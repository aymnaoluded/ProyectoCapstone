import React, { useEffect, useState } from "react";
import { 
  Ticket as TicketIcon, 
  MessageSquare, 
  Clock, 
  User, 
  Send, 
  RefreshCw, 
  Loader2, 
  ChevronRight, 
  Star,
  CheckCircle2,
  AlertCircle
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

interface MisSolicitudesProps {
  usuario: Usuario;
}

export const MisSolicitudes: React.FC<MisSolicitudesProps> = ({ usuario }) => {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketItem | null>(null);
  const [mensajes, setMensajes] = useState<MensajeTicket[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargarTickets = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setTickets(Array.isArray(data) ? data : []);
        if (ticketSeleccionado) {
          const actualizado = (Array.isArray(data) ? data : []).find(
            (t: TicketItem) => t.id_ticket === ticketSeleccionado.id_ticket
          );
          if (actualizado) setTicketSeleccionado(actualizado);
        }
      }
    } catch (err) {
      console.error("Error al cargar tickets:", err);
    } finally {
      setCargando(false);
    }
  };

  const seleccionarTicket = async (ticket: TicketItem) => {
    setTicketSeleccionado(ticket);
    setCargandoDetalle(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticket.id_ticket}`, {
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setMensajes(data.mensajes || []);
      }
    } catch (err) {
      console.error("Error al obtener detalle del ticket:", err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  useEffect(() => {
    cargarTickets();
  }, []);

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSeleccionado || !nuevoMensaje.trim() || enviando) return;

    setEnviando(true);
    try {
      const res = await fetch(
        `${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/mensaje`,
        {
          method: "POST",
          headers: cabecerasAuth({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            contenido: nuevoMensaje.trim(),
          }),
        }
      );

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
            autor_rol: usuario.rol_id,
          },
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
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
      case "en proceso":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
      case "en espera":
        return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20";
      case "resuelto":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
      case "cerrado":
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Cabecera Superior Glass */}
      <div className="liquid-glass border-b border-[var(--border-glass)] px-6 sm:px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Mis Solicitudes
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Seguimiento de tickets escalados al equipo humano
          </p>
        </div>
        <button
          onClick={cargarTickets}
          title="Recargar solicitudes"
          className="p-2.5 rounded-xl liquid-glass border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer shadow-xs active:scale-95"
        >
          <RefreshCw size={16} className={cargando ? "animate-spin text-[var(--accent-primary)]" : ""} />
        </button>
      </div>

      {/* Contenido dividido en 2 paneles estilo Liquid Glass */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 sm:p-6 gap-5 max-w-7xl mx-auto w-full">
        {/* Columna Izquierda: Listado de tickets */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col liquid-glass-card rounded-3xl overflow-hidden shrink-0 h-64 md:h-auto">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              Solicitudes Activas ({tickets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] apple-scrollbar">
            {cargando && tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)] space-y-2">
                <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
                <p className="text-xs font-medium">Cargando solicitudes...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-[var(--text-tertiary)]">
                <TicketIcon size={32} className="mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[var(--text-secondary)]">No tienes tickets creados</p>
                <p className="text-[11px]">
                  Si el asistente IA no resuelve tu duda, puedes escalarla directamente para atención personalizada.
                </p>
              </div>
            ) : (
              tickets.map((t) => (
                <div
                  key={t.id_ticket}
                  onClick={() => seleccionarTicket(t)}
                  className={`p-4 cursor-pointer transition-all ${
                    ticketSeleccionado?.id_ticket === t.id_ticket
                      ? "bg-blue-500/10 border-l-4 border-[var(--accent-primary)]"
                      : "hover:bg-[var(--bg-card-hover)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] line-clamp-1">
                      #{t.id_ticket} · {t.titulo}
                    </span>
                    <span
                      className={`text-[9.5px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeEstado(
                        t.estado
                      )}`}
                    >
                      {t.estado}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed">
                    {t.descripcion}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-[10.5px] text-[var(--text-tertiary)]">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {t.fecha_creacion}
                    </span>
                    <ChevronRight size={14} className="text-[var(--text-tertiary)]" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle y Mensajería del Ticket */}
        <div className="flex-1 flex flex-col liquid-glass-card rounded-3xl overflow-hidden min-h-0">
          {ticketSeleccionado ? (
            <>
              {/* Encabezado del ticket seleccionado */}
              <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/20 space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                        Ticket #{ticketSeleccionado.id_ticket}: {ticketSeleccionado.titulo}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeEstado(
                          ticketSeleccionado.estado
                        )}`}
                      >
                        {ticketSeleccionado.estado}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {ticketSeleccionado.descripcion}
                    </p>
                  </div>

                  {ticketSeleccionado.calificacion && (
                    <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full shrink-0">
                      <Star size={13} className="text-amber-500 fill-amber-400" />
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                        {ticketSeleccionado.calificacion}/5
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--text-secondary)] pt-2 border-t border-[var(--border-subtle)]">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-[var(--text-tertiary)]" /> Creado: {ticketSeleccionado.fecha_creacion}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={13} className="text-[var(--text-tertiary)]" /> 
                    {ticketSeleccionado.ejecutivo 
                      ? `Atendido por: ${ticketSeleccionado.ejecutivo.nombre}`
                      : "Esperando asignación de ejecutivo"}
                  </span>
                </div>
              </div>

              {/* Hilo de mensajes estilo Apple Messages */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 apple-scrollbar">
                {cargandoDetalle ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                    <Loader2 className="animate-spin text-[var(--accent-primary)] mb-2" size={26} />
                    <span className="text-xs font-medium">Cargando mensajes del ticket...</span>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-tertiary)] space-y-2">
                    <MessageSquare size={32} className="mx-auto opacity-40" />
                    <p className="text-xs font-medium text-[var(--text-secondary)]">Aún no hay mensajes en este ticket</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Escribe a continuación si deseas adjuntar detalles o hacer consultas directas al ejecutivo asignado.
                    </p>
                  </div>
                ) : (
                  mensajes.map((m) => {
                    const esMio = m.autor_id === usuario.id_usuario;
                    return (
                      <div
                        key={m.id_mensaje}
                        className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${
                          esMio ? "ml-auto items-end" : "mr-auto items-start"
                        } animate-scale-up`}
                      >
                        <span className="text-[10px] text-[var(--text-tertiary)] mb-1 px-1">
                          {esMio ? "Tú" : m.autor_nombre} · {m.fecha}
                        </span>
                        <div
                          className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed [overflow-wrap:anywhere] ${
                            esMio
                              ? "bg-gradient-to-r from-[#007AFF] to-[#0A84FF] text-white rounded-br-xs shadow-md shadow-blue-500/20"
                              : "liquid-glass border border-[var(--border-glass)] text-[var(--text-primary)] rounded-bl-xs shadow-xs"
                          }`}
                        >
                          {m.contenido}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Barra para responder al ticket */}
              <form onSubmit={handleEnviarMensaje} className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/40 flex gap-2.5 shrink-0">
                <input
                  type="text"
                  placeholder="Escribe un mensaje para el ejecutivo..."
                  maxLength={5000}
                  value={nuevoMensaje}
                  onChange={(e) => setNuevoMensaje(e.target.value)}
                  disabled={enviando || ticketSeleccionado.id_estado === 4 || ticketSeleccionado.id_estado === 5}
                  className="liquid-input flex-1 rounded-2xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={enviando || !nuevoMensaje.trim() || ticketSeleccionado.id_estado === 4 || ticketSeleccionado.id_estado === 5}
                  className="apple-btn-primary px-5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                >
                  {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Responder</span>
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--text-tertiary)]">
              <div className="w-16 h-16 rounded-3xl liquid-glass border border-[var(--border-glass)] flex items-center justify-center text-[var(--text-tertiary)] mb-3 shadow-sm">
                <TicketIcon size={30} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Selecciona un ticket</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm leading-relaxed">
                Elige una solicitud de la columna izquierda para revisar las respuestas del ejecutivo o enviar mensajes.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
