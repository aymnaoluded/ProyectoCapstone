import React, { useEffect, useState } from "react";
import {
  Inbox,
  Clock,
  User,
  Send,
  RefreshCw,
  Loader2,
  Filter,
  UserCheck,
  Star,
  MessageSquare,
} from "lucide-react";
import type { Usuario } from "../types";
import { cabecerasAuth, API_URL } from "../utils/api";

interface TicketItem {
  id_ticket: number;
  titulo: string;
  descripcion: string;
  fecha_creacion: string;
  calificacion: number | null;
  conversacion_id: number | null;
  id_estado: number;
  estado: string;
  cliente: {
    id: number;
    nombre: string;
    correo: string;
  };
  ejecutivo: {
    id: number;
    nombre: string;
  } | null;
}

interface MensajeTicket {
  id_mensaje: number;
  contenido: string;
  fecha: string;
  autor_id: number;
  autor_nombre: string;
  autor_rol: number;
}

interface PersonalAsignable {
  id_usuario: number;
  nombre: string;
  rol_nombre: string;
}

interface BandejaEjecutivoProps {
  usuario: Usuario;
  soloAsignados?: boolean;
  /** Vista de solo lectura: únicamente tickets con estado "Cerrado" (historial). */
  soloHistorial?: boolean;
}

const ID_ESTADO_PENDIENTE = 1;
const ID_ESTADO_EN_PROCESO = 2;
const ID_ESTADO_CERRADO = 5;

const ESTADOS_DISPONIBLES = [
  { id: 1, nombre: "Pendiente" },
  { id: 2, nombre: "En Proceso" },
  { id: 3, nombre: "En Espera" },
  { id: 4, nombre: "Resuelto" },
  { id: 5, nombre: "Cerrado" }
];

