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

async def cerrar_db_pool():
    global pool
    if pool:
        await pool.close()

def obtener_db_pool() -> asyncpg.Pool:
    return pool

