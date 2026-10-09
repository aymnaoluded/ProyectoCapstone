import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from database import obtener_db_pool
from services import generar_embedding_consulta, responder_gemini
from .auth import get_usuario_actual, UsuarioToken

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["Chat y RAG"])

UMBRAL_ALTA_CONFIANZA = 0.80
UMBRAL_MEDIA_CONFIANZA = 0.60

ROLES_STAFF = ("Administrador", "Ejecutivo")

MSG_IA_NO_DISPONIBLE = (
    "El asistente de IA no está disponible en este momento. "
    "Puedes solicitar la asistencia de un ejecutivo para atender tu consulta."
)


async def _validar_dueno_conversacion(
    conn, id_conversacion: int, usuario: UsuarioToken, bloquear_si_escalada: bool = False
):
    conv = await conn.fetchrow(
        "SELECT id_conversacion, cliente_id, escalada FROM CONVERSACION WHERE id_conversacion = $1;",
        id_conversacion
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")
    if conv["cliente_id"] != usuario.id_usuario:
        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta conversación.")
    if bloquear_si_escalada and conv["escalada"]:
        raise HTTPException(
            status_code=409,
            detail="Esta conversación fue escalada a un ticket y ya no admite más mensajes. "
                   "Continúa el caso desde Mis Solicitudes."
        )
    return conv


async def _responder_sin_ia(conn, conversacion_id: int) -> "ChatResponse":
    """Respuesta controlada cuando la IA falla (cuota, conexión, etc.): se registra y se sugiere escalar."""
    await conn.execute(
        """
        INSERT INTO MENSAJE (conversacion_id, emisor, contenido, nivel_confianza, requiere_escalamiento)
        VALUES ($1, 'bot', $2, 0.000, TRUE)
        """,
        conversacion_id, MSG_IA_NO_DISPONIBLE
    )
    return ChatResponse(
        conversacion_id=conversacion_id,
        respuesta=MSG_IA_NO_DISPONIBLE,
        nivel_confianza="BAJA",
        score_maximo=0.0,
        escalar_ejecutivo=True,
        fuentes=[]
    )


@router.post("/nueva")
async def crear_nueva_conversacion(usuario: UsuarioToken = Depends(get_usuario_actual)):
    """Crea una nueva conversación limpia para el usuario autenticado o reutiliza una vacía sin mensajes"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Reutilizar si ya existe una conversación vacía sin mensajes para este usuario
                empty_conv = await conn.fetchrow(
                    """
                    SELECT c.id_conversacion, c.titulo, c.fecha_inicio
                    FROM CONVERSACION c
                    WHERE c.cliente_id = $1 
                      AND NOT EXISTS (SELECT 1 FROM MENSAJE m WHERE m.conversacion_id = c.id_conversacion)
                    ORDER BY c.id_conversacion DESC
                    LIMIT 1;
                    """,
                    usuario.id_usuario
                )
                if empty_conv:
                    return {
                        "id_conversacion": empty_conv["id_conversacion"],
                        "titulo": empty_conv["titulo"] or "Nueva conversación",
                        "fecha_inicio": empty_conv["fecha_inicio"].strftime("%Y-%m-%d %H:%M") if empty_conv["fecha_inicio"] else ""
                    }

                row = await conn.fetchrow(
                    """
                    INSERT INTO CONVERSACION (cliente_id, titulo)
                    VALUES ($1, 'Nueva conversación')
                    RETURNING id_conversacion, fecha_inicio, titulo;
                    """,
                    usuario.id_usuario
                )
                return {
                    "id_conversacion": row["id_conversacion"],
                    "titulo": row["titulo"],
                    "fecha_inicio": row["fecha_inicio"].strftime("%Y-%m-%d %H:%M") if row["fecha_inicio"] else ""
                }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en POST /api/chat/nueva: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al crear la conversación.")


class ChatRequest(BaseModel):
    mensaje: str
    conversacion_id: Optional[int] = None


class FuenteResponse(BaseModel):
    id_fragmento: int
    similitud: float
    extracto: str


class ChatResponse(BaseModel):
    conversacion_id: int
    respuesta: str
    nivel_confianza: str
    score_maximo: float
    escalar_ejecutivo: bool
    fuentes: List[FuenteResponse]


@router.post("", response_model=ChatResponse)
async def chat_rag(body: ChatRequest, usuario: UsuarioToken = Depends(get_usuario_actual)):
    if not body.mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    pool = obtener_db_pool()
    try:
        # Si el servicio de IA falla no se responde con 500: se guarda el mensaje
        # y se ofrece escalar a un ejecutivo.
        vector_str = None
        try:
            vector_pregunta = generar_embedding_consulta(body.mensaje)
            vector_str = f"[{','.join(map(str, vector_pregunta))}]"
        except Exception:
            logger.exception("Fallo al generar el embedding de la consulta")

        async with pool.acquire() as conn:
            async with conn.transaction():
                conversacion_id = body.conversacion_id
                msg_limpio = " ".join(body.mensaje.split())
                titulo_conversacion = (msg_limpio[:57] + "...") if len(msg_limpio) > 60 else msg_limpio

                if not conversacion_id:
                    conv_row = await conn.fetchrow(
                        "INSERT INTO CONVERSACION (cliente_id, titulo) VALUES ($1, $2) RETURNING id_conversacion",
                        usuario.id_usuario, titulo_conversacion
                    )
                    conversacion_id = conv_row["id_conversacion"]
                else:
                    await _validar_dueno_conversacion(
                        conn, conversacion_id, usuario, bloquear_si_escalada=True
                    )

                    await conn.execute(
                        """
                        UPDATE CONVERSACION 
                        SET titulo = $1 
                        WHERE id_conversacion = $2 
                          AND (titulo IS NULL OR titulo = 'Nueva conversación' OR titulo = '');
                        """,
                        titulo_conversacion, conversacion_id
                    )

                await conn.execute(
                    "INSERT INTO MENSAJE (conversacion_id, emisor, contenido) VALUES ($1, 'cliente', $2)",
                    conversacion_id, body.mensaje
                )

                if vector_str is None:
                    return await _responder_sin_ia(conn, conversacion_id)

                # Búsqueda semántica en pgvector filtrando solo fragmentos de documentos ACTIVOS
                rows = await conn.fetch(
                    """
                    SELECT 
                        f.id_fragmento,
                        f.contenido,
                        1 - (f.embedding <=> $1::vector) AS similitud
                    FROM FRAGMENTO f
                    INNER JOIN DOCUMENTO d ON f.documento_id = d.id_documento
                    WHERE COALESCE(d.activo, TRUE) = TRUE
                    ORDER BY f.embedding <=> $1::vector ASC
                    LIMIT 4;
                    """,
                    vector_str
                )

                if not rows:
                    msg_vacio = "Lo siento, no encontré información publicada en la base de conocimiento para atender tu solicitud."
                    await conn.execute(
                        """
                        INSERT INTO MENSAJE (conversacion_id, emisor, contenido, nivel_confianza, requiere_escalamiento)
                        VALUES ($1, 'bot', $2, 0.000, TRUE)
                        """,
                        conversacion_id, msg_vacio
                    )
                    return ChatResponse(
                        conversacion_id=conversacion_id,
                        respuesta=msg_vacio,
                        nivel_confianza="BAJA",
                        score_maximo=0.0,
                        escalar_ejecutivo=True,
                        fuentes=[]
                    )

                score_maximo = round(float(rows[0]["similitud"]), 3)
                mejor_fragmento_id = rows[0]["id_fragmento"]
                fuentes_data = [
                    FuenteResponse(
                        id_fragmento=r["id_fragmento"],
                        similitud=round(float(r["similitud"]), 3),
                        extracto=r["contenido"][:100] + "..."
                    )
                    for r in rows
                ]

                if score_maximo < UMBRAL_MEDIA_CONFIANZA:
                    texto_resp = "Lo siento, no encontré información suficiente en la base de conocimiento para responder a tu consulta."
                    await conn.execute(
                        """
                        INSERT INTO MENSAJE (conversacion_id, emisor, contenido, fragmento_id, nivel_confianza, requiere_escalamiento)
                        VALUES ($1, 'bot', $2, $3, $4, TRUE)
                        """,
                        conversacion_id, texto_resp, mejor_fragmento_id, score_maximo
                    )
                    return ChatResponse(
                        conversacion_id=conversacion_id,
                        respuesta=texto_resp,
                        nivel_confianza="BAJA",
                        score_maximo=score_maximo,
                        escalar_ejecutivo=True,
                        fuentes=[]
                    )

                contextos = [r["contenido"] for r in rows]
                try:
                    respuesta_ia = responder_gemini(body.mensaje, contextos)
                except Exception:
                    logger.exception("Fallo al generar la respuesta con Gemini")
                    return await _responder_sin_ia(conn, conversacion_id)

                if score_maximo < UMBRAL_ALTA_CONFIANZA:
                    texto_resp = (
                        f"{respuesta_ia}\n\n"
                        "*Nota: Esta respuesta proviene de coincidencias parciales. "
                        "Puedes solicitar la asistencia de un ejecutivo si lo requieres.*"
                    )
                    nivel = "MEDIA"
                    requiere_esc = True
                else:
                    texto_resp = respuesta_ia
                    nivel = "ALTA"
                    requiere_esc = False

                msg_bot = await conn.fetchrow(
                    """
                    INSERT INTO MENSAJE (conversacion_id, emisor, contenido, fragmento_id, nivel_confianza, requiere_escalamiento)
                    VALUES ($1, 'bot', $2, $3, $4, $5)
                    RETURNING id_mensaje
                    """,
                    conversacion_id, texto_resp, mejor_fragmento_id, score_maximo, requiere_esc
                )
                bot_id = msg_bot["id_mensaje"]

                for r in rows:
                    await conn.execute(
                        """
                        INSERT INTO mensaje_fragmento (mensaje_id, fragmento_id, score)
                        VALUES ($1, $2, $3)
                        ON CONFLICT DO NOTHING
                        """,
                        bot_id, r["id_fragmento"], round(float(r["similitud"]), 3)
                    )

                return ChatResponse(
                    conversacion_id=conversacion_id,
                    respuesta=texto_resp,
                    nivel_confianza=nivel,
                    score_maximo=score_maximo,
                    escalar_ejecutivo=requiere_esc,
                    fuentes=fuentes_data
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en POST /api/chat: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al procesar el mensaje.")


class FinalizarConversacionRequest(BaseModel):
    conversacion_id: int
    calificacion: Optional[int] = None


@router.post("/finalizar")
async def finalizar_conversacion(
    body: FinalizarConversacionRequest,
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Solo el dueño puede cerrar o calificar la conversación
                await _validar_dueno_conversacion(conn, body.conversacion_id, usuario)

                await conn.execute(
                    """
                    UPDATE CONVERSACION 
                    SET fecha_fin = COALESCE(fecha_fin, NOW()),
                        calificacion = COALESCE($1, calificacion)
                    WHERE id_conversacion = $2;
                    """,
                    body.calificacion, body.conversacion_id
                )
                if body.calificacion:
                    await conn.execute(
                        "UPDATE TICKET SET calificacion = $1 WHERE conversacion_id = $2;",
                        body.calificacion, body.conversacion_id
                    )

                # Registrar auditoría
                calif_detalle = f" con calificación de {body.calificacion} estrellas" if body.calificacion else ""
                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'FIN_CHAT_IA', $2);
                    """,
                    usuario.id_usuario,
                    f"Conversación #{body.conversacion_id} finalizada{calif_detalle}"
                )

        return {"message": "Conversación finalizada exitosamente."}
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en POST /api/chat/finalizar: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al finalizar la conversación.")


