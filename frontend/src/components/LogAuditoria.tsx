import React, { useEffect, useState } from "react";
import { Search, Activity, LogIn, FileText } from "lucide-react";
import { API_URL } from "../utils/api";
import { EncabezadoPagina, BotonRecargar, Kpi, EstadoVacio } from "./ui/Pagina";
import { Esqueleto } from "./ui/Skeleton";

interface LogItem {
  id_log: number;
  usuario: string;
  correo: string;
  accion: string;
  detalle: string;
  fecha: string;
}

const CLASE_ACCION: Record<string, string> = {
  LOGIN: "insignia-resuelto",
  LOGOUT: "insignia-cerrado",
  SUBIDA_DOCUMENTO: "insignia-proceso",
  TOGGLE_DOCUMENTO: "insignia-proceso",
  CREATE_USUARIO: "bg-noche text-menta",
  CREACION_TICKET: "insignia-coral",
  ELIMINAR_DOCUMENTO: "insignia-error",
};

// "SUBIDA_DOCUMENTO" → "Subida documento"
const humanizar = (accion: string) => {
  const t = (accion || "").replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const LogAuditoria: React.FC = () => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroAccion, setFiltroAccion] = useState<string>("TODAS");

  const cargarLogs = async () => {
    setCargando(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/admin/auditoria?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        console.error("Error al cargar auditoría, código de respuesta:", res.status);
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
    const termino = busqueda.toLowerCase();
    const coincideTexto =
      (l.usuario || "").toLowerCase().includes(termino) ||
      (l.correo || "").toLowerCase().includes(termino) ||
      (l.detalle || "").toLowerCase().includes(termino) ||
      (l.accion || "").toLowerCase().includes(termino);
    const coincideAccion = filtroAccion === "TODAS" || l.accion === filtroAccion;
    return coincideTexto && coincideAccion;
  });

  const cargaInicial = cargando && logs.length === 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 space-y-7">
        <EncabezadoPagina
          ceja="Seguridad y trazabilidad"
          titulo={
            <>
              Registro de <em>auditoría</em>
            </>
          }
          descripcion="Cada inicio de sesión, carga de documentos, cuenta creada y ticket queda registrado aquí."
          acciones={<BotonRecargar onClick={cargarLogs} cargando={cargando} />}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 escalonado">
          <Kpi etiqueta="Registros" valor={logs.length} detalle="Acciones auditadas" icono={<Activity size={16} />} />
          <Kpi
            etiqueta="Inicios de sesión"
            valor={logs.filter((l) => l.accion === "LOGIN").length}
            detalle="Accesos a la plataforma"
            icono={<LogIn size={16} />}
            tono="exito"
          />
          <Kpi
            etiqueta="Gestión documental"
            valor={logs.filter((l) => l.accion === "SUBIDA_DOCUMENTO" || l.accion === "TOGGLE_DOCUMENTO").length}
            detalle="Cargas y cambios de publicación"
            icono={<FileText size={16} />}
            tono="luz"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por usuario, acción o detalle"
              aria-label="Buscar en el registro de auditoría"
              className="campo !pl-10 !rounded-full !min-h-[2.5rem]"
            />
          </div>
          <label htmlFor="filtro-accion" className="sr-only">
            Filtrar por acción
          </label>
          <select
            id="filtro-accion"
            value={filtroAccion}
            onChange={(e) => setFiltroAccion(e.target.value)}
            className="campo campo-sm !min-h-[2.5rem] w-full sm:w-auto"
          >
            {accionesUnicas.map((acc) => (
              <option key={acc} value={acc}>
                {acc === "TODAS" ? "Todas las acciones" : humanizar(acc)}
              </option>
            ))}
          </select>
          {(busqueda || filtroAccion !== "TODAS") && (
            <span className="text-[0.8125rem] text-tinta-2 sm:ml-auto tabular-nums">
              {logsFiltrados.length} de {logs.length} registros
            </span>
          )}
        </div>

        <div className="superficie overflow-hidden">
          {cargaInicial ? (
            <div className="p-5 space-y-3" role="status" aria-label="Cargando registros">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Esqueleto className="h-3.5 w-10" />
                  <Esqueleto className="h-3.5 w-32" />
                  <Esqueleto className="h-3.5 flex-1" />
                </div>
              ))}
            </div>
          ) : logsFiltrados.length === 0 ? (
            <EstadoVacio
              compacto
              titulo={logs.length === 0 ? "Sin registros todavía" : "Sin coincidencias"}
              descripcion={logs.length === 0 ? "Las acciones de la plataforma aparecerán aquí." : "Ningún registro coincide con la búsqueda."}
            />
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto max-h-[70vh] barra-fina">
                <table className="tabla">
                  <caption className="sr-only">Registro de auditoría</caption>
                  <thead>
                    <tr>
                      <th scope="col">N.º</th>
                      <th scope="col">Fecha y hora</th>
                      <th scope="col">Usuario</th>
                      <th scope="col">Acción</th>
                      <th scope="col">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsFiltrados.map((item) => (
                      <tr key={item.id_log}>
                        <td className="numeral text-tinta-3">{item.id_log}</td>
                        <td className="text-tinta-2 tabular-nums whitespace-nowrap">{item.fecha}</td>
                        <td>
                          <p className="font-semibold text-tinta">{item.usuario}</p>
                          <p className="text-[0.8125rem] text-tinta-2">{item.correo}</p>
                        </td>
                        <td>
                          <span className={`insignia ${CLASE_ACCION[item.accion?.toUpperCase()] ?? "insignia-cerrado"}`}>
                            {humanizar(item.accion)}
                          </span>
                        </td>
                        <td className="text-tinta-2 max-w-md truncate" title={item.detalle}>
                          {item.detalle}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="md:hidden divide-y divide-linea">
                {logsFiltrados.map((item) => (
                  <li key={item.id_log} className="px-4 py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`insignia ${CLASE_ACCION[item.accion?.toUpperCase()] ?? "insignia-cerrado"}`}>
                        {humanizar(item.accion)}
                      </span>
                      <span className="text-[0.75rem] text-tinta-3 tabular-nums">{item.fecha}</span>
                    </div>
                    <p className="text-[0.875rem] font-semibold text-tinta mt-2">{item.usuario}</p>
                    <p className="text-[0.8125rem] text-tinta-2 mt-0.5 [overflow-wrap:anywhere]">{item.detalle}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
