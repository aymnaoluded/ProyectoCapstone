import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────
   Diálogo accesible: atrapa el foco, se cierra con Escape o tocando el
   fondo, devuelve el foco al elemento que lo abrió y bloquea el scroll.
   En celular se presenta como hoja que sube desde abajo.
   ───────────────────────────────────────────────────────────────────── */

interface ModalProps {
  abierto: boolean;
  onCerrar: () => void;
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  icono?: React.ReactNode;
  tono?: "normal" | "coral" | "peligro" | "luz";
  ancho?: "sm" | "md" | "lg";
  /** Impide cerrar mientras se procesa una acción */
  bloqueado?: boolean;
  children?: React.ReactNode;
  pie?: React.ReactNode;
}

const SELECTOR_FOCO =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const TONOS = {
  normal: "bg-menta text-petroleo-hover",
  coral: "bg-coral-suave text-coral-tinta",
  peligro: "bg-error-suave text-error",
  luz: "bg-luz-suave text-luz-tinta",
};

const ANCHOS = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl" };

export const Modal: React.FC<ModalProps> = ({
  abierto,
  onCerrar,
  titulo,
  descripcion,
  icono,
  tono = "normal",
  ancho = "sm",
  bloqueado = false,
  children,
  pie,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const idDescripcion = useId();
  // Referencias a los valores más recientes, para que el manejador de teclado no quede desactualizado
  const cerrarRef = useRef(onCerrar);
  const bloqueadoRef = useRef(bloqueado);
  useEffect(() => {
    cerrarRef.current = onCerrar;
    bloqueadoRef.current = bloqueado;
  });

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Foco inicial: el primer campo, o el panel si no hay campos
    const t = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const campo = panel.querySelector<HTMLElement>("input, textarea, select");
      (campo ?? panel).focus();
    }, 30);

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !bloqueadoRef.current) {
        e.stopPropagation();
        cerrarRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const enfocables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(SELECTOR_FOCO));
      if (enfocables.length === 0) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    };
    document.addEventListener("keydown", alTeclear);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflowPrevio;
      anterior?.focus?.();
    };
  }, [abierto]);

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-noche/45 backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
            transition={{ duration: 0.2 }}
            onClick={() => !bloqueado && onCerrar()}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={idTitulo}
            aria-describedby={descripcion ? idDescripcion : undefined}
            tabIndex={-1}
            className={`relative w-full ${ANCHOS[ancho]} max-h-[92dvh] flex flex-col bg-superficie
              rounded-t-[1.75rem] sm:rounded-[1.5rem] border border-linea shadow-[var(--sombra-flotante)]
              focus:outline-none pb-seguro`}
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            {/* Asa visual en celular */}
            <span className="sm:hidden mx-auto mt-2.5 h-1 w-10 rounded-full bg-linea-fuerte" aria-hidden="true" />

            <div className="flex items-start gap-3.5 px-6 pt-5 sm:pt-6">
              {icono && (
                <span className={`arco grid place-items-center w-10 h-11 shrink-0 ${TONOS[tono]}`}>{icono}</span>
              )}
              <div className="flex-1 min-w-0 pt-0.5">
                <h2 id={idTitulo} className="titular text-[1.35rem] text-tinta">
                  {titulo}
                </h2>
                {descripcion && (
                  <p id={idDescripcion} className="text-sm text-tinta-2 mt-1.5 leading-relaxed">
                    {descripcion}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onCerrar}
                disabled={bloqueado}
                aria-label="Cerrar"
                className="boton-icono -mr-2 -mt-1"
              >
                <X size={18} />
              </button>
            </div>

            {children && <div className="px-6 pt-5 pb-1 overflow-y-auto barra-fina min-h-0">{children}</div>}

            {pie && (
              <div className="px-6 pt-4 pb-5 sm:pb-6 mt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 border-t border-linea/70">
                {pie}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
