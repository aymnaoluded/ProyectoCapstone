import asyncio
import hashlib
import logging
import os
import secrets
import time
from collections import deque
from datetime import datetime, timedelta, timezone
from math import ceil
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from pydantic import BaseModel, Field, EmailStr
from database import obtener_db_pool
from security import (
    verificar_password,
    hashear_password,
    es_hash_valido
)
from gmail_service import enviar_correo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

# Configuración JWT

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTOS = 60

if not JWT_SECRET:
    raise RuntimeError("Falta JWT_SECRET en las variables de entorno.")

security_scheme = HTTPBearer()

# Configuración de límites

LOGIN_MAX_INTENTOS = int(os.getenv("LOGIN_MAX_INTENTOS", "5"))

LOGIN_MAX_INTENTOS_IP = int(os.getenv("LOGIN_MAX_INTENTOS_IP", "30"))

LOGIN_VENTANA_SEGUNDOS = int(os.getenv("LOGIN_VENTANA_SEGUNDOS", "900"))

RECUPERACION_MAX_INTENTOS_IP = int(os.getenv("RECUPERACION_MAX_INTENTOS_IP", "10"))

RECUPERACION_MAX_INTENTOS_CORREO = int(os.getenv("RECUPERACION_MAX_INTENTOS_CORREO", "3"))

RECUPERACION_VENTANA_SEGUNDOS = int(os.getenv("RECUPERACION_VENTANA_SEGUNDOS", "3600"))

# Limitador de solicitudes

class LimitadorIntentos:
    """Limita solicitudes por clave en una ventana temporal."""

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
        cola = self._vigentes(clave)

        if cola and len(cola) >= self.maximo:
            restante = self.ventana - (time.monotonic() - cola[0])
            return max(1, ceil(restante))

        return 0

    def registrar_fallo(self, clave: str) -> None:
        if len(self._fallos) > 10_000:
            for k in list(self._fallos):
                self._vigentes(k)

        self._fallos.setdefault(clave, deque()).append(time.monotonic())

    def reiniciar(self, clave: str) -> None:
        self._fallos.pop(clave, None)


_limitador_cuenta = LimitadorIntentos(LOGIN_MAX_INTENTOS, LOGIN_VENTANA_SEGUNDOS)

_limitador_ip = LimitadorIntentos(LOGIN_MAX_INTENTOS_IP, LOGIN_VENTANA_SEGUNDOS)

_recuperacion_ip = LimitadorIntentos(RECUPERACION_MAX_INTENTOS_IP, RECUPERACION_VENTANA_SEGUNDOS)

_recuperacion_correo = LimitadorIntentos(RECUPERACION_MAX_INTENTOS_CORREO, RECUPERACION_VENTANA_SEGUNDOS)

_cambio_password = LimitadorIntentos(5, 900)

_HASH_FALSO = hashear_password("contraseña-que-nadie-usa")

# Modelos Pydantic

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
    id_usuario: int
    rol: str


class ActivarCuentaRequest(BaseModel):
    token: str = Field(..., min_length=20, max_length=256)
    password: str = Field(..., min_length=8, max_length=256)


class SolicitarRecuperacionRequest(BaseModel):
    correo: EmailStr


class RestablecerPasswordRequest(BaseModel):
    token: str = Field(...,min_length=20, max_length=256)
    password: str = Field(..., min_length=8, max_length=256)


class CambiarPasswordRequest(BaseModel):
    password_actual: str = Field(..., min_length=1, max_length=256)
    password_nueva: str = Field(..., min_length=8, max_length=256)

# Funciones auxiliares

def generar_hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def obtener_frontend_url() -> str:
    frontend_url = os.getenv("FRONTEND_URL", "").strip()

    if not frontend_url:
        raise RuntimeError("Falta configurar FRONTEND_URL.")

    return frontend_url.rstrip("/")


def crear_access_token(usuario_id: int, rol_nombre: str, version_sesion: int) -> str:

    expira = (
        datetime.now(timezone.utc)
        + timedelta(minutes=JWT_EXPIRATION_MINUTOS))

    payload = {
        "sub": str(usuario_id),
        "rol": rol_nombre,
        "ver": version_sesion,
        "exp": expira,
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


# Validar usuario autenticado

async def get_usuario_actual(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)) -> UsuarioToken:

    token = credentials.credentials

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        usuario_id = int(payload["sub"])
        version_token = payload["ver"]

        if (not isinstance(version_token, int) or isinstance(version_token, bool)):
            raise ValueError("Versión inválida")

    except (JWTError, KeyError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail=("Token inválido o expirado. Vuelve a iniciar sesión."))
    

    pool = obtener_db_pool()

    try:
        async with pool.acquire() as conn:
            usuario = await conn.fetchrow(
                """
                SELECT
                    u.id_usuario,
                    u.cuenta_activada,
                    u.version_sesion,
                    r.nombre AS rol_nombre
                FROM USUARIO u
                INNER JOIN ROL r
                    ON r.id_rol = u.rol
                WHERE u.id_usuario = $1;
                """,
                usuario_id
            )

    except Exception:
        logger.exception("Error verificando la sesión")

        raise HTTPException(status_code=503, detail="No se pudo verificar la sesión.")

    if (not usuario or not usuario["cuenta_activada"] or usuario["version_sesion"] != version_token):
        raise HTTPException(status_code=401, detail=("Tu sesión ya no es válida. Vuelve a iniciar sesión."))

    return UsuarioToken(id_usuario=usuario["id_usuario"], rol=usuario["rol_nombre"])


