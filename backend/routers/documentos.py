import os
import time
import traceback
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from database import obtener_db_pool
from services import (
    extraer_texto,
    fragmentar_texto,
    generar_embedding_documento,
)

router = APIRouter(tags=["Documentos y Base de Conocimiento"])

@router.post("/api/documentos")
async def subir_documento(
    titulo: str = Form(...),
    admin_id: int = Form(...),
    archivo: UploadFile = File(...)
):
    pool = obtener_db_pool()
    try:
        contenido_bytes = await archivo.read()
        os.makedirs("uploads", exist_ok=True)
        file_name = f"{int(time.time())}_{archivo.filename.replace(' ', '_')}"
        file_path = os.path.join("uploads", file_name)
        with open(file_path, "wb") as f:
            f.write(contenido_bytes)

        ruta_archivo = f"/uploads/{file_name}"
        texto_completo = extraer_texto(contenido_bytes, archivo.content_type)
        fragmentos = fragmentar_texto(texto_completo)

        if not fragmentos:
            raise HTTPException(status_code=400, detail="El documento no contiene texto extraíble.")

        async with pool.acquire() as conn:
            async with conn.transaction():
                doc_row = await conn.fetchrow(
                    """
                    INSERT INTO DOCUMENTO (titulo, ruta_archivo, admin_id, activo)
                    VALUES ($1, $2, $3, TRUE)
                    RETURNING id_documento
                    """,
                    titulo, ruta_archivo, admin_id
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
                    admin_id, f"Documento '{titulo}' indexado con {len(fragmentos)} fragmentos."
                )

        return {
            "message": "Documento indexado con éxito",
            "documento_id": documento_id,
            "total_fragmentos": len(fragmentos)
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/admin/conocimiento/stats")
async def obtener_stats_conocimiento():
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
async def listar_documentos():
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/api/admin/documentos/{id_documento}/toggle")
async def toggle_estado_documento(id_documento: int):
    pool = obtener_db_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            UPDATE DOCUMENTO 
            SET activo = NOT activo 
            WHERE id_documento = $1 
            RETURNING activo;
            """,
            id_documento
        )
    return {"id_documento": id_documento, "activo": row["activo"]}

@router.patch("/{id_documento}/toggle")
async def toggle_documento(id_documento: int, usuario_id: int):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
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

            # Auditoría
            await conn.execute(
                """
                INSERT INTO log_auditoria (usuario_id, accion, detalle)
                VALUES ($1, 'TOGGLE_DOCUMENTO', $2);
                """,
                usuario_id, f"Documento '{doc['titulo']}' marcado como {nuevo_estado}"
            )

            return {"id_documento": doc["id_documento"], "activo": doc["activo"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))