export const BandejaEjecutivo: React.FC<BandejaEjecutivoProps> = ({
  usuario,
  soloAsignados = false,
  soloHistorial = false,
}) => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<number | null>(null);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketItem | null>(null);
  const [mensajes, setMensajes] = useState<MensajeTicket[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [personalAsignable, setPersonalAsignable] = useState<PersonalAsignable[]>([]);

  const esAdmin = usuario.rol_nombre === "Administrador";

  // Muestra el mensaje de error del backend (por ejemplo, un 403 si el ticket ya no es de este ejecutivo)
  const mostrarErrorApi = async (res: Response, porDefecto: string) => {
    const errorData = await res.json().catch(() => null);
    alert(typeof errorData?.detail === "string" ? errorData.detail : porDefecto);
  };

  // Solo el Administrador puede asignar tickets a otras personas
  useEffect(() => {
    if (!esAdmin || soloHistorial) return;
    fetch(`${API_URL}/api/admin/ejecutivos`, { headers: cabecerasAuth() })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setPersonalAsignable(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Error al cargar ejecutivos:", err));
  }, [esAdmin, soloHistorial]);

  const cargarTickets = async () => {
    setCargando(true);
    try {
      // El backend identifica al usuario y su rol a partir del token (JWT)
      let url = `${API_URL}/api/tickets`;
      // En el historial no se aplica el filtro de estado de la cabecera: siempre son los cerrados
      if (filtroEstado && !soloHistorial) {
        url += `?estado_id=${filtroEstado}`;
      }
      const res = await fetch(url, { headers: cabecerasAuth() });
      if (res.ok) {
        let data = await res.json();
        if (Array.isArray(data)) {
          if (soloHistorial) {
            // Historial: solo tickets cerrados. El ejecutivo ve los suyos; el admin, todos.
            data = data.filter((t: any) => t.id_estado === ID_ESTADO_CERRADO);
            if (usuario.rol_nombre === "Ejecutivo") {
              data = data.filter((t: any) => t.ejecutivo && t.ejecutivo.id === usuario.id_usuario);
            }
          } else if (soloAsignados) {
            // Tickets Asignados: los que tiene este ejecutivo, sin contar los ya cerrados
            data = data.filter(
              (t: any) =>
                t.ejecutivo &&
                t.ejecutivo.id === usuario.id_usuario &&
                t.id_estado !== ID_ESTADO_CERRADO
            );
          } else if (usuario.rol_nombre === "Ejecutivo") {
            // Bandeja de Tickets (Ejecutivo): solo los que todavía no tienen ejecutivo asignado
            data = data.filter((t: any) => !t.ejecutivo && t.id_estado !== ID_ESTADO_CERRADO);
          } else {
            // Administrador en "Supervisión de Tickets": ve todos los activos, sin los cerrados
            data = data.filter((t: any) => t.id_estado !== ID_ESTADO_CERRADO);
          }
        }
        setTickets(data)
      }
    } catch (err) {
      console.error("Error al cargar la bandeja de tickets:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTickets();
  }, [filtroEstado, soloAsignados, soloHistorial]);

  const seleccionarTicket = async (ticket: TicketItem) => {
    setTicketSeleccionado(ticket);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticket.id_ticket}`, {
        headers: cabecerasAuth()
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data.mensajes);
      }
    } catch (err) {
      console.error("Error al cargar detalle del ticket:", err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleTomarTicket = async () => {
    if (!ticketSeleccionado) return;
    setActualizandoEstado(true);
    try {
      // id_estado 2 = En Proceso, asignándose a sí mismo
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id_estado: 2,
          ejecutivo_id: usuario.id_usuario
        })
      });

      if (res.ok) {
        const datosActualizados: TicketItem = {
          ...ticketSeleccionado,
          id_estado: 2,
          estado: "En Proceso",
          ejecutivo: {
            id: usuario.id_usuario,
            nombre: `${usuario.nombre} ${usuario.apellido}`
          }
        };
        setTicketSeleccionado(datosActualizados);
        setTickets((prev) =>
          soloAsignados || usuario.rol_nombre === "Administrador"
            // Tickets Asignados, o Administrador viendo todos: se actualiza en la lista
            ? prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t))
            // Bandeja de Tickets (Ejecutivo), que solo lista los sin asignar: al tomarlo, sale de la lista
            : prev.filter((t) => t.id_ticket !== ticketSeleccionado.id_ticket)
        );
      } else {
        // Por ejemplo, otro ejecutivo lo tomó antes: se avisa y se recarga la bandeja
        await mostrarErrorApi(res, "No se pudo tomar el ticket.");
        setTicketSeleccionado(null);
        cargarTickets();
      }
    } catch (err) {
      console.error("Error al tomar ticket:", err);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleCambiarEstado = async (nuevoEstadoId: number) => {
    if (!ticketSeleccionado || ticketSeleccionado.id_estado === nuevoEstadoId) return;
    setActualizandoEstado(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id_estado: nuevoEstadoId
        })
      });

      if (res.ok) {
        const estadoObj = ESTADOS_DISPONIBLES.find((e) => e.id === nuevoEstadoId);
        const datosActualizados: TicketItem = {
          ...ticketSeleccionado,
          id_estado: nuevoEstadoId,
          estado: estadoObj?.nombre || ticketSeleccionado.estado
        };
        setTicketSeleccionado(datosActualizados);
        setTickets((prev) =>
          prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t))
        );
      } else {
        await mostrarErrorApi(res, "No se pudo actualizar el estado del ticket.");
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleAsignar = async (ejecutivoId: number) => {
    if (!ticketSeleccionado || ticketSeleccionado.ejecutivo?.id === ejecutivoId) return;
    const persona = personalAsignable.find((p) => p.id_usuario === ejecutivoId);
    // Si estaba Pendiente pasa a En Proceso (ya tiene responsable); si no, se mantiene su estado
    const nuevoEstadoId =
      ticketSeleccionado.id_estado === ID_ESTADO_PENDIENTE ? ID_ESTADO_EN_PROCESO : ticketSeleccionado.id_estado;
    setActualizandoEstado(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          id_estado: nuevoEstadoId,
          ejecutivo_id: ejecutivoId
        })
      });

      if (res.ok) {
        const estadoObj = ESTADOS_DISPONIBLES.find((e) => e.id === nuevoEstadoId);
        const datosActualizados: TicketItem = {
          ...ticketSeleccionado,
          id_estado: nuevoEstadoId,
          estado: estadoObj?.nombre || ticketSeleccionado.estado,
          ejecutivo: { id: ejecutivoId, nombre: persona?.nombre || "Ejecutivo" }
        };
        setTicketSeleccionado(datosActualizados);
        setTickets((prev) =>
          prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t))
        );
      } else {
        await mostrarErrorApi(res, "No se pudo asignar el ticket.");
      }
    } catch (err) {
      console.error("Error al asignar ticket:", err);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSeleccionado || !nuevoMensaje.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/mensaje`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          contenido: nuevoMensaje.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMensajes((prev) => [
          ...prev,
          {
            id_mensaje: data.id_mensaje,
            contenido: nuevoMensaje.trim(),
            fecha: data.fecha,
            autor_id: usuario.id_usuario,
            autor_nombre: `${usuario.nombre} ${usuario.apellido}`,
            autor_rol: usuario.rol_id
          }
        ]);
        setNuevoMensaje("");
      } else {
        await mostrarErrorApi(res, "No se pudo enviar el mensaje.");
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
    } finally {
      setEnviando(false);
    }
  };

  const getBadgeEstado = (estado: string) => {
    switch (estado.toLowerCase()) {
      case "pendiente":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      case "en proceso":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "en espera":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "resuelto":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "cerrado":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-200";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Cabecera Superior */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {soloHistorial
              ? "Historial de Tickets"
              : soloAsignados
              ? "Tickets Asignados"
              : "Bandeja de Tickets"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {!soloHistorial && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-sm text-slate-600">
              <Filter size={13} className="text-slate-400" />
              <select
                value={filtroEstado || ""}
                onChange={(e) => setFiltroEstado(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="">Todos los estados</option>
                {ESTADOS_DISPONIBLES.filter((est) => est.id !== ID_ESTADO_CERRADO).map((est) => (
                  <option key={est.id} value={est.id}>
                    {est.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={cargarTickets}
            title="Recargar bandeja"
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={cargando ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Columna Izquierda: Listado de Tickets */}
        <div className="w-1/3 flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              {soloHistorial ? "Tickets Cerrados" : "Tickets Disponibles"} ({tickets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {cargando && tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
                <Loader2 className="animate-spin text-blue-600" size={20} />
                <p className="text-xs">Cargando bandeja de soporte...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <Inbox size={32} className="mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">
                  {soloHistorial ? "No hay tickets cerrados todavía" : "No hay tickets para mostrar"}
                </p>
                <p className="text-[11px] text-slate-400">
                  {soloHistorial
                    ? "Los tickets que se cierren aparecerán aquí como historial."
                    : "Los casos escalados por clientes o por baja confianza del bot se listarán aquí."}
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id_ticket}
                  onClick={() => seleccionarTicket(t)}
                  className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${
                    ticketSeleccionado?.id_ticket === t.id_ticket
                      ? "bg-blue-50/60 border-l-4 border-blue-600"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-bold text-slate-800 line-clamp-1">
                      #{t.id_ticket} - {t.titulo}
                    </span>
                    <span
                      className={`text-[12px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeEstado(
                        t.estado
                      )}`}
                    >
                      {t.estado}
                    </span>
                  </div>

                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{t.descripcion}</p>

                  <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={12} /> {t.cliente.nombre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {t.fecha_creacion}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle, Asignación y Chat con el Cliente */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          {ticketSeleccionado ? (
            <>
              {/* Encabezado y Barra de Acción del Ticket */}
              <div className="p-5 border-b border-slate-200 bg-white space-y-4 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  {/* min-w-0 + overflow-wrap: un texto largo sin espacios no empuja fuera de vista los controles */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-slate-900 [overflow-wrap:anywhere]">
                        #{ticketSeleccionado.id_ticket} - {ticketSeleccionado.titulo}
                      </h2>
                      <span
                        className={`text-[13px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeEstado(
                          ticketSeleccionado.estado
                        )}`}
                      >
                        {ticketSeleccionado.estado}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1.5 [overflow-wrap:anywhere]">{ticketSeleccionado.descripcion}</p>
                  </div>

                  {/* Acciones de Asignación / Estado (no disponibles en el historial: es solo lectura) */}
                  {!soloHistorial && (
                    <div className="flex items-center gap-2 shrink-0">
                      {/* El Administrador puede asignar el ticket a cualquier ejecutivo activo */}
                      {esAdmin && (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-500">Asignado a:</label>
                          <select
                            value={ticketSeleccionado.ejecutivo?.id ?? ""}
                            onChange={(e) => handleAsignar(Number(e.target.value))}
                            disabled={actualizandoEstado || personalAsignable.length === 0}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1
                            focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          >
                            <option value="" disabled>
                              Sin asignar
                            </option>
                            {personalAsignable.map((p) => (
                              <option key={p.id_usuario} value={p.id_usuario}>
                                {p.id_usuario === usuario.id_usuario ? `${p.nombre} (yo)` : p.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Sin responsable: el Ejecutivo lo toma (el Admin usa el selector). Con responsable: se cambia el estado */}
                      {!ticketSeleccionado.ejecutivo ? (
                        !esAdmin && (
                          <button
                            onClick={handleTomarTicket}
                            disabled={actualizandoEstado}
                            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all
                            shadow-xs disabled:opacity-50 cursor-pointer"
                          >
                            <UserCheck size={14} />
                            <span>Tomar Ticket</span>
                          </button>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-medium text-slate-500">Estado:</label>
                          <select
                            value={ticketSeleccionado.id_estado}
                            onChange={(e) => handleCambiarEstado(Number(e.target.value))}
                            // Un ticket cerrado solo lo puede reabrir el Administrador
                            disabled={actualizandoEstado || (!esAdmin && ticketSeleccionado.id_estado === ID_ESTADO_CERRADO)}
                            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 
                            focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          >
                            {ESTADOS_DISPONIBLES.map((est) => (
                              <option key={est.id} value={est.id}>
                                {est.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-4">
                    <span>
                      <strong>Cliente:</strong> {ticketSeleccionado.cliente.nombre} ({ticketSeleccionado.cliente.correo})
                    </span>
                    <span>·</span>
                    <span>
                      <strong>Asignado:</strong>{" "}
                      {ticketSeleccionado.ejecutivo ? ticketSeleccionado.ejecutivo.nombre : "Sin asignar"}
                    </span>
                  </div>

                  {ticketSeleccionado.calificacion && (
                    <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                      <Star size={12} className="text-amber-500 fill-amber-400" />
                      <span className="text-[11px] font-bold text-amber-700">
                        {ticketSeleccionado.calificacion}/5
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hilo de Respuestas */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
                {cargandoDetalle ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Loader2 className="animate-spin text-blue-600 mb-2" size={24} />
                    <span className="text-xs">Cargando conversación...</span>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 space-y-2">
                    <MessageSquare size={28} className="mx-auto text-slate-300" />
                    <p className="text-xs">No hay mensajes previos en este ticket.</p>
                    <p className="text-[11px] text-slate-400">
                      Toma el caso y envía tu primera respuesta al cliente.
                    </p>
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const esMio = m.autor_id === usuario.id_usuario;
                    return (
                      <div
                        key={m.id_mensaje}
                        className={`flex flex-col max-w-[80%] ${
                          esMio ? "ml-auto items-end" : "mr-auto items-start"
                        }`}
                      >
                        <span className="text-[12px] text-slate-400 mb-1 px-1">
                          {esMio ? "Tú" : m.autor_nombre} · {m.fecha}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed [overflow-wrap:anywhere] ${
                            esMio
                              ? "bg-blue-600 text-white rounded-br-xs shadow-xs"
                              : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs shadow-xs"
                          }`}
                        >
                          {m.contenido}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input para responder (oculto en el historial: es de solo lectura) */}
              {soloHistorial ? (
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                  Este ticket está cerrado. Se muestra en modo consulta.
                </div>
              ) : !esAdmin && ticketSeleccionado.ejecutivo?.id !== usuario.id_usuario ? (
                // El Ejecutivo solo responde los tickets asignados a él
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                  Toma el ticket para poder responder al cliente.
                </div>
              ) : (
                <form onSubmit={handleEnviarMensaje} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    placeholder="Escribe una respuesta para el cliente..."
                    maxLength={5000}
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    disabled={enviando || ticketSeleccionado.id_estado === 5}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 
                    disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={enviando || !nuevoMensaje.trim() || ticketSeleccionado.id_estado === 5}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors 
                    disabled:opacity-50 cursor-pointer"
                  >
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Responder</span>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <Inbox size={40} className="text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-600">Ningún ticket seleccionado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Selecciona un ticket de la columna izquierda para revisar el contexto, tomar el caso o dar respuesta al usuario.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