def requiere_rol(*roles_permitidos: str):

    def crear_verificador():

        async def verificador(usuario: UsuarioToken = Depends(get_usuario_actual)) -> UsuarioToken:

            if usuario.rol not in roles_permitidos:
                raise HTTPException(status_code=403, detail=("No tienes permiso para acceder a este recurso."))
            return usuario

        return verificador

    return crear_verificador()

# LOGIN

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, request: Request):
    correo = body.correo.strip().lower()
    ip = (request.client.host if request.client else "desconocida")

    clave_cuenta = f"{ip}|{correo}"

    espera = max(_limitador_cuenta.segundos_restantes(clave_cuenta),_limitador_ip.segundos_restantes(ip))

    if espera > 0:
        raise HTTPException(
            status_code=429,
            detail=("Demasiados intentos fallidos. " f"Intenta nuevamente en "f"{ceil(espera / 60)} minuto(s)."),
            headers={"Retry-After": str(espera)}
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
                    u.cuenta_activada,
                    u.version_sesion,
                    u.rol AS rol_id,
                    r.nombre AS rol_nombre
                FROM USUARIO u
                INNER JOIN ROL r
                    ON u.rol = r.id_rol
                WHERE u.correo = $1;
                """,
                correo
            )

            if user:
                credenciales_ok = await asyncio.to_thread(verificar_password, body.password, user["password"])

                credenciales_ok = (credenciales_ok and user["cuenta_activada"])
            else:
                await asyncio.to_thread(verificar_password, body.password, _HASH_FALSO)
                credenciales_ok = False

            if not credenciales_ok:

                _limitador_cuenta.registrar_fallo(clave_cuenta)
                _limitador_ip.registrar_fallo(ip)

                if (user and _limitador_cuenta.cantidad(clave_cuenta) == LOGIN_MAX_INTENTOS):
                    try:
                        await conexion.execute(
                            """
                            INSERT INTO log_auditoria
                            (usuario_id, accion, detalle)
                            VALUES (
                                $1,
                                'LOGIN_BLOQUEADO',
                                $2
                            );
                            """,
                            user["id_usuario"],
                            (
                                "Bloqueo temporal tras "
                                f"{LOGIN_MAX_INTENTOS} "
                                f"intentos desde {ip}"
                            )
                        )
                    except Exception:
                        logger.exception("Error registrando bloqueo")

                raise HTTPException(status_code=401, detail=("El correo o la contraseña ingresados no coinciden."))

            _limitador_cuenta.reiniciar(clave_cuenta)

            # Compatibilidad con contraseñas antiguas.
            if not es_hash_valido(user["password"]):
                try:
                    nuevo_hash = await asyncio.to_thread(hashear_password, body.password)

                    await conexion.execute(
                        """
                        UPDATE USUARIO
                        SET password = $1
                        WHERE id_usuario = $2;
                        """,
                        nuevo_hash,
                        user["id_usuario"]
                    )
                except Exception:
                    logger.exception("No se pudo migrar la contraseña")

            await conexion.execute(
                """
                INSERT INTO log_auditoria
                (usuario_id, accion, detalle)
                VALUES (
                    $1,
                    'LOGIN',
                    'Inicio de sesión exitoso'
                );
                """,
                user["id_usuario"]
            )

            token = crear_access_token(user["id_usuario"], user["rol_nombre"], user["version_sesion"])

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

# ACTIVAR CUENTA

@router.post("/activar-cuenta")
async def activar_cuenta(body: ActivarCuentaRequest):
    pool = obtener_db_pool()

    token_hash = generar_hash_token(body.token)

    nuevo_hash = await asyncio.to_thread(hashear_password, body.password)

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():

                invitacion = await conn.fetchrow(
                    """
                    SELECT
                        t.id_token,
                        t.usuario_id
                    FROM TOKEN_ACTIVACION t
                    INNER JOIN USUARIO u
                        ON u.id_usuario = t.usuario_id
                    WHERE t.token_hash = $1
                      AND t.tipo_token = 'ACTIVACION'
                      AND t.utilizado = FALSE
                      AND t.fecha_expiracion > NOW()
                      AND u.cuenta_activada = FALSE
                    FOR UPDATE OF t, u;
                    """,
                    token_hash
                )

                if not invitacion:
                    raise HTTPException(status_code=400, detail=("El enlace es inválido, ya fue utilizado o ha expirado."))

                await conn.execute(
                    """
                    UPDATE USUARIO
                    SET password = $1,
                        cuenta_activada = TRUE,
                        version_sesion = version_sesion + 1
                    WHERE id_usuario = $2;
                    """,
                    nuevo_hash,
                    invitacion["usuario_id"]
                )

                await conn.execute(
                    """
                    UPDATE TOKEN_ACTIVACION
                    SET utilizado = TRUE
                    WHERE usuario_id = $1
                      AND tipo_token = 'ACTIVACION'
                      AND utilizado = FALSE;
                    """,
                    invitacion["usuario_id"]
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria
                    (usuario_id, accion, detalle)
                    VALUES (
                        $1,
                        'ACTIVAR_CUENTA',
                        'Cuenta activada mediante invitación'
                    );
                    """,
                    invitacion["usuario_id"]
                )

        return {"mensaje": ("Cuenta activada correctamente. Ya puedes iniciar sesión.")}

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error al activar cuenta")

        raise HTTPException(status_code=500, detail="Ocurrió un error al activar la cuenta.")

