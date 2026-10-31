import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from database import iniciar_db_pool, cerrar_db_pool
from routers import auth, documentos, chat, tickets, admin

# "produccion" oculta la documentación de la API y activa HSTS; por defecto, "desarrollo"
ENTORNO = os.getenv("ENTORNO", "desarrollo").strip().lower()
ES_PRODUCCION = ENTORNO == "produccion"

@asynccontextmanager
async def lifespan(app: FastAPI):
    await iniciar_db_pool()
    os.makedirs("uploads", exist_ok=True)
    yield
    await cerrar_db_pool()

# En producción no se publica el mapa de endpoints (/docs, /redoc, /openapi.json)
app = FastAPI(
    title="SupportAI API",
    lifespan=lifespan,
    docs_url=None if ES_PRODUCCION else "/docs",
    redoc_url=None if ES_PRODUCCION else "/redoc",
    openapi_url=None if ES_PRODUCCION else "/openapi.json",
)

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

RUTAS_DOCUMENTACION = ("/docs", "/redoc", "/openapi.json")

@app.middleware("http")
async def cabeceras_seguridad(request: Request, call_next):
    """Agrega cabeceras de seguridad HTTP a todas las respuestas."""
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"

    # La API solo devuelve JSON: no debe ejecutar nada. Swagger (/docs) carga scripts, por eso se excluye
    if not request.url.path.startswith(RUTAS_DOCUMENTACION):
        response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

    # Tickets, conversaciones y datos de usuarios no deben quedar en la caché del navegador
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"

    # HSTS solo tiene sentido con HTTPS, que existe en producción
    if ES_PRODUCCION:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    return response

app.include_router(auth.router)
app.include_router(documentos.router)
app.include_router(chat.router)
app.include_router(tickets.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"status": "online", "message": "SupportAI Backend Modular Funcionando"}