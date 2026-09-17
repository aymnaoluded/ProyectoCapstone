import os
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from database import obtener_db_pool
from security import verificar_password

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTOS = 60

if not JWT_SECRET:
    raise RuntimeError("Falta JWT_SECRET en las variables de entorno.")

security_scheme = HTTPBearer()


class LoginRequest(BaseModel):
    correo: str
    password: str


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
    """
    Dependency de FastAPI: lee el header 'Authorization: Bearer <token>',
    valida el JWT (firma + expiración) y entrega el usuario real.
    Se usa en cualquier endpoint que necesite saber quién hace la petición,
    en vez de confiar en un id que venga en el body.
    """
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
    """
    Fábrica de dependencies para restringir un endpoint a ciertos roles.
    Uso: usuario: UsuarioToken = Depends(requiere_rol("Administrador"))
    """
    def verificador(usuario: UsuarioToken = Depends(get_usuario_actual)) -> UsuarioToken:
        if usuario.rol not in roles_permitidos:
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para acceder a este recurso."
            )
        return usuario
    return verificador


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
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
                body.correo.strip().lower()
            )

            if not user or not verificar_password(body.password, user["password"]):
                raise HTTPException(
                    status_code=401,
                    detail="El correo o la contraseña ingresados no coinciden."
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
        raise HTTPException(status_code=500, detail="Ocurrió un error al iniciar sesión.")