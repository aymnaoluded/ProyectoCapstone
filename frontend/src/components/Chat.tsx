import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  User,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Headphones,
  CheckCircle,
  Star,
  X,
  Loader2,
  Plus,
  BookOpen
} from "lucide-react";
import type { Mensaje, Usuario, ConversacionDetalle } from "../types";
import { cabecerasAuth, API_URL } from "../utils/api";

interface ChatProps {
  usuario: Usuario;
  conversacionIdProp?: number | null;
  onConversacionCreada?: (id: number) => void;
  onConversacionActualizada?: () => void;
  onNuevaConversacion?: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  usuario,
  conversacionIdProp,
  onConversacionCreada,
  onConversacionActualizada,
  onNuevaConversacion,
}) => {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: "init",
      emisor: "bot",
      texto: `Hola ${usuario.nombre}, soy tu asistente virtual SupportAI. ¿En qué puedo ayudarte hoy con la base de conocimiento?`,
      hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [conversacionInfo, setConversacionInfo] = useState<ConversacionDetalle | null>(null);
  const [mostrarFuentes, setMostrarFuentes] = useState<Record<string, boolean>>({});

  const [finalizado, setFinalizado] = useState(false);
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [calificacionEnviada, setCalificacionEnviada] = useState(false);
  const [yaEscalado, setYaEscalado] = useState(false);

  // Modal de escalamiento
  const [modalEscalar, setModalEscalar] = useState(false);
  const [tituloTicket, setTituloTicket] = useState("");
  const [descTicket, setDescTicket] = useState("");
  const [escalando, setEscalando] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversacionIdProp) {
      setConversacionId(null);
      setConversacionInfo(null);
      setMensajes([
        {
          id: "init",
          emisor: "bot",
          texto: `Hola ${usuario.nombre}, soy tu asistente virtual SupportAI. ¿En qué puedo ayudarte hoy?`,
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
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
        const res = await fetch(
          `${API_URL}/api/chat/conversaciones/${conversacionIdProp}`,
          { headers: cabecerasAuth() }
        );
        if (!res.ok) throw new Error("Error al cargar la conversación");

        const data = await res.json();
        setConversacionId(data.conversacion.id_conversacion);
        setConversacionInfo(data.conversacion);
        if (data.mensajes && data.mensajes.length > 0) {
          setMensajes(data.mensajes);
        } else {
          setMensajes([
            {
              id: "init",
              emisor: "bot",
              texto: `Hola ${usuario.nombre}, soy tu asistente virtual SupportAI. ¿En qué puedo ayudarte hoy?`,
              hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }

        const estaFinalizada = Boolean(
          data.conversacion.finalizada ||
            data.conversacion.fecha_fin ||
            data.conversacion.calificacion
        );
        setFinalizado(estaFinalizada);
        setCalificacion(data.conversacion.calificacion);
        setCalificacionEnviada(data.conversacion.calificacion !== null);
        setYaEscalado(Boolean(data.conversacion.escalada));
      } catch (err) {
        console.error("Error cargando historial de chat:", err);
      } finally {
        setCargandoHistorial(false);
      }
    };

    cargarConversacion();
  }, [conversacionIdProp, usuario.nombre]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, finalizado, cargandoHistorial]);

  const toggleFuentes = (id: string) => {
    setMostrarFuentes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const abrirModalEscalar = (motivoSugerido?: string) => {
    setTituloTicket(
      motivoSugerido || `Consulta escalada desde chat #${conversacionId || "general"}`
    );

    const contextoConversacion = mensajes
      .filter((m) => m.id !== "init")
      .map((m) => `${m.emisor === "user" ? "Cliente" : "IA"}: ${m.texto}`)
      .slice(-4)
      .join("\n\n");

    setDescTicket(
      contextoConversacion || "El cliente requiere atención personalizada de un ejecutivo humano."
    );
    setModalEscalar(true);
  };

  const enviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || cargando || finalizado || yaEscalado) return;

    const textoPregunta = input.trim();
    const nuevoMsgUser: Mensaje = {
      id: Date.now().toString(),
      emisor: "user",
      texto: textoPregunta,
      hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMensajes((prev) => [...prev, nuevoMsgUser]);
    setInput("");
    setCargando(true);

    const esPrimeraPregunta = !conversacionId;

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          mensaje: textoPregunta,
          conversacion_id: conversacionId,
        }),
      });

      if (!res.ok) {
        if (res.status === 409) {
          setYaEscalado(true);
        }
        throw new Error("Error en la respuesta del asistente");
      }

      const data = await res.json();
      setConversacionId(data.conversacion_id);

      const nuevoMsgBot: Mensaje = {
        id: (Date.now() + 1).toString(),
        emisor: "bot",
        texto: data.respuesta,
        hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        nivelConfianza: data.nivel_confianza,
        scoreMaximo: data.score_maximo,
        escalarEjecutivo: data.escalar_ejecutivo,
        fuentes: data.fuentes,
      };

      setMensajes((prev) => [...prev, nuevoMsgBot]);

      if (esPrimeraPregunta && onConversacionCreada) {
        onConversacionCreada(data.conversacion_id);
      } else if (onConversacionActualizada) {
        onConversacionActualizada();
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          emisor: "bot",
          texto: "Ocurrió un error al contactar el servidor. Por favor intenta nuevamente.",
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleEscalarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTicket.trim() || !descTicket.trim() || escalando || yaEscalado) return;

    setEscalando(true);
    try {
      const res = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          titulo: tituloTicket.trim(),
          descripcion: descTicket.trim(),
          conversacion_id: conversacionId,
        }),
      });

      if (res.ok) {
        const ticketData = await res.json();
        setModalEscalar(false);
        setYaEscalado(true);
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            emisor: "bot",
            texto: `Se generó el Ticket #${ticketData.id_ticket} con éxito. Un ejecutivo revisará tu caso en la bandeja de soporte. Puedes revisar el avance en "Mis Solicitudes".`,
            hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
        if (onConversacionActualizada) onConversacionActualizada();
      } else if (res.status === 409) {
        const errorData = await res.json().catch(() => null);
        setYaEscalado(true);
        setModalEscalar(false);
        alert(errorData?.detail || "Esta conversación ya fue escalada anteriormente.");
      } else {
        alert("Error al generar el ticket.");
      }
    } catch {
      alert("Error de red al crear el ticket.");
    } finally {
      setEscalando(false);
    }
  };

  const handleFinalizarConversacion = async () => {
    if (!conversacionId) {
      setFinalizado(true);
      return;
    }

    try {
      await fetch(`${API_URL}/api/chat/finalizar`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ conversacion_id: conversacionId }),
      });
      setFinalizado(true);
      if (onConversacionActualizada) onConversacionActualizada();
    } catch (err) {
      console.error(err);
      setFinalizado(true);
    }
  };

  const enviarCalificacion = async (estrellas: number) => {
    setCalificacion(estrellas);
    if (!conversacionId) {
      setCalificacionEnviada(true);
      return;
    }

    try {
      await fetch(`${API_URL}/api/chat/finalizar`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          conversacion_id: conversacionId,
          calificacion: estrellas,
        }),
      });
      setCalificacionEnviada(true);
      if (onConversacionActualizada) onConversacionActualizada();
    } catch {
      setCalificacionEnviada(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden relative">
      {/* Cabecera del Chat - Liquid Glass Bar */}
      <div className="liquid-glass border-b border-[var(--border-glass)] px-5 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0 ring-1 ring-white/20">
            <Sparkles size={20} />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)] truncate">
                {conversacionInfo?.titulo || "Soporte Virtual IA"}
              </h2>
              {conversacionId && (
                <span className="text-[10px] font-semibold text-[var(--accent-primary)] bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                  #{conversacionId}
                </span>
              )}
            </div>
            <p className="text-xs font-medium flex items-center gap-1.5 truncate mt-0.5">
              {finalizado ? (
                <span className="text-[var(--text-tertiary)] flex items-center gap-1">
                  <BookOpen size={12} />
                  Modo lectura · Conversación finalizada
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  En línea · Asistente con IA & RAG
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Acciones superiores con estilo Glass Pill */}
        <div className="flex items-center gap-2">
          {!finalizado && (
            <>
              {yaEscalado ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <CheckCircle size={14} />
                  <span className="hidden sm:inline">Escalado a ejecutivo</span>
                </span>
              ) : (
                <button
                  onClick={() => abrirModalEscalar("Solicitud directa de atención con ejecutivo")}
                  className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Headphones size={14} />
                  <span className="hidden sm:inline">Hablar con ejecutivo</span>
                </button>
              )}

              <button
                onClick={handleFinalizarConversacion}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] liquid-glass border border-[var(--border-glass)] hover:bg-[var(--bg-card-hover)] px-3 py-1.5 rounded-full transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <CheckCircle size={14} />
                <span>Finalizar</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Área del Hilo Centralizado */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 apple-scrollbar">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Banner si el chat está finalizado */}
          {finalizado && !cargandoHistorial && (
            <div className="liquid-glass border border-[var(--border-glass)] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Conversación finalizada{" "}
                    {conversacionInfo?.fecha_fin ? `el ${conversacionInfo.fecha_fin}` : ""}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    Estás visualizando este chat en modo consulta histórica.
                  </p>
                </div>
              </div>

              {onNuevaConversacion && (
                <button
                  onClick={onNuevaConversacion}
                  className="apple-btn-primary text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Plus size={14} />
                  <span>Nuevo chat</span>
                </button>
              )}
            </div>
          )}

          {/* Estado de Carga del Historial */}
          {cargandoHistorial ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3 text-[var(--text-tertiary)]">
              <Loader2 size={26} className="animate-spin text-[var(--accent-primary)]" />
              <p className="text-xs font-medium">Recuperando conversación...</p>
            </div>
          ) : (
            mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3.5 ${m.emisor === "user" ? "justify-end" : "justify-start"} animate-scale-up`}
              >
                {m.emisor === "bot" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 ring-1 ring-white/20">
                    <Sparkles size={15} />
                  </div>
                )}

                <div className="space-y-1 max-w-[85%] sm:max-w-[75%]">
                  <div
                    className={`p-4 rounded-2xl text-[13.5px] leading-relaxed ${
                      m.emisor === "user"
                        ? "bg-gradient-to-r from-[#007AFF] to-[#0A84FF] text-white shadow-md shadow-blue-500/20 rounded-br-xs"
                        : "liquid-glass border border-[var(--border-glass)] text-[var(--text-primary)] rounded-tl-xs shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.texto}</div>

                    {/* Botón contextual de escalamiento */}
                    {m.emisor === "bot" && m.escalarEjecutivo && !finalizado && !yaEscalado && (
                      <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <button
                          onClick={() => abrirModalEscalar("Duda no resuelta por la IA")}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl transition-all cursor-pointer active:scale-98"
                        >
                          <Headphones size={14} />
                          <span>¿No resuelve tu duda? Escalar con un ejecutivo humano</span>
                        </button>
                      </div>
                    )}

                    {/* Insignia de Confianza estilo Apple */}
                    {m.emisor === "bot" && m.nivelConfianza && (
                      <div className="mt-3 pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium">
                          {m.nivelConfianza === "ALTA" ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <ShieldCheck size={14} /> Alta Confianza ({Math.round((m.scoreMaximo || 0) * 100)}%)
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <AlertTriangle size={14} /> Confianza Parcial ({Math.round((m.scoreMaximo || 0) * 100)}%)
                            </span>
                          )}
                        </div>

                        {m.fuentes && m.fuentes.length > 0 && (
                          <button
                            onClick={() => toggleFuentes(m.id)}
                            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          >
                            <span>{m.fuentes.length} fuentes</span>
                            {mostrarFuentes[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Despliegue de fuentes RAG en Glass card */}
                    {mostrarFuentes[m.id] && m.fuentes && (
                      <div className="mt-2.5 space-y-1.5 bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-subtle)]">
                        {m.fuentes.map((f) => (
                          <div key={f.id_fragmento} className="text-[11px] text-[var(--text-secondary)]">
                            <span className="font-semibold text-[var(--text-primary)]">
                              Fragmento #{f.id_fragmento} ({Math.round(f.similitud * 100)}%):
                            </span>
                            <p className="italic text-[var(--text-secondary)] mt-0.5">"{f.extracto}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] text-[var(--text-tertiary)] block px-1.5 ${
                      m.emisor === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {m.hora}
                  </span>
                </div>

                {m.emisor === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface-elevated)] border border-[var(--border-glass)] text-[var(--text-secondary)] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Indicador de escritura animado Apple */}
          {cargando && (
            <div className="flex gap-3.5 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5 ring-1 ring-white/20">
                <Sparkles size={15} className="animate-spin" />
              </div>
              <div className="liquid-glass border border-[var(--border-glass)] rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-[var(--text-secondary)] shadow-xs flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[var(--accent-primary)] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span className="font-medium text-[11px]">Consultando en base de conocimiento...</span>
              </div>
            </div>
          )}

          {/* Tarjeta de Calificación al finalizar */}
          {finalizado && !cargandoHistorial && (
            <div className="liquid-glass-elevated border border-[var(--border-glass)] rounded-3xl p-6 text-center max-w-md mx-auto my-6 space-y-3 shadow-lg">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle size={26} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Conversación finalizada</h3>
              <p className="text-xs text-[var(--text-secondary)]">¿Cómo evaluarías la atención del asistente inteligente?</p>

              {!calificacionEnviada ? (
                <div className="flex justify-center gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((est) => (
                    <button
                      key={est}
                      onClick={() => enviarCalificacion(est)}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-amber-400 hover:scale-125 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star
                        size={24}
                        className={calificacion && calificacion >= est ? "fill-amber-400 text-amber-400" : ""}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-2 px-4 rounded-xl inline-block font-semibold">
                  ¡Gracias por calificar con {calificacion} estrellas!
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input de Mensaje Flotante estilo Cápsula Apple */}
      <div className="p-4 sm:p-5 shrink-0 relative z-10">
        <div className="max-w-3xl mx-auto">
          {finalizado ? (
            <div className="liquid-glass border border-[var(--border-glass)] rounded-2xl px-5 py-3.5 text-xs text-[var(--text-secondary)] flex items-center justify-between gap-4 shadow-sm">
              <span className="font-medium text-[var(--text-secondary)]">
                Esta conversación ha concluido. Puedes iniciar una nueva consulta en cualquier momento.
              </span>
              {onNuevaConversacion && (
                <button
                  onClick={onNuevaConversacion}
                  className="apple-btn-primary px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Nueva consulta</span>
                </button>
              )}
            </div>
          ) : yaEscalado ? (
            <div className="liquid-glass border border-amber-500/20 rounded-2xl px-5 py-3.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-4 shadow-sm bg-amber-500/5">
              <span className="font-medium flex items-center gap-2">
                <Headphones size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
                Esta conversación fue escalada a un ticket. Puedes seguir su avance en "Mis Solicitudes".
              </span>
              {onNuevaConversacion && (
                <button
                  onClick={onNuevaConversacion}
                  className="apple-btn-primary px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 text-xs font-semibold"
                >
                  <Plus size={14} />
                  <span>Nueva consulta</span>
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={enviarMensaje} className="relative flex items-center">
              <input
                type="text"
                disabled={cargando}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta sobre los documentos..."
                className="liquid-input w-full rounded-2xl py-3.5 pl-5 pr-14 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none transition-all shadow-sm"
              />
              <button
                type="submit"
                disabled={cargando || !input.trim()}
                aria-label="Enviar mensaje"
                className="absolute right-2 w-9 h-9 rounded-xl bg-[var(--accent-primary)] hover:brightness-110 active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-sm shadow-blue-500/25 cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Escalamiento a Ticket estilo iOS Sheet */}
      {modalEscalar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass-elevated border border-[var(--border-glass)] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                  <Headphones size={20} />
                </div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">Escalar a un ejecutivo</h2>
              </div>
              <button
                onClick={() => setModalEscalar(false)}
                className="p-1 rounded-full text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Generaremos un ticket formal para que nuestro equipo continúe tu atención de manera personalizada.
            </p>

            <form onSubmit={handleEscalarTicket} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Título del caso
                </label>
                <input
                  type="text"
                  required
                  value={tituloTicket}
                  onChange={(e) => setTituloTicket(e.target.value)}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Descripción / Contexto
                </label>
                <textarea
                  rows={4}
                  required
                  value={descTicket}
                  onChange={(e) => setDescTicket(e.target.value)}
                  className="liquid-input w-full rounded-xl p-3 text-xs text-[var(--text-primary)] focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalEscalar(false)}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={escalando}
                  className="apple-btn-primary text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {escalando ? "Creando ticket..." : "Confirmar y Escalar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
