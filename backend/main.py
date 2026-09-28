import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import iniciar_db_pool, cerrar_db_pool
from routers import auth, documentos, chat, tickets, admin

@asynccontextmanager
async def lifespan(app: FastAPI):
    await iniciar_db_pool()
    os.makedirs("uploads", exist_ok=True)
    yield
    await cerrar_db_pool()

app = FastAPI(title="SupportAI API", lifespan=lifespan)

ORIGENES_PERMITIDOS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

cors_env = os.getenv("CORS_ORIGINS")
if cors_env:
    ORIGENES_PERMITIDOS.extend([o.strip() for o in cors_env.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGENES_PERMITIDOS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(chat.router)
app.include_router(tickets.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "SupportAI Backend Modular Funcionando"}