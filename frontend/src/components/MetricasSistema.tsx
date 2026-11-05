import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Sparkles,
  Star,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Ticket,
  Mail,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cabecerasAuth, API_URL } from "../utils/api";

interface MetricasData {
  resumen: {
    total_conversaciones: number;
    tasa_escalamiento: number;
    promedio_satisfaccion: number;
    total_evaluaciones: number;
    documentos_activos: number;
    fragmentos_indexados: number;
  };
  rag: {
    total_respuestas: number;
    confianza_promedio: number;
    alta_confianza: number;
    media_confianza: number;
    baja_confianza: number;
  };
  tickets: {
    total_tickets: number;
    por_estado: Record<string, number>;
  };
}

interface EstadoGmail {
  exito: boolean;
  simulado: boolean;
  mensaje: string;
  detalles: {
    remitente?: string;
    client_id_enmascarado?: string;
    refresh_token_presente?: boolean;
  };
}

export const MetricasSistema: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasData | null>(null);
  const [cargando, setCargando] = useState(true);

  // Diagnóstico y prueba de Gmail API
  const [estadoGmail, setEstadoGmail] = useState<EstadoGmail | null>(null);
  const [cargandoGmail, setCargandoGmail] = useState(false);
  const [destinatarioPrueba, setDestinatarioPrueba] = useState("");
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<{ exito: boolean; mensaje: string } | null>(null);

  const cargarMetricas = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/metricas`, {
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setMetricas(data);
      }
    } catch (err) {
      console.error("Error al cargar métricas:", err);
    } finally {
      setCargando(false);
    }
  };

  const consultarEstadoGmail = async () => {
    setCargandoGmail(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/diagnostico/gmail`, {
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setEstadoGmail(data);
      }
    } catch (err) {
      console.error("Error al consultar estado de Gmail:", err);
    } finally {
      setCargandoGmail(false);
    }
  };

  const handleProbarGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinatarioPrueba.trim()) return;

    setEnviandoPrueba(true);
    setResultadoPrueba(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/diagnostico/probar-envio`, {
        method: "POST",
        headers: cabecerasAuth(),
        body: JSON.stringify({ destinatario: destinatarioPrueba.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.exito) {
        setResultadoPrueba({
          exito: true,
          mensaje: data.mensaje || "Correo de prueba enviado con éxito.",
        });
      } else {
        setResultadoPrueba({
          exito: false,
          mensaje: data.detail || data.mensaje || "Falló el envío de prueba.",
        });
      }
    } catch (err) {
      setResultadoPrueba({
        exito: false,
        mensaje: "Error de conexión al intentar enviar el correo.",
      });
    } finally {
      setEnviandoPrueba(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
    consultarEstadoGmail();
  }, []);

  if (cargando && !metricas) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F5F7FA]">
        <div className="flex flex-col items-center gap-3 text-[#52606D]">
          <Loader2 className="animate-spin text-[#1E4E79]" size={32} />
          <p className="text-sm font-medium">Cargando analítica institucional...</p>
        </div>
      </div>
    );
  }

  const totalRespuestasRAG = metricas?.rag.total_respuestas || 0;
  const pctAlta = totalRespuestasRAG > 0 ? Math.round(((metricas?.rag.alta_confianza || 0) / totalRespuestasRAG) * 100) : 0;
  const pctMedia = totalRespuestasRAG > 0 ? Math.round(((metricas?.rag.media_confianza || 0) / totalRespuestasRAG) * 100) : 0;
  const pctBaja = totalRespuestasRAG > 0 ? Math.round(((metricas?.rag.baja_confianza || 0) / totalRespuestasRAG) * 100) : 0;

  const ticketsPorEstado = metricas?.tickets.por_estado || {};
  const totalTickets = metricas?.tickets.total_tickets || 0;

  const ordenEstados = ["Pendiente", "En Proceso", "En Espera", "Resuelto", "Cerrado"];
  const ticketsArray = ordenEstados
    .filter((estado) => ticketsPorEstado[estado] !== undefined)
    .map((estado) => ({
      estado,
      cantidad: ticketsPorEstado[estado],
    }));

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F7FA] font-sans pb-12">
      {/* Cabecera Interna Estilo iOS */}
      <div className="bg-white/80 backdrop-blur-md border-b border-slate-200/70 px-6 sm:px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#173C5E] tracking-tight">
            Métricas y Rendimiento
          </h1>
          <p className="text-xs text-[#52606D] mt-0.5">
            Monitoreo continuo de atención, calidad documental y desempeño del asistente IA
          </p>
        </div>

        <button
          onClick={cargarMetricas}
          type="button"
          className="p-2.5 text-[#52606D] hover:text-[#173C5E] border border-slate-200 rounded-xl hover:bg-white active:scale-95 transition-all shadow-2xs cursor-pointer"
          title="Actualizar datos"
        >
          <RefreshCw size={15} className={cargando ? "animate-spin text-[#1E4E79]" : ""} />
        </button>
      </div>

      <div className="p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Fila 1: KPIs Principales con Estilo iOS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] hover:shadow-[0_8px_24px_rgba(31,41,51,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[#52606D] mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52606D]">Conversaciones</span>
              <div className="p-2.5 bg-[#1E4E79]/8 text-[#1E4E79] rounded-xl border border-[#1E4E79]/15">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-heading text-[#173C5E]">
              {metricas?.resumen.total_conversaciones || 0}
            </div>
            <p className="text-[11.5px] font-medium text-[#7B8794] mt-1.5">
              {metricas?.resumen.tasa_escalamiento ?? 0}% requirió atención humana
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] hover:shadow-[0_8px_24px_rgba(31,41,51,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[#52606D] mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52606D]">Confianza RAG</span>
              <div className="p-2.5 bg-[#47705A]/12 text-[#47705A] rounded-xl border border-[#47705A]/20">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-heading text-[#173C5E]">
              {Math.round((metricas?.rag.confianza_promedio || 0) * 100)}%
            </div>
            <p className="text-[11.5px] font-medium text-[#7B8794] mt-1.5">
              Similitud coseno promedio en respuestas
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] hover:shadow-[0_8px_24px_rgba(31,41,51,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[#52606D] mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52606D]">Satisfacción</span>
              <div className="p-2.5 bg-[#E3A21A]/12 text-[#E3A21A] rounded-xl border border-[#E3A21A]/25">
                <Star size={16} className="fill-[#E3A21A]" />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-heading text-[#173C5E] flex items-baseline gap-1.5">
              {metricas?.resumen.promedio_satisfaccion ?? 0}
              <span className="text-xs font-medium text-[#7B8794]">/ 5.0</span>
            </div>
            <p className="text-[11.5px] font-medium text-[#7B8794] mt-1.5">
              Basado en {metricas?.resumen.total_evaluaciones || 0} evaluaciones
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] hover:shadow-[0_8px_24px_rgba(31,41,51,0.06)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between text-[#52606D] mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#52606D]">Indexación</span>
              <div className="p-2.5 bg-[#173C5E]/10 text-[#173C5E] rounded-xl border border-[#173C5E]/20">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-3xl font-extrabold font-heading text-[#173C5E]">
              {metricas?.resumen.fragmentos_indexados || 0}
            </div>
            <p className="text-[11.5px] font-medium text-[#7B8794] mt-1.5">
              Vectores en {metricas?.resumen.documentos_activos || 0} documentos activos
            </p>
          </div>
        </div>

        {/* Fila 2: Distribución RAG y Estado de Tickets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Distribución de Certeza del Bot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold font-heading text-[#173C5E] flex items-center gap-2">
                <BarChart3 size={16} className="text-[#1E4E79]" />
                Precisión de Respuestas IA
              </h2>
              <span className="text-[11px] text-[#7B8794] font-medium">
                {metricas?.rag.total_respuestas || 0} respuestas generadas
              </span>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#47705A] flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Alta Confianza (&ge; 80%)
                  </span>
                  <span className="text-[#52606D] font-bold">{metricas?.rag.alta_confianza || 0} ({pctAlta}%)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#47705A] rounded-full transition-all duration-500" style={{ width: `${pctAlta}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#E3A21A] flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Confianza Parcial (60% - 79%)
                  </span>
                  <span className="text-[#52606D] font-bold">{metricas?.rag.media_confianza || 0} ({pctMedia}%)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#E3A21A] rounded-full transition-all duration-500" style={{ width: `${pctMedia}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#C53030] flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Baja Confianza / Escalados (&lt; 60%)
                  </span>
                  <span className="text-[#52606D] font-bold">{metricas?.rag.baja_confianza || 0} ({pctBaja}%)</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#C53030] rounded-full transition-all duration-500" style={{ width: `${pctBaja}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Distribución de Tickets por Estado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold font-heading text-[#173C5E] flex items-center gap-2">
                <Ticket size={16} className="text-[#1E4E79]" />
                Volumen de Tickets ({totalTickets})
              </h2>
              <span className="text-[11px] text-[#7B8794] font-medium">Gestión humana</span>
            </div>

            <div className="space-y-3 pt-1">
              {ticketsArray.length === 0 ? (
                <p className="text-xs text-[#7B8794] py-6 text-center font-medium">No hay tickets registrados aún.</p>
              ) : (
                ticketsArray.map((item) => {
                  const pct = totalTickets > 0 ? Math.round((item.cantidad / totalTickets) * 100) : 0;
                  return (
                    <div key={item.estado} className="flex items-center justify-between py-2 border-b border-slate-100/70 last:border-0 text-xs">
                      <span className="font-semibold text-[#1F2933]">{item.estado}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#7B8794] font-medium">{pct}%</span>
                        <span className="font-bold text-[#173C5E] bg-[#F5F7FA] border border-[#CBD2D9] px-3 py-0.5 rounded-full min-w-[34px] text-center shadow-2xs">
                          {item.cantidad}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Diagnóstico de Integración Gmail API (OAuth 2.0) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-[0_2px_14px_rgba(31,41,51,0.03)] space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#1E4E79]/8 text-[#1E4E79] rounded-xl border border-[#1E4E79]/15">
                <Mail size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold font-heading text-[#173C5E]">
                  Estado de la Integración Gmail API (OAuth 2.0)
                </h2>
                <p className="text-[11px] text-[#7B8794]">
                  Servicio de notificaciones, invitaciones y recuperación de contraseñas
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={consultarEstadoGmail}
              disabled={cargandoGmail}
              title="Refrescar estado de Gmail"
              className="p-2 text-[#52606D] hover:text-[#173C5E] hover:bg-[#F5F7FA] rounded-xl active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={cargandoGmail ? "animate-spin text-[#1E4E79]" : ""} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* Estado y Diagnóstico */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F7FA] border border-slate-200/80 text-xs">
                <span className="font-semibold text-[#52606D]">Estado de Operación:</span>
                {estadoGmail?.simulado ? (
                  <span className="px-3 py-1 rounded-full font-bold text-[10.5px] bg-[#E3A21A]/15 text-[#E3A21A] border border-[#E3A21A]/30 flex items-center gap-1.5 shadow-2xs">
                    <AlertTriangle size={12} />
                    <span>Modo Simulación (Desarrollo)</span>
                  </span>
                ) : estadoGmail?.exito ? (
                  <span className="px-3 py-1 rounded-full font-bold text-[10.5px] bg-[#47705A]/15 text-[#47705A] border border-[#47705A]/30 flex items-center gap-1.5 shadow-2xs">
                    <CheckCircle2 size={12} />
                    <span>Conexión OAuth 2.0 Activa</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full font-bold text-[10.5px] bg-slate-200 text-[#52606D]">
                    Consultando...
                  </span>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-[#7B8794]">Remitente configurado:</span>
                  <span className="font-semibold text-[#1F2933]">
                    {estadoGmail?.detalles?.remitente || "Sin configurar"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-[#7B8794]">Client ID:</span>
                  <span className="font-mono text-[11px] text-[#52606D]">
                    {estadoGmail?.detalles?.client_id_enmascarado || "No configurado"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-[#7B8794]">Refresh Token (OAuth 2.0):</span>
                  <span className="font-semibold">
                    {estadoGmail?.detalles?.refresh_token_presente ? (
                      <span className="text-[#47705A]">Configurado ✓</span>
                    ) : (
                      <span className="text-[#E3A21A]">No detectado</span>
                    )}
                  </span>
                </div>
              </div>

              {estadoGmail?.simulado && (
                <div className="p-3 bg-[#FCF6EC] border border-[#E3A21A]/30 rounded-xl text-[11px] text-[#1F2933] leading-relaxed">
                  <strong className="text-[#173C5E]">Nota para producción:</strong> Para despachar correos reales, configura en tu archivo <code className="bg-amber-100/70 px-1 py-0.5 rounded font-mono">backend/.env</code> las credenciales de Gmail OAuth 2.0.
                </div>
              )}
            </div>

            {/* Herramienta de Envío de Prueba */}
            <div className="bg-[#F5F7FA] p-5 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-xs font-bold font-heading text-[#173C5E] flex items-center gap-1.5 mb-1">
                  <Send size={14} className="text-[#1E4E79]" />
                  Prueba de Envío en Vivo
                </h3>
                <p className="text-[11px] text-[#52606D] leading-snug">
                  Verifica que los correos electrónicos se envíen y reciban correctamente sin salir de la plataforma.
                </p>
              </div>

              {resultadoPrueba && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 shadow-2xs ${
                    resultadoPrueba.exito
                      ? "bg-[#47705A]/12 border-[#47705A]/25 text-[#47705A]"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  {resultadoPrueba.exito ? (
                    <CheckCircle2 size={15} className="text-[#47705A] shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle size={15} className="text-red-600 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-snug font-medium">{resultadoPrueba.mensaje}</span>
                </div>
              )}

              <form onSubmit={handleProbarGmail} className="space-y-2.5">
                <div>
                  <input
                    type="email"
                    required
                    placeholder="ejemplo@correo.com"
                    value={destinatarioPrueba}
                    onChange={(e) => setDestinatarioPrueba(e.target.value)}
                    disabled={enviandoPrueba}
                    className="w-full bg-white border border-[#CBD2D9] rounded-xl px-3.5 py-2 text-xs text-[#1F2933] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 disabled:opacity-50 transition-all shadow-2xs"
                  />
                </div>
                <button
                  type="submit"
                  disabled={enviandoPrueba || !destinatarioPrueba.trim()}
                  className="w-full flex items-center justify-center gap-1.5 bg-[#1E4E79] hover:bg-[#173C5E] active:scale-[0.98] disabled:opacity-50 text-white text-xs font-heading font-semibold py-2.5 px-3 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  {enviandoPrueba ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Despachando correo de prueba...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Enviar Correo de Verificación</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
