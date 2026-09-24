import React, { useEffect, useState } from "react";
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Star,
  FileText,
  RefreshCw,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Ticket
} from "lucide-react";

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
    confianza_promedio: number;
    total_respuestas: number;
    alta_confianza: number;
    media_confianza: number;
    baja_confianza: number;
  };
  tickets_estado: {
    estado: string;
    cantidad: number;
  }[];
}

export const MetricasSistema: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargarMetricas = async () => {
    setCargando(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://localhost:8000/api/admin/metricas?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setMetricas(data);
      } else {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Error al obtener métricas (HTTP ${res.status})`);
      }
    } catch (err: any) {
      console.error("Error al cargar métricas:", err);
      setError(err.message || "No se pudieron obtener las métricas del sistema.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
  }, []);

  if (cargando && !metricas) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#f8fafc] text-slate-400">
        <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
        <p className="text-xs font-medium">Calculando indicadores del sistema...</p>
      </div>
    );
  }

  if (error && !metricas) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#f8fafc] text-slate-500 p-6">
        <AlertTriangle className="text-amber-500 mb-3" size={36} />
        <p className="text-sm font-semibold text-slate-700">{error}</p>
        <button
          onClick={cargarMetricas}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const totalRespuestas = metricas?.rag.total_respuestas || 0;
  const pctAlta = totalRespuestas > 0 ? Math.round(((metricas?.rag.alta_confianza || 0) / totalRespuestas) * 100) : 0;
  const pctMedia = totalRespuestas > 0 ? Math.round(((metricas?.rag.media_confianza || 0) / totalRespuestas) * 100) : 0;
  const pctBaja = totalRespuestas > 0 ? Math.round(((metricas?.rag.baja_confianza || 0) / totalRespuestas) * 100) : 0;

  const ticketsArray = metricas?.tickets_estado || [];
  const totalTickets = ticketsArray.reduce((acc, t) => acc + (t.cantidad || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Métricas y Rendimiento</h1>
        </div>
        <button
          onClick={cargarMetricas}
          className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          title="Actualizar datos"
        >
          <RefreshCw size={15} className={cargando ? "animate-spin text-blue-600" : ""} />
        </button>
      </div>

      <div className="p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Fila 1: KPIs Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Conversaciones</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {metricas?.resumen.total_conversaciones || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {metricas?.resumen.tasa_escalamiento ?? 0}% requirió atención humana
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Confianza RAG</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <Sparkles size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {Math.round((metricas?.rag.confianza_promedio || 0) * 100)}%
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Similitud coseno promedio en respuestas
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Satisfacción</span>
              <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                <Star size={16} className="fill-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 flex items-baseline gap-1">
              {metricas?.resumen.promedio_satisfaccion ?? 0}
              <span className="text-xs font-normal text-slate-400">/ 5.0</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Basado en {metricas?.resumen.total_evaluaciones || 0} evaluaciones
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Indexación</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {metricas?.resumen.fragmentos_indexados || 0}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Vectores en {metricas?.resumen.documentos_activos || 0} documentos activos
            </p>
          </div>
        </div>

        {/* Fila 2: Distribución RAG y Estado de Tickets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Distribución de Certeza del Bot */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <BarChart3 size={16} className="text-blue-600" />
                Precisión de Respuestas IA
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">
                {metricas?.rag.total_respuestas || 0} respuestas generadas
              </span>
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} /> Alta Confianza (&ge; 80%)
                  </span>
                  <span className="text-slate-600">{metricas?.rag.alta_confianza || 0} ({pctAlta}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${pctAlta}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-amber-700 flex items-center gap-1">
                    <AlertTriangle size={13} /> Confianza Parcial (60% - 79%)
                  </span>
                  <span className="text-slate-600">{metricas?.rag.media_confianza || 0} ({pctMedia}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pctMedia}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-rose-700 flex items-center gap-1">
                    <AlertTriangle size={13} /> Baja Confianza / Escalados (&lt; 60%)
                  </span>
                  <span className="text-slate-600">{metricas?.rag.baja_confianza || 0} ({pctBaja}%)</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full transition-all duration-500" style={{ width: `${pctBaja}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Distribución de Tickets por Estado */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Ticket size={16} className="text-blue-600" />
                Volumen de Tickets ({totalTickets})
              </h2>
              <span className="text-[11px] text-slate-400 font-medium">Gestión humana</span>
            </div>

            <div className="space-y-2.5 pt-1">
              {ticketsArray.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No hay tickets registrados aún.</p>
              ) : (
                ticketsArray.map((item) => {
                  const pct = totalTickets > 0 ? Math.round((item.cantidad / totalTickets) * 100) : 0;
                  return (
                    <div key={item.estado} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                      <span className="font-semibold text-slate-700">{item.estado}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 font-medium">{pct}%</span>
                        <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg min-w-[32px] text-center">
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
      </div>
    </div>
  );
};