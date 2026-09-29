import asyncio
import logging
import os
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from math import ceil

from jose import jwt, JWTError
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from database import obtener_db_pool
from security import verificar_password, hashear_password, es_hash_valido

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTOS = 60

if not JWT_SECRET:
    raise RuntimeError("Falta JWT_SECRET en las variables de entorno.")

security_scheme = HTTPBearer()

LOGIN_MAX_INTENTOS = int(os.getenv("LOGIN_MAX_INTENTOS", "5"))
LOGIN_MAX_INTENTOS_IP = int(os.getenv("LOGIN_MAX_INTENTOS_IP", "30"))
LOGIN_VENTANA_SEGUNDOS = int(os.getenv("LOGIN_VENTANA_SEGUNDOS", "900"))


class LimitadorIntentos:
    """Cuenta intentos fallidos por clave dentro de una ventana de tiempo deslizante."""

    def __init__(self, maximo: int, ventana_seg: int):
        self.maximo = maximo
        self.ventana = ventana_seg
        self._fallos: dict[str, deque] = {}

    def _vigentes(self, clave: str):
        cola = self._fallos.get(clave)
        if cola is None:
            return None
        limite = time.monotonic() - self.ventana
        while cola and cola[0] <= limite:
            cola.popleft()
        if not cola:
            del self._fallos[clave]
            return None
        return cola

    def cantidad(self, clave: str) -> int:
        cola = self._vigentes(clave)
        return len(cola) if cola else 0

    def segundos_restantes(self, clave: str) -> int:
        """0 si no está bloqueada; si lo está, segundos hasta poder reintentar."""
        cola = self._vigentes(clave)
        if cola and len(cola) >= self.maximo:
            return max(1, ceil(self.ventana - (time.monotonic() - cola[0])))
        return 0

    def registrar_fallo(self, clave: str) -> None:
        # Poda ocasional para que el diccionario no crezca sin límite
        if len(self._fallos) > 10_000:
            for k in list(self._fallos):
                self._vigentes(k)
        self._fallos.setdefault(clave, deque()).append(time.monotonic())

    def reiniciar(self, clave: str) -> None:
        self._fallos.pop(clave, None)


_limitador_cuenta = LimitadorIntentos(LOGIN_MAX_INTENTOS, LOGIN_VENTANA_SEGUNDOS)
_limitador_ip = LimitadorIntentos(LOGIN_MAX_INTENTOS_IP, LOGIN_VENTANA_SEGUNDOS)

# Hash de mentira: se verifica cuando el correo no existe, para que la respuesta
# tarde lo mismo y no se pueda averiguar qué correos están registrados.
_HASH_FALSO = hashear_password("contraseña-que-nadie-usa")


class LoginRequest(BaseModel):
    correo: str = Field(..., max_length=254)
    password: str = Field(..., max_length=256)


class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str
    rol_id: int
    rol_nombre: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse


class UsuarioToken(BaseModel):
    """Lo que queda disponible en cada endpoint protegido, extraído del JWT ya verificado."""
    id_usuario: int
    rol: str


def crear_access_token(usuario_id: int, rol_nombre: str) -> str:
    expira = datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRATION_MINUTOS)
    payload = {
        "sub": str(usuario_id),
        "rol": rol_nombre,
        "exp": expira,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
) -> UsuarioToken:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido o expirado. Vuelve a iniciar sesión."
        )

    usuario_id = payload.get("sub")
    rol = payload.get("rol")

    if usuario_id is None or rol is None:
        raise HTTPException(status_code=401, detail="Token inválido.")

    return UsuarioToken(id_usuario=int(usuario_id), rol=rol)


def requiere_rol(*roles_permitidos: str):

    def verificador(usuario: UsuarioToken = Depends(get_usuario_actual)) -> UsuarioToken:
        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para acceder a este recurso."
            )
        return usuario
    return verificador


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request):
    correo = body.correo.strip().lower()
    ip = request.client.host if request.client else "desconocida"
    clave_cuenta = f"{ip}|{correo}"

    espera = max(
        _limitador_cuenta.segundos_restantes(clave_cuenta),
        _limitador_ip.segundos_restantes(ip),
    )
    if espera > 0:
        raise HTTPException(
            status_code=429,
            detail=f"Demasiados intentos fallidos. Intenta nuevamente en {ceil(espera / 60)} minuto(s).",
            headers={"Retry-After": str(espera)},
        )

    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conexion:
            user = await conexion.fetchrow(
                """
                SELECT 
                    u.id_usuario, 
                    u.nombre, 
                    u.apellido, 
                    u.correo, 
                    u.password,
                    u.rol AS rol_id,
                    r.nombre AS rol_nombre
                FROM USUARIO u
                INNER JOIN ROL r ON u.rol = r.id_rol
                WHERE u.correo = $1;
                """,
                correo
            )

            # 2. Verificación (en un hilo aparte para no bloquear el servidor con PBKDF2)
            if user:
                credenciales_ok = await asyncio.to_thread(
                    verificar_password, body.password, user["password"]
                )
            else:
                await asyncio.to_thread(verificar_password, body.password, _HASH_FALSO)
                credenciales_ok = False

            # 3. Fallo: se registra el intento y se responde siempre con el mismo mensaje
            if not credenciales_ok:
                _limitador_cuenta.registrar_fallo(clave_cuenta)
                _limitador_ip.registrar_fallo(ip)

                # Auditoría solo cuando se alcanza el bloqueo, para no llenar el log
                if user and _limitador_cuenta.cantidad(clave_cuenta) == LOGIN_MAX_INTENTOS:
                    try:
                        await conexion.execute(
                            """
                            INSERT INTO log_auditoria (usuario_id, accion, detalle)
                            VALUES ($1, 'LOGIN_BLOQUEADO', $2);
                            """,
                            user["id_usuario"],
                            f"Bloqueo temporal tras {LOGIN_MAX_INTENTOS} intentos fallidos desde {ip}"
                        )
                    except Exception:
                        logger.exception("No se pudo registrar el bloqueo de login en auditoría")

                raise HTTPException(
                    status_code=401,
                    detail="El correo o la contraseña ingresados no coinciden."
                )

            # 4. Éxito: se limpia el contador de esta cuenta
            _limitador_cuenta.reiniciar(clave_cuenta)
            if not es_hash_valido(user["password"]):
                try:
                    nuevo_hash = await asyncio.to_thread(hashear_password, body.password)
                    await conexion.execute(
                        "UPDATE USUARIO SET password = $1 WHERE id_usuario = $2;",
                        nuevo_hash,
                        user["id_usuario"]
                    )
                except Exception:
                    logger.exception(
                        "No se pudo migrar la contraseña del usuario %s",
                        user["id_usuario"]
                    )

            await conexion.execute(
                """
                INSERT INTO log_auditoria (usuario_id, accion, detalle)
                VALUES ($1, 'LOGIN', 'Inicio de sesión exitoso');
                """,
                user["id_usuario"]
            )

            token = crear_access_token(user["id_usuario"], user["rol_nombre"])

            return LoginResponse(
                access_token=token,
                usuario=UsuarioResponse(
                    id_usuario=user["id_usuario"],
                    nombre=user["nombre"],
                    apellido=user["apellido"],
                    correo=user["correo"],
                    rol_id=user["rol_id"],
                    rol_nombre=user["rol_nombre"]
                )
            )
    except HTTPException:
        raise
    except Exception:
        logger.exception("Error inesperado en el login")
        raise HTTPException(status_code=500, detail="Ocurrió un error al iniciar sesión.")