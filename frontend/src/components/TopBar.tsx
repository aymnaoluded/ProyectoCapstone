import React from "react";
import { Menu, Search, WifiOff } from "lucide-react";
import type { Usuario } from "../types";
import { buscarItem, type VistaApp } from "./navegacion";
import { MarcaIcono } from "./ui/Fachada";
import { useEnLinea, saludoSegunHora } from "../utils/useEnLinea";

interface TopBarProps {
  usuario?: Usuario;
  vistaActiva: VistaApp;
  onToggleSidebarMobile: () => void;
  onCerrarSesion?: () => void;
  onCambiarPassword?: () => void;
  mostrarSeguridad?: boolean;
  onAbrirAccesos?: () => void;
}

const esMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export const TopBar: React.FC<TopBarProps> = ({
  usuario,
  vistaActiva,
  onToggleSidebarMobile,
  mostrarSeguridad,
  onAbrirAccesos,
}) => {
  const enLinea = useEnLinea();
  const item = buscarItem(usuario?.rol_nombre, vistaActiva);
  const info = mostrarSeguridad
    ? { titulo: "Seguridad de la cuenta", categoria: "Tu perfil" }
    : { titulo: item?.etiqueta ?? "Comunidad Clara", categoria: item?.categoria ?? "Plataforma" };

  const fecha = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });

  return (
    <header className="sticky top-0 z-30 shrink-0 h-14 md:h-[3.75rem] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-3 bg-papel/85 backdrop-blur-md border-b border-linea">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebarMobile}
          className="md:hidden boton-icono -ml-1"
          aria-label="Abrir menú"
          type="button"
        >
          <Menu size={20} />
        </button>
        <MarcaIcono size={28} className="md:hidden shrink-0" />

        {/* Celular: nombre de la vista (el encabezado de la página puede quedar fuera de pantalla) */}
        <p className="md:hidden font-semibold text-[0.9375rem] text-tinta truncate" aria-current="page">
          {info.titulo}
        </p>

        {/* Escritorio: saludo; la vista ya se nombra en el directorio y en el encabezado */}
        <p className="hidden md:flex items-baseline gap-2 min-w-0 text-[0.875rem] text-tinta-2 truncate">
          <span>
            {saludoSegunHora()}, <span className="font-semibold text-tinta">{usuario?.nombre}</span>
          </span>
          <span aria-hidden="true" className="text-linea-fuerte">·</span>
          <span className="ceja !text-[0.65rem] truncate">{info.categoria}</span>
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!enLinea && (
          <span role="status" className="insignia insignia-error insignia-sin-punto">
            <WifiOff size={12} />
            <span className="hidden sm:inline">Sin conexión</span>
          </span>
        )}

        <span className="hidden lg:inline text-[0.8125rem] text-tinta-3 first-letter:uppercase">{fecha}</span>

        {onAbrirAccesos && (
          <button
            type="button"
            onClick={onAbrirAccesos}
            aria-label="Abrir accesos rápidos"
            aria-keyshortcuts={esMac ? "Meta+K" : "Control+K"}
            className="group flex items-center gap-2 h-9 pl-3 pr-1.5 rounded-full border border-linea-fuerte bg-superficie text-tinta-2
              hover:border-petroleo hover:text-petroleo transition-colors"
          >
            <Search size={15} />
            <span className="hidden md:inline text-[0.8125rem] font-medium">Ir a…</span>
            <span className="hidden md:inline-flex items-center gap-0.5 ml-1">
              <kbd className="tecla">{esMac ? "⌘" : "Ctrl"}</kbd>
              <kbd className="tecla">K</kbd>
            </span>
            <span className="md:hidden w-1" />
          </button>
        )}
      </div>
    </header>
  );
};
