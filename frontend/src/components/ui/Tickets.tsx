import React, { useLayoutEffect, useRef, useEffect } from "react";
import { ArrowUp, Clock, User } from "lucide-react";
import { InsigniaEstado } from "./Pagina";
import { IndicadorVentanas } from "./Fachada";
import { Esqueleto } from "./Skeleton";

/* ─────────────────────────────────────────────────────────────────────
   Piezas compartidas por "Mis solicitudes" (residente) y la bandeja de
   tickets (ejecutivo y administrador).
   ───────────────────────────────────────────────────────────────────── */

export interface MensajeHilo {
  id_mensaje: number;
  contenido: string;
  fecha: string;
  autor_id: number;
  autor_nombre: string;
  autor_rol: number;
}

/* Tarjeta de un ticket en la lista */
export const TarjetaTicket = ({
  id,
  titulo,
  descripcion,
  estado,
  fecha,
  persona,
  seleccionado,
  onClick,
}: {
  id: number;
  titulo: string;
  descripcion: string;
  estado: string;
  fecha: string;
  persona?: string;
  seleccionado: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-current={seleccionado ? "true" : undefined}
    className={`fila-ticket relative w-full text-left px-4 py-3.5 rounded-2xl transition-all duration-200
      ${seleccionado ? "bg-superficie shadow-[var(--sombra-papel)] ring-1 ring-linea" : "hover:bg-superficie/70"}`}
  >
    <span
      aria-hidden="true"
      className={`absolute left-0 top-4 bottom-4 w-[4px] rounded-r-sm transition-all duration-300 ease-curva
        ${seleccionado ? "bg-luz shadow-[0_0_10px_rgba(242,180,65,0.7)]" : "bg-transparent"}`}
    />
    <span className="flex items-start justify-between gap-3">
      <span className="min-w-0">
        <span className="numeral text-[0.8rem] text-tinta-3">N.º {id}</span>
        <span className="text-[0.9rem] font-semibold text-tinta leading-snug line-clamp-2 [overflow-wrap:anywhere]">
          {titulo}
        </span>
      </span>
      <InsigniaEstado estado={estado} className="shrink-0 mt-0.5" />
    </span>
    <span className="text-[0.8125rem] text-tinta-2 mt-1.5 line-clamp-2 leading-relaxed [overflow-wrap:anywhere]">
      {descripcion}
    </span>
    <span className="mt-2.5 flex items-center gap-3 text-[0.75rem] text-tinta-3">
      {persona && (
        <span className="flex items-center gap-1 min-w-0 truncate font-medium text-tinta-2">
          <User size={12} className="shrink-0" /> {persona}
        </span>
      )}
      <span className="flex items-center gap-1 shrink-0 tabular-nums">
        <Clock size={12} /> {fecha}
      </span>
    </span>
  </button>
);

export const EsqueletoTickets = () => (
  <div className="space-y-2 p-2" role="status" aria-label="Cargando tickets">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="px-4 py-3.5 space-y-2">
        <Esqueleto className="h-2.5 w-12" />
        <div className="flex justify-between gap-3">
          <Esqueleto className="h-4 w-2/3" />
          <Esqueleto className="h-4 w-16 !rounded-full" />
        </div>
        <Esqueleto className="h-3 w-full" />
        <Esqueleto className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

/* Hilo de mensajes de un ticket */
export const HiloMensajes = ({
  mensajes,
  usuarioId,
  cargando,
  vacio,
}: {
  mensajes: MensajeHilo[];
  usuarioId: number;
  cargando: boolean;
  vacio: React.ReactNode;
}) => {
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes.length]);

  if (cargando) {
    return (
      <div className="space-y-5 p-5 sm:p-6" role="status" aria-label="Cargando mensajes">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`flex flex-col gap-1.5 ${i % 2 ? "items-end" : ""}`}>
            <Esqueleto className="h-2.5 w-24" />
            <Esqueleto className={`h-12 ${i % 2 ? "w-1/2" : "w-2/3"} !rounded-2xl`} />
          </div>
        ))}
      </div>
    );
  }

  if (mensajes.length === 0) return <>{vacio}</>;

  return (
    <div className="p-4 sm:p-6 space-y-4" role="log" aria-label="Mensajes del ticket">
      {mensajes.map((m) => {
        const esMio = m.autor_id === usuarioId;
        return (
          <div
            key={m.id_mensaje}
            className={`flex flex-col max-w-[88%] sm:max-w-[75%] animate-aparecer ${esMio ? "ml-auto items-end" : "mr-auto items-start"}`}
          >
            <span className="text-[0.6875rem] text-tinta-3 mb-1 px-1">
              <span className="font-semibold text-tinta-2">{esMio ? "Tú" : m.autor_nombre}</span> · {m.fecha}
            </span>
            <div
              className={`px-4 py-2.5 text-[0.9rem] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere] ${
                esMio ? "burbuja-usuario" : "burbuja-humano text-tinta"
              }`}
            >
              {m.contenido}
            </div>
          </div>
        );
      })}
      <div ref={finRef} />
    </div>
  );
};

/* Compositor para responder dentro de un ticket */
export const CompositorHilo = ({
  valor,
  onCambio,
  onEnviar,
  enviando,
  deshabilitado,
  placeholder,
  etiqueta,
}: {
  valor: string;
  onCambio: (v: string) => void;
  onEnviar: (e: React.FormEvent) => void;
  enviando: boolean;
  deshabilitado?: boolean;
  placeholder: string;
  etiqueta: string;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`;
  }, [valor]);

  return (
    <form onSubmit={onEnviar} className="shrink-0 p-3 sm:p-4 border-t border-linea bg-papel/60">
      <div className="compositor flex items-end gap-2 pl-4 pr-2 py-1.5">
        <label className="sr-only" htmlFor="respuesta-ticket">
          {etiqueta}
        </label>
        <textarea
          id="respuesta-ticket"
          ref={ref}
          rows={1}
          placeholder={placeholder}
          maxLength={5000}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (valor.trim() && !enviando && !deshabilitado) onEnviar(e);
            }
          }}
          disabled={enviando || deshabilitado}
          className="flex-1 resize-none bg-transparent py-2 text-[0.9rem] leading-relaxed text-tinta placeholder:text-tinta-3 focus:outline-none disabled:opacity-60 barra-fina"
        />
        <button
          type="submit"
          disabled={enviando || !valor.trim() || deshabilitado}
          aria-label="Enviar mensaje"
          className={`grid place-items-center w-9 h-9 rounded-full shrink-0 mb-0.5 transition-all duration-300 ease-curva
            ${valor.trim() && !enviando && !deshabilitado ? "bg-petroleo text-white hover:bg-petroleo-hover active:scale-90" : "bg-papel-2 text-tinta-3"}`}
        >
          {enviando ? <IndicadorVentanas /> : <ArrowUp size={17} strokeWidth={2.4} />}
        </button>
      </div>
    </form>
  );
};

/* Nota que reemplaza al compositor cuando no se puede responder */
export const NotaHilo = ({ children }: { children: React.ReactNode }) => (
  <div className="shrink-0 px-5 py-4 border-t border-linea bg-papel-2/50 text-center text-[0.8125rem] text-tinta-2">{children}</div>
);
