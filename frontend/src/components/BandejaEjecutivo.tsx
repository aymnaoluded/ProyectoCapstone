import React, { useEffect, useState } from "react";
import {
  Inbox,
  Clock,
  User,
  Send,
  RefreshCw,
  Loader2,
  ChevronRight,
  Filter,
  CheckCircle2,
  UserCheck,
  Star,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import type { Usuario } from "../types";

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

interface BandejaEjecutivoProps {
  usuario: Usuario;
}

const ESTADOS_DISPONIBLES = [
  { id: 1, nombre: "Pendiente" },
  { id: 2, nombre: "En Proceso" },
  { id: 3, nombre: "En Espera" },
  { id: 4, nombre: "Resuelto" },
  { id: 5, nombre: "Cerrado" }
];

export const BandejaEjecutivo: React.FC<BandejaEjecutivoProps> = ({ usuario }) => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<number | null>(null);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketItem | null>(null);
  const [mensajes, setMensajes] = useState<MensajeTicket[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);

  const cargarTickets = async () => {
    setCargando(true);
    try {
      let url = `http://localhost:8000/api/tickets?rol=${usuario.rol_id}&usuario_id=${usuario.id_usuario}`;
      if (filtroEstado) {
        url += `&estado_id=${filtroEstado}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
        if (ticketSeleccionado) {
          const actualizado = data.find((t: TicketItem) => t.id_ticket === ticketSeleccionado.id_ticket);
          if (actualizado) setTicketSeleccionado(actualizado);
        }
      }
    } catch (err) {
      console.error("Error al cargar la bandeja de tickets:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTickets();
  }, [filtroEstado]);

  const seleccionarTicket = async (ticket: TicketItem) => {
    setTicketSeleccionado(ticket);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticket.id_ticket}`);
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
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estado: 2,
          usuario_id: usuario.id_usuario,
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
          prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t))
        );
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
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_estado: nuevoEstadoId,
          usuario_id: usuario.id_usuario
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
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
    } finally {
      setActualizandoEstado(false);
    }
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSeleccionado || !nuevoMensaje.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch(`http://localhost:8000/api/tickets/${ticketSeleccionado.id_ticket}/mensaje`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: ticketSeleccionado.id_ticket,
          autor_id: usuario.id_usuario,
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
          <h1 className="text-xl font-bold text-slate-900">Bandeja de Tickets</h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión y resolución de incidentes escalados desde el bot de soporte.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro por estado */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600">
            <Filter size={13} className="text-slate-400" />
            <select
              value={filtroEstado || ""}
              onChange={(e) => setFiltroEstado(e.target.value ? Number(e.target.value) : null)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_DISPONIBLES.map((est) => (
                <option key={est.id} value={est.id}>
                  {est.nombre}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={cargarTickets}
            title="Recargar bandeja"
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={cargando ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Contenido dividido en 2 columnas */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6 max-w-7xl mx-auto w-full">
        {/* Columna Izquierda: Listado de Tickets */}
        <div className="w-1/3 flex flex-col bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Tickets Disponibles ({tickets.length})
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
                <p className="text-xs font-medium text-slate-600">No hay tickets para mostrar</p>
                <p className="text-[11px] text-slate-400">
                  Los casos escalados por clientes o por baja confianza del bot se listarán aquí.
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
                    <span className="text-xs font-bold text-slate-800 line-clamp-1">
                      #{t.id_ticket} - {t.titulo}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeEstado(
                        t.estado
                      )}`}
                    >
                      {t.estado}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.descripcion}</p>

                  <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
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
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        #{ticketSeleccionado.id_ticket} - {ticketSeleccionado.titulo}
                      </h2>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeEstado(
                          ticketSeleccionado.estado
                        )}`}
                      >
                        {ticketSeleccionado.estado}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1.5">{ticketSeleccionado.descripcion}</p>
                  </div>

                  {/* Acciones de Asignación / Estado */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!ticketSeleccionado.ejecutivo ? (
                      <button
                        onClick={handleTomarTicket}
                        disabled={actualizandoEstado}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        <UserCheck size={14} />
                        <span>Tomar Ticket</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-medium text-slate-500">Estado:</label>
                        <select
                          value={ticketSeleccionado.id_estado}
                          onChange={(e) => handleCambiarEstado(Number(e.target.value))}
                          disabled={actualizandoEstado}
                          className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
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
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
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
                        <span className="text-[10px] text-slate-400 mb-1 px-1">
                          {esMio ? "Tú" : m.autor_nombre} · {m.fecha}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
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

              {/* Input para responder */}
              <form onSubmit={handleEnviarMensaje} className="p-4 bg-white border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  placeholder="Escribe una respuesta para el cliente..."
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando || ticketSeleccionado.id_estado === 5}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoMensaje.trim() || ticketSeleccionado.id_estado === 5}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Responder</span>
                </button>
              </form>
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