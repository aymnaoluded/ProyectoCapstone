from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import obtener_db_pool

router = APIRouter(prefix="/api/auth", tags=["Autenticacion"])

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

@router.post("/login", response_model=UsuarioResponse)
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
                body.correo.strip()
            )

            if not user or user["password"] != body.password:
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

            return UsuarioResponse(
                id_usuario=user["id_usuario"],
                nombre=user["nombre"],
                apellido=user["apellido"],
                correo=user["correo"],
                rol_id=user["rol_id"],
                rol_nombre=user["rol_nombre"]
            )
    except HTTPException:
        raise
    except Exception as e :
        raise HTTPException(status_code=500, detail=str(e))