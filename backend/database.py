import os
# pyrefly: ignore [missing-import]
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
        await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS calificacion INTEGER;")
        await conn.execute("ALTER TABLE CONVERSACION ADD COLUMN IF NOT EXISTS titulo VARCHAR(255);")

async def cerrar_db_pool():
    global pool
    if pool:
        await pool.close()

def obtener_db_pool() -> asyncpg.Pool:
    return pool