# SOLICITAR RECUPERACIÓN DE CONTRASEÑA

@router.post("/solicitar-recuperacion")
async def solicitar_recuperacion(body: SolicitarRecuperacionRequest, request: Request):
    correo = body.correo.strip().lower()

    ip = (request.client.host if request.client else "desconocida")

    respuesta_generica = {
        "mensaje": (
            "Si el correo está registrado y la cuenta "
            "está activa, recibirás un enlace para "
            "restablecer tu contraseña."
        )
    }

    if (_recuperacion_ip.segundos_restantes(ip) > 0 or _recuperacion_correo.segundos_restantes(correo) > 0):
        return respuesta_generica

    _recuperacion_ip.registrar_fallo(ip)
    _recuperacion_correo.registrar_fallo(correo)

    try:
        frontend_url = obtener_frontend_url()
        pool = obtener_db_pool()

        async with pool.acquire() as conn:

            usuario = await conn.fetchrow(
                """
                SELECT
                    id_usuario,
                    nombre,
                    correo
                FROM USUARIO
                WHERE correo = $1
                  AND cuenta_activada = TRUE;
                """,
                correo
            )

            if not usuario:
                return respuesta_generica

            token = secrets.token_urlsafe(32)
            token_hash = generar_hash_token(token)

            expiracion = (datetime.now(timezone.utc) + timedelta(minutes=15))

            async with conn.transaction():

                await conn.execute(
                    """
                    UPDATE TOKEN_ACTIVACION
                    SET utilizado = TRUE
                    WHERE usuario_id = $1
                      AND tipo_token = 'RECUPERACION'
                      AND utilizado = FALSE;
                    """,
                    usuario["id_usuario"]
                )

                await conn.execute(
                    """
                    INSERT INTO TOKEN_ACTIVACION
                    (
                        usuario_id,
                        token_hash,
                        fecha_expiracion,
                        tipo_token
                    )
                    VALUES (
                        $1,
                        $2,
                        $3,
                        'RECUPERACION'
                    );
                    """,
                    usuario["id_usuario"],
                    token_hash,
                    expiracion
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria
                    (usuario_id, accion, detalle)
                    VALUES (
                        $1,
                        'SOLICITAR_RECUPERACION',
                        'Solicitud de recuperación de contraseña'
                    );
                    """,
                    usuario["id_usuario"]
                )

        enlace = (f"{frontend_url}" f"/restablecer-password?token={token}")

        mensaje = (
            f"Hola {usuario['nombre']},\n\n"
            "Recibimos una solicitud para restablecer "
            "tu contraseña de SupportAI.\n\n"
            "Ingresa al siguiente enlace:\n"
            f"{enlace}\n\n"
            "Este enlace vence en 15 minutos.\n\n"
            "Si no solicitaste este cambio, puedes "
            "ignorar este mensaje.\n\n"
            "Equipo SupportAI"
        )

        try:
            await asyncio.to_thread(enviar_correo, correo, "SupportAI - Recuperación de contraseña", mensaje)
        except Exception:
            logger.exception("No se pudo enviar el correo de recuperación al usuario %s", usuario["id_usuario"])

        return respuesta_generica

    except Exception:
        logger.exception("Error en solicitar_recuperacion")
        return respuesta_generica

# RESTABLECER CONTRASEÑA MEDIANTE TOKEN

@router.post("/restablecer-password")
async def restablecer_password(body: RestablecerPasswordRequest):
    pool = obtener_db_pool()

    token_hash = generar_hash_token(body.token)

    nuevo_hash = await asyncio.to_thread(hashear_password, body.password)

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():

                recuperacion = await conn.fetchrow(
                    """
                    SELECT
                        t.id_token,
                        t.usuario_id
                    FROM TOKEN_ACTIVACION t
                    INNER JOIN USUARIO u
                        ON u.id_usuario = t.usuario_id
                    WHERE t.token_hash = $1
                      AND t.tipo_token = 'RECUPERACION'
                      AND t.utilizado = FALSE
                      AND t.fecha_expiracion > NOW()
                      AND u.cuenta_activada = TRUE
                    FOR UPDATE OF t, u;
                    """,
                    token_hash
                )

                if not recuperacion:
                    raise HTTPException(status_code=400, detail=("El enlace es inválido, ha expirado o ya fue utilizado."))

                await conn.execute(
                    """
                    UPDATE USUARIO
                    SET password = $1,
                        version_sesion = version_sesion + 1
                    WHERE id_usuario = $2;
                    """,
                    nuevo_hash,
                    recuperacion["usuario_id"]
                )

                await conn.execute(
                    """
                    UPDATE TOKEN_ACTIVACION
                    SET utilizado = TRUE
                    WHERE usuario_id = $1
                      AND tipo_token = 'RECUPERACION'
                      AND utilizado = FALSE;
                    """,
                    recuperacion["usuario_id"]
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria
                    (usuario_id, accion, detalle)
                    VALUES (
                        $1,
                        'RESTABLECER_PASSWORD',
                        'Contraseña restablecida por correo'
                    );
                    """,
                    recuperacion["usuario_id"]
                )

        return {"mensaje": ("Contraseña restablecida correctamente. Ya puedes iniciar sesión.")}

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error al restablecer contraseña")
        raise HTTPException(status_code=500, detail="No se pudo restablecer la contraseña.")

