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
} from "lucide-react";
import type { Mensaje, Usuario } from "../types";

interface ChatProps {
  usuario: Usuario;
}

export const Chat: React.FC<ChatProps> = ({ usuario }) => {
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
  const [conversacionId, setConversacionId] = useState<number | null>(null);
  const [mostrarFuentes, setMostrarFuentes] = useState<Record<string, boolean>>({});

  const [finalizado, setFinalizado] = useState(false);
  const [calificacion, setCalificacion] = useState<number | null>(null);
  const [calificacionEnviada, setCalificacionEnviada] = useState(false);
  const [modalEscalar, setModalEscalar] = useState(false);
  const [tituloTicket, setTituloTicket] = useState("");
  const [descTicket, setDescTicket] = useState("");
  const [escalando, setEscalando] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, cargando, finalizado]);

  const toggleFuentes = (id: string) => {
    setMostrarFuentes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const enviarMensaje = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || cargando || finalizado) return;

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

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mensaje: textoPregunta,
          cliente_id: usuario.id_usuario,
          conversacion_id: conversacionId,
        }),
      });

      if (!res.ok) throw new Error("Error en la respuesta del asistente");

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
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          emisor: "bot",
          texto: "Ocurrió un error al contactar el servidor. Por favor intenta de nuevo.",
          hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  const handleEscalarTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tituloTicket.trim() || !descTicket.trim()) return;

    setEscalando(true);
    try {
      const res = await fetch("http://localhost:8000/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: tituloTicket.trim(),
          descripcion: descTicket.trim(),
          cliente_id: usuario.id_usuario,
          conversacion_id: conversacionId,
        }),
      });

      if (res.ok) {
        const ticketData = await res.json();
        setModalEscalar(false);
        setMensajes((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            emisor: "bot",
            texto: `✅ Tu ticket #${ticketData.id_ticket} ha sido creado correctamente en estado "Pendiente". Un ejecutivo revisará tu caso en breve.`,
            hora: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        alert("Error al generar el ticket.");
      }
    } catch {
      alert("Error de red al crear ticket.");
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
      await fetch("http://localhost:8000/api/chat/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversacion_id: conversacionId }),
      });
      setFinalizado(true);
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
      await fetch("http://localhost:8000/api/chat/finalizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversacion_id: conversacionId,
          calificacion: estrellas,
        }),
      });
      setCalificacionEnviada(true);
    } catch {
      setCalificacionEnviada(true);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden">
      {/* Cabecera del Chat */}
      <div className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Soporte Virtual IA</h2>
            <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              En línea · RAG habilitado
            </p>
          </div>
        </div>

        {/* Acciones */}
        {!finalizado && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTituloTicket("Consulta escalada desde el chat");
                setDescTicket(
                  mensajes
                    .filter((m) => m.id !== "init")
                    .map((m) => `${m.emisor === "user" ? "Cliente" : "IA"}: ${m.texto}`)
                    .slice(-4)
                    .join("\n")
                );
                setModalEscalar(true);
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 px-3.5 py-1.5 rounded-xl transition-all"
            >
              <Headphones size={14} />
              <span>Hablar con un ejecutivo</span>
            </button>

            <button
              onClick={handleFinalizarConversacion}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 px-3.5 py-1.5 rounded-xl transition-all"
            >
              <CheckCircle size={14} />
              <span>Finalizar chat</span>
            </button>
          </div>
        )}
      </div>

      {/* Área del Hilo Centralizado */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {mensajes.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3.5 ${m.emisor === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.emisor === "bot" && (
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Sparkles size={15} />
                </div>
              )}

              <div className={`space-y-1 max-w-[85%] sm:max-w-[75%]`}>
                <div
                  className={`p-4 rounded-2xl text-[13.5px] leading-relaxed shadow-xs ${
                    m.emisor === "user"
                      ? "bg-blue-600 text-white rounded-br-xs"
                      : "bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.texto}</div>

                  {/* Insignia de Confianza (solo bot) */}
                  {m.emisor === "bot" && m.nivelConfianza && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 font-medium">
                        {m.nivelConfianza === "ALTA" ? (
                          <span className="text-emerald-600 flex items-center gap-1">
                            <ShieldCheck size={13} /> Alta Confianza ({Math.round((m.scoreMaximo || 0) * 100)}%)
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <AlertTriangle size={13} /> Confianza Parcial ({Math.round((m.scoreMaximo || 0) * 100)}%)
                          </span>
                        )}
                      </div>

                      {m.fuentes && m.fuentes.length > 0 && (
                        <button
                          onClick={() => toggleFuentes(m.id)}
                          className="text-slate-400 hover:text-slate-700 flex items-center gap-0.5 text-[11px] transition-colors"
                        >
                          <span>{m.fuentes.length} fuentes</span>
                          {mostrarFuentes[m.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Despliegue de fuentes RAG */}
                  {mostrarFuentes[m.id] && m.fuentes && (
                    <div className="mt-2 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                      {m.fuentes.map((f) => (
                        <div key={f.id_fragmento} className="text-[11px] text-slate-500">
                          <span className="font-semibold text-slate-700">
                            Fragmento #{f.id_fragmento} ({Math.round(f.similitud * 100)}%):
                          </span>
                          <p className="italic text-slate-600 mt-0.5">"{f.extracto}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <span
                  className={`text-[10px] text-slate-400 block px-1.5 ${
                    m.emisor === "user" ? "text-right" : "text-left"
                  }`}
                >
                  {m.hora}
                </span>
              </div>

              {m.emisor === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <User size={15} />
                </div>
              )}
            </div>
          ))}

          {cargando && (
            <div className="flex gap-3.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 animate-pulse mt-0.5">
                <Sparkles size={15} />
              </div>
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-tl-xs px-4 py-3 text-xs text-slate-500 shadow-xs flex items-center gap-2">
                <Loader2 size={13} className="animate-spin text-blue-600" />
                <span>Buscando en la base de conocimiento...</span>
              </div>
            </div>
          )}

          {/* Tarjeta de Conversación Finalizada y Calificación */}
          {finalizado && (
            <div className="bg-white border border-slate-200/80 rounded-2xl p-6 text-center max-w-md mx-auto my-4 space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto">
                <CheckCircle size={22} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Conversación finalizada</h3>
              <p className="text-xs text-slate-500">¿Cómo evaluarías la atención del asistente?</p>

              {!calificacionEnviada ? (
                <div className="flex justify-center gap-2 pt-2">
                  {[1, 2, 3, 4, 5].map((est) => (
                    <button
                      key={est}
                      onClick={() => enviarCalificacion(est)}
                      className="p-1 text-slate-300 hover:text-amber-400 hover:scale-110 transition-all"
                    >
                      <Star
                        size={22}
                        className={calificacion && calificacion >= est ? "fill-amber-400 text-amber-400" : ""}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-emerald-700 bg-emerald-50 py-1.5 px-3 rounded-xl inline-block font-semibold">
                  ¡Gracias por calificar con {calificacion} estrellas!
                </div>
              )}
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input de Mensaje fijado al pie */}
      <div className="bg-white border-t border-slate-200/80 p-4 shrink-0">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={enviarMensaje} className="relative flex items-center">
            <input
              type="text"
              disabled={cargando || finalizado}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                finalizado
                  ? "Esta conversación ha concluido."
                  : "Haz una pregunta sobre los documentos indexados..."
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-4 pr-12 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={cargando || finalizado || !input.trim()}
              className="absolute right-2 w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-xs"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Modal de Escalamiento a Ticket */}
      {modalEscalar && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-600">
                <Headphones size={20} />
                <h2 className="text-base font-bold text-slate-900">Escalar a un ejecutivo</h2>
              </div>
              <button
                onClick={() => setModalEscalar(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Generaremos un ticket formal para que nuestro equipo continúe tu atención.
            </p>

            <form onSubmit={handleEscalarTicket} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Título del caso</label>
                <input
                  type="text"
                  required
                  value={tituloTicket}
                  onChange={(e) => setTituloTicket(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Descripción / Contexto</label>
                <textarea
                  rows={4}
                  required
                  value={descTicket}
                  onChange={(e) => setDescTicket(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalEscalar(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={escalando}
                  className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
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