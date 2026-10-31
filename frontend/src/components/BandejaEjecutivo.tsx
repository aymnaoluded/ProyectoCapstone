import React, { useEffect, useState } from "react";
import {
  Inbox,
  Clock,
  User,
  Send,
  RefreshCw,
  Loader2,
  Filter,
  Star,
  MessageSquare,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  X
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
  const [modalReabrir, setModalReabrir] = useState(false);

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
      let url = `${API_URL}/api/tickets`;
      if (filtroEstado && !soloHistorial) {
        url += `?estado_id=${filtroEstado}`;
      }
      const res = await fetch(url, { headers: cabecerasAuth() });
      if (res.ok) {
        let data = await res.json();
        if (Array.isArray(data)) {
          if (soloHistorial) {
            data = data.filter((t: any) => t.id_estado === ID_ESTADO_CERRADO);
            if (usuario.rol_nombre === "Ejecutivo") {
              data = data.filter((t: any) => t.ejecutivo && t.ejecutivo.id === usuario.id_usuario);
            }
          } else if (soloAsignados) {
            data = data.filter(
              (t: any) =>
                t.ejecutivo &&
                t.ejecutivo.id === usuario.id_usuario &&
                t.id_estado !== ID_ESTADO_CERRADO
            );
          } else if (usuario.rol_nombre === "Ejecutivo") {
            data = data.filter((t: any) => !t.ejecutivo && t.id_estado !== ID_ESTADO_CERRADO);
          } else {
            data = data.filter((t: any) => t.id_estado !== ID_ESTADO_CERRADO);
          }
        }
        setTickets(data);
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
        setMensajes(data.mensajes || []);
      }
    } catch (err) {
      console.error("Error al cargar detalle del ticket:", err);
    } finally {
      setCargandoDetalle(false);
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

  // Solo el Administrador reabre tickets cerrados (el backend rechaza a los demás roles)
  const handleReabrir = async () => {
    if (!ticketSeleccionado) return;

    // Con responsable vuelve a En Proceso; sin responsable, a Pendiente para que alguien lo tome
    const nuevoEstadoId = ticketSeleccionado.ejecutivo ? ID_ESTADO_EN_PROCESO : ID_ESTADO_PENDIENTE;
    setActualizandoEstado(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/estado`, {
        method: "PATCH",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id_estado: nuevoEstadoId })
      });

      if (res.ok) {
        // Deja de estar cerrado: sale del historial
        setTickets((prev) => prev.filter((t) => t.id_ticket !== ticketSeleccionado.id_ticket));
        setTicketSeleccionado(null);
      } else {
        await mostrarErrorApi(res, "No se pudo reabrir el ticket.");
      }
    } catch (err) {
      console.error("Error al reabrir ticket:", err);
    } finally {
      setActualizandoEstado(false);
      setModalReabrir(false);
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
      <div className="liquid-glass border-b border-[var(--border-glass)] px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            {soloHistorial
              ? "Historial de Tickets"
              : soloAsignados
              ? "Tickets Asignados"
              : "Bandeja de Tickets"}
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {soloHistorial
              ? "Consulta histórica de casos resueltos y archivados"
              : soloAsignados
              ? "Casos asignados directamente a tu atención"
              : "Casos activos escalados esperando respuesta"}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!soloHistorial && (
            <div className="flex items-center gap-2 liquid-glass border border-[var(--border-glass)] rounded-2xl px-3 py-1.5 text-xs text-[var(--text-secondary)] shadow-xs">
              <Filter size={13} className="text-[var(--text-tertiary)]" />
              <select
                value={filtroEstado || ""}
                onChange={(e) => setFiltroEstado(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent focus:outline-none cursor-pointer text-xs font-medium text-[var(--text-primary)]"
              >
                <option value="" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                  Todos los estados
                </option>
                {ESTADOS_DISPONIBLES.filter((est) => est.id !== ID_ESTADO_CERRADO).map((est) => (
                  <option
                    key={est.id}
                    value={est.id}
                    className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                  >
                    {est.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={cargarTickets}
            title="Recargar bandeja"
            className="p-2.5 rounded-xl liquid-glass border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw size={15} className={cargando ? "animate-spin text-[var(--accent-primary)]" : ""} />
          </button>
        </div>
      </div>

      {/* Contenido dividido en 2 paneles estilo Liquid Glass */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden p-4 sm:p-6 gap-5 max-w-7xl mx-auto w-full">
        {/* Columna Izquierda: Listado de Tickets */}
        <div className="w-full md:w-80 lg:w-96 flex flex-col liquid-glass-card rounded-3xl overflow-hidden shrink-0 h-64 md:h-auto">
          <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/30 flex items-center justify-between">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              {soloHistorial ? "Tickets Cerrados" : "Tickets Disponibles"} ({tickets.length})
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] apple-scrollbar">
            {cargando && tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[var(--text-tertiary)] space-y-2">
                <Loader2 className="animate-spin text-[var(--accent-primary)]" size={24} />
                <p className="text-xs font-medium">Cargando bandeja...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center space-y-2 text-[var(--text-tertiary)]">
                <Inbox size={32} className="mx-auto opacity-50" />
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  {soloHistorial ? "No hay tickets cerrados" : "Sin tickets pendientes"}
                </p>
                <p className="text-[11px] leading-relaxed">
                  {soloHistorial
                    ? "Los tickets archivados y resueltos aparecerán aquí."
                    : "Los casos derivados aparecerán aquí para ser gestionados."}
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
                    <span className="flex items-center gap-1 font-medium text-[var(--text-secondary)]">
                      <User size={11} /> {t.cliente.nombre}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {t.fecha_creacion}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Detalle, Asignación y Chat con Cliente */}
        <div className="flex-1 flex flex-col liquid-glass-card rounded-3xl overflow-hidden min-h-0">
          {ticketSeleccionado ? (
            <>
              {/* Encabezado y Barra de Acción del Ticket */}
              <div className="p-5 sm:p-6 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/20 space-y-3 shrink-0">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                        #{ticketSeleccionado.id_ticket} · {ticketSeleccionado.titulo}
                      </h2>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getBadgeEstado(
                          ticketSeleccionado.estado
                        )}`}
                      >
                        {ticketSeleccionado.estado}
                      </span>
                    </div>
                    {/* Alto máximo con scroll: una descripción larga no debe tapar el hilo ni el formulario de respuesta */}
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap max-h-28 overflow-y-auto pr-2">
                      {ticketSeleccionado.descripcion}
                    </p>
                  </div>

                  {/* Acciones de Asignación / Estado */}
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

                      {/* Sin responsable: solo el Admin lo asigna (con el selector). Con responsable: se cambia el estado */}
                      {!ticketSeleccionado.ejecutivo ? (
                        !esAdmin && (
                          <span className="text-[11px] font-semibold text-[var(--text-secondary)] px-3 py-1.5 rounded-xl border border-[var(--border-glass)]">
                            Pendiente de asignación
                          </span>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                            Estado:
                          </label>
                          <select
                            value={ticketSeleccionado.id_estado}
                            onChange={(e) => handleCambiarEstado(Number(e.target.value))}
                            disabled={actualizandoEstado}
                            className="text-xs font-semibold liquid-glass border border-[var(--border-glass)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] focus:outline-none cursor-pointer disabled:opacity-50"
                          >
                            {/* "Cerrado" no se ofrece: cerrar un ticket es exclusivo del cliente */}
                            {ESTADOS_DISPONIBLES.filter(
                              (est) => est.id !== ID_ESTADO_CERRADO || ticketSeleccionado.id_estado === ID_ESTADO_CERRADO
                            ).map((est) => (
                              <option
                                key={est.id}
                                value={est.id}
                                className="bg-[var(--bg-surface)] text-[var(--text-primary)]"
                              >
                                {est.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between text-xs text-[var(--text-secondary)] pt-2.5 border-t border-[var(--border-subtle)] gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      <strong className="text-[var(--text-primary)]">Cliente:</strong> {ticketSeleccionado.cliente.nombre} ({ticketSeleccionado.cliente.correo})
                    </span>
                    <span>·</span>
                    <span>
                      <strong className="text-[var(--text-primary)]">Asignado:</strong>{" "}
                      {ticketSeleccionado.ejecutivo ? ticketSeleccionado.ejecutivo.nombre : "Sin asignar"}
                    </span>
                  </div>

                  {ticketSeleccionado.calificacion && (
                    <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                      <Star size={12} className="text-amber-500 fill-amber-400" />
                      <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                        {ticketSeleccionado.calificacion}/5
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Hilo de Respuestas */}
              <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-4 apple-scrollbar">
                {cargandoDetalle ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--text-tertiary)]">
                    <Loader2 className="animate-spin text-[var(--accent-primary)] mb-2" size={26} />
                    <span className="text-xs font-medium">Cargando mensajes del ticket...</span>
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="text-center py-16 text-[var(--text-tertiary)] space-y-2">
                    <MessageSquare size={32} className="mx-auto opacity-40" />
                    <p className="text-xs font-semibold text-[var(--text-secondary)]">No hay mensajes previos</p>
                    <p className="text-[11px] max-w-xs mx-auto">
                      Envía la primera respuesta para asistir al cliente.
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
                          className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
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

              {/* Input para responder */}
              {soloHistorial ? (
                <div className="p-4 bg-[var(--bg-surface-elevated)]/30 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-tertiary)] font-medium">
                  Este ticket se encuentra cerrado. Se muestra en modo de solo lectura.
                </div>
              ) : !esAdmin && ticketSeleccionado.ejecutivo?.id !== usuario.id_usuario ? (
                // El Ejecutivo solo responde los tickets asignados a él
                <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
                  Podrás responder al cliente cuando el administrador te asigne este ticket.
                </div>
              ) : (
                <form onSubmit={handleEnviarMensaje} className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/40 flex gap-2.5 shrink-0">
                  <input
                    type="text"
                    placeholder="Escribe una respuesta para el cliente..."
                    maxLength={5000}
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    disabled={enviando || ticketSeleccionado.id_estado === 5}
                    className="liquid-input flex-1 rounded-2xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={enviando || !nuevoMensaje.trim() || ticketSeleccionado.id_estado === 5}
                    className="apple-btn-primary px-5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 shadow-sm cursor-pointer"
                  >
                    {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    <span>Responder</span>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--text-tertiary)]">
              <div className="w-16 h-16 rounded-3xl liquid-glass border border-[var(--border-glass)] flex items-center justify-center text-[var(--text-tertiary)] mb-3 shadow-sm">
                <Inbox size={32} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Ningún ticket seleccionado</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm leading-relaxed">
                Selecciona una solicitud de la columna izquierda para revisar el contexto, tomar el caso o dar respuesta al usuario.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación para reabrir (mismo estilo que el modal de escalamiento del chat) */}
      {modalReabrir && ticketSeleccionado && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => !actualizandoEstado && setModalReabrir(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-600">
                <RotateCcw size={20} />
                <h2 className="text-base font-bold text-slate-900">
                  Reabrir ticket #{ticketSeleccionado.id_ticket}
                </h2>
              </div>
              <button
                onClick={() => setModalReabrir(false)}
                disabled={actualizandoEstado}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm font-medium text-slate-800 [overflow-wrap:anywhere]">{ticketSeleccionado.titulo}</p>

            <p className="text-xs text-slate-500">
              {ticketSeleccionado.ejecutivo
                ? `El ticket volverá a la bandeja de activos en estado "En Proceso", asignado a ${ticketSeleccionado.ejecutivo.nombre}.`
                : 'El ticket volverá a la bandeja de activos en estado "Pendiente", para que un ejecutivo lo tome.'}
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalReabrir(false)}
                disabled={actualizandoEstado}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleReabrir}
                disabled={actualizandoEstado}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer
                flex items-center gap-1.5"
              >
                {actualizandoEstado ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                <span>{actualizandoEstado ? "Reabriendo..." : "Reabrir ticket"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
