import logging
import os
import re
import time
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from database import obtener_db_pool
from services import (
    extraer_texto,
    fragmentar_texto,
    generar_embedding_documento,
)
from .auth import requiere_rol, UsuarioToken

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Documentos y Base de Conocimiento"])

ROL_ADMIN = "Administrador"

CARPETA_UPLOADS = "uploads"
MAX_TAMANO_BYTES = 25 * 1024 * 1024  # 25 MB

TIPOS_PERMITIDOS = {
    "pdf": "application/pdf",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "txt": "text/plain",
}

def sanitizar_nombre_archivo(nombre: str) -> str:
    nombre = os.path.basename((nombre or "").replace("\\", "/"))
    nombre = re.sub(r"[^A-Za-z0-9._-]", "_", nombre)
    nombre = nombre.lstrip(".") 
    base, ext = os.path.splitext(nombre)
    nombre = base[:100] + ext
    return nombre or "documento"


def obtener_extension_valida(nombre_archivo: str) -> str:
    """Devuelve la extensión (sin punto, en minúsculas) o lanza 400 si no está permitida."""
    extension = os.path.splitext(sanitizar_nombre_archivo(nombre_archivo))[1].lstrip(".").lower()
    if extension not in TIPOS_PERMITIDOS:
        raise HTTPException(
            status_code=400,
            detail="Formato no admitido. Debe ser un archivo PDF, DOCX o TXT."
        )
    return extension


async def leer_archivo_validado(archivo: UploadFile):
    """Valida la extensión y el tamaño (máx. 25 MB) y devuelve (contenido_bytes, extension)."""
    extension = obtener_extension_valida(archivo.filename or "")

    # Se lee un byte más que el límite solo para detectar que se excedió
    contenido = await archivo.read(MAX_TAMANO_BYTES + 1)
    if len(contenido) > MAX_TAMANO_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El archivo supera el tamaño máximo permitido de 25 MB."
        )
    if len(contenido) == 0:
        raise HTTPException(status_code=400, detail="El archivo adjunto se encuentra vacío.")

    return contenido, extension


def guardar_archivo(contenido: bytes, nombre_original: str) -> str:
    """Guarda el archivo en uploads/ con un nombre seguro y devuelve la ruta que se guarda en BD."""
    os.makedirs(CARPETA_UPLOADS, exist_ok=True)

    nombre_guardado = f"{int(time.time() * 1000)}_{sanitizar_nombre_archivo(nombre_original)}"
    ruta_disco = os.path.join(CARPETA_UPLOADS, nombre_guardado)

    # Defensa adicional: la ruta final debe quedar dentro de la carpeta uploads
    base = os.path.abspath(CARPETA_UPLOADS)
    if os.path.commonpath([base, os.path.abspath(ruta_disco)]) != base:
        raise HTTPException(status_code=400, detail="Nombre de archivo no válido.")

    with open(ruta_disco, "wb") as f:
        f.write(contenido)

    return f"/uploads/{nombre_guardado}"


async def _alternar_publicacion(id_documento: int, usuario_id: int) -> dict:
    """Alterna publicado/despublicado de un documento y lo registra en auditoría."""
    pool = obtener_db_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            doc = await conn.fetchrow(
                """
                UPDATE DOCUMENTO 
                SET activo = NOT COALESCE(activo, TRUE)
                WHERE id_documento = $1
                RETURNING id_documento, titulo, activo;
                """,
                id_documento
            )
            if not doc:
                raise HTTPException(status_code=404, detail="Documento no encontrado")

            nuevo_estado = "Publicado" if doc["activo"] else "Despublicado"

            await conn.execute(
                """
                INSERT INTO log_auditoria (usuario_id, accion, detalle)
                VALUES ($1, 'TOGGLE_DOCUMENTO', $2);
                """,
                usuario_id, f"Documento '{doc['titulo']}' marcado como {nuevo_estado}"
            )

    return {
        "id_documento": doc["id_documento"],
        "titulo": doc["titulo"],
        "activo": doc["activo"]
    }