# CAMBIAR CONTRASEÑA CON SESIÓN INICIADA

@router.post("/cambiar-password")
async def cambiar_password(body: CambiarPasswordRequest, usuario: UsuarioToken = Depends(get_usuario_actual)):
    pool = obtener_db_pool()

    clave_limitador = str(usuario.id_usuario)

    espera = _cambio_password.segundos_restantes(clave_limitador)

    if espera > 0:
        raise HTTPException(status_code=429, detail=("Demasiados intentos. Intenta nuevamente más tarde."),headers={"Retry-After": str(espera)})

    if body.password_actual == body.password_nueva:
        raise HTTPException(status_code=400, detail=("La nueva contraseña debe ser diferente de la actual."))

    try:
        async with pool.acquire() as conn:
            async with conn.transaction():

                datos = await conn.fetchrow(
                    """
                    SELECT
                        password,
                        cuenta_activada
                    FROM USUARIO
                    WHERE id_usuario = $1
                    FOR UPDATE;
                    """,
                    usuario.id_usuario
                )

                if (not datos or not datos["cuenta_activada"]):
                    raise HTTPException(status_code=401, detail="Cuenta no disponible.")

                password_valida = await asyncio.to_thread(verificar_password, body.password_actual, datos["password"])

                if not password_valida:
                    _cambio_password.registrar_fallo(clave_limitador)

                    raise HTTPException(status_code=400, detail=("La contraseña actual es incorrecta."))

                nuevo_hash = await asyncio.to_thread(hashear_password, body.password_nueva)

                await conn.execute(
                    """
                    UPDATE USUARIO
                    SET password = $1,
                        version_sesion = version_sesion + 1
                    WHERE id_usuario = $2;
                    """,
                    nuevo_hash,
                    usuario.id_usuario
                )

                await conn.execute(
                    """
                    UPDATE TOKEN_ACTIVACION
                    SET utilizado = TRUE
                    WHERE usuario_id = $1
                      AND tipo_token = 'RECUPERACION'
                      AND utilizado = FALSE;
                    """,
                    usuario.id_usuario
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria
                    (usuario_id, accion, detalle)
                    VALUES (
                        $1,
                        'CAMBIAR_PASSWORD',
                        'Cambio de contraseña autenticado'
                    );
                    """,
                    usuario.id_usuario
                )

        _cambio_password.reiniciar(clave_limitador)

        return {"mensaje": ("Contraseña actualizada correctamente. Vuelve a iniciar sesión.")}

    except HTTPException:
        raise

    except Exception:
        logger.exception("Error al cambiar contraseña")
        raise HTTPException(status_code=500, detail="No se pudo cambiar la contraseña.")