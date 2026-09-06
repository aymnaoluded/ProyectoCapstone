import React, { useEffect, useState } from "react";
import { ShieldAlert, RefreshCw, Search, Filter, Clock, Activity } from "lucide-react";

interface LogItem {
  id_log: number;
  usuario: string;
  correo: string;
  accion: string;
  detalle: string;
  fecha: string;
}

export const LogAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAccion, setFiltroAccion] = useState<string>("TODAS");

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const res = await fetch(`http://localhost:8000/api/admin/auditoria?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error("Error al obtener logs de auditoría:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarLogs();
  }, []);

  const accionesUnicas = ["TODAS", ...Array.from(new Set(logs.map((l) => l.accion)))];

  const logsFiltrados = logs.filter((l) => {
    const coincideTexto =
      l.usuario.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.detalle.toLowerCase().includes(busqueda.toLowerCase()) ||
      l.accion.toLowerCase().includes(busqueda.toLowerCase());

    const coincideAccion = filtroAccion === "TODAS" || l.accion === filtroAccion;

    return coincideTexto && coincideAccion;
  });

     const getBadgeColor = (accion: string) => {
        switch (accion.toUpperCase()) {
        case "LOGIN":
            return "bg-emerald-50 text-emerald-700 border-emerald-200/70";
        case "LOGOUT":
            return "bg-red-100 text-red-700 border-red-300"; 
        case "SUBIDA_DOCUMENTO":
            return "bg-blue-50 text-blue-700 border-blue-200/70";
        case "CREACION_TICKET":
            return "bg-amber-50 text-amber-700 border-amber-200/70";
        case "ELIMINAR_DOCUMENTO":
            return "bg-rose-50 text-rose-700 border-rose-200/70";
        default:
            return "bg-slate-100 text-slate-700 border-slate-200";
        }
    };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Cabecera */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Log de Auditoría</h1>
          <p className="text-s text-slate-500 mt-1">
            Registro de eventos de seguridad, operaciones y trazabilidad de acciones.
          </p>
        </div>

        <button
          onClick={cargarLogs}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin text-blue-600" : ""} />
          <span>Actualizar</span>
        </button>
      </div>

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Métricas / Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">{logs.length}</span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Total registros</span>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Activity size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
                {logs.filter((l) => l.accion === "LOGIN").length}
              </span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Inicios de sesión</span>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <ShieldAlert size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
                {logs.filter((l) => l.accion === "SUBIDA_DOCUMENTO").length}
              </span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Cargas documentales</span>
            </div>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        {/* Barra de Filtro y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por usuario, acción o detalle..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-s focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter size={14} className="text-slate-400" />
            <select
              value={filtroAccion}
              onChange={(e) => setFiltroAccion(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {accionesUnicas.map((acc) => (
                <option key={acc} value={acc}>
                  {acc === "TODAS" ? "Todas las acciones" : acc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabla de Logs */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">ID</th>
                  <th className="px-6 py-3.5">Fecha y Hora</th>
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Acción</th>
                  <th className="px-6 py-3.5">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logsFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      No hay registros que coincidan con la búsqueda.
                    </td>
                  </tr>
                ) : (
                  logsFiltrados.map((item) => (
                    <tr key={item.id_log} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-400">#{item.id_log}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {item.fecha}
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-slate-900">{item.usuario}</p>
                        <p className="text-[14px] text-slate-400">{item.correo}</p>
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getBadgeColor(
                            item.accion
                          )}`}
                        >
                          {item.accion}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-md truncate" title={item.detalle}>
                        {item.detalle}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};