@router.post("/api/documentos")
async def subir_documento(
    titulo: str = Form(...),
    archivo: UploadFile = File(...),
    usuario: UsuarioToken = Depends(requiere_rol(ROL_ADMIN))
):
    titulo = titulo.strip()
    if not titulo:
        raise HTTPException(status_code=400, detail="El título no puede estar vacío.")

    pool = obtener_db_pool()
    try:
        # Valida extensión (pdf/docx/txt) y tamaño (25 MB)
        contenido_bytes, extension = await leer_archivo_validado(archivo)

        texto_completo = extraer_texto(contenido_bytes, TIPOS_PERMITIDOS[extension])
        fragmentos = fragmentar_texto(texto_completo)

        if not fragmentos:
            raise HTTPException(status_code=400, detail="El documento no contiene texto extraíble.")

        # Solo se guarda el archivo si el contenido es válido
        ruta_archivo = guardar_archivo(contenido_bytes, archivo.filename)

        async with pool.acquire() as conn:
            async with conn.transaction():
                doc_row = await conn.fetchrow(
                    """
                    INSERT INTO DOCUMENTO (titulo, ruta_archivo, admin_id, activo)
                    VALUES ($1, $2, $3, TRUE)
                    RETURNING id_documento
                    """,
                    titulo, ruta_archivo, usuario.id_usuario
                )
                documento_id = doc_row["id_documento"]

                for i, fragmento in enumerate(fragmentos):
                    vector = generar_embedding_documento(fragmento)
                    vector_str = f"[{','.join(map(str, vector))}]"
                    await conn.execute(
                        """
                        INSERT INTO FRAGMENTO (documento_id, contenido, embedding, orden)
                        VALUES ($1, $2, $3::vector, $4)
                        """,
                        documento_id, fragmento, vector_str, i + 1
                    )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'SUBIDA_DOCUMENTO', $2)
                    """,
                    usuario.id_usuario,
                    f"Documento '{titulo}' indexado con {len(fragmentos)} fragmentos."
                )

        return {
            "message": "Documento indexado con éxito",
            "documento_id": documento_id,
            "total_fragmentos": len(fragmentos)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en POST /api/documentos: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al procesar el documento.")


@router.get("/api/admin/conocimiento/stats")
async def obtener_stats_conocimiento(usuario: UsuarioToken = Depends(requiere_rol(ROL_ADMIN))):
    pool = obtener_db_pool()
    async with pool.acquire() as conn:
        total_docs = await conn.fetchval("SELECT COUNT(*) FROM DOCUMENTO;")
        publicados = await conn.fetchval("SELECT COUNT(*) FROM DOCUMENTO WHERE activo = TRUE;")
        fragmentos = await conn.fetchval("SELECT COUNT(*) FROM FRAGMENTO;")
        consultas = await conn.fetchval("SELECT COUNT(*) FROM MENSAJE WHERE emisor = 'cliente';")

    return {
        "documentos": total_docs or 0,
        "publicados": publicados or 0,
        "fragmentos_indexados": fragmentos or 0,
        "consultas_atendidas": consultas or 0
    }


@router.get("/api/admin/documentos")
async def listar_documentos(usuario: UsuarioToken = Depends(requiere_rol(ROL_ADMIN))):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    d.id_documento,
                    d.titulo,
                    d.ruta_archivo,
                    d.fecha_carga,
                    d.activo,
                    COALESCE(COUNT(f.id_fragmento), 0)::int AS total_fragmentos
                FROM DOCUMENTO d
                LEFT JOIN FRAGMENTO f ON d.id_documento = f.documento_id
                GROUP BY d.id_documento
                ORDER BY d.fecha_carga DESC;
                """
            )

        return [
            {
                "id_documento": r["id_documento"],
                "titulo": r["titulo"],
                "fecha": str(r["fecha_carga"])[:10] if r["fecha_carga"] else "Reciente",
                "activo": bool(r["activo"]),
                "total_fragmentos": int(r["total_fragmentos"]),
                "usos": 0
            }
            for r in rows
        ]
    except Exception as e:
        logger.error("Error en GET /api/admin/documentos: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al listar los documentos.")


@router.patch("/api/admin/documentos/{id_documento}/toggle")
async def toggle_estado_documento(
    id_documento: int,
    usuario: UsuarioToken = Depends(requiere_rol(ROL_ADMIN))
):
    try:
        return await _alternar_publicacion(id_documento, usuario.id_usuario)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en toggle_estado_documento: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al actualizar el documento.")

@router.patch("/{id_documento}/toggle")
async def toggle_documento(
    id_documento: int,
    usuario: UsuarioToken = Depends(requiere_rol(ROL_ADMIN))
):
    try:
        return await _alternar_publicacion(id_documento, usuario.id_usuario)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en toggle_documento: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al actualizar el documento.")