import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
pool: asyncpg.pool = None

async def iniciar_db_pool():
    global pool
    pool = await asyncpg.create_pool(
        dsn=DATABASE_URL,
        min_size=2,
        max_size=10
    )
    async with pool.acquire() as conn:
        # Solo se altera la tabla si faltan las columnas: el usuario de la aplicación
        # (supportai_app) no tiene permiso para cambiar la estructura, ni siquiera con IF NOT EXISTS
        existentes = await conn.fetch(
            """
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'conversacion' AND column_name IN ('calificacion', 'titulo');
            """
        )
        if len(existentes) < 2:
            try:
                await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS calificacion INTEGER;")
                await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);")
            except asyncpg.InsufficientPrivilegeError as e:
                raise RuntimeError(
                    "Faltan las columnas calificacion/titulo en CONVERSACION y el usuario de la base "
                    "no puede crearlas. Ejecuta backend/schema.sql como postgres."
                ) from e

async def cerrar_db_pool():
    global pool
    if pool:
        await pool.close()

def obtener_db_pool() -> asyncpg.Pool:
    return pool

