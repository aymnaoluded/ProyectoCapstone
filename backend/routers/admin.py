from fastapi import APIRouter, HTTPException, Query
from database import obtener_db_pool
from pydantic import BaseModel
from typing import Optional
import traceback

router = APIRouter(prefix="/api/admin", tags=["Administracion y Métricas"])

@router.get("/metricas")
async def obtener_metricas():
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
                FROM TICKET
                WHERE calificacion IS NOT NULL;
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
                    {
                        "estado": r["estado"],
                        "cantidad": r["cantidad"]
                    }
                    for r in tickets_por_estado
                ]
            }
    except Exception as e:
        print("\n" + "=" * 50)
        print(">>> ERROR EN GET /api/admin/metricas:")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/auditoria")
async def obtener_auditoria():
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/usuarios")
async def listar_usuarios():
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
                    CASE 
                        WHEN u.rol = 1 THEN 'Administrador'
                        WHEN u.rol = 2 THEN 'Ejecutivo'
                        WHEN u.rol = 3 THEN 'Cliente'
                        ELSE 'Desconocido'
                    END AS rol_nombre,
                    u.ultima_conexion,
                    CASE 
                        WHEN u.ultima_conexion IS NOT NULL 
                             AND u.ultima_conexion >= (NOW() - INTERVAL '5 minutes') THEN TRUE
                        ELSE FALSE
                    END AS online
                FROM USUARIO u
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
        print("\n" + "=" * 50)
        print(">>> ERROR EN GET /api/admin/usuarios:")
        traceback.print_exc()
        print("=" * 50 + "\n")
        raise HTTPException(status_code=500, detail=str(e))

class HeartbeatRequest(BaseModel):
    id_usuario: int

@router.post("/usuarios/heartbeat")
async def heartbeat_usuario(body: HeartbeatRequest):
    """Actualiza el timestamp para mantener el usuario en estado Online"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE USUARIO SET ultima_conexion = NOW() WHERE id_usuario = $1;",
                body.id_usuario
            )
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/usuarios/desconectar")
async def desconectar_usuario(body: HeartbeatRequest):
    """Limpia el estado al cerrar sesión y registra el evento de LOGOUT en auditoría"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # 1. Ajustar última conexión para marcar desconectado de inmediato
                await conn.execute(
                    """
                    UPDATE USUARIO 
                    SET ultima_conexion = NOW() - INTERVAL '10 minutes' 
                    WHERE id_usuario = $1;
                    """,
                    body.id_usuario
                )

                # 2. Registrar evento en log_auditoria
                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'LOGOUT', 'Cierre de sesión voluntario');
                    """,
                    body.id_usuario
                )

        return {"status": "desconectado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/documentos/{id_documento}/toggle")
async def toggle_estado_documento(id_documento: int, usuario_id: Optional[int] = Query(None)):
    """Alterna el estado publicado/borrador de un documento y lo audita"""
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
                    raise HTTPException(status_code=404, detail="Documento no encontrado")

                nuevo_estado = "Publicado" if doc["activo"] else "Despublicado"

                if usuario_id:
                    await conn.execute(
                        """
                        INSERT INTO log_auditoria (usuario_id, accion, detalle)
                        VALUES ($1, 'TOGGLE_DOCUMENTO', $2);
                        """,
                        usuario_id,
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
        raise HTTPException(status_code=500, detail=str(e))