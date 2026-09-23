from asyncio import timeouts
from asyncio import timeouts
import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel, EmailStr
from database import obtener_db_pool
from .auth import get_usuario_actual, requiere_rol, UsuarioToken
from security import hashear_password

try:
    from services import (
        extraer_texto_de_archivo,
        dividir_texto_en_fragmentos,
        generar_embeddings_gemini,
    )
except ImportError:
    from services import (
        extraer_texto as extraer_texto_de_archivo,
        fragmentar_texto as dividir_texto_en_fragmentos,
        generar_embedding as generar_embeddings_gemini,
    )

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Administracion y Métricas"])


# =====================
# Métricas y auditoría 
# =====================

@router.get("/metricas")
async def obtener_metricas(usuario: UsuarioToken = Depends(requiere_rol("Administrador"))):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            # 1. Conversaciones y tasa de escalamiento
            stats_conv = await conn.fetchrow(
                """
                SELECT 
                    COUNT(*)::INT AS total_conversaciones,
                    COUNT(*) FILTER (WHERE escalada = TRUE)::INT AS total_escaladas
                FROM CONVERSACION;
                """
            )
            total_conv = stats_conv["total_conversaciones"] or 0
            total_esc = stats_conv["total_escaladas"] or 0
            tasa_escalamiento = round((total_esc / total_conv * 100), 1) if total_conv > 0 else 0.0

            # 2. Desglose de confianza y respuestas del bot (RAG)
            stats_rag = await conn.fetchrow(
                """
                SELECT 
                    ROUND(COALESCE(AVG(nivel_confianza), 0.0)::NUMERIC, 2) AS confianza_promedio,
                    COUNT(*) FILTER (WHERE emisor = 'bot')::INT AS total_respuestas,
                    COUNT(*) FILTER (WHERE emisor = 'bot' AND nivel_confianza >= 0.80)::INT AS alta_confianza,
                    COUNT(*) FILTER (WHERE emisor = 'bot' AND nivel_confianza >= 0.60 AND nivel_confianza < 0.80)::INT AS media_confianza,
                    COUNT(*) FILTER (WHERE emisor = 'bot' AND (nivel_confianza < 0.60 OR nivel_confianza IS NULL))::INT AS baja_confianza
                FROM MENSAJE;
                """
            )

            # 3. Métricas de satisfacción del cliente (promedio de estrellas 1 a 5)
            stats_calif = await conn.fetchrow(
                """
                SELECT 
                    ROUND(COALESCE(AVG(calificacion), 0.0)::NUMERIC, 1) AS promedio_satisfaccion,
                    COUNT(calificacion)::INT AS total_evaluaciones
                FROM (
                    SELECT calificacion FROM TICKET WHERE calificacion IS NOT NULL
                    UNION ALL
                    SELECT c.calificacion 
                    FROM CONVERSACION c 
                    WHERE c.calificacion IS NOT NULL 
                      AND NOT EXISTS (SELECT 1 FROM TICKET t WHERE t.conversacion_id = c.id_conversacion AND t.calificacion IS NOT NULL)
                ) sub;
                """
            )

            # 4. Estado de la base de conocimiento
            docs_activos = await conn.fetchval(
                "SELECT COUNT(*)::INT FROM DOCUMENTO WHERE COALESCE(activo, TRUE) = TRUE;"
            )
            fragmentos_indexados = await conn.fetchval(
                """
                SELECT COUNT(f.id_fragmento)::INT 
                FROM FRAGMENTO f 
                INNER JOIN DOCUMENTO d ON f.documento_id = d.id_documento 
                WHERE COALESCE(d.activo, TRUE) = TRUE;
                """
            )

            # 5. Tickets agrupados por estado
            tickets_por_estado = await conn.fetch(
                """
                SELECT 
                    e.estado,
                    COUNT(t.id_ticket)::INT AS cantidad
                FROM ESTADO_TICKET e
                LEFT JOIN TICKET t ON e.id_estado = t.estado
                GROUP BY e.id_estado, e.estado
                ORDER BY e.id_estado ASC;
                """
            )

            return {
                "resumen": {
                    "total_conversaciones": total_conv,
                    "tasa_escalamiento": tasa_escalamiento,
                    "promedio_satisfaccion": float(stats_calif["promedio_satisfaccion"] or 0.0),
                    "total_evaluaciones": stats_calif["total_evaluaciones"] or 0,
                    "documentos_activos": docs_activos or 0,
                    "fragmentos_indexados": fragmentos_indexados or 0,
                },
                "rag": {
                    "confianza_promedio": float(stats_rag["confianza_promedio"] or 0.0),
                    "total_respuestas": stats_rag["total_respuestas"] or 0,
                    "alta_confianza": stats_rag["alta_confianza"] or 0,
                    "media_confianza": stats_rag["media_confianza"] or 0,
                    "baja_confianza": stats_rag["baja_confianza"] or 0,
                },
                "tickets_estado": [
                    {"estado": r["estado"], "cantidad": r["cantidad"]}
                    for r in tickets_por_estado
                ]
            }
    except Exception as e:
        logger.error("Error en GET /api/admin/metricas: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al obtener las métricas.")


