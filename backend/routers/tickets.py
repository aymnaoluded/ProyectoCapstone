from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from database import obtener_db_pool
from .auth import get_usuario_actual, requiere_rol, UsuarioToken

router = APIRouter(prefix="/api/tickets", tags=["Gestión de Tickets"])

ROL_ADMIN = "Administrador"
ROL_EJECUTIVO = "Ejecutivo"
ROL_CLIENTE = "Cliente"
ROLES_STAFF = (ROL_ADMIN, ROL_EJECUTIVO)


class CrearTicketRequest(BaseModel):
    titulo: str
    descripcion: str
    conversacion_id: Optional[int] = None


class ActualizarEstadoTicketRequest(BaseModel):
    id_estado: int
    ejecutivo_id: Optional[int] = None


class ResponderTicketRequest(BaseModel):
    contenido: str


def _validar_acceso_ticket(usuario: UsuarioToken, cliente_id_ticket: int) -> None:
    """Staff accede a todo; un cliente solo a sus propios tickets."""
    if usuario.rol in ROLES_STAFF:
        return
    if usuario.rol == ROL_CLIENTE and usuario.id_usuario == cliente_id_ticket:
        return
    raise HTTPException(status_code=403, detail="No tienes permiso para acceder a este ticket.")


@router.get("")
async def listar_tickets(
    estado_id: Optional[int] = Query(None),
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    """Lista los tickets según el rol del usuario autenticado y los filtros aplicados"""
    if usuario.rol != ROL_CLIENTE and usuario.rol not in ROLES_STAFF:
        raise HTTPException(status_code=403, detail="No tienes permiso para acceder a este recurso.")

    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            query = """
                SELECT 
                    t.id_ticket,
                    t.titulo,
                    t.descripcion,
                    t.fecha_creacion,
                    t.calificacion,
                    t.conversacion_id,
                    e.id_estado,
                    e.estado AS estado_nombre,
                    c.id_usuario AS cliente_id,
                    CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre,
                    c.correo AS cliente_correo,
                    ej.id_usuario AS ejecutivo_id,
                    CONCAT(ej.nombre, ' ', ej.apellido) AS ejecutivo_nombre
                FROM TICKET t
                INNER JOIN ESTADO_TICKET e ON t.estado = e.id_estado
                INNER JOIN USUARIO c ON t.cliente = c.id_usuario
                LEFT JOIN USUARIO ej ON t.ejecutivo_asignado = ej.id_usuario
                WHERE 1=1
            """
            params = []

            # Un cliente solo ve sus tickets (el id sale del JWT, no de la petición)
            if usuario.rol == ROL_CLIENTE:
                params.append(usuario.id_usuario)
                query += f" AND t.cliente = ${len(params)}"

            # Filtro opcional por estado
            if estado_id:
                params.append(estado_id)
                query += f" AND t.estado = ${len(params)}"

            query += " ORDER BY t.fecha_creacion DESC;"
            rows = await conn.fetch(query, *params)

            return [
                {
                    "id_ticket": r["id_ticket"],
                    "titulo": r["titulo"],
                    "descripcion": r["descripcion"],
                    "fecha_creacion": r["fecha_creacion"].strftime("%Y-%m-%d %H:%M"),
                    "calificacion": r["calificacion"],
                    "conversacion_id": r["conversacion_id"],
                    "id_estado": r["id_estado"],
                    "estado": r["estado_nombre"],
                    "cliente": {
                        "id": r["cliente_id"],
                        "nombre": r["cliente_nombre"],
                        "correo": r["cliente_correo"]
                    },
                    "ejecutivo": {
                        "id": r["ejecutivo_id"],
                        "nombre": r["ejecutivo_nombre"]
                    } if r["ejecutivo_id"] else None
                }
                for r in rows
            ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{id_ticket}")
async def obtener_detalle_ticket(
    id_ticket: int,
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    """Obtiene el detalle de un ticket con su hilo de mensajes"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            ticket = await conn.fetchrow(
                """
                SELECT 
                    t.id_ticket,
                    t.titulo,
                    t.descripcion,
                    t.fecha_creacion,
                    t.calificacion,
                    t.conversacion_id,
                    e.id_estado,
                    e.estado AS estado_nombre,
                    c.id_usuario AS cliente_id,
                    CONCAT(c.nombre, ' ', c.apellido) AS cliente_nombre,
                    c.correo AS cliente_correo,
                    ej.id_usuario AS ejecutivo_id,
                    CONCAT(ej.nombre, ' ', ej.apellido) AS ejecutivo_nombre
                FROM TICKET t
                INNER JOIN ESTADO_TICKET e ON t.estado = e.id_estado
                INNER JOIN USUARIO c ON t.cliente = c.id_usuario
                LEFT JOIN USUARIO ej ON t.ejecutivo_asignado = ej.id_usuario
                WHERE t.id_ticket = $1;
                """,
                id_ticket
            )
            if not ticket:
                raise HTTPException(status_code=404, detail="Ticket no encontrado")

            _validar_acceso_ticket(usuario, ticket["cliente_id"])

            mensajes = await conn.fetch(
                """
                SELECT 
                    tm.id_ticket_mensaje,
                    tm.contenido,
                    tm.fecha,
                    u.id_usuario,
                    CONCAT(u.nombre, ' ', u.apellido) AS autor_nombre,
                    u.rol AS autor_rol
                FROM ticket_mensaje tm
                INNER JOIN USUARIO u ON tm.autor_id = u.id_usuario
                WHERE tm.ticket_id = $1
                ORDER BY tm.fecha ASC;
                """,
                id_ticket
            )

            return {
                "ticket": {
                    "id_ticket": ticket["id_ticket"],
                    "titulo": ticket["titulo"],
                    "descripcion": ticket["descripcion"],
                    "fecha_creacion": ticket["fecha_creacion"].strftime("%Y-%m-%d %H:%M"),
                    "calificacion": ticket["calificacion"],
                    "id_estado": ticket["id_estado"],
                    "estado": ticket["estado_nombre"],
                    "cliente": {
                        "id": ticket["cliente_id"],
                        "nombre": ticket["cliente_nombre"],
                        "correo": ticket["cliente_correo"]
                    },
                    "ejecutivo": {
                        "id": ticket["ejecutivo_id"],
                        "nombre": ticket["ejecutivo_nombre"]
                    } if ticket["ejecutivo_id"] else None
                },
                "mensajes": [
                    {
                        "id_mensaje": m["id_ticket_mensaje"],
                        "contenido": m["contenido"],
                        "fecha": m["fecha"].strftime("%Y-%m-%d %H:%M"),
                        "autor_id": m["id_usuario"],
                        "autor_nombre": m["autor_nombre"],
                        "autor_rol": m["autor_rol"]
                    }
                    for m in mensajes
                ]
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("")
async def crear_ticket(
    body: CrearTicketRequest,
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    """Crea un nuevo ticket a nombre del usuario autenticado y registra la auditoría"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                # Si el ticket nace de una conversación, debe ser del propio usuario
                if body.conversacion_id:
                    dueno = await conn.fetchrow(
                        "SELECT cliente_id FROM CONVERSACION WHERE id_conversacion = $1;",
                        body.conversacion_id
                    )
                    if not dueno:
                        raise HTTPException(status_code=404, detail="Conversación no encontrada")
                    if dueno["cliente_id"] != usuario.id_usuario:
                        raise HTTPException(status_code=403, detail="No tienes permiso sobre esta conversación.")

                # 1 = Pendiente
                ticket_row = await conn.fetchrow(
                    """
                    INSERT INTO TICKET (titulo, descripcion, cliente, estado, conversacion_id)
                    VALUES ($1, $2, $3, 1, $4)
                    RETURNING id_ticket, titulo;
                    """,
                    body.titulo, body.descripcion, usuario.id_usuario, body.conversacion_id
                )

                if body.conversacion_id:
                    await conn.execute(
                        "UPDATE CONVERSACION SET escalada = TRUE WHERE id_conversacion = $1;",
                        body.conversacion_id
                    )

                # Auditoría
                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'CREACION_TICKET', $2);
                    """,
                    usuario.id_usuario, f"Ticket #{ticket_row['id_ticket']} creado: '{ticket_row['titulo']}'"
                )

                return {"id_ticket": ticket_row["id_ticket"], "mensaje": "Ticket creado exitosamente"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{id_ticket}/estado")
async def actualizar_estado_ticket(
    id_ticket: int,
    body: ActualizarEstadoTicketRequest,
    usuario: UsuarioToken = Depends(requiere_rol(ROL_EJECUTIVO, ROL_ADMIN))
):
    """Actualiza el estado del ticket (solo Ejecutivos y Administradores), asigna ejecutivo si corresponde y audita"""
    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                existe = await conn.fetchrow(
                    "SELECT 1 FROM TICKET WHERE id_ticket = $1;",
                    id_ticket
                )
                if not existe:
                    raise HTTPException(status_code=404, detail="Ticket no encontrado")

                estado_row = await conn.fetchrow(
                    "SELECT estado FROM ESTADO_TICKET WHERE id_estado = $1;",
                    body.id_estado
                )
                if not estado_row:
                    raise HTTPException(status_code=400, detail="Estado inválido")

                if body.ejecutivo_id:
                    await conn.execute(
                        """
                        UPDATE TICKET 
                        SET estado = $1, ejecutivo_asignado = $2 
                        WHERE id_ticket = $3;
                        """,
                        body.id_estado, body.ejecutivo_id, id_ticket
                    )
                else:
                    await conn.execute(
                        """
                        UPDATE TICKET 
                        SET estado = $1 
                        WHERE id_ticket = $2;
                        """,
                        body.id_estado, id_ticket
                    )

                await conn.execute(
                    """
                    INSERT INTO log_auditoria (usuario_id, accion, detalle)
                    VALUES ($1, 'CAMBIO_ESTADO_TICKET', $2);
                    """,
                    usuario.id_usuario,
                    f"Ticket #{id_ticket} cambió a estado '{estado_row['estado']}'"
                )

                return {"status": "actualizado", "nuevo_estado": estado_row["estado"]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{id_ticket}/mensaje")
async def responder_ticket(
    id_ticket: int,
    body: ResponderTicketRequest,
    usuario: UsuarioToken = Depends(get_usuario_actual)
):
    """Agrega un mensaje al hilo de discusión del ticket"""
    if not body.contenido.strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    pool = obtener_db_pool()
    try:
        async with pool.acquire() as conn:
            async with conn.transaction():
                ticket = await conn.fetchrow(
                    "SELECT cliente FROM TICKET WHERE id_ticket = $1;",
                    id_ticket
                )
                if not ticket:
                    raise HTTPException(status_code=404, detail="Ticket no encontrado")

                # Un cliente solo puede responder en sus propios tickets
                _validar_acceso_ticket(usuario, ticket["cliente"])

                row = await conn.fetchrow(
                    """
                    INSERT INTO ticket_mensaje (ticket_id, autor_id, contenido)
                    VALUES ($1, $2, $3)
                    RETURNING id_ticket_mensaje, fecha;
                    """,
                    id_ticket, usuario.id_usuario, body.contenido
                )
                return {
                    "id_mensaje": row["id_ticket_mensaje"],
                    "fecha": row["fecha"].strftime("%Y-%m-%d %H:%M")
                }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))