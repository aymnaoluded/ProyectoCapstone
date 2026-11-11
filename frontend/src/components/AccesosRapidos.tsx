import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Search, Plus, LockKeyhole, LogOut, CornerDownLeft, type LucideIcon } from "lucide-react";
import type { Usuario } from "../types";
import { itemsDeRol, type VistaApp } from "./navegacion";

/* ─────────────────────────────────────────────────────────────────────
   Accesos rápidos (Ctrl/⌘ + K): moverse por la plataforma con el teclado.
   Solo lista destinos y acciones que existen para el rol del usuario.
   ───────────────────────────────────────────────────────────────────── */

interface Accion {
  id: string;
  grupo: "Ir a" | "Acciones";
  etiqueta: string;
  detalle: string;
  icono: LucideIcon;
  ejecutar: () => void;
}

interface AccesosRapidosProps {
  abierto: boolean;
  onCerrar: () => void;
  usuario: Usuario;
  vistaActiva: VistaApp;
  onIrA: (vista: VistaApp) => void;
  onNuevaConversacion?: () => void;
  onSeguridad: () => void;
  onCerrarSesion: () => void;
}

const normalizar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const AccesosRapidos: React.FC<AccesosRapidosProps> = ({
  abierto,
  onCerrar,
  usuario,
  vistaActiva,
  onIrA,
  onNuevaConversacion,
  onSeguridad,
  onCerrarSesion,
}) => {
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaId = useId();

  const acciones = useMemo<Accion[]>(() => {
    const destinos: Accion[] = itemsDeRol(usuario.rol_nombre).map((item) => ({
      id: `ir-${item.vista}`,
      grupo: "Ir a",
      etiqueta: item.etiqueta,
      detalle: item.vista === vistaActiva ? "Estás aquí" : item.descripcion,
      icono: item.icono,
      ejecutar: () => onIrA(item.vista),
    }));
    const extra: Accion[] = [];
    if (usuario.rol_nombre === "Cliente" && onNuevaConversacion) {
      extra.push({
        id: "nueva",
        grupo: "Acciones",
        etiqueta: "Nueva consulta",
        detalle: "Empieza una conversación nueva con Luz",
        icono: Plus,
        ejecutar: onNuevaConversacion,
      });
    }
    extra.push(
      {
        id: "seguridad",
        grupo: "Acciones",
        etiqueta: "Cambiar contraseña",
        detalle: "Seguridad de tu cuenta",
        icono: LockKeyhole,
        ejecutar: onSeguridad,
      },
      {
        id: "salir",
        grupo: "Acciones",
        etiqueta: "Cerrar sesión",
        detalle: `Salir de la cuenta de ${usuario.nombre}`,
        icono: LogOut,
        ejecutar: onCerrarSesion,
      }
    );
    return [...destinos, ...extra];
  }, [usuario, vistaActiva, onIrA, onNuevaConversacion, onSeguridad, onCerrarSesion]);

  const filtradas = useMemo(() => {
    const q = normalizar(consulta.trim());
    if (!q) return acciones;
    return acciones.filter((a) => normalizar(`${a.etiqueta} ${a.detalle}`).includes(q));
  }, [acciones, consulta]);

  // Cada apertura empieza con la búsqueda vacía (ajuste durante el render, no en un efecto)
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
  if (abiertoPrevio !== abierto) {
    setAbiertoPrevio(abierto);
    if (abierto) {
      setConsulta("");
      setIndice(0);
    }
  }

  useEffect(() => {
    if (!abierto) return;
    const anterior = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => {
      window.clearTimeout(t);
      anterior?.focus?.();
    };
  }, [abierto]);

  const ejecutar = (accion?: Accion) => {
    if (!accion) return;
    onCerrar();
    accion.ejecutar();
  };

  const alTeclear = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndice((i) => (filtradas.length ? (i + 1) % filtradas.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndice((i) => (filtradas.length ? (i - 1 + filtradas.length) % filtradas.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      ejecutar(filtradas[indice]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCerrar();
    } else if (e.key === "Tab") {
      e.preventDefault();
    }
  };

  let grupoAnterior = "";

  return createPortal(
    <AnimatePresence>
      {abierto && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[12vh]">
          <motion.div
            className="absolute inset-0 bg-noche/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onCerrar}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Accesos rápidos"
            className="relative w-full max-w-xl bg-superficie border border-linea rounded-[1.4rem] shadow-[var(--sombra-flotante)] overflow-hidden"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 38 }}
            onKeyDown={alTeclear}
          >
            <div className="flex items-center gap-3 px-5 border-b border-linea">
              <Search size={18} className="text-tinta-3 shrink-0" />
              <input
                ref={inputRef}
                value={consulta}
                onChange={(e) => {
                  setConsulta(e.target.value);
                  setIndice(0);
                }}
                placeholder="¿A dónde quieres ir?"
                role="combobox"
                aria-expanded="true"
                aria-controls={listaId}
                aria-activedescendant={filtradas[indice] ? `${listaId}-${filtradas[indice].id}` : undefined}
                aria-autocomplete="list"
                className="flex-1 h-14 bg-transparent text-[1rem] text-tinta placeholder:text-tinta-3 focus:outline-none"
              />
              <kbd className="tecla">Esc</kbd>
            </div>

            <ul id={listaId} role="listbox" aria-label="Destinos y acciones" className="max-h-[50vh] overflow-y-auto barra-fina p-2">
              {filtradas.length === 0 && (
                <li className="px-4 py-8 text-center text-sm text-tinta-2">Nada coincide con “{consulta}”.</li>
              )}
              {filtradas.map((a, i) => {
                const cabecera = a.grupo !== grupoAnterior ? a.grupo : null;
                grupoAnterior = a.grupo;
                const Icono = a.icono;
                const activo = i === indice;
                return (
                  <React.Fragment key={a.id}>
                    {cabecera && (
                      <li role="presentation" className="ceja px-3 pt-3 pb-1.5">
                        {cabecera}
                      </li>
                    )}
                    <li
                      id={`${listaId}-${a.id}`}
                      role="option"
                      aria-selected={activo}
                      onMouseMove={() => setIndice(i)}
                      onClick={() => ejecutar(a)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors
                        ${activo ? "bg-menta-2" : ""}`}
                    >
                      <span className={`arco grid place-items-center w-8 h-9 shrink-0 ${activo ? "bg-petroleo text-white" : "bg-papel-2 text-tinta-2"}`}>
                        <Icono size={16} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[0.9rem] font-semibold text-tinta truncate">{a.etiqueta}</span>
                        <span className="block text-[0.8rem] text-tinta-2 truncate">{a.detalle}</span>
                      </span>
                      {activo && <CornerDownLeft size={15} className="text-petroleo shrink-0" />}
                    </li>
                  </React.Fragment>
                );
              })}
            </ul>

            <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-t border-linea bg-papel/60 text-[0.75rem] text-tinta-3">
              <span className="flex items-center gap-1.5"><kbd className="tecla">↑</kbd><kbd className="tecla">↓</kbd> moverse</span>
              <span className="flex items-center gap-1.5"><kbd className="tecla">↵</kbd> abrir</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};