@router.get("/auditoria")
async def obtener_auditoria(usuario: UsuarioToken = Depends(requiere_rol("Administrador"))):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    l.id_log,
                    u.nombre || ' ' || u.apellido AS usuario,
                    u.correo AS usuario_correo,
                    l.accion,
                    l.detalle,
                    l.fecha
                FROM log_auditoria l
                LEFT JOIN USUARIO u ON l.usuario_id = u.id_usuario
                ORDER BY l.fecha DESC
                LIMIT 100;
                """
            )

        return [
            {
                "id_log": r["id_log"],
                "usuario": r["usuario"] or "Sistema / Anónimo",
                "correo": r["usuario_correo"] or "N/A",
                "accion": r["accion"],
                "detalle": r["detalle"] or "",
                "fecha": str(r["fecha"])[:19] if r["fecha"] else "Sin fecha"
            }
            for r in rows
        ]
    except Exception as e:
        logger.error("Error en GET /api/admin/auditoria: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al obtener la auditoría.")


# ===================
# Gestión de usuarios
# ===================

@router.get("/usuarios")
async def listar_usuarios(usuario: UsuarioToken = Depends(requiere_rol("Administrador"))):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    u.id_usuario,
                    u.nombre,
                    u.apellido,
                    u.correo,
                    u.rol AS rol_id,
                    r.nombre AS rol_nombre,
                    u.ultima_conexion,
                    CASE 
                        WHEN u.ultima_conexion IS NOT NULL 
                             AND u.ultima_conexion >= (NOW() - INTERVAL '5 minutes') THEN TRUE
                        ELSE FALSE
                    END AS online
                FROM USUARIO u
                INNER JOIN ROL r ON u.rol = r.id_rol
                ORDER BY online DESC, u.id_usuario ASC;
                """
            )

        resultado = []
        for r in rows:
            conexion_val = r["ultima_conexion"]
            conexion_str = str(conexion_val)[:19] if conexion_val else "Nunca"

            resultado.append({
                "id_usuario": r["id_usuario"],
                "nombre": f"{r['nombre']} {r['apellido']}",
                "correo": r["correo"],
                "rol_id": r["rol_id"],
                "rol_nombre": r["rol_nombre"],
                "fecha_registro": "Activo",
                "ultima_conexion": conexion_str,
                "online": bool(r["online"])
            })

        return resultado
    except Exception as e:
        logger.error("Error en GET /api/admin/usuarios: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al listar los usuarios.")


class CrearUsuarioRequest(BaseModel):
    nombre: str
    apellido: str
    correo: EmailStr
    password: str
    rol: int


