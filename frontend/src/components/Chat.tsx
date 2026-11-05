import React, { useState, useRef, useEffect } from "react";
import {
  Send,
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
  BookOpen,
  Building2,
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
      texto: `Hola ${usuario.nombre}, soy el asistente virtual de Comunidad Clara Administraciones. ¿En qué puedo orientarte hoy respecto a tu comunidad, reglamentos o solicitudes?`,
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
          texto: `Hola ${usuario.nombre}, soy el asistente virtual de Comunidad Clara Administraciones. ¿En qué puedo orientarte hoy?`,
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
              texto: `Hola ${usuario.nombre}, soy el asistente virtual de Comunidad Clara Administraciones. ¿En qué puedo orientarte hoy?`,
              hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
        setFinalizado(data.conversacion.finalizada || false);
        setCalificacion(data.conversacion.calificacion || null);
        setCalificacionEnviada(!!data.conversacion.calificacion);
        setYaEscalado(data.conversacion.escalada || false);
      } catch (err) {
        console.error("Error al cargar conversación:", err);
      } finally {
        setCargandoHistorial(false);
      }
    };

    cargarConversacion();
  }, [conversacionIdProp, usuario.nombre]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando]);

  const toggleFuentes = (id: string) => {
    setMostrarFuentes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const enviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || cargando || finalizado) return;

    const textoUsuario = input.trim();
    setInput("");

    const nuevoMensajeUsuario: Mensaje = {
      id: Date.now().toString(),
      emisor: "user",
      texto: textoUsuario,
      hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMensajes((prev) => [...prev, nuevoMensajeUsuario]);
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: cabecerasAuth(),
        body: JSON.stringify({
          mensaje: textoUsuario,
          cliente_id: usuario.id_usuario,
          conversacion_id: conversacionId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Error en el asistente virtual.");
      }

      const data = await res.json();

      if (!conversacionId && data.conversacion_id) {
        setConversacionId(data.conversacion_id);
        if (onConversacionCreada) {
          onConversacionCreada(data.conversacion_id);
        }
      }

      const nuevoMensajeBot: Mensaje = {
        id: (Date.now() + 1).toString(),
        emisor: "bot",
        texto: data.respuesta,
        hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
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
          texto:
            err instanceof Error
              ? `Aviso: ${err.message}`
              : "No pude procesar tu solicitud. Por favor intenta nuevamente.",
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleFinalizarConversacion = async () => {
    if (!conversacionId) {
      setFinalizado(true);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/chat/conversaciones/${conversacionId}/finalizar`, {
        method: "PUT",
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        setFinalizado(true);
        if (onConversacionActualizada) {
          onConversacionActualizada();
        }
      }
    } catch (err) {
      console.error("Error al finalizar conversación:", err);
    }
  };

  const enviarCalificacion = async (puntos: number) => {
    if (!conversacionId) return;

    try {
      const res = await fetch(`${API_URL}/api/chat/conversaciones/${conversacionId}/calificar`, {
        method: "PUT",
        headers: cabecerasAuth(),
        body: JSON.stringify({ calificacion: puntos }),
      });
      if (res.ok) {
        setCalificacion(puntos);
        setCalificacionEnviada(true);
        if (onConversacionActualizada) {
          onConversacionActualizada();
        }
      }
    } catch (err) {
      console.error("Error al calificar conversación:", err);
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
    setModalEscalar(true);
  };

  const handleEscalarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conversacionId || !tituloTicket.trim() || !descTicket.trim()) return;

    setEscalando(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/conversaciones/${conversacionId}/escalar`, {
        method: "POST",
        headers: cabecerasAuth(),
        body: JSON.stringify({
          titulo: tituloTicket.trim(),
          descripcion: descTicket.trim(),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "No se pudo generar el ticket.");
      }

      const data = await res.json();
      setYaEscalado(true);
      setModalEscalar(false);

      setMensajes((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          emisor: "bot",
          texto: `Se ha generado formalmente el Ticket #${data.id_ticket}: "${tituloTicket}". El equipo de administración revisará tu caso a la brevedad.`,
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      if (onConversacionActualizada) {
        onConversacionActualizada();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al escalar el caso.");
    } finally {
      setEscalando(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F5F7FA] overflow-hidden relative font-sans">
      {/* Cabecera del Chat */}
      <div className="bg-white border-b border-[#E4E7EB] px-5 py-3.5 flex items-center justify-between shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-lg bg-[#1E4E79] text-white flex items-center justify-center shadow-xs shrink-0">
            <Building2 size={20} className="text-[#E3A21A]" />
          </div>
          <div className="overflow-hidden">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold font-heading text-[#173C5E] truncate">
                {conversacionInfo?.titulo || "Orientación y Consultas con IA"}
              </h2>
              {conversacionId && (
                <span className="text-[10px] font-semibold text-[#1E4E79] bg-[#1E4E79]/10 border border-[#1E4E79]/20 px-2 py-0.5 rounded-md">
                  #{conversacionId}
                </span>
              )}
            </div>
            <p className="text-xs font-medium flex items-center gap-1.5 truncate mt-0.5">
              {finalizado ? (
                <span className="text-[#7B8794] flex items-center gap-1">
                  <BookOpen size={12} />
                  Modo lectura · Consulta finalizada
                </span>
              ) : (
                <span className="text-[#47705A] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#47705A]"></span>
                  En línea · Base de Conocimiento RAG
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Acciones superiores */}
        <div className="flex items-center gap-2">
          {!finalizado && (
            <>
              {yaEscalado ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#47705A] bg-[#47705A]/10 border border-[#47705A]/20 px-3 py-1.5 rounded-lg">
                  <CheckCircle size={14} />
                  <span className="hidden sm:inline">Escalado a administración</span>
                </span>
              ) : (
                <button
                  onClick={() => abrirModalEscalar("Solicitud directa de atención")}
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-medium text-[#E3A21A] bg-[#E3A21A]/10 hover:bg-[#E3A21A]/20 border border-[#E3A21A]/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
                >
                  <Headphones size={14} />
                  <span className="hidden sm:inline">Hablar con ejecutivo</span>
                </button>
              )}

              <button
                onClick={handleFinalizarConversacion}
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-[#52606D] hover:text-[#1F2933] bg-white border border-[#CBD2D9] hover:bg-[#F5F7FA] px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-xs"
              >
                <CheckCircle size={14} />
                <span>Finalizar</span>
              </button>
            </>
          )}

          {finalizado && onNuevaConversacion && (
            <button
              onClick={onNuevaConversacion}
              type="button"
              className="bg-[#1E4E79] hover:bg-[#173C5E] text-white px-3.5 py-1.5 rounded-lg text-xs font-heading font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Plus size={14} />
              <span>Nueva consulta</span>
            </button>
          )}
        </div>
      </div>

      {/* Área de Mensajes */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Mensaje Informativo RAG */}
          <div className="bg-white border border-[#E4E7EB] rounded-lg p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#47705A]/10 border border-[#47705A]/20 text-[#47705A] flex items-center justify-center shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h3 className="text-xs font-bold font-heading text-[#173C5E]">
                  Base Documental Comunidad Clara
                </h3>
                <p className="text-[11px] text-[#52606D] mt-0.5">
                  Las respuestas están fundamentadas en los reglamentos y documentos oficiales de la copropiedad.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-[#1E4E79] bg-[#1E4E79]/10 border border-[#1E4E79]/20 px-2.5 py-1 rounded-md shrink-0">
              <BookOpen size={11} />
              <span>RAG Activo</span>
            </div>
          </div>

          {cargandoHistorial ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-[#52606D]">
              <Loader2 size={26} className="animate-spin text-[#1E4E79]" />
              <p className="text-xs font-medium">Cargando consulta...</p>
            </div>
          ) : (
            mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3.5 ${m.emisor === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
              >
                {m.emisor === "bot" && (
                  <div className="w-8 h-8 rounded-lg bg-[#1E4E79] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <Building2 size={16} className="text-[#E3A21A]" />
                  </div>
                )}

                <div className="space-y-1 max-w-[85%] sm:max-w-[75%] min-w-0">
                  <div
                    className={`p-4 rounded-lg text-[13.5px] leading-relaxed ${
                      m.emisor === "user"
                        ? "bg-[#1E4E79] text-white shadow-xs rounded-br-xs"
                        : "bg-white border border-[#E4E7EB] text-[#1F2933] rounded-tl-xs shadow-xs"
                    }`}
                  >
                    <div className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.texto}</div>

                    {/* Botón contextual de escalamiento */}
                    {m.emisor === "bot" && m.escalarEjecutivo && !finalizado && !yaEscalado && (
                      <div className="mt-3 pt-3 border-t border-[#E4E7EB]">
                        <button
                          onClick={() => abrirModalEscalar("Duda no resuelta por la base de conocimiento")}
                          type="button"
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-[#E3A21A] bg-[#E3A21A]/10 hover:bg-[#E3A21A]/20 border border-[#E3A21A]/30 rounded-lg transition-all cursor-pointer"
                        >
                          <Headphones size={14} />
                          <span>¿Necesitas ayuda adicional? Escalar a administración</span>
                        </button>
                      </div>
                    )}

                    {/* Insignia de Confianza */}
                    {m.emisor === "bot" && m.nivelConfianza && (
                      <div className="mt-3 pt-2.5 border-t border-[#E4E7EB] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 font-medium">
                          {m.nivelConfianza === "ALTA" ? (
                            <span className="text-[#47705A] flex items-center gap-1 font-semibold">
                              <ShieldCheck size={14} /> Alta Confianza ({Math.round((m.scoreMaximo || 0) * 100)}%)
                            </span>
                          ) : (
                            <span className="text-[#E3A21A] flex items-center gap-1 font-semibold">
                              <AlertTriangle size={14} /> Confianza Parcial ({Math.round((m.scoreMaximo || 0) * 100)}%)
                            </span>
                          )}
                        </div>

                        {m.fuentes && m.fuentes.length > 0 && (
                          <button
                            onClick={() => toggleFuentes(m.id)}
                            type="button"
                            className="text-[#52606D] hover:text-[#1F2933] flex items-center gap-1 text-[11px] transition-colors cursor-pointer"
                          >
                            <span>{m.fuentes.length} fuentes</span>
                            {mostrarFuentes[m.id] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Despliegue de fuentes RAG */}
                    {mostrarFuentes[m.id] && m.fuentes && (
                      <div className="mt-2.5 space-y-1.5 bg-[#F5F7FA] p-3 rounded-lg border border-[#E4E7EB]">
                        {m.fuentes.map((f) => (
                          <div key={f.id_fragmento} className="text-[11px] text-[#52606D]">
                            <span className="font-semibold text-[#1F2933]">
                              Fragmento #{f.id_fragmento} ({Math.round(f.similitud * 100)}%):
                            </span>
                            <p className="italic text-[#52606D] mt-0.5">"{f.extracto}"</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <span
                    className={`text-[10px] text-[#7B8794] block px-1.5 ${
                      m.emisor === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {m.hora}
                  </span>
                </div>

                {m.emisor === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-white border border-[#CBD2D9] text-[#52606D] flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    <User size={15} />
                  </div>
                )}
              </div>
            ))
          )}

          {/* Indicador de consulta RAG */}
          {cargando && (
            <div className="flex gap-3.5 justify-start animate-fade-in">
              <div className="w-8 h-8 rounded-lg bg-[#1E4E79] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Loader2 size={15} className="animate-spin text-[#E3A21A]" />
              </div>
              <div className="bg-white border border-[#E4E7EB] rounded-lg rounded-tl-xs px-4 py-3 text-xs text-[#52606D] shadow-xs flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#1E4E79] animate-bounce" style={{ animationDelay: "0ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[#1E4E79] animate-bounce" style={{ animationDelay: "150ms" }}></span>
                  <span className="w-2 h-2 rounded-full bg-[#1E4E79] animate-bounce" style={{ animationDelay: "300ms" }}></span>
                </div>
                <span className="font-medium text-[11px]">Consultando en base de conocimiento...</span>
              </div>
            </div>
          )}

          {/* Tarjeta de Calificación al finalizar */}
          {finalizado && !cargandoHistorial && (
            <div className="bg-white border border-[#E4E7EB] rounded-lg p-6 text-center max-w-md mx-auto my-6 space-y-3 shadow-sm">
              <div className="w-12 h-12 bg-[#47705A]/15 border border-[#47705A]/20 text-[#47705A] rounded-lg flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle size={26} />
              </div>
              <h3 className="text-sm font-bold font-heading text-[#173C5E]">Consulta finalizada</h3>
              <p className="text-xs text-[#52606D]">¿Cómo evaluarías la orientación recibida?</p>

              {!calificacionEnviada ? (
                <div className="flex justify-center gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((est) => (
                    <button
                      key={est}
                      onClick={() => enviarCalificacion(est)}
                      type="button"
                      className="p-1.5 text-[#CBD2D9] hover:text-[#E3A21A] hover:scale-120 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star
                        size={24}
                        className={calificacion && calificacion >= est ? "fill-[#E3A21A] text-[#E3A21A]" : ""}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#47705A] bg-[#47705A]/10 border border-[#47705A]/20 py-2 px-4 rounded-lg inline-block font-semibold">
                  ¡Gracias por calificar con {calificacion} estrellas!
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input de Mensaje */}
      <div className="p-4 sm:p-5 shrink-0 relative z-10 bg-[#F5F7FA]">
        <div className="max-w-3xl mx-auto">
          {finalizado ? (
            <div className="bg-white border border-[#E4E7EB] rounded-lg px-5 py-3.5 text-xs text-[#52606D] flex items-center justify-between gap-4 shadow-xs">
              <span className="font-medium text-[#52606D]">
                Esta consulta ha concluido. Puedes iniciar una nueva consulta en cualquier momento.
              </span>
              {onNuevaConversacion && (
                <button
                  onClick={onNuevaConversacion}
                  type="button"
                  className="bg-[#1E4E79] hover:bg-[#173C5E] text-white px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 text-xs font-heading font-semibold"
                >
                  <Plus size={14} />
                  <span>Nueva consulta</span>
                </button>
              )}
            </div>
          ) : yaEscalado ? (
            <div className="bg-[#FCF6EC] border border-[#E3A21A]/30 rounded-lg px-5 py-3.5 text-xs text-[#1F2933] flex items-center justify-between gap-4 shadow-xs">
              <span className="font-medium flex items-center gap-2">
                <Headphones size={16} className="shrink-0 text-[#E3A21A]" />
                Esta consulta fue escalada a un ticket. Puedes seguir su avance en "Mis Solicitudes".
              </span>
              {onNuevaConversacion && (
                <button
                  onClick={onNuevaConversacion}
                  type="button"
                  className="bg-[#1E4E79] hover:bg-[#173C5E] text-white px-4 py-2 rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0 text-xs font-heading font-semibold"
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
                maxLength={2000}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu consulta respecto al reglamento o servicios..."
                className="w-full bg-white border border-[#CBD2D9] rounded-lg py-3 pl-4 pr-13 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all shadow-xs"
              />
              <button
                type="submit"
                disabled={cargando || !input.trim()}
                aria-label="Enviar mensaje"
                className="absolute right-2 w-9 h-9 rounded-lg bg-[#1E4E79] hover:bg-[#173C5E] active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer"
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal de Escalamiento a Ticket */}
      {modalEscalar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white border border-[#E4E7EB] rounded-lg max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-[#173C5E]">
                <div className="w-9 h-9 rounded-lg bg-[#E3A21A]/15 flex items-center justify-center border border-[#E3A21A]/30 text-[#E3A21A]">
                  <Headphones size={20} />
                </div>
                <h2 className="text-base font-bold font-heading text-[#173C5E]">Escalar a administración</h2>
              </div>
              <button
                onClick={() => setModalEscalar(false)}
                type="button"
                className="p-1 rounded-lg text-[#52606D] hover:text-[#1F2933] hover:bg-[#F5F7FA] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#52606D] leading-relaxed">
              Generaremos un ticket formal para que el equipo de administración continúe tu atención de manera personalizada.
            </p>

            <form onSubmit={handleEscalarTicket} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#52606D] block mb-1">
                  Título del caso
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={tituloTicket}
                  onChange={(e) => setTituloTicket(e.target.value)}
                  className="w-full bg-white border border-[#CBD2D9] rounded-lg px-3.5 py-2 text-sm text-[#1F2933] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#52606D] block mb-1">
                  Descripción / Contexto
                </label>
                <textarea
                  rows={4}
                  required
                  maxLength={5000}
                  value={descTicket}
                  onChange={(e) => setDescTicket(e.target.value)}
                  className="w-full bg-white border border-[#CBD2D9] rounded-lg p-3 text-xs text-[#1F2933] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setModalEscalar(false)}
                  className="px-4 py-2 text-xs font-medium text-[#52606D] hover:text-[#1F2933] hover:bg-[#F5F7FA] rounded-lg transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={escalando}
                  className="bg-[#1E4E79] hover:bg-[#173C5E] text-white text-xs font-heading font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer shadow-xs disabled:opacity-50"
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