@router.get("/conversaciones")
async def listar_conversaciones(usuario: UsuarioToken = Depends(get_usuario_actual)):
    """Lista el historial de conversaciones previas con SupportIA del usuario autenticado"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    c.id_conversacion,
                    c.cliente_id,
                    c.fecha_inicio,
                    c.fecha_fin,
                    c.calificacion,
                    c.escalada,
                    c.titulo,
                    (
                        SELECT m.fecha 
                        FROM MENSAJE m 
                        WHERE m.conversacion_id = c.id_conversacion 
                        ORDER BY m.fecha DESC, m.id_mensaje DESC 
                        LIMIT 1
                    ) AS fecha_ultimo_mensaje,
                    (
                        SELECT m.contenido 
                        FROM MENSAJE m 
                        WHERE m.conversacion_id = c.id_conversacion AND m.emisor = 'cliente' 
                        ORDER BY m.fecha ASC, m.id_mensaje ASC 
                        LIMIT 1
                    ) AS primer_mensaje,
                    (
                        SELECT COUNT(*)::INT 
                        FROM MENSAJE m 
                        WHERE m.conversacion_id = c.id_conversacion
                    ) AS total_mensajes
                FROM CONVERSACION c
                WHERE c.cliente_id = $1
                  AND EXISTS (SELECT 1 FROM MENSAJE m WHERE m.conversacion_id = c.id_conversacion)
                ORDER BY COALESCE((
                    SELECT m.fecha 
                    FROM MENSAJE m 
                    WHERE m.conversacion_id = c.id_conversacion 
                    ORDER BY m.fecha DESC, m.id_mensaje DESC 
                    LIMIT 1
                ), c.fecha_inicio) DESC;
                """,
                usuario.id_usuario
            )

            return [
                {
                    "id_conversacion": r["id_conversacion"],
                    "fecha_inicio": r["fecha_inicio"].strftime("%Y-%m-%d %H:%M") if r["fecha_inicio"] else "",
                    "fecha_ultimo_mensaje": r["fecha_ultimo_mensaje"].strftime("%Y-%m-%d %H:%M") if r["fecha_ultimo_mensaje"] else (r["fecha_inicio"].strftime("%Y-%m-%d %H:%M") if r["fecha_inicio"] else ""),
                    "fecha_fin": r["fecha_fin"].strftime("%Y-%m-%d %H:%M") if r["fecha_fin"] else None,
                    "calificacion": r["calificacion"],
                    "escalada": bool(r["escalada"]),
                    "finalizada": bool(r["fecha_fin"] is not None or r["calificacion"] is not None),
                    "titulo": r["titulo"] or (r["primer_mensaje"][:57] + "..." if r["primer_mensaje"] and len(r["primer_mensaje"]) > 60 else (r["primer_mensaje"] or "Consulta con SupportAI")),
                    "primer_mensaje": r["primer_mensaje"] or "Consulta inicial con SupportAI",
                    "total_mensajes": r["total_mensajes"] or 0,
                }
                for r in rows
            ]
    except Exception as e:
        logger.error("Error en GET /api/chat/conversaciones: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al listar las conversaciones.")


