import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────
   Notificaciones breves (toasts). Reemplazan los alert() del navegador
   y los avisos sueltos de cada vista. Se anuncian a lectores de pantalla.
   ───────────────────────────────────────────────────────────────────── */

type TipoToast = "exito" | "error" | "aviso" | "info";

interface Toast {
  id: number;
  tipo: TipoToast;
  titulo: string;
  mensaje?: string;
}

interface ToastApi {
  exito: (titulo: string, mensaje?: string) => void;
  error: (titulo: string, mensaje?: string) => void;
  aviso: (titulo: string, mensaje?: string) => void;
  info: (titulo: string, mensaje?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ESTILOS: Record<TipoToast, { icono: React.ReactNode; acento: string }> = {
  exito: { icono: <CheckCircle2 size={18} />, acento: "bg-exito-suave text-exito" },
  error: { icono: <XCircle size={18} />, acento: "bg-error-suave text-error" },
  aviso: { icono: <AlertTriangle size={18} />, acento: "bg-luz-suave text-luz-tinta" },
  info: { icono: <Info size={18} />, acento: "bg-menta text-petroleo-hover" },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const siguienteId = useRef(1);

  const cerrar = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const mostrar = useCallback(
    (tipo: TipoToast, titulo: string, mensaje?: string) => {
      const id = siguienteId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, tipo, titulo, mensaje }]);
      window.setTimeout(() => cerrar(id), tipo === "error" ? 7000 : 5000);
    },
    [cerrar]
  );

  const api = useMemo<ToastApi>(
    () => ({
      exito: (t, m) => mostrar("exito", t, m),
      error: (t, m) => mostrar("error", t, m),
      aviso: (t, m) => mostrar("aviso", t, m),
      info: (t, m) => mostrar("info", t, m),
    }),
    [mostrar]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed z-[90] inset-x-3 top-3 sm:inset-x-auto sm:top-auto sm:bottom-6 sm:right-6 flex flex-col gap-2.5 sm:w-[23rem] pointer-events-none"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              role={t.tipo === "error" ? "alert" : "status"}
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 480, damping: 38 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-superficie border border-linea p-3.5 pr-2.5 shadow-[var(--sombra-flotante)]"
            >
              <span className={`arco grid place-items-center w-8 h-9 shrink-0 ${ESTILOS[t.tipo].acento}`}>
                {ESTILOS[t.tipo].icono}
              </span>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-sm font-semibold text-tinta leading-snug">{t.titulo}</p>
                {t.mensaje && <p className="text-[0.8125rem] text-tinta-2 mt-0.5 leading-relaxed">{t.mensaje}</p>}
              </div>
              <button
                type="button"
                onClick={() => cerrar(t.id)}
                aria-label="Cerrar notificación"
                className="boton-icono !w-8 !h-8 shrink-0"
              >
                <X size={15} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
};
