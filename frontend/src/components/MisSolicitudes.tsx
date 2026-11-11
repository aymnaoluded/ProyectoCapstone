import React, { useEffect, useState } from "react";
import { Clock, User, Star, CheckCircle2, AlertCircle, ArrowLeft, ChevronDown } from "lucide-react";
import type { Usuario } from "../types";
import { cabecerasAuth, API_URL } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { EncabezadoPagina, BotonRecargar, EstadoVacio, InsigniaEstado, Aviso } from "./ui/Pagina";
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
  ejecutivo: {
    id: number;
    nombre: string;
  } | null;
}

interface MisSolicitudesProps {
  usuario: Usuario;
}

export const MisSolicitudes: React.FC<MisSolicitudesProps> = ({ usuario }) => {
  const toast = useToast();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [ticketSeleccionado, setTicketSeleccionado] = useState<TicketItem | null>(null);
  const [mensajes, setMensajes] = useState<MensajeHilo[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modalCerrar, setModalCerrar] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [errorCerrar, setErrorCerrar] = useState<string | null>(null);
  const [descripcionAbierta, setDescripcionAbierta] = useState(false);

  // Solo el cliente puede cerrar su ticket; después solo un administrador puede reabrirlo
  const handleCerrarTicket = async () => {
    if (!ticketSeleccionado) return;
    setCerrando(true);
    setErrorCerrar(null);
    try {
      const res = await fetch(`${API_URL}/api/tickets/${ticketSeleccionado.id_ticket}/cerrar`, {
        method: "POST",
        headers: cabecerasAuth(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const actualizado: TicketItem = { ...ticketSeleccionado, id_estado: 5, estado: "Cerrado" };
        setTicketSeleccionado(actualizado);
        setTickets((prev) => prev.map((t) => (t.id_ticket === actualizado.id_ticket ? actualizado : t)));
        setModalCerrar(false);
        toast.exito(`Solicitud #${actualizado.id_ticket} cerrada`, "Gracias por confirmar que tu caso quedó resuelto.");
      } else {
        setErrorCerrar(typeof data?.detail === "string" ? data.detail : "No se pudo cerrar el ticket.");
      }
    } catch {
      setErrorCerrar("Error de conexión al cerrar el ticket.");
    } finally {
      setCerrando(false);
    }
  };

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
      } else {
        toast.error("No pudimos cargar tus solicitudes", "Inténtalo nuevamente en unos segundos.");
      }
    } catch (err) {
      console.error("Error al cargar tickets:", err);
      toast.error("Sin conexión con el servidor", "No pudimos cargar tus solicitudes.");
    } finally {
      setCargando(false);
    }
  };

  const seleccionarTicket = async (ticket: TicketItem) => {
    setTicketSeleccionado(ticket);
    setDescripcionAbierta(false);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        const data = await res.json().catch(() => null);
        toast.error("No se envió tu mensaje", typeof data?.detail === "string" ? data.detail : "Inténtalo nuevamente.");
      }
    } catch (err) {
      console.error("Error al enviar mensaje:", err);
      toast.error("No se envió tu mensaje", "Revisa tu conexión.");
    } finally {
      setEnviando(false);
    }
  };

  const abiertos = tickets.filter((t) => t.id_estado !== 5).length;
  const bloqueado = ticketSeleccionado ? ticketSeleccionado.id_estado === 4 || ticketSeleccionado.id_estado === 5 : false;

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
      <div className={`px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-5 ${ticketSeleccionado ? "max-md:hidden" : ""}`}>
        <EncabezadoPagina
          ceja="Atención al residente"
          titulo={
            <>
              Mis <em>solicitudes</em>
            </>
          }
          descripcion={
            tickets.length > 0
              ? `Tienes ${abiertos} ${abiertos === 1 ? "solicitud abierta" : "solicitudes abiertas"} con el equipo de administración.`
              : "Aquí sigues los casos que derivaste a un ejecutivo desde la conversación con Luz."
          }
          acciones={<BotonRecargar onClick={cargarTickets} cargando={cargando} />}
        />
      </div>

      <div className="flex-1 min-h-0 flex gap-5 px-0 sm:px-6 lg:px-8 pb-0 sm:pb-6">
        {/* ── Lista ─────────────────────────────────────── */}
        <section
          aria-label="Lista de solicitudes"
          className={`w-full md:w-[21rem] lg:w-[23rem] shrink-0 flex flex-col min-h-0 rounded-none sm:rounded-[1.4rem] bg-papel-2/55 border-y sm:border border-linea
            ${ticketSeleccionado ? "max-md:hidden" : ""}`}
        >
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="ceja">Tus casos</p>
            <span className="text-[0.75rem] font-semibold text-tinta-3 tabular-nums">{tickets.length}</span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto barra-fina px-2 pb-2 space-y-1">
            {cargando && tickets.length === 0 ? (
              <EsqueletoTickets />
            ) : tickets.length === 0 ? (
              <EstadoVacio
                compacto
                titulo="Sin solicitudes por ahora"
                descripcion="Si Luz no resuelve tu duda, usa “Hablar con ejecutivo” en el chat y tu caso aparecerá aquí."
              />
            ) : (
              tickets.map((t) => (
                <TarjetaTicket
                  key={t.id_ticket}
                  id={t.id_ticket}
                  titulo={t.titulo}
                  descripcion={t.descripcion}
                  estado={t.estado}
                  fecha={t.fecha_creacion}
                  persona={t.ejecutivo?.nombre}
                  seleccionado={ticketSeleccionado?.id_ticket === t.id_ticket}
                  onClick={() => seleccionarTicket(t)}
                />
              ))
            )}
          </div>
        </section>

        {/* ── Detalle ───────────────────────────────────── */}
        <section
          aria-label="Detalle de la solicitud"
          className={`flex-1 min-w-0 flex flex-col min-h-0 bg-superficie sm:rounded-[1.4rem] sm:border border-linea sm:shadow-[var(--sombra-papel)] overflow-hidden
            ${ticketSeleccionado ? "" : "max-md:hidden"}`}
        >
          {ticketSeleccionado ? (
            <>
              <div className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-5 pb-4 border-b border-linea space-y-3">
                <button
                  type="button"
                  onClick={() => setTicketSeleccionado(null)}
                  className="md:hidden boton boton-fantasma boton-sm -ml-3"
                >
                  <ArrowLeft size={15} /> Tus solicitudes
                </button>

                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="numeral text-tinta-3">N.º {ticketSeleccionado.id_ticket}</span>
                      <InsigniaEstado estado={ticketSeleccionado.estado} />
                    </div>
                    <h2 className="titular text-[1.45rem] sm:text-[1.7rem] mt-1.5 [overflow-wrap:anywhere]">
                      {ticketSeleccionado.titulo}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ticketSeleccionado.calificacion && (
                      <span className="insignia insignia-pendiente insignia-sin-punto">
                        <Star size={12} className="fill-luz text-luz" />
                        {ticketSeleccionado.calificacion}/5
                      </span>
                    )}
                    {/* El cliente es el único que puede cerrar su ticket */}
                    {ticketSeleccionado.id_estado !== 5 && (
                      <button
                        type="button"
                        onClick={() => {
                          setErrorCerrar(null);
                          setModalCerrar(true);
                        }}
                        className="boton boton-secundario boton-sm"
                      >
                        <CheckCircle2 size={15} className="text-exito" />
                        Cerrar solicitud
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[0.8125rem] text-tinta-2">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} className="text-tinta-3" /> Creada el {ticketSeleccionado.fecha_creacion}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <User size={14} className="text-tinta-3" />
                    {ticketSeleccionado.ejecutivo
                      ? `Te atiende ${ticketSeleccionado.ejecutivo.nombre}`
                      : "Esperando que se asigne un ejecutivo"}
                  </span>
                </div>

                {/* Descripción plegable para no tapar el hilo */}
                <div className="rounded-xl bg-papel/70 border border-linea">
                  <button
                    type="button"
                    onClick={() => setDescripcionAbierta((v) => !v)}
                    aria-expanded={descripcionAbierta}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-[0.8125rem] font-semibold text-tinta-2"
                  >
                    Descripción del caso
                    <ChevronDown size={15} className={`transition-transform duration-300 ${descripcionAbierta ? "rotate-180" : ""}`} />
                  </button>
                  <p
                    className={`px-3.5 text-[0.8125rem] text-tinta-2 leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] overflow-y-auto barra-fina transition-all duration-300
                      ${descripcionAbierta ? "max-h-40 pb-3" : "max-h-0 overflow-hidden"}`}
                  >
                    {ticketSeleccionado.descripcion}
                  </p>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
                <HiloMensajes
                  mensajes={mensajes}
                  usuarioId={usuario.id_usuario}
                  cargando={cargandoDetalle}
                  vacio={
                    <EstadoVacio
                      compacto
                      titulo="Aún no hay mensajes"
                      descripcion="Puedes agregar detalles o preguntarle directamente al ejecutivo que tome tu caso."
                    />
                  }
                />
              </div>

              {bloqueado ? (
                <NotaHilo>
                  {ticketSeleccionado.id_estado === 5
                    ? "Esta solicitud está cerrada. Si necesitas reabrirla, pídeselo a la administración."
                    : "Esta solicitud está resuelta. Si todo quedó bien, puedes cerrarla."}
                </NotaHilo>
              ) : (
                <CompositorHilo
                  valor={nuevoMensaje}
                  onCambio={setNuevoMensaje}
                  onEnviar={handleEnviarMensaje}
                  enviando={enviando}
                  placeholder="Escribe un mensaje para el ejecutivo…"
                  etiqueta="Mensaje para el ejecutivo"
                />
              )}
            </>
          ) : (
            <EstadoVacio
              className="flex-1"
              titulo="Elige una solicitud"
              descripcion="Selecciona un caso de la lista para ver las respuestas del ejecutivo o escribirle."
            />
          )}
        </section>
      </div>

      {/* Confirmación para cerrar la solicitud */}
      <Modal
        abierto={modalCerrar && !!ticketSeleccionado}
        onCerrar={() => setModalCerrar(false)}
        bloqueado={cerrando}
        icono={<CheckCircle2 size={19} />}
        titulo={`Cerrar la solicitud N.º ${ticketSeleccionado?.id_ticket ?? ""}`}
        descripcion="Ciérrala cuando tu problema esté resuelto. Ya no podrás enviar mensajes y, si necesitas reabrirla, deberás pedírselo a un administrador."
        pie={
          <>
            <button type="button" onClick={() => setModalCerrar(false)} disabled={cerrando} className="boton boton-fantasma">
              Cancelar
            </button>
            <button type="button" onClick={handleCerrarTicket} disabled={cerrando} className="boton boton-primario">
              {cerrando ? <IndicadorVentanas /> : <CheckCircle2 size={16} />}
              {cerrando ? "Cerrando…" : "Cerrar solicitud"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[0.9375rem] font-semibold text-tinta [overflow-wrap:anywhere]">{ticketSeleccionado?.titulo}</p>
          {errorCerrar && <Aviso icono={<AlertCircle size={16} />}>{errorCerrar}</Aviso>}
        </div>
      </Modal>
    </div>
  );
};