@router.post("/usuarios", status_code=201)
async def crear_usuario(
    body: CrearUsuarioRequest,
    usuario: UsuarioToken = Depends(requiere_rol("Administrador"))
):
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 8 caracteres.")

    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            existente = await conn.fetchval(
                "SELECT id_usuario FROM USUARIO WHERE correo = $1;",
                body.correo.strip().lower()
            )
            if existente:
                raise HTTPException(status_code=409, detail="Ya existe un usuario con ese correo.")

            password_hash = hashear_password(body.password)

            async with conn.transaction():
                nuevo = await conn.fetchrow(
                    """
                    INSERT INTO USUARIO (nombre, apellido, correo, password, rol)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id_usuario, nombre, apellido, correo, rol;
                    """,
                    body.nombre, body.apellido, body.correo.strip().lower(), password_hash, body.rol
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'CREATE_USUARIO', $2);
                    """,
                    usuario.id_usuario,
                    f"Usuario creado: {nuevo['correo']} (id {nuevo['id_usuario']})"
                )

            return dict(nuevo)
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en POST /api/admin/usuarios: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al crear el usuario.")


# ============================================================
# Presencia en tiempo real - cualquier usuario autenticado
# ============================================================

@router.post("/usuarios/heartbeat")
async def heartbeat_usuario(usuario: UsuarioToken = Depends(get_usuario_actual)):
    """Actualiza el timestamp para mantener al usuario logueado en estado Online."""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE USUARIO SET ultima_conexion = NOW() WHERE id_usuario = $1;",
                usuario.id_usuario
            )
        return {"status": "ok"}
    except Exception as e:
        logger.error("Error en heartbeat: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al actualizar la presencia.")


@router.post("/usuarios/desconectar")
async def desconectar_usuario(usuario: UsuarioToken = Depends(get_usuario_actual)):
    """Limpia el estado al cerrar sesión y registra el evento de LOGOUT en auditoría."""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    UPDATE USUARIO 
                    SET ultima_conexion = NOW() - INTERVAL '10 minutes' 
                    WHERE id_usuario = $1;
                    """,
                    usuario.id_usuario
                )
                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'LOGOUT', 'Cierre de sesión voluntario');
                    """,
                    usuario.id_usuario
                )
        return {"status": "desconectado"}
    except Exception as e:
        logger.error("Error en desconectar_usuario: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al cerrar la sesión.")

# ==================================
# Gestión de la base de conocimiento
# ==================================

@router.patch("/documentos/{id_documento}/toggle")
async def toggle_estado_documentos(
    id_documento: int,
    usuario: UsuarioToken = Depends(requiere_rol("Administrador"))
):
    """Alterna el estado publicado/borrador de un documento (RN-01) y lo audita."""
    pool = obtener_db_pool()
    try:
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
                    raise HTTPException(status_code=404, detail="Documento no encontrado.")

                nuevo_estado = "Publicado" if doc["activo"] else "Despublicado"

                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'TOGGLE_DOCUMENTO', $2);
                    """,
                    usuario.id_usuario,
                    f"Documento '{doc['titulo']}' marcado como {nuevo_estado}"
                )

                return {
                    "id_documento": doc["id_documento"],
                    "titulo": doc["titulo"],
                    "activo": doc["activo"]
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en toggle_estado_documento: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al actualizar el documento.")


@router.put("/documentos/{id_documento}")
@router.put("/documentos/{id_documento}")
async def actualizar_documento(
    id_documento: int,
    titulo: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    usuario: UsuarioToken = Depends(requiere_rol("Administrador"))
):
    """
    Actualiza el título y opcionalmente reemplaza el archivo físico y regenera fragmentos RAG.
    Sincronizado exactamente con las columnas: id_documento, titulo, ruta_archivo, fecha_carga, admin_id, activo.
    """
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            # 1. Verificar existencia con las columnas reales
            doc_existente = await conn.fetchrow(
                "SELECT id_documento, titulo, ruta_archivo FROM DOCUMENTO WHERE id_documento = $1;",
                id_documento
            )
            if not doc_existente:
                raise HTTPException(status_code=404, detail="Documento no encontrado.")

            nuevo_titulo = titulo.strip() if titulo else doc_existente["titulo"]

            # ============================================================
            # Caso 1: Solo cambio de título (sin reindexación)
            # ============================================================
            if not archivo:
                async with conn.transaction():
                    await conn.execute(
                        "UPDATE DOCUMENTO SET titulo = $1 WHERE id_documento = $2;",
                        nuevo_titulo, id_documento
                    )
                    await conn.execute(
                        """
                        INSERT INTO log_auditoria (usuario_id, accion, detalle)
                        VALUES ($1, 'UPDATE_DOCUMENTO', $2);
                        """,
                        usuario.id_usuario,
                        f"Título del documento #{id_documento} actualizado a '{nuevo_titulo}'"
                    )

                return {
                    "status": "ok",
                    "mensaje": "Título actualizado con éxito.",
                    "reindexado": False,
                    "titulo": nuevo_titulo
                }

            # ============================================================
            # Caso 2: Reemplazo de archivo y reindexación vectorial RAG
            # ============================================================
            nombre_original = archivo.filename or "documento"
            extension = nombre_original.split(".")[-1].lower()
            if extension not in ["pdf", "docx", "txt"]:
                raise HTTPException(
                    status_code=400,
                    detail="Formato no admitido. Debe ser archivo PDF, DOCX o TXT."
                )

            contenido_bytes = await archivo.read()
            if len(contenido_bytes) == 0:
                raise HTTPException(status_code=400, detail="El archivo adjunto se encuentra vacío.")

            # Guardar el archivo físicamente en la carpeta uploads como en tus registros
            os.makedirs("uploads", exist_ok=True)
            # pyrefly: ignore [unknown-name]
            timestamp_prefijo = int(time.time() * 1000)
            nombre_guardado = f"{timestamp_prefijo}_{nombre_original.replace(' ', '_')}"
            ruta_disco = os.path.join("uploads", nombre_guardado)
            
            with open(ruta_disco, "wb") as f:
                f.write(contenido_bytes)

            ruta_bd = f"/uploads/{nombre_guardado}"

            # Extraer texto y generar embeddings con Gemini
            # pyrefly: ignore [not-async]
            texto = await extraer_texto_de_archivo(contenido_bytes, extension)
            if not texto or not texto.strip():
                raise HTTPException(
                    status_code=400,
                    detail="No fue posible extraer texto legible del documento seleccionado."
                )

            chunks = dividir_texto_en_fragmentos(texto)
            if not chunks:
                raise HTTPException(status_code=400, detail="No se obtuvieron fragmentos de texto válidos.")

            # pyrefly: ignore [not-async]
            embeddings = await generar_embeddings_gemini(chunks)

            # Transacción atómica en PostgreSQL
            async with conn.transaction():
                # 1. Purgar vectores anteriores
                await conn.execute(
                    "DELETE FROM FRAGMENTO WHERE documento_id = $1;",
                    id_documento
                )

                # 2. Insertar los nuevos fragmentos en pgvector
                for chunk, vector in zip(chunks, embeddings):
                    vector_str = f"[{','.join(map(str, vector))}]"
                    await conn.execute(
                        """
                        INSERT INTO FRAGMENTO (documento_id, contenido, embedding)
                        VALUES ($1, $2, $3::vector);
                        """,
                        id_documento, chunk, vector_str
                    )

                # 3. Actualizar la tabla DOCUMENTO usando las columnas exactas de tu BDD
                await conn.execute(
                    """
                    UPDATE DOCUMENTO 
                    SET titulo = $1,
                        ruta_archivo = $2,
                        fecha_carga = NOW()
                    WHERE id_documento = $3;
                    """,
                    nuevo_titulo, ruta_bd, id_documento
                )

                # 4. Registrar trazabilidad
                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'REINDEX_DOCUMENTO', $2);
                    """,
                    usuario.id_usuario,
                    f"Documento #{id_documento} reindexado con '{nombre_original}' ({len(chunks)} fragmentos)"
                )

            return {
                "status": "ok",
                "mensaje": "Documento y vectores RAG actualizados con éxito.",
                "reindexado": True,
                "fragmentos_totales": len(chunks),
                "titulo": nuevo_titulo
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en PUT /documentos/%s: %s", id_documento, e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Ocurrió un error al actualizar el documento: {str(e)}")