@router.get("/conversaciones/{id_conversacion}")
async def obtener_detalle_conversacion(
    id_conversacion: int,
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    """Obtiene el detalle de una conversación de SupportIA y su hilo de mensajes.
    Lo puede ver su dueño y el personal (Ejecutivo/Administrador) en modo lectura."""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            conv = await conn.fetchrow(
                """
                SELECT 
                    c.id_conversacion,
                    c.cliente_id,
                    c.fecha_inicio,
                    c.fecha_fin,
                    c.calificacion,
                    c.escalada,
                    c.titulo,
                    CONCAT(u.nombre, ' ', u.apellido) AS cliente_nombre,
                    u.correo AS cliente_correo
                FROM CONVERSACION c
                LEFT JOIN USUARIO u ON c.cliente_id = u.id_usuario
                WHERE c.id_conversacion = $1;
                """,
                id_conversacion
            )

            if not conv:
                raise HTTPException(status_code=404, detail="Conversación no encontrada")

            if conv["cliente_id"] != usuario.id_usuario and usuario.rol not in ROLES_STAFF:
                raise HTTPException(status_code=403, detail="No tienes permiso sobre esta conversación.")

            mensajes = await conn.fetch(
                """
                SELECT 
                    id_mensaje,
                    emisor,
                    contenido,
                    fecha,
                    nivel_confianza,
                    requiere_escalamiento
                FROM MENSAJE
                WHERE conversacion_id = $1
                ORDER BY fecha ASC, id_mensaje ASC;
                """,
                id_conversacion
            )

            # Cargar fuentes asociadas a los mensajes del bot
            bot_msg_ids = [m["id_mensaje"] for m in mensajes if m["emisor"] == "bot"]
            fuentes_por_msg = {}
            if bot_msg_ids:
                fuentes_rows = await conn.fetch(
                    """
                    SELECT 
                        mf.mensaje_id,
                        mf.fragmento_id,
                        mf.score,
                        f.contenido
                    FROM mensaje_fragmento mf
                    INNER JOIN FRAGMENTO f ON mf.fragmento_id = f.id_fragmento
                    WHERE mf.mensaje_id = ANY($1::int[])
                    ORDER BY mf.score DESC;
                    """,
                    bot_msg_ids
                )
                for fr in fuentes_rows:
                    m_id = fr["mensaje_id"]
                    if m_id not in fuentes_por_msg:
                        fuentes_por_msg[m_id] = []
                    fuentes_por_msg[m_id].append({
                        "id_fragmento": fr["fragmento_id"],
                        "similitud": round(float(fr["score"]), 3),
                        "extracto": (fr["contenido"][:100] + "...") if fr["contenido"] else ""
                    })

            resultado_mensajes = []
            for m in mensajes:
                score_val = float(m["nivel_confianza"]) if m["nivel_confianza"] is not None else None
                nivel = None
                if score_val is not None and m["emisor"] == "bot":
                    if score_val >= UMBRAL_ALTA_CONFIANZA:
                        nivel = "ALTA"
                    elif score_val >= UMBRAL_MEDIA_CONFIANZA:
                        nivel = "MEDIA"
                    else:
                        nivel = "BAJA"

                resultado_mensajes.append({
                    "id": str(m["id_mensaje"]),
                    "emisor": "user" if m["emisor"] == "cliente" else "bot",
                    "texto": m["contenido"],
                    "hora": m["fecha"].strftime("%H:%M") if m["fecha"] else "",
                    "nivelConfianza": nivel,
                    "scoreMaximo": score_val,
                    "escalarEjecutivo": bool(m["requiere_escalamiento"]),
                    "fuentes": fuentes_por_msg.get(m["id_mensaje"], [])
                })

            return {
                "conversacion": {
                    "id_conversacion": conv["id_conversacion"],
                    "cliente_id": conv["cliente_id"],
                    "cliente_nombre": conv["cliente_nombre"],
                    "cliente_correo": conv["cliente_correo"],
                    "fecha_inicio": conv["fecha_inicio"].strftime("%Y-%m-%d %H:%M") if conv["fecha_inicio"] else "",
                    "fecha_fin": conv["fecha_fin"].strftime("%Y-%m-%d %H:%M") if conv["fecha_fin"] else None,
                    "calificacion": conv["calificacion"],
                    "escalada": bool(conv["escalada"]),
                    "finalizada": bool(conv["fecha_fin"] is not None or conv["calificacion"] is not None),
                    "titulo": conv["titulo"] or "Consulta con SupportAI"
                },
                "mensajes": resultado_mensajes
            }
    except HTTPException:
        raise
    except Exception as e:
        logger.error("Error en GET /api/chat/conversaciones/%s: %s", id_conversacion, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Ocurrió un error al obtener la conversación.")