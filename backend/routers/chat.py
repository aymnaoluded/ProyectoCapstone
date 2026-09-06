from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import obtener_db_pool
from services import generar_embedding_consulta, responder_gemini

router = APIRouter(prefix="/api/chat", tags=["Chat y RAG"])

UMBRAL_ALTA_CONFIANZA = 0.80
UMBRAL_MEDIA_CONFIANZA = 0.60

class ChatRequest(BaseModel):
    mensaje: str
    cliente_id: Optional[int] = 3
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
async def chat_rag(body: ChatRequest):
    if not body.mensaje.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    pool = obtener_db_pool()
    try:
        vector_pregunta = generar_embedding_consulta(body.mensaje)
        vector_str = f"[{','.join(map(str, vector_pregunta))}]"

        async with pool.acquire() as conn:
            async with conn.transaction():
                conversacion_id = body.conversacion_id
                if not conversacion_id:
                    conv_row = await conn.fetchrow(
                        "INSERT INTO CONVERSACION (cliente_id) VALUES ($1) RETURNING id_conversacion",
                        body.cliente_id
                    )
                    conversacion_id = conv_row["id_conversacion"]

                await conn.execute(
                    "INSERT INTO MENSAJE (conversacion_id, emisor, contenido) VALUES ($1, 'cliente', $2)",
                    conversacion_id, body.mensaje
                )

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
                respuesta_ia = responder_gemini(body.mensaje, contextos)

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
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class FinalizarConversacionRequest(BaseModel):
    conversacion_id: int
    calificacion: Optional[int] = None

@router.post("/finalizar")
async def finalizar_conversacion(body: FinalizarConversacionRequest):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    "UPDATE CONVERSACION SET fecha_fin = NOW() WHERE id_conversacion = $1;",
                    body.conversacion_id
                )
                if body.calificacion:
                    await conn.execute(
                        "UPDATE TICKET SET calificacion = $1 WHERE conversacion_id = $2;",
                        body.calificacion, body.conversacion_id
                    )
        return {"message": "Conversación finalizada exitosamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))