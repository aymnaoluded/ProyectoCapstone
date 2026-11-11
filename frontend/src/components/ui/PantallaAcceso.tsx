import React, { useState } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { Marca, Skyline } from "./Fachada";

/* ─────────────────────────────────────────────────────────────────────
   Marco común de las pantallas públicas (activar cuenta, recuperar y
   restablecer contraseña, 404, error): banda nocturna + tarjeta de papel.
   ───────────────────────────────────────────────────────────────────── */

export const PantallaAcceso = ({
  ceja,
  titulo,
  descripcion,
  children,
  ilustracion,
}: {
  ceja?: string;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  children?: React.ReactNode;
  ilustracion?: React.ReactNode;
}) => (
  <div className="min-h-dvh w-full bg-papel flex flex-col font-sans">
    <header className="zona-noche relative overflow-hidden bg-noche">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-10 w-96 h-60 rounded-full bg-luz/10 blur-3xl" />
      <div className="relative max-w-5xl mx-auto px-5 sm:px-8 pt-6 flex items-end justify-between gap-6 h-32 sm:h-36">
        <a href="/" className="self-start rounded-lg" aria-label="Ir al inicio de Comunidad Clara">
          <Marca tono="noche" />
        </a>
        <Skyline className="h-[5.5rem] sm:h-24 max-sm:hidden" ventana="11px" />
      </div>
    </header>

    <main className="flex-1 flex items-start sm:items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
      <div className="w-full max-w-[27rem] superficie p-6 sm:p-9 animate-aparecer">
        {ilustracion}
        {ceja && <p className="ceja">{ceja}</p>}
        <h1 className="titular text-[1.9rem] sm:text-[2.15rem] mt-2.5">{titulo}</h1>
        {descripcion && <p className="text-[0.9375rem] text-tinta-2 mt-2.5 leading-relaxed">{descripcion}</p>}
        <div className="mt-7">{children}</div>
      </div>
    </main>

    <footer className="pb-6 text-center text-[0.75rem] text-tinta-3">© 2026 Comunidad Clara Administraciones Ltda.</footer>
  </div>
);

/* Campo con ícono a la izquierda y, para contraseñas, botón para mostrarla */
export const CampoConIcono = ({
  id,
  etiqueta,
  icono: Icono,
  tipo = "text",
  conMostrar = false,
  mostrarControlado,
  onToggleMostrar,
  ...props
}: {
  id: string;
  etiqueta: string;
  icono: LucideIcon;
  tipo?: string;
  conMostrar?: boolean;
  mostrarControlado?: boolean;
  onToggleMostrar?: () => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "id">) => {
  const [mostrarLocal, setMostrarLocal] = useState(false);
  const mostrar = mostrarControlado ?? mostrarLocal;
  const alternar = onToggleMostrar ?? (() => setMostrarLocal((v) => !v));

  return (
    <div>
      <label htmlFor={id} className="etiqueta">
        {etiqueta}
      </label>
      <div className="relative">
        <Icono className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" size={17} />
        <input
          id={id}
          type={conMostrar ? (mostrar ? "text" : "password") : tipo}
          className={`campo !pl-11 !min-h-[3rem] ${conMostrar ? "!pr-12" : ""}`}
          {...props}
        />
        {conMostrar && (
          <button
            type="button"
            onClick={alternar}
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={mostrar}
            className="boton-icono !w-9 !h-9 absolute right-1.5 top-1/2 -translate-y-1/2"
          >
            {mostrar ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
    </div>
  );
};

/* Indicador simple de largo de contraseña (regla real: mínimo 8 caracteres) */
export const LargoClave = ({ valor }: { valor: string }) => {
  const ok = valor.length >= 8;
  return (
    <div className="flex items-center gap-2.5 mt-2" aria-live="polite">
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className={`w-[7px] h-[9px] rounded-[2px] transition-colors duration-300 ${
              i < valor.length ? (ok ? "bg-exito" : "bg-luz") : "bg-papel-2"
            }`}
          />
        ))}
      </span>
      <span className={`text-[0.75rem] ${ok ? "text-exito font-medium" : "text-tinta-3"}`}>
        {ok ? "Largo suficiente" : `Mínimo 8 caracteres (${valor.length}/8)`}
      </span>
    </div>
  );
};
