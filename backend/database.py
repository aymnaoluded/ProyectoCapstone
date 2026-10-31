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
        # Si las columnas y el índice ya existen, no se ejecutan los ALTER/CREATE de abajo:
        # el usuario de la aplicación (supportai_app) no tiene permiso para cambiar la estructura,
        # ni siquiera con IF NOT EXISTS. Si falta algo, se ejecutan como siempre (requiere postgres).
        columnas = await conn.fetchval(
            """
            SELECT COUNT(*) FROM information_schema.columns
            WHERE (table_name = 'conversacion' AND column_name IN ('calificacion', 'titulo'))
               OR (table_name = 'documento' AND column_name = 'hash_archivo');
            """
        )
        indice = await conn.fetchval("SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documento_hash';")
        if columnas == 3 and indice:
            return

        await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS calificacion INTEGER;")
        await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);")
        await conn.execute("ALTER TABLE DOCUMENTO ADD COLUMN IF NOT EXISTS hash_archivo VARCHAR(64);")
        await conn.execute("CREATE INDEX IF NOT EXISTS idx_documento_hash ON DOCUMENTO(hash_archivo);")

async def cerrar_db_pool():
    global pool
    if pool:
        await pool.close()

def obtener_db_pool() -> asyncpg.Pool:
    return pool

