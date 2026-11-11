import React from "react";
import { RefreshCw } from "lucide-react";
import { Fachada, IndicadorVentanas } from "./Fachada";

/* ─────────────────────────────────────────────────────────────────────
   Piezas compartidas por todas las vistas internas
   ───────────────────────────────────────────────────────────────────── */

/* Encabezado editorial de cada vista: ceja + titular + descripción + acciones */
export const EncabezadoPagina = ({
  ceja,
  titulo,
  descripcion,
  acciones,
  className = "",
}: {
  ceja?: string;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  className?: string;
}) => (
  <header className={`flex flex-wrap items-end justify-between gap-x-6 gap-y-4 ${className}`}>
    <div className="min-w-0 max-w-2xl animate-aparecer">
      {ceja && <p className="ceja mb-2">{ceja}</p>}
      <h1 className="titular text-[1.85rem] sm:text-[2.35rem] text-tinta">{titulo}</h1>
      {descripcion && <p className="text-[0.9375rem] text-tinta-2 mt-2 leading-relaxed">{descripcion}</p>}
    </div>
    {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
  </header>
);

/* Botón de recarga con estado de giro */
export const BotonRecargar = ({
  onClick,
  cargando,
  etiqueta = "Actualizar",
  soloIcono = false,
}: {
  onClick: () => void;
  cargando?: boolean;
  etiqueta?: string;
  soloIcono?: boolean;
}) =>
  soloIcono ? (
    <button type="button" onClick={onClick} className="boton-icono" aria-label={etiqueta} title={etiqueta}>
      <RefreshCw size={16} className={cargando ? "animate-spin text-petroleo" : ""} />
    </button>
  ) : (
    <button type="button" onClick={onClick} className="boton boton-secundario">
      <RefreshCw size={15} className={cargando ? "animate-spin text-petroleo" : ""} />
      <span>{etiqueta}</span>
    </button>
  );

/* Indicador numérico (KPI) con cifra editorial */
export const Kpi = ({
  etiqueta,
  valor,
  detalle,
  icono,
  tono = "petroleo",
  className = "",
}: {
  etiqueta: string;
  valor: React.ReactNode;
  detalle?: React.ReactNode;
  icono?: React.ReactNode;
  tono?: "petroleo" | "exito" | "luz" | "coral" | "noche";
  className?: string;
}) => {
  const acentos = {
    petroleo: "bg-menta text-petroleo-hover",
    exito: "bg-exito-suave text-exito",
    luz: "bg-luz-suave text-luz-tinta",
    coral: "bg-coral-suave text-coral-tinta",
    noche: "bg-noche text-menta",
  };
  return (
    <div className={`superficie p-5 flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="ceja">{etiqueta}</span>
        {icono && <span className={`arco grid place-items-center w-8 h-9 ${acentos[tono]}`}>{icono}</span>}
      </div>
      <div className="cifra text-[2.5rem] text-tinta">{valor}</div>
      {detalle && <p className="text-[0.8125rem] text-tinta-2 leading-snug">{detalle}</p>}
    </div>
  );
};

/* Estado vacío con una pequeña fachada: nunca un espacio abandonado */
export const EstadoVacio = ({
  titulo,
  descripcion,
  accion,
  compacto = false,
  className = "",
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  accion?: React.ReactNode;
  compacto?: boolean;
  className?: string;
}) => (
  <div className={`flex flex-col items-center justify-center text-center ${compacto ? "py-8 px-5" : "py-14 px-6"} ${className}`}>
    <div className="arco bg-noche p-3 pt-5 shadow-[0_14px_30px_-16px_rgba(14,38,36,0.7)] mb-5">
      <Fachada columnas={3} filas={compacto ? 2 : 3} proporcion={0.3} semilla={titulo.length + 3} tamanoVentana="9px" separacion="5px" intervalo={2200} />
    </div>
    <p className="titular text-[1.2rem] text-tinta">{titulo}</p>
    {descripcion && <p className="text-sm text-tinta-2 mt-1.5 max-w-sm leading-relaxed">{descripcion}</p>}
    {accion && <div className="mt-5">{accion}</div>}
  </div>
);

/* Estado de carga con las ventanas de la marca */
export const Cargando = ({ texto = "Cargando…", className = "" }: { texto?: string; className?: string }) => (
  <div role="status" className={`flex flex-col items-center justify-center gap-3 py-14 text-tinta-2 ${className}`}>
    <IndicadorVentanas className="scale-150" />
    <p className="text-sm font-medium mt-1">{texto}</p>
  </div>
);

/* Insignia para los estados de un ticket / solicitud */
const CLASE_ESTADO: Record<string, string> = {
  pendiente: "insignia-pendiente",
  "en proceso": "insignia-proceso",
  "en espera": "insignia-espera",
  resuelto: "insignia-resuelto",
  cerrado: "insignia-cerrado",
};

export const InsigniaEstado = ({ estado, className = "" }: { estado: string; className?: string }) => (
  <span className={`insignia ${CLASE_ESTADO[estado?.toLowerCase()] ?? "insignia-cerrado"} ${className}`}>{estado}</span>
);

/* Aviso en línea (errores de formulario, notas) */
export const Aviso = ({
  tono = "error",
  children,
  icono,
}: {
  tono?: "error" | "luz" | "info" | "exito";
  children: React.ReactNode;
  icono?: React.ReactNode;
}) => {
  const estilos = {
    error: "bg-error-suave text-error border-error/20",
    luz: "bg-luz-suave text-luz-tinta border-luz/40",
    info: "bg-menta-2 text-petroleo-hover border-petroleo/15",
    exito: "bg-exito-suave text-exito border-exito/20",
  };
  return (
    <div
      role={tono === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[0.8125rem] font-medium leading-relaxed animate-aparecer ${estilos[tono]}`}
    >
      {icono && <span className="shrink-0 mt-0.5">{icono}</span>}
      <div className="min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
};
