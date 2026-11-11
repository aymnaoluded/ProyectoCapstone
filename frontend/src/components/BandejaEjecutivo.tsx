import React, { useEffect, useState } from "react";
import { Star, RotateCcw, ArrowLeft, ChevronDown, Mail, UserRound, UserCheck, Hand } from "lucide-react";
import type { Usuario } from "../types";
import { cabecerasAuth, API_URL } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { EncabezadoPagina, BotonRecargar, EstadoVacio, InsigniaEstado } from "./ui/Pagina";
import { TarjetaTicket, EsqueletoTickets, HiloMensajes, CompositorHilo, NotaHilo, type MensajeHilo } from "./ui/Tickets";
import { Modal } from "./ui/Modal";
import { IndicadorVentanas } from "./ui/Fachada";

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
  { id: 5, nombre: "Cerrado" },
];

export const BandejaEjecutivo: React.FC<BandejaEjecutivoProps> = ({
  usuario,
  soloAsignados = false,
  soloHistorial = false,
}) => {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<number | null>(null);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketItem | null>(null);
  const [mensajes, setMensajes] = useState<MensajeHilo[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [actualizandoEstado, setActualizandoEstado] = useState(false);
  const [personalAsignable, setPersonalAsignable] = useState<PersonalAsignable[]>([]);
  const [modalReabrir, setModalReabrir] = useState(false);
  const [descripcionAbierta, setDescripcionAbierta] = useState(false);

  const esAdmin = usuario.rol_nombre === "Administrador";

  // Muestra el mensaje de error del backend (por ejemplo, un 403 si el ticket ya no es de este ejecutivo)
  const mostrarErrorApi = async (res: Response, porDefecto: string) => {
    const errorData = await res.json().catch(() => null);
    toast.error(porDefecto, typeof errorData?.detail === "string" ? errorData.detail : undefined);
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
            data = data.filter((t: TicketItem) => t.id_estado === ID_ESTADO_CERRADO);
            if (usuario.rol_nombre === "Ejecutivo") {
              data = data.filter((t: TicketItem) => t.ejecutivo && t.ejecutivo.id === usuario.id_usuario);
            }
          } else if (soloAsignados) {
            data = data.filter(
              (t: TicketItem) =>
                t.ejecutivo && t.ejecutivo.id === usuario.id_usuario && t.id_estado !== ID_ESTADO_CERRADO
            );
          } else if (usuario.rol_nombre === "Ejecutivo") {
            data = data.filter((t: TicketItem) => !t.ejecutivo && t.id_estado !== ID_ESTADO_CERRADO);
          } else {
            data = data.filter((t: TicketItem) => t.id_estado !== ID_ESTADO_CERRADO);
          }
        }
        setTickets(data);
      } else {
        toast.error("No se pudo cargar la bandeja", "Inténtalo nuevamente en unos segundos.");
      }
    } catch (err) {
      console.error("Error al cargar la bandeja de tickets:", err);
      toast.error("Sin conexión con el servidor", "No se pudo cargar la bandeja.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroEstado, soloAsignados, soloHistorial]);

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
          id_estado: nuevoEstadoId,
        }),
      });

      if (res.ok) {
        const estadoObj = ESTADOS_DISPONIBLES.find((e) => e.id === nuevoEstadoId);
        const datosActualizados: TicketItem = {
          ...ticketSeleccionado,
          id_estado: nuevoEstadoId,
          estado: estadoObj?.nombre || ticketSeleccionado.estado,
        };
        setTicketSeleccionado(datosActualizados);
        setTickets((prev) => prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t)));
        toast.exito(`Ticket #${ticketSeleccionado.id_ticket} actualizado`, `Nuevo estado: ${datosActualizados.estado}.`);
      } else {
        await mostrarErrorApi(res, "No se pudo actualizar el estado del ticket.");
      }
    } catch (err) {
      console.error("Error al actualizar estado:", err);
      toast.error("Sin conexión con el servidor", "El estado no cambió.");
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
        body: JSON.stringify({ id_estado: nuevoEstadoId }),
      });

      if (res.ok) {
        // Deja de estar cerrado: sale del historial
        toast.exito(`Ticket #${ticketSeleccionado.id_ticket} reabierto`, "Volvió a la bandeja de casos activos.");
        setTickets((prev) => prev.filter((t) => t.id_ticket !== ticketSeleccionado.id_ticket));
        setTicketSeleccionado(null);
      } else {
        await mostrarErrorApi(res, "No se pudo reabrir el ticket.");
      }
    } catch (err) {
      console.error("Error al reabrir ticket:", err);
      toast.error("Sin conexión con el servidor", "El ticket sigue cerrado.");
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
          ejecutivo_id: ejecutivoId,
        }),
      });

      if (res.ok) {
        const estadoObj = ESTADOS_DISPONIBLES.find((e) => e.id === nuevoEstadoId);
        const datosActualizados: TicketItem = {
          ...ticketSeleccionado,
          id_estado: nuevoEstadoId,
          estado: estadoObj?.nombre || ticketSeleccionado.estado,
          ejecutivo: { id: ejecutivoId, nombre: persona?.nombre || "Ejecutivo" },
        };
        setTicketSeleccionado(datosActualizados);
        setTickets((prev) => prev.map((t) => (t.id_ticket === ticketSeleccionado.id_ticket ? datosActualizados : t)));
        toast.exito(`Ticket #${ticketSeleccionado.id_ticket} asignado`, `Responsable: ${datosActualizados.ejecutivo?.nombre}.`);
      } else {
        await mostrarErrorApi(res, "No se pudo asignar el ticket.");
      }
    } catch (err) {
      console.error("Error al asignar ticket:", err);
      toast.error("Sin conexión con el servidor", "La asignación no cambió.");
    } finally {
      setActualizandoEstado(false);
    }
  };

  // El Ejecutivo toma para sí un ticket sin responsable: queda asignado a él y pasa a "En Proceso"
  const handleTomarTicket = async () => {
    if (!ticketSeleccionado || ticketSeleccionado.ejecutivo) return;
    const tomado = ticketSeleccionado;
    const nuevoEstadoId = tomado.id_estado === ID_ESTADO_PENDIENTE ? ID_ESTADO_EN_PROCESO : tomado.id_estado;
    setActualizandoEstado(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${tomado.id_ticket}/estado`, {
        method: "PATCH",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id_estado: nuevoEstadoId, ejecutivo_id: usuario.id_usuario }),
      });

      if (res.ok) {
        const estadoObj = ESTADOS_DISPONIBLES.find((e) => e.id === nuevoEstadoId);
        const datosActualizados: TicketItem = {
          ...tomado,
          id_estado: nuevoEstadoId,
          estado: estadoObj?.nombre || tomado.estado,
          ejecutivo: { id: usuario.id_usuario, nombre: `${usuario.nombre} ${usuario.apellido}`.trim() },
        };
        setTicketSeleccionado(datosActualizados);
        // Deja de estar "sin responsable": sale de la bandeja y aparece en Tickets asignados
        setTickets((prev) => prev.filter((t) => t.id_ticket !== tomado.id_ticket));
        toast.exito(`Tomaste el ticket #${tomado.id_ticket}`, "Ya puedes responder al residente. Lo verás en Tickets asignados.");
      } else {
        await mostrarErrorApi(res, "No se pudo tomar el ticket.");
        if (res.status === 409) cargarTickets();
      }
    } catch (err) {
      console.error("Error al tomar ticket:", err);
      toast.error("Sin conexión con el servidor", "El ticket sigue sin responsable.");
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
          contenido: nuevoMensaje.trim(),
        }),
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
            autor_rol: usuario.rol_id,
          },
        ]);
        setNuevoMensaje("");
      } else {
        await mostrarErrorApi(res, "No se pudo enviar el mensaje.");
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      toast.error("Sin conexión con el servidor", "El mensaje no se envió.");
    } finally {
      setEnviando(false);
    }
  };

  const textos = soloHistorial
    ? {
        ceja: "Archivo de casos",
        titulo: (
          <>
            Historial de <em>tickets</em>
          </>
        ),
        descripcion: esAdmin
          ? "Casos cerrados por los residentes. Desde aquí puedes reabrir uno si hace falta."
          : "Casos cerrados que atendiste.",
        lista: "Cerrados",
        vacio: "No hay tickets cerrados",
        vacioDesc: "Los casos que los residentes den por cerrados quedarán archivados aquí.",
      }
    : soloAsignados
    ? {
        ceja: "Mi trabajo",
        titulo: (
          <>
            Tickets <em>asignados</em>
          </>
        ),
        descripcion: "Casos que estás atendiendo. Responde al residente y actualiza el estado.",
        lista: "Asignados a ti",
        vacio: "No tienes casos asignados",
        vacioDesc: "Cuando la administración te asigne un ticket aparecerá en esta lista.",
      }
    : {
        ceja: "Mesa de ayuda",
        titulo: esAdmin ? (
          <>
            Supervisión de <em>tickets</em>
          </>
        ) : (
          <>
            Bandeja de <em>tickets</em>
          </>
        ),
        descripcion: esAdmin
          ? "Todos los casos activos escalados desde Luz, la asistente. Asigna un responsable a cada uno."
          : "Casos escalados que todavía no tienen responsable. Toma uno para empezar a atenderlo.",
        lista: esAdmin ? "Activos" : "Sin responsable",
        vacio: "Sin tickets pendientes",
        vacioDesc: "Los casos que los residentes deriven desde Luz aparecerán aquí.",
      };

  const puedeResponder = esAdmin || ticketSeleccionado?.ejecutivo?.id === usuario.id_usuario;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className={`px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-5 ${ticketSeleccionado ? "max-md:hidden" : ""}`}>
        <EncabezadoPagina
          ceja={textos.ceja}
          titulo={textos.titulo}
          descripcion={textos.descripcion}
          acciones={
            <>
              {!soloHistorial && (
                <>
                  <label htmlFor="filtro-estado" className="sr-only">
                    Filtrar por estado
                  </label>
                  <select
                    id="filtro-estado"
                    value={filtroEstado || ""}
                    onChange={(e) => setFiltroEstado(e.target.value ? Number(e.target.value) : null)}
                    className="campo campo-sm w-auto"
                  >
                    <option value="">Todos los estados</option>
                    {ESTADOS_DISPONIBLES.filter((est) => est.id !== ID_ESTADO_CERRADO).map((est) => (
                      <option key={est.id} value={est.id}>
                        {est.nombre}
                      </option>
                    ))}
                  </select>
                </>
              )}
              <BotonRecargar onClick={cargarTickets} cargando={cargando} />
            </>
          }
        />
      </div>

      <div className="flex-1 min-h-0 flex gap-5 px-0 sm:px-6 lg:px-8 pb-0 sm:pb-6">
        {/* ── Lista ─────────────────────────────────────── */}
        <section
          aria-label="Lista de tickets"
          className={`w-full md:w-[21rem] lg:w-[23rem] shrink-0 flex flex-col min-h-0 sm:rounded-[1.4rem] bg-papel-2/55 border-y sm:border border-linea
            ${ticketSeleccionado ? "max-md:hidden" : ""}`}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="ceja">{textos.lista}</p>
            <span className="text-[0.75rem] font-semibold text-tinta-3 tabular-nums">{tickets.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto barra-fina px-2 pb-2 space-y-1">
            {cargando && tickets.length === 0 ? (
              <EsqueletoTickets />
            ) : tickets.length === 0 ? (
              <EstadoVacio compacto titulo={textos.vacio} descripcion={textos.vacioDesc} />
            ) : (
              tickets.map((t) => (
                <TarjetaTicket
                  key={t.id_ticket}
                  id={t.id_ticket}
                  titulo={t.titulo}
                  descripcion={t.descripcion}
                  estado={t.estado}
                  fecha={t.fecha_creacion}
                  persona={t.cliente.nombre}
                  seleccionado={ticketSeleccionado?.id_ticket === t.id_ticket}
                  onClick={() => seleccionarTicket(t)}
                />
              ))
            )}
          </div>
        </section>

        {/* ── Detalle ───────────────────────────────────── */}
        <section
          aria-label="Detalle del ticket"
          className={`flex-1 min-w-0 flex flex-col min-h-0 bg-superficie sm:rounded-[1.4rem] sm:border border-linea sm:shadow-[var(--sombra-papel)] overflow-hidden
            ${ticketSeleccionado ? "" : "max-md:hidden"}`}
        >
          {ticketSeleccionado ? (
            <>
              <div className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-linea space-y-3.5 max-h-[55%] overflow-y-auto barra-fina">
                <button
                  type="button"
                  onClick={() => setTicketSeleccionado(null)}
                  className="md:hidden boton boton-fantasma boton-sm -ml-3"
                >
                  <ArrowLeft size={15} /> Volver a la lista
                </button>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="numeral text-tinta-3">N.º {ticketSeleccionado.id_ticket}</span>
                      <InsigniaEstado estado={ticketSeleccionado.estado} />
                      {ticketSeleccionado.calificacion && (
                        <span className="insignia insignia-pendiente insignia-sin-punto">
                          <Star size={12} className="fill-luz text-luz" />
                          {ticketSeleccionado.calificacion}/5
                        </span>
                      )}
                    </div>
                    <h2 className="titular text-[1.45rem] sm:text-[1.7rem] mt-1.5 [overflow-wrap:anywhere]">
                      {ticketSeleccionado.titulo}
                    </h2>
                  </div>

                  {/* El administrador reabre tickets cerrados desde el historial */}
                  {soloHistorial && esAdmin && ticketSeleccionado.id_estado === ID_ESTADO_CERRADO && (
                    <button type="button" onClick={() => setModalReabrir(true)} className="boton boton-secundario boton-sm shrink-0">
                      <RotateCcw size={15} />
                      Reabrir ticket
                    </button>
                  )}
                </div>

                {/* Ficha: residente, responsable y controles */}
                <div className="grid sm:grid-cols-2 gap-2.5">
                  <div className="rounded-xl bg-papel/70 border border-linea px-3.5 py-2.5 min-w-0">
                    <p className="ceja !text-[0.625rem]">Residente</p>
                    <p className="text-[0.875rem] font-semibold text-tinta mt-1 flex items-center gap-1.5 min-w-0">
                      <UserRound size={14} className="text-tinta-3 shrink-0" />
                      <span className="truncate">{ticketSeleccionado.cliente.nombre}</span>
                    </p>
                    <a
                      href={`mailto:${ticketSeleccionado.cliente.correo}`}
                      className="text-[0.8125rem] text-petroleo hover:underline flex items-center gap-1.5 mt-0.5 min-w-0"
                    >
                      <Mail size={13} className="shrink-0" />
                      <span className="truncate">{ticketSeleccionado.cliente.correo}</span>
                    </a>
                  </div>

                  <div className="rounded-xl bg-papel/70 border border-linea px-3.5 py-2.5 space-y-2 min-w-0">
                    {!soloHistorial && esAdmin ? (
                      <div>
                        <label htmlFor="asignar-ticket" className="ceja !text-[0.625rem] block">
                          Responsable
                        </label>
                        <select
                          id="asignar-ticket"
                          value={ticketSeleccionado.ejecutivo?.id ?? ""}
                          onChange={(e) => handleAsignar(Number(e.target.value))}
                          disabled={actualizandoEstado || personalAsignable.length === 0}
                          className="campo campo-sm mt-1"
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
                    ) : (
                      <div>
                        <p className="ceja !text-[0.625rem]">Responsable</p>
                        <p className="text-[0.875rem] font-semibold text-tinta mt-1 flex items-center gap-1.5">
                          <UserCheck size={14} className="text-tinta-3" />
                          {ticketSeleccionado.ejecutivo ? ticketSeleccionado.ejecutivo.nombre : "Sin asignar"}
                        </p>
                      </div>
                    )}

                    {/* Con responsable se cambia el estado; "Cerrado" no se ofrece: cerrar es exclusivo del cliente */}
                    {!soloHistorial && ticketSeleccionado.ejecutivo && (
                      <div>
                        <label htmlFor="estado-ticket" className="ceja !text-[0.625rem] block">
                          Estado
                        </label>
                        <select
                          id="estado-ticket"
                          value={ticketSeleccionado.id_estado}
                          onChange={(e) => handleCambiarEstado(Number(e.target.value))}
                          disabled={actualizandoEstado}
                          className="campo campo-sm mt-1"
                        >
                          {ESTADOS_DISPONIBLES.filter(
                            (est) => est.id !== ID_ESTADO_CERRADO || ticketSeleccionado.id_estado === ID_ESTADO_CERRADO
                          ).map((est) => (
                            <option key={est.id} value={est.id}>
                              {est.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* Un ejecutivo puede tomar un ticket que todavía no tiene responsable */}
                    {!soloHistorial && !ticketSeleccionado.ejecutivo && !esAdmin && (
                      <button
                        type="button"
                        onClick={handleTomarTicket}
                        disabled={actualizandoEstado}
                        className="boton boton-primario boton-sm w-full"
                      >
                        <Hand size={15} />
                        Tomar este ticket
                      </button>
                    )}
                    {actualizandoEstado && (
                      <p className="flex items-center gap-2 text-[0.75rem] text-petroleo" role="status">
                        <IndicadorVentanas /> Guardando…
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-papel/70 border border-linea">
                  <button
                    type="button"
                    onClick={() => setDescripcionAbierta((v) => !v)}
                    aria-expanded={descripcionAbierta}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-[0.8125rem] font-semibold text-tinta-2"
                  >
                    Descripción del caso · <span className="font-normal tabular-nums">{ticketSeleccionado.fecha_creacion}</span>
                    <ChevronDown size={15} className={`ml-auto transition-transform duration-300 ${descripcionAbierta ? "rotate-180" : ""}`} />
                  </button>
                  {descripcionAbierta && (
                    <p className="px-3.5 pb-3 text-[0.8125rem] text-tinta-2 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] max-h-28 overflow-y-auto barra-fina">
                      {ticketSeleccionado.descripcion}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
                <HiloMensajes
                  mensajes={mensajes}
                  usuarioId={usuario.id_usuario}
                  cargando={cargandoDetalle}
                  vacio={
                    <EstadoVacio compacto titulo="Sin mensajes todavía" descripcion="Envía la primera respuesta para orientar al residente." />
                  }
                />
              </div>

              {soloHistorial ? (
                <NotaHilo>Este ticket está cerrado. Se muestra en modo de solo lectura.</NotaHilo>
              ) : !puedeResponder ? (
                // El Ejecutivo solo responde los tickets asignados a él
                <NotaHilo>
                  {ticketSeleccionado.ejecutivo
                    ? `Este ticket lo atiende ${ticketSeleccionado.ejecutivo.nombre}.`
                    : "Toma este ticket para responder al residente."}
                </NotaHilo>
              ) : (
                <CompositorHilo
                  valor={nuevoMensaje}
                  onCambio={setNuevoMensaje}
                  onEnviar={handleEnviarMensaje}
                  enviando={enviando}
                  deshabilitado={ticketSeleccionado.id_estado === ID_ESTADO_CERRADO}
                  placeholder="Escribe una respuesta para el residente…"
                  etiqueta="Respuesta para el residente"
                />
              )}
            </>
          ) : (
            <EstadoVacio
              className="flex-1"
              titulo="Ningún ticket seleccionado"
              descripcion="Elige un caso de la lista para revisar el contexto, tomarlo o responder al residente."
            />
          )}
        </section>
      </div>

      {/* Confirmación para reabrir */}
      <Modal
        abierto={modalReabrir && !!ticketSeleccionado}
        onCerrar={() => setModalReabrir(false)}
        bloqueado={actualizandoEstado}
        tono="luz"
        icono={<RotateCcw size={18} />}
        titulo={`Reabrir el ticket N.º ${ticketSeleccionado?.id_ticket ?? ""}`}
        descripcion={
          ticketSeleccionado?.ejecutivo
            ? `Volverá a la bandeja de activos en estado "En Proceso", asignado a ${ticketSeleccionado.ejecutivo.nombre}.`
            : 'Volverá a la bandeja de activos en estado "Pendiente", para que un ejecutivo lo tome.'
        }
        pie={
          <>
            <button type="button" onClick={() => setModalReabrir(false)} disabled={actualizandoEstado} className="boton boton-fantasma">
              Cancelar
            </button>
            <button type="button" onClick={handleReabrir} disabled={actualizandoEstado} className="boton boton-primario">
              {actualizandoEstado ? <IndicadorVentanas /> : <RotateCcw size={15} />}
              {actualizandoEstado ? "Reabriendo…" : "Reabrir ticket"}
            </button>
          </>
        }
      >
        <p className="text-[0.9375rem] font-semibold text-tinta [overflow-wrap:anywhere]">{ticketSeleccionado?.titulo}</p>
      </Modal>
    </div>
  );
};
