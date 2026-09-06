from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import obtener_db_pool

router = APIRouter(tags=["Gestión de Tickets"])

class TicketCreateRequest(BaseModel):
    titulo: str
    descripcion: str
    cliente_id: Optional[int] = 3
    conversacion_id: Optional[int] = None

@router.post("/api/tickets")
async def crear_ticket(body: TicketCreateRequest):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                if body.conversacion_id:
                    await conn.execute(
                        "UPDATE CONVERSACION SET escalada = TRUE WHERE id_conversacion = $1",
                        body.conversacion_id
                    )

                row = await conn.fetchrow(
                    """
                    INSERT INTO TICKET (titulo, descripcion, cliente, estado, conversacion_id)
                    VALUES ($1, $2, $3, 1, $4)
                    RETURNING id_ticket, fecha_creacion
                    """,
                    body.titulo, body.descripcion, body.cliente_id, body.conversacion_id
                )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'CREACION_TICKET', $2)
                    """,
                    body.cliente_id, f"Ticket #{row['id_ticket']} creado: '{body.titulo}'"
                )

        return {
            "message": "Ticket creado correctamente",
            "id_ticket": row["id_ticket"],
            "fecha_creacion": row["fecha_creacion"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/tickets/cliente/{cliente_id}")
async def listar_tickets_cliente(cliente_id: int):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    t.id_ticket,
                    t.titulo,
                    t.descripcion,
                    t.fecha_creacion,
                    e.estado,
                    t.calificacion
                FROM TICKET t
                INNER JOIN ESTADO_TICKET e ON t.estado = e.id_estado
                WHERE t.cliente = $1
                ORDER BY t.fecha_creacion DESC;
                """,
                cliente_id
            )
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/ejecutivo/tickets")
async def listar_tickets_ejecutivo():
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT 
                    t.id_ticket,
                    t.titulo,
                    t.descripcion,
                    t.fecha_creacion,
                    e.estado,
                    u.nombre || ' ' || u.apellido AS cliente_nombre,
                    u.correo AS cliente_correo
                FROM TICKET t
                INNER JOIN ESTADO_TICKET e ON t.estado = e.id_estado
                INNER JOIN USUARIO u ON t.cliente = u.id_usuario
                ORDER BY t.fecha_creacion DESC;
                """
            )
        return [dict(r) for r in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ActualizarEstadoTicket(BaseModel):
    id_estado: int

@router.patch("/api/ejecutivo/tickets/{ticket_id}/estado")
async def cambiar_estado_ticket(ticket_id: int, body: ActualizarEstadoTicket):
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE TICKET SET estado = $1 WHERE id_ticket = $2;",
                body.id_estado, ticket_id
            )
        return {"message": "Estado actualizado"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))