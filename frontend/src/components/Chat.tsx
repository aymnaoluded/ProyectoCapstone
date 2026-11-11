import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  ArrowUp,
  ArrowDown,
  Headphones,
  CheckCircle2,
  Star,
  Plus,
  Copy,
  Check,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  WifiOff,
  Receipt,
  ScrollText,
  Trees,
  PawPrint,
  Car,
  Wrench,
  ArrowRight,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import type { Mensaje, Usuario, ConversacionDetalle } from "../types";
import { cabecerasAuth, API_URL } from "../utils/api";
import { useEnLinea, saludoSegunHora } from "../utils/useEnLinea";
import { useToast } from "../context/ToastContext";
import { AvatarAsistente, Fachada, IndicadorVentanas, MedidorConfianza } from "./ui/Fachada";
import { TextoFormateado } from "./ui/TextoFormateado";
import { Modal } from "./ui/Modal";
import { Aviso } from "./ui/Pagina";
import { Esqueleto } from "./ui/Skeleton";

interface ChatProps {
  usuario: Usuario;
  conversacionIdProp?: number | null;
  onConversacionCreada?: (id: number) => void;
  onConversacionActualizada?: () => void;
  onNuevaConversacion?: () => void;
}

// Un mensaje de error lleva el texto original para poder reintentarlo
type MensajeChat = Mensaje & { error?: boolean; reintento?: string };

const LIMITE_MENSAJE = 2000;

const horaActual = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const mensajeInicial = (nombre: string): MensajeChat => ({
  id: "init",
  emisor: "bot",
  texto: `Hola ${nombre}, soy Luz, la asistente virtual de Comunidad Clara Administraciones. ¿En qué puedo orientarte hoy respecto a tu comunidad, reglamentos o solicitudes?`,
  hora: horaActual(),
});

/* Preguntas para empezar: solo completan el campo de texto, la respuesta sale de los documentos */
const SUGERENCIAS: { tema: string; pregunta: string; icono: LucideIcon }[] = [
  { tema: "Gastos comunes", pregunta: "¿Cómo se calculan los gastos comunes y cuándo vencen?", icono: Receipt },
  { tema: "Reglamento", pregunta: "¿Qué dice el reglamento de copropiedad sobre los ruidos molestos?", icono: ScrollText },
  { tema: "Espacios comunes", pregunta: "¿Cómo se reservan los espacios comunes del condominio?", icono: Trees },
  { tema: "Mascotas", pregunta: "¿Qué normas aplican a las mascotas en las áreas comunes?", icono: PawPrint },
  { tema: "Estacionamientos", pregunta: "¿Cuáles son las reglas para los estacionamientos de visitas?", icono: Car },
  { tema: "Mantenciones", pregunta: "¿Cómo informo un problema de mantención en el edificio?", icono: Wrench },
];

const CONFIANZA = {
  ALTA: { texto: "Confianza alta", color: "text-exito" },
  MEDIA: { texto: "Confianza parcial", color: "text-luz-tinta" },
  BAJA: { texto: "Confianza baja", color: "text-coral-tinta" },
};

export const Chat: React.FC<ChatProps> = ({
  usuario,
  conversacionIdProp,
  onConversacionCreada,
  onConversacionActualizada,
  onNuevaConversacion,
}) => {
  const toast = useToast();
  const enLinea = useEnLinea();

  const [mensajes, setMensajes] = useState<MensajeChat[]>([mensajeInicial(usuario.nombre)]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [conversacionInfo, setConversacionInfo] = useState<ConversacionDetalle | null>(null);
  const [mostrarFuentes, setMostrarFuentes] = useState<Record<string, boolean>>({});

  const [finalizado, setFinalizado] = useState(false);
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [calificacionEnviada, setCalificacionEnviada] = useState(false);
  const [estrellaHover, setEstrellaHover] = useState(0);
  const [yaEscalado, setYaEscalado] = useState(false);

  // Confirmación para finalizar
  const [confirmarFinalizar, setConfirmarFinalizar] = useState(false);
  const [finalizando, setFinalizando] = useState(false);

  // Modal de escalamiento
  const [modalEscalar, setModalEscalar] = useState(false);
  const [tituloTicket, setTituloTicket] = useState("");
  const [descTicket, setDescTicket] = useState("");
  const [escalando, setEscalando] = useState(false);
  const [errorEscalar, setErrorEscalar] = useState<string | null>(null);

  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const [alFondo, setAlFondo] = useState(true);

  const areaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const alFondoRef = useRef(true);
  const saltoInstantaneo = useRef(false);

  useEffect(() => {
    if (!conversacionIdProp) {
      setConversacionId(null);
      setConversacionInfo(null);
      setMensajes([mensajeInicial(usuario.nombre)]);
      setFinalizado(false);
      setCalificacion(null);
      setCalificacionEnviada(false);
      setYaEscalado(false);
      setInput("");
      return;
    }

    const cargarConversacion = async () => {
      setCargandoHistorial(true);
      try {
        const res = await fetch(`${API_URL}/api/chat/conversaciones/${conversacionIdProp}`, {
          headers: cabecerasAuth(),
        });
        if (!res.ok) throw new Error("Error al cargar la conversación");

        const data = await res.json();
        setConversacionId(data.conversacion.id_conversacion);
        setConversacionInfo(data.conversacion);
        if (data.mensajes && data.mensajes.length > 0) {
          setMensajes(data.mensajes);
        } else {
          setMensajes([mensajeInicial(usuario.nombre)]);
        }
        setFinalizado(data.conversacion.finalizada || false);
        setCalificacion(data.conversacion.calificacion || null);
        setCalificacionEnviada(!!data.conversacion.calificacion);
        setYaEscalado(data.conversacion.escalada || false);
        saltoInstantaneo.current = true;
      } catch (err) {
        console.error("Error al cargar conversación:", err);
        toast.error("No pudimos abrir la consulta", "Revisa tu conexión e inténtalo nuevamente.");
      } finally {
        setCargandoHistorial(false);
      }
    };

    cargarConversacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversacionIdProp, usuario.nombre]);

  const mensajesReales = mensajes.filter((m) => m.id !== "init");
  const esBienvenida = !cargandoHistorial && !finalizado && !yaEscalado && mensajesReales.length === 0;

  // Desplazamiento: sigue la conversación solo si el usuario ya estaba abajo
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area || esBienvenida) return;
    const ultimo = mensajes[mensajes.length - 1];
    if (saltoInstantaneo.current) {
      area.scrollTop = area.scrollHeight;
      saltoInstantaneo.current = false;
      return;
    }
    if (alFondoRef.current || ultimo?.emisor === "user") {
      area.scrollTo({ top: area.scrollHeight, behavior: "smooth" });
    }
  }, [mensajes, cargando, finalizado, esBienvenida]);

  const alDesplazar = () => {
    const area = areaRef.current;
    if (!area) return;
    const cerca = area.scrollHeight - area.scrollTop - area.clientHeight < 140;
    alFondoRef.current = cerca;
    if (cerca !== alFondo) setAlFondo(cerca);
  };

  const irAlFinal = () => {
    areaRef.current?.scrollTo({ top: areaRef.current.scrollHeight, behavior: "smooth" });
  };

  // El campo de texto crece con el contenido (hasta ~6 líneas)
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 168)}px`;
  }, [input]);

  const toggleFuentes = (id: string) => {
    setMostrarFuentes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copiarMensaje = async (m: MensajeChat) => {
    try {
      await navigator.clipboard.writeText(m.texto);
      setCopiadoId(m.id);
      window.setTimeout(() => setCopiadoId((actual) => (actual === m.id ? null : actual)), 1800);
    } catch {
      toast.error("No se pudo copiar", "Tu navegador no permitió acceder al portapapeles.");
    }
  };

  const enviarTexto = async (textoUsuario: string, yaMostrado = false) => {
    if (!textoUsuario.trim() || cargando || finalizado) return;

    if (!yaMostrado) {
      const nuevoMensajeUsuario: MensajeChat = {
        id: Date.now().toString(),
        emisor: "user",
        texto: textoUsuario,
        hora: horaActual(),
      };
      setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    }
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          mensaje: textoUsuario,
          cliente_id: usuario.id_usuario,
          conversacion_id: conversacionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const detalle = errorData?.detail;
        const mensajeError =
          typeof detalle === "string"
            ? detalle
            : Array.isArray(detalle)
            ? detalle.map((d: { msg?: string }) => d?.msg ?? String(d)).join(". ")
            : "Error en el asistente virtual.";
        throw new Error(mensajeError);
      }

      const data = await res.json();

      if (!conversacionId && data.conversacion_id) {
        setConversacionId(data.conversacion_id);
        if (onConversacionCreada) {
          onConversacionCreada(data.conversacion_id);
        }
      }

      const nuevoMensajeBot: MensajeChat = {
        id: (Date.now() + 1).toString(),
        emisor: "bot",
        texto: data.respuesta,
        hora: horaActual(),
        fuentes: data.fuentes || [],
        nivelConfianza: data.nivel_confianza,
        scoreMaximo: data.score_maximo,
        escalarEjecutivo: data.escalar_ejecutivo,
      };

      setMensajes((prev) => [...prev, nuevoMensajeBot]);
      if (onConversacionActualizada) {
        onConversacionActualizada();
      }
    } catch (err: unknown) {
      console.error(err);
      setMensajes((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          emisor: "bot",
          error: true,
          reintento: textoUsuario,
          texto:
            err instanceof Error && err.message && err.message !== "Failed to fetch"
              ? err.message
              : "No pude conectarme con el servidor. Revisa tu conexión e inténtalo nuevamente.",
          hora: horaActual(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || cargando || finalizado || !enLinea) return;
    const texto = input.trim();
    setInput("");
    enviarTexto(texto);
  };

  const reintentar = (m: MensajeChat) => {
    if (!m.reintento || cargando) return;
    setMensajes((prev) => prev.filter((x) => x.id !== m.id));
    enviarTexto(m.reintento, true);
  };

  const alTeclearCompositor = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      enviarMensaje();
    }
  };

  const usarSugerencia = (pregunta: string) => {
    setInput(pregunta);
    window.requestAnimationFrame(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(pregunta.length, pregunta.length);
    });
  };

  const handleFinalizarConversacion = async () => {
    if (!conversacionId) {
      setFinalizado(true);
      setConfirmarFinalizar(false);
      return;
    }

    setFinalizando(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/finalizar`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ conversacion_id: conversacionId }),
      });
      if (res.ok) {
        setFinalizado(true);
        setConfirmarFinalizar(false);
        if (onConversacionActualizada) {
          onConversacionActualizada();
        }
      } else {
        toast.error("No se pudo finalizar la consulta", "Inténtalo nuevamente en unos segundos.");
      }
    } catch (err) {
      console.error("Error al finalizar conversación:", err);
      toast.error("Sin conexión con el servidor", "La consulta sigue abierta.");
    } finally {
      setFinalizando(false);
    }
  };

  const enviarCalificacion = async (puntos: number) => {
    if (!conversacionId) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/finalizar`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ conversacion_id: conversacionId, calificacion: puntos }),
      });
      if (res.ok) {
        setCalificacion(puntos);
        setCalificacionEnviada(true);
        if (onConversacionActualizada) {
          onConversacionActualizada();
        }
      } else {
        toast.error("No se guardó tu calificación", "Inténtalo nuevamente.");
      }
    } catch (err) {
      console.error("Error al calificar conversación:", err);
      toast.error("No se guardó tu calificación", "Revisa tu conexión.");
    }
  };

  const abrirModalEscalar = (motivoSugerido?: string) => {
    const ultimoMsgUsuario = [...mensajes].reverse().find((m) => m.emisor === "user");
    setTituloTicket(
      ultimoMsgUsuario ? `Consulta: ${ultimoMsgUsuario.texto.substring(0, 50)}...` : "Consulta de Residente"
    );
    setDescTicket(
      motivoSugerido
        ? `Motivo: ${motivoSugerido}\n\nContexto: Solicitud escalada desde la consulta con el asistente virtual.`
        : ""
    );
    setErrorEscalar(null);
    setModalEscalar(true);
  };

  const handleEscalarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTicket.trim() || !descTicket.trim() || escalando || yaEscalado) return;

    setEscalando(true);
    setErrorEscalar(null);
    try {
      // El backend crea la solicitud en POST /api/tickets y, si viene la conversación, la marca como escalada
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          titulo: tituloTicket.trim(),
          descripcion: descTicket.trim(),
          conversacion_id: conversacionId,
        }),
      });

      if (res.status === 409) {
        // La conversación ya tenía una solicitud: se refleja en pantalla en vez de mostrar un error
        const errorData = await res.json().catch(() => null);
        setYaEscalado(true);
        setModalEscalar(false);
        toast.info("Esta consulta ya está con un ejecutivo", typeof errorData?.detail === "string" ? errorData.detail : undefined);
        if (onConversacionActualizada) onConversacionActualizada();
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(typeof errorData?.detail === "string" ? errorData.detail : "No se pudo crear la solicitud.");
      }

      const data = await res.json();
      setYaEscalado(true);
      setModalEscalar(false);
      toast.exito(`Solicitud #${data.id_ticket} creada`, "Puedes seguir su avance en Mis solicitudes.");

      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          emisor: "bot",
          texto: `Creé la solicitud #${data.id_ticket}: «${tituloTicket.trim()}». El equipo de administración revisará tu caso y te responderá en "Mis solicitudes".`,
          hora: horaActual(),
        },
      ]);

      if (onConversacionActualizada) {
        onConversacionActualizada();
      }
    } catch (err: unknown) {
      setErrorEscalar(err instanceof Error ? err.message : "Error al escalar el caso.");
    } finally {
      setEscalando(false);
    }
  };

  // Se puede pedir un ejecutivo en cualquier momento; si ya hay conversación, la solicitud queda ligada a ella
  const puedeEscalar = !finalizado && !yaEscalado;
  const titulo = conversacionInfo?.titulo || "Luz · tu asistente";

  /* ── Estado de la conversación (línea bajo el título) ───────────── */
  const estado = !enLinea ? (
    <span className="flex items-center gap-1.5 text-error">
      <WifiOff size={12} /> Sin conexión
    </span>
  ) : finalizado ? (
    <span className="flex items-center gap-1.5 text-tinta-2">
      <BookOpen size={12} /> Consulta finalizada · solo lectura
    </span>
  ) : yaEscalado ? (
    <span className="flex items-center gap-1.5 text-coral-tinta">
      <Headphones size={12} /> Derivada a un ejecutivo
    </span>
  ) : cargando ? (
    <span className="flex items-center gap-2 text-petroleo">
      <IndicadorVentanas /> Luz está buscando en los documentos…
    </span>
  ) : (
    <span className="flex items-center gap-1.5 text-tinta-2">
      <span className="w-1.5 h-1.5 rounded-full bg-exito shadow-[0_0_0_3px_rgba(46,118,80,0.15)]" />
      Luz está en línea · responde con documentos oficiales
    </span>
  );

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative bg-papel">
      {/* ── Cabecera de la conversación ─────────────────────────────── */}
      <div className="shrink-0 z-10 px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 border-b border-linea bg-papel">
        <div className="flex items-center gap-3 min-w-0">
          <AvatarAsistente size={32} activo={cargando} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-[0.95rem] font-semibold text-tinta truncate">{titulo}</h2>
              {conversacionId && (
                <span className="numeral text-[0.8rem] text-tinta-3 shrink-0">N.º {conversacionId}</span>
              )}
            </div>
            <div className="text-[0.75rem] font-medium mt-0.5 truncate" aria-live="polite">
              {estado}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {puedeEscalar && (
            <button
              onClick={() => abrirModalEscalar("Solicitud directa de atención")}
              type="button"
              className="boton boton-coral boton-sm max-sm:!px-0 max-sm:!w-9"
              aria-label="Hablar con un ejecutivo"
              title="Hablar con un ejecutivo"
            >
              <Headphones size={15} />
              <span className="hidden sm:inline">Hablar con ejecutivo</span>
            </button>
          )}
          {!finalizado && mensajesReales.length > 0 && (
            <button
              onClick={() => setConfirmarFinalizar(true)}
              type="button"
              className="boton boton-secundario boton-sm max-sm:!px-0 max-sm:!w-9"
              aria-label="Finalizar consulta"
              title="Finalizar consulta"
            >
              <CheckCircle2 size={15} />
              <span className="hidden sm:inline">Finalizar</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Área de mensajes ───────────────────────────────────────── */}
      <div
        ref={areaRef}
        onScroll={alDesplazar}
        className="flex-1 min-h-0 overflow-y-auto barra-fina"
        role="log"
        aria-label="Conversación con el asistente"
        aria-busy={cargando || cargandoHistorial}
      >
        {esBienvenida ? (
          <Bienvenida nombre={usuario.nombre} onSugerencia={usarSugerencia} />
        ) : (
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
            {cargandoHistorial ? (
              <div className="space-y-6" role="status" aria-label="Cargando la consulta">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`flex gap-3 ${i % 2 ? "justify-end" : ""}`}>
                    {i % 2 === 0 && <Esqueleto className="w-8 h-9 !rounded-t-full shrink-0" />}
                    <div className={`space-y-2 ${i % 2 ? "w-1/2" : "w-2/3"}`}>
                      <Esqueleto className="h-4 w-full" />
                      <Esqueleto className="h-4 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              mensajes.map((m) =>
                m.emisor === "user" ? (
                  <div key={m.id} className="flex justify-end animate-aparecer">
                    <div className="max-w-[85%] sm:max-w-[78%] min-w-0 flex flex-col items-end">
                      <div className="burbuja-usuario px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
                        {m.texto}
                      </div>
                      <span className="text-[0.6875rem] text-tinta-3 mt-1.5 px-1 tabular-nums">Tú · {m.hora}</span>
                    </div>
                  </div>
                ) : m.error ? (
                  <div key={m.id} className="flex gap-3 animate-aparecer">
                    <span className="arco grid place-items-center w-8 h-9 shrink-0 bg-error-suave text-error">
                      <AlertTriangle size={15} />
                    </span>
                    <div className="max-w-[85%] sm:max-w-[78%] min-w-0">
                      <div className="burbuja-error px-4 py-3 text-[0.9rem] leading-relaxed" role="alert">
                        <p className="font-semibold text-error text-[0.8125rem] mb-0.5">No se pudo responder</p>
                        <p className="[overflow-wrap:anywhere]">{m.texto}</p>
                        {m.reintento && (
                          <button
                            type="button"
                            onClick={() => reintentar(m)}
                            disabled={cargando || !enLinea}
                            className="boton boton-secundario boton-sm mt-3"
                          >
                            <RotateCcw size={14} />
                            Reintentar
                          </button>
                        )}
                      </div>
                      <span className="text-[0.6875rem] text-tinta-3 mt-1.5 px-1 block tabular-nums">{m.hora}</span>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="group flex gap-3 animate-aparecer">
                    <AvatarAsistente size={30} />
                    <div className="max-w-[88%] sm:max-w-[80%] min-w-0">
                      <div className="burbuja-asistente px-4 sm:px-5 py-3.5 text-[0.9375rem] leading-relaxed text-tinta">
                        <TextoFormateado texto={m.texto} />

                        {/* Escalamiento sugerido por el asistente */}
                        {m.escalarEjecutivo && puedeEscalar && (
                          <div className="mt-3.5 pt-3.5 border-t border-dashed border-linea">
                            <p className="text-[0.8125rem] text-tinta-2 mb-2.5">
                              ¿No resolví tu duda? Un ejecutivo puede continuar tu caso.
                            </p>
                            <button
                              onClick={() => abrirModalEscalar("Duda no resuelta por la base de conocimiento")}
                              type="button"
                              className="boton boton-coral boton-sm"
                            >
                              <Headphones size={14} />
                              Hablar con un ejecutivo
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Pie del mensaje: hora, confianza, fuentes y copiar */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 px-1 text-[0.75rem] text-tinta-3">
                        <span className="tabular-nums">
                          <span className="font-semibold text-tinta-2">Luz</span> · {m.hora}
                        </span>
                        {m.nivelConfianza && (
                          <span
                            className={`flex items-center gap-1.5 font-medium ${CONFIANZA[m.nivelConfianza]?.color ?? ""}`}
                            title="Qué tan parecida es la respuesta a los documentos oficiales"
                          >
                            <MedidorConfianza nivel={m.nivelConfianza} />
                            {CONFIANZA[m.nivelConfianza]?.texto} · {Math.round((m.scoreMaximo || 0) * 100)}%
                          </span>
                        )}
                        {m.fuentes && m.fuentes.length > 0 && (
                          <button
                            onClick={() => toggleFuentes(m.id)}
                            type="button"
                            aria-expanded={!!mostrarFuentes[m.id]}
                            className="flex items-center gap-1 font-medium text-tinta-2 hover:text-petroleo transition-colors"
                          >
                            {m.fuentes.length} {m.fuentes.length === 1 ? "fuente" : "fuentes"}
                            <ChevronDown
                              size={13}
                              className={`transition-transform duration-300 ${mostrarFuentes[m.id] ? "rotate-180" : ""}`}
                            />
                          </button>
                        )}
                        {m.id !== "init" && (
                          <button
                            type="button"
                            onClick={() => copiarMensaje(m)}
                            aria-label={copiadoId === m.id ? "Respuesta copiada" : "Copiar respuesta"}
                            title="Copiar respuesta"
                            className="flex items-center gap-1 font-medium text-tinta-2 hover:text-petroleo transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100"
                          >
                            {copiadoId === m.id ? <Check size={13} className="text-exito" /> : <Copy size={13} />}
                            <span>{copiadoId === m.id ? "Copiado" : "Copiar"}</span>
                          </button>
                        )}
                      </div>

                      {/* Fragmentos de documentos consultados */}
                      {mostrarFuentes[m.id] && m.fuentes && (
                        <div className="mt-2.5 rounded-2xl border border-linea bg-papel-2/50 p-3 space-y-2.5 animate-aparecer">
                          <p className="ceja px-1">Fragmentos consultados</p>
                          {m.fuentes.map((f) => (
                            <figure key={f.id_fragmento} className="rounded-xl bg-superficie border border-linea px-3.5 py-3">
                              <figcaption className="flex items-center justify-between gap-3 text-[0.75rem]">
                                <span className="font-semibold text-tinta">Fragmento #{f.id_fragmento}</span>
                                <span className="flex items-center gap-2 text-tinta-2 tabular-nums">
                                  <span className="w-16 h-1.5 rounded-full bg-papel-2 overflow-hidden" aria-hidden="true">
                                    <span
                                      className="block h-full rounded-full bg-petroleo"
                                      style={{ width: `${Math.round(f.similitud * 100)}%` }}
                                    />
                                  </span>
                                  {Math.round(f.similitud * 100)}% similitud
                                </span>
                              </figcaption>
                              <blockquote className="mt-2 text-[0.8125rem] text-tinta-2 leading-relaxed italic [overflow-wrap:anywhere]">
                                “{f.extracto}”
                              </blockquote>
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              )
            )}

            {/* Indicador de respuesta en curso */}
            {cargando && (
              <div className="flex gap-3 animate-aparecer" role="status">
                <AvatarAsistente size={30} activo />
                <div className="burbuja-asistente px-4 py-3 flex items-center gap-3 text-[0.8125rem] text-tinta-2">
                  <IndicadorVentanas />
                  <span>Luz está buscando en los documentos de tu comunidad…</span>
                </div>
              </div>
            )}

            {/* Tarjeta de cierre y calificación */}
            {finalizado && !cargandoHistorial && (
              <div className="pt-4 animate-aparecer">
                <div className="superficie max-w-md mx-auto p-6 text-center">
                  <div className="arco bg-noche w-fit mx-auto p-2.5 pt-4">
                    <Fachada
                      columnas={3}
                      filas={2}
                      proporcion={calificacionEnviada ? 1 : 0.34}
                      animada={false}
                      semilla={conversacionId ?? 3}
                      tamanoVentana="9px"
                      separacion="5px"
                    />
                  </div>
                  <h3 className="titular text-[1.35rem] mt-4">Consulta finalizada</h3>
                  {!calificacionEnviada ? (
                    <>
                      <p className="text-sm text-tinta-2 mt-1.5">¿Te sirvió la orientación de Luz?</p>
                      <div
                        className="flex justify-center gap-1 pt-4"
                        role="radiogroup"
                        aria-label="Califica la orientación de 1 a 5 estrellas"
                        onMouseLeave={() => setEstrellaHover(0)}
                      >
                        {[1, 2, 3, 4, 5].map((est) => {
                          const activa = (estrellaHover || calificacion || 0) >= est;
                          return (
                            <button
                              key={est}
                              onClick={() => enviarCalificacion(est)}
                              onMouseEnter={() => setEstrellaHover(est)}
                              onFocus={() => setEstrellaHover(est)}
                              onBlur={() => setEstrellaHover(0)}
                              type="button"
                              role="radio"
                              aria-checked={calificacion === est}
                              aria-label={`${est} ${est === 1 ? "estrella" : "estrellas"}`}
                              disabled={!conversacionId}
                              className="p-1.5 rounded-full transition-transform duration-200 hover:scale-115 active:scale-95"
                            >
                              <Star
                                size={28}
                                strokeWidth={1.6}
                                className={`transition-colors duration-150 ${
                                  activa ? "fill-luz text-luz drop-shadow-[0_0_8px_rgba(242,180,65,0.55)]" : "text-linea-fuerte"
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[0.75rem] text-tinta-3 mt-2 h-4">
                        {["", "No me sirvió", "Me sirvió poco", "Más o menos", "Me sirvió", "Me sirvió mucho"][estrellaHover]}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-exito font-medium mt-2 animate-aparecer">
                      ¡Gracias! Calificaste esta orientación con {calificacion}{" "}
                      {calificacion === 1 ? "estrella" : "estrellas"}.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ir al último mensaje (conversaciones largas) */}
      {!alFondo && !esBienvenida && (
        <button
          type="button"
          onClick={irAlFinal}
          className="absolute left-1/2 -translate-x-1/2 bottom-[7.5rem] z-10 boton boton-secundario boton-sm shadow-[var(--sombra-flotante)] animate-aparecer"
        >
          <ArrowDown size={14} />
          Ir al último mensaje
        </button>
      )}

      {/* ── Zona de escritura ──────────────────────────────────────── */}
      <div className="shrink-0 px-3 sm:px-6 lg:px-8 pt-2 pb-3 sm:pb-5 bg-gradient-to-t from-papel via-papel to-papel/0">
        <div className="max-w-3xl mx-auto">
          {finalizado ? (
            <div className="superficie px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-tinta-2">
              <span>Esta consulta terminó. Puedes releerla cuando quieras desde tu historial.</span>
              {onNuevaConversacion && (
                <button onClick={onNuevaConversacion} type="button" className="boton boton-primario boton-sm shrink-0">
                  <Plus size={15} />
                  Nueva consulta
                </button>
              )}
            </div>
          ) : yaEscalado ? (
            <div className="rounded-[1.125rem] border border-coral/35 bg-coral-suave/60 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-tinta">
              <span className="flex items-start gap-2.5">
                <Headphones size={17} className="shrink-0 text-coral-tinta mt-0.5" />
                Un ejecutivo continuará esta consulta. Sigue su avance en “Mis solicitudes”.
              </span>
              {onNuevaConversacion && (
                <button onClick={onNuevaConversacion} type="button" className="boton boton-primario boton-sm shrink-0">
                  <Plus size={15} />
                  Nueva consulta
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={enviarMensaje}>
              <div className="compositor flex items-end gap-2 pl-4 pr-2 py-2">
                <label htmlFor="mensaje-asistente" className="sr-only">
                  Escribe tu consulta
                </label>
                <textarea
                  id="mensaje-asistente"
                  ref={textareaRef}
                  rows={1}
                  disabled={cargando}
                  maxLength={LIMITE_MENSAJE}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={alTeclearCompositor}
                  placeholder={esBienvenida ? "Escribe tu pregunta sobre tu comunidad…" : "Escribe un mensaje…"}
                  className="flex-1 resize-none bg-transparent py-2 text-[0.9375rem] leading-relaxed text-tinta placeholder:text-tinta-3 focus:outline-none disabled:opacity-60 max-h-[168px] barra-fina"
                />
                <button
                  type="submit"
                  disabled={cargando || !input.trim() || !enLinea}
                  aria-label="Enviar mensaje"
                  className={`grid place-items-center w-10 h-10 rounded-full shrink-0 transition-all duration-300 ease-curva
                    ${input.trim() && !cargando && enLinea
                      ? "bg-petroleo text-white shadow-[0_0_0_4px_rgba(242,180,65,0.28)] hover:bg-petroleo-hover active:scale-90"
                      : "bg-papel-2 text-tinta-3"}`}
                >
                  <ArrowUp size={19} strokeWidth={2.4} />
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 pt-2 text-[0.6875rem] text-tinta-3">
                <span className="truncate">
                  {!enLinea ? (
                    "Sin conexión: podrás enviar cuando vuelva internet."
                  ) : (
                    <>
                      <span className="sm:hidden">Responde con documentos oficiales.</span>
                      <span className="hidden sm:inline">Respuestas basadas en los documentos publicados por la administración.</span>
                    </>
                  )}
                </span>
                <span className="hidden sm:flex items-center gap-1.5 shrink-0">
                  {input.length > LIMITE_MENSAJE - 300 ? (
                    <span className={`tabular-nums ${input.length >= LIMITE_MENSAJE ? "text-error font-semibold" : ""}`}>
                      {input.length}/{LIMITE_MENSAJE}
                    </span>
                  ) : (
                    <>
                      <kbd className="tecla">Enter</kbd> envía · <kbd className="tecla">Shift</kbd>+<kbd className="tecla">Enter</kbd> salto
                    </>
                  )}
                </span>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* ── Confirmar fin de la consulta ───────────────────────────── */}
      <Modal
        abierto={confirmarFinalizar}
        onCerrar={() => setConfirmarFinalizar(false)}
        bloqueado={finalizando}
        icono={<CheckCircle2 size={19} />}
        titulo="¿Finalizar esta consulta?"
        descripcion="Quedará guardada en tu historial en modo lectura y podrás calificar la orientación recibida."
        pie={
          <>
            <button type="button" onClick={() => setConfirmarFinalizar(false)} disabled={finalizando} className="boton boton-fantasma">
              Seguir conversando
            </button>
            <button type="button" onClick={handleFinalizarConversacion} disabled={finalizando} className="boton boton-primario">
              {finalizando ? <IndicadorVentanas /> : <CheckCircle2 size={16} />}
              {finalizando ? "Finalizando…" : "Finalizar consulta"}
            </button>
          </>
        }
      />

      {/* ── Escalar a un ejecutivo ─────────────────────────────────── */}
      <Modal
        abierto={modalEscalar}
        onCerrar={() => setModalEscalar(false)}
        bloqueado={escalando}
        tono="coral"
        ancho="md"
        icono={<Headphones size={19} />}
        titulo="Hablar con un ejecutivo"
        descripcion="Crearemos una solicitud para que el equipo de administración continúe tu caso personalmente. Podrás seguirla en Mis solicitudes."
        pie={
          <>
            <button type="button" onClick={() => setModalEscalar(false)} disabled={escalando} className="boton boton-fantasma">
              Cancelar
            </button>
            <button
              type="submit"
              form="form-escalar"
              disabled={escalando || !tituloTicket.trim() || !descTicket.trim()}
              className="boton boton-primario"
            >
              {escalando ? <IndicadorVentanas /> : <Headphones size={16} />}
              {escalando ? "Creando solicitud…" : "Crear solicitud"}
            </button>
          </>
        }
      >
        <form id="form-escalar" onSubmit={handleEscalarTicket} className="space-y-4">
          {errorEscalar && <Aviso icono={<AlertTriangle size={16} />}>{errorEscalar}</Aviso>}
          <div>
            <label htmlFor="escalar-titulo" className="etiqueta">
              Título del caso
            </label>
            <input
              id="escalar-titulo"
              type="text"
              required
              maxLength={200}
              value={tituloTicket}
              onChange={(e) => setTituloTicket(e.target.value)}
              className="campo"
            />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="escalar-descripcion" className="etiqueta">
                ¿Qué necesitas?
              </label>
              <span className="text-[0.6875rem] text-tinta-3 tabular-nums">{descTicket.length}/5000</span>
            </div>
            <textarea
              id="escalar-descripcion"
              rows={5}
              required
              maxLength={5000}
              value={descTicket}
              onChange={(e) => setDescTicket(e.target.value)}
              placeholder="Cuéntale al ejecutivo los detalles: qué pasó, dónde y desde cuándo."
              className="campo"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────
   Pantalla de bienvenida: el primer contacto con el asistente
   ───────────────────────────────────────────────────────────────────── */
const PASOS = [
  { titulo: "Pregunta", texto: "Escríbele como le hablarías a la administración." },
  { titulo: "Respuesta con respaldo", texto: "Verás de qué documento sale y cuánta confianza tiene." },
  { titulo: "Una persona, si hace falta", texto: "Deriva tu caso a un ejecutivo y síguelo en Mis solicitudes." },
];

const Bienvenida = ({ nombre, onSugerencia }: { nombre: string; onSugerencia: (pregunta: string) => void }) => (
  <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 sm:pt-14 pb-8">
    <div className="flex items-start justify-between gap-8">
      <div className="min-w-0 escalonado">
        <p className="ceja flex items-center gap-2">
          <span className="ventana ventana-encendida w-[7px] h-[9px]" aria-hidden="true" />
          Luz · asistente de Comunidad Clara
        </p>
        <h1 className="titular text-[2.2rem] sm:text-[2.7rem] mt-4 text-tinta">
          {saludoSegunHora()}, {nombre}.
          <br />
          <em>Soy Luz,</em> ¿en qué te ayudo?
        </h1>
        <p className="text-[0.975rem] text-tinta-2 mt-4 max-w-xl leading-relaxed">
          Respondo con los reglamentos y documentos que publica la administración de tu comunidad. Si algo no está en
          ellos, te conecto con un ejecutivo del equipo.
        </p>
      </div>

      {/* Fachada: el edificio que "se enciende" con cada consulta */}
      <div className="hidden md:block shrink-0 animate-aparecer-lento" aria-hidden="true">
        <div className="arco bg-noche px-4 pt-9 pb-4 shadow-[0_30px_60px_-30px_rgba(14,38,36,0.8)]">
          <Fachada columnas={4} filas={5} proporcion={0.36} semilla={nombre.length + 11} tamanoVentana="15px" separacion="9px" intervalo={1600} />
        </div>
        <div className="h-2 mx-[-10px] rounded-full bg-noche/10 mt-1.5" />
        <p className="ceja !text-[0.6rem] text-center mt-3 max-w-[9rem] mx-auto leading-relaxed">
          Cada ventana encendida, un vecino atendido
        </p>
      </div>
    </div>

    {/* Sugerencias */}
    <div className="mt-8 sm:mt-10">
      <p className="ceja mb-3">Para empezar, elige un tema</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 escalonado">
        {SUGERENCIAS.map(({ tema, pregunta, icono: Icono }) => (
          <button
            key={tema}
            type="button"
            onClick={() => onSugerencia(pregunta)}
            className="group superficie superficie-interactiva text-left p-3.5 sm:p-4 flex sm:flex-col items-center sm:items-stretch gap-3.5 sm:gap-3 sm:min-h-[8.5rem]"
          >
            <span className="flex items-center justify-between shrink-0">
              <span className="arco grid place-items-center w-9 h-10 bg-menta text-petroleo-hover transition-colors duration-300 group-hover:bg-noche group-hover:text-luz">
                <Icono size={17} />
              </span>
              <ArrowRight
                size={16}
                className="hidden sm:block text-tinta-3 opacity-0 -translate-x-2 transition-all duration-300 ease-curva group-hover:opacity-100 group-hover:translate-x-0 group-focus-visible:opacity-100"
              />
            </span>
            <span className="min-w-0">
              <span className="block text-[0.75rem] font-semibold text-petroleo">{tema}</span>
              <span className="block text-[0.875rem] text-tinta mt-0.5 leading-snug">{pregunta}</span>
            </span>
          </button>
        ))}
      </div>
    </div>

    {/* Cómo funciona */}
    <div className="mt-10">
      <p className="ceja mb-3">Cómo funciona</p>
      <ol className="grid sm:grid-cols-3 gap-px rounded-2xl overflow-hidden border border-linea bg-linea">
        {PASOS.map((p, i) => (
          <li
            key={p.titulo}
            className="bg-superficie/70 px-4 py-3.5 sm:py-4 flex sm:block items-baseline gap-3 animate-aparecer"
            style={{ animationDelay: `${0.3 + i * 0.06}s` }}
          >
            <span className="numeral text-[1.2rem] sm:text-[1.35rem] text-petroleo shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <span className="block">
              <span className="block text-[0.875rem] font-semibold text-tinta sm:mt-1">{p.titulo}</span>
              <span className="block text-[0.8125rem] text-tinta-2 mt-0.5 leading-snug">{p.texto}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  </section>
);
