import React from "react";
import { Menu, Building2 } from "lucide-react";
import type { Usuario } from "../types";
import type { VistaApp } from "./Sidebar";

interface TopBarProps {
  usuario?: Usuario;
  vistaActiva: VistaApp;
  onToggleSidebarMobile: () => void;
  onCerrarSesion?: () => void;
  onCambiarPassword?: () => void;
  mostrarSeguridad?: boolean;
}

const NOMBRES_VISTAS: Record<VistaApp, { titulo: string; categoria: string }> = {
  chat:               { titulo: "Asistente Virtual IA",          categoria: "Atención y Soporte" },
  mis_tickets:        { titulo: "Mis Solicitudes",                categoria: "Atención al Residente" },
  bandeja_tickets:    { titulo: "Bandeja de Tickets",             categoria: "Gestión de Soporte" },
  tickets_asignados:  { titulo: "Tickets Asignados",              categoria: "Mi Trabajo" },
  historial_tickets:  { titulo: "Historial de Tickets",           categoria: "Archivo de Casos" },
  admin_conocimiento: { titulo: "Base de Conocimiento (RAG)",     categoria: "Administración" },
  admin_usuarios:     { titulo: "Gestión de Usuarios",            categoria: "Administración" },
  metricas:           { titulo: "Métricas del Sistema",           categoria: "Analítica Institucional" },
  auditoria:          { titulo: "Registro de Auditoría",          categoria: "Seguridad y Trazabilidad" },
};

export const TopBar: React.FC<TopBarProps> = ({
  vistaActiva,
  onToggleSidebarMobile,
  mostrarSeguridad,
}) => {
  const info = mostrarSeguridad
    ? { titulo: "Seguridad de la Cuenta", categoria: "Ajustes de Perfil" }
    : (NOMBRES_VISTAS[vistaActiva] ?? { titulo: "Portal Institucional", categoria: "Comunidad Clara" });

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-5 py-3 bg-[#F6F5F0]">
      <div className="bg-white/95 backdrop-blur-md rounded-[14px] px-4 py-2.5
        flex items-center justify-between gap-3
        border border-[#E7EAE7] shadow-[0_1px_6px_rgba(41,58,59,0.05)]
        transition-all">

        {/* Breadcrumb + título */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 rounded-xl text-[#788583] hover:text-[#293A3B]
              hover:bg-[#F6F5F0] transition-colors active:scale-95 cursor-pointer"
            title="Abrir menú"
            type="button"
          >
            <Menu size={19} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            {/* Breadcrumb desktop */}
            <div className="hidden sm:flex items-center gap-2 text-[12px] font-medium text-[#788583]">
              <span className="flex items-center gap-1.5 font-semibold text-[#286D68]
                px-2.5 py-1 rounded-full bg-[#DCEFEA] border border-[#C4E0DA]">
                <Building2 size={12} />
                Comunidad Clara
              </span>
              <span className="text-[#CDD4D3]">/</span>
              <span className="truncate text-[#788583]">{info.categoria}</span>
              <span className="text-[#CDD4D3]">/</span>
            </div>

            <h1 className="text-sm sm:text-[15px] font-heading font-bold text-[#293A3B] tracking-tight truncate">
              {info.titulo}
            </h1>
          </div>
        </div>

        {/* Indicador de estado */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#52966A] animate-pulse" />
          <span className="text-[11px] font-medium text-[#788583]">Plataforma Activa</span>
        </div>
      </div>
    </header>
  );
};
