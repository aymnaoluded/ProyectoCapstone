import React from "react";
import type { Usuario } from "../types";
import { itemsDeRol, type VistaApp } from "./navegacion";

interface MobileNavProps {
  usuario: Usuario;
  vistaActiva: VistaApp;
  setVistaActiva: (vista: VistaApp) => void;
}

/* Barra inferior del celular: la sección activa se marca con una ventana encendida */
export const MobileNav: React.FC<MobileNavProps> = ({ usuario, vistaActiva, setVistaActiva }) => {
  const items = itemsDeRol(usuario.rol_nombre).filter((i) => i.enMovil).slice(0, 5);

  return (
    <nav
      aria-label="Navegación principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-superficie/95 backdrop-blur-md border-t border-linea pb-seguro"
    >
      <ul className="flex items-stretch justify-around px-1.5">
        {items.map((item) => {
          const activo = vistaActiva === item.vista;
          const Icono = item.icono;
          return (
            <li key={item.vista} className="flex-1">
              <button
                onClick={() => setVistaActiva(item.vista)}
                type="button"
                aria-current={activo ? "page" : undefined}
                className={`relative w-full flex flex-col items-center justify-center gap-1 pt-2.5 pb-2 min-h-[3.5rem] transition-colors
                  ${activo ? "text-petroleo" : "text-tinta-3 active:text-tinta"}`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute top-0 h-[3px] rounded-b-sm transition-all duration-300 ease-curva
                    ${activo ? "w-6 bg-luz shadow-[0_0_10px_rgba(242,180,65,0.8)]" : "w-0 bg-transparent"}`}
                />
                <Icono size={20} strokeWidth={activo ? 2.25 : 1.9} />
                <span className={`text-[0.6875rem] tracking-tight ${activo ? "font-semibold" : "font-medium"}`}>
                  {item.corta}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
