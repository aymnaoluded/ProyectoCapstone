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
  chat: { titulo: "Asistente Virtual IA", categoria: "Atención y Soporte" },
  mis_tickets: { titulo: "Mis Solicitudes", categoria: "Atención al Residente" },
  bandeja_tickets: { titulo: "Bandeja de Tickets", categoria: "Gestión de Soporte" },
  tickets_asignados: { titulo: "Tickets Asignados", categoria: "Mi Trabajo" },
  historial_tickets: { titulo: "Historial de Tickets", categoria: "Archivo de Casos" },
  admin_conocimiento: { titulo: "Base de Conocimiento (RAG)", categoria: "Administración" },
  admin_usuarios: { titulo: "Gestión de Usuarios", categoria: "Administración" },
  metricas: { titulo: "Métricas del Sistema", categoria: "Analítica Institucional" },
  auditoria: { titulo: "Registro de Auditoría", categoria: "Seguridad y Trazabilidad" },
};

export const TopBar: React.FC<TopBarProps> = ({
  vistaActiva,
  onToggleSidebarMobile,
  mostrarSeguridad,
}) => {
  const vistaInfo = mostrarSeguridad
    ? { titulo: "Seguridad de la Cuenta", categoria: "Ajustes de Perfil" }
    : NOMBRES_VISTAS[vistaActiva] || { titulo: "Portal Institucional", categoria: "Comunidad Clara" };

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3 bg-[#F5F7FA]">
      <div className="bg-white/90 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center justify-between gap-3 shadow-[0_2px_12px_rgba(31,41,51,0.03)] border border-slate-200/70 transition-all">
        {/* BREADCRUMBS INSTITUCIONALES CON ESTILO IOS */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 rounded-xl text-[#52606D] hover:text-[#1F2933] hover:bg-[#F5F7FA] transition-colors active:scale-95 cursor-pointer"
            title="Abrir menú"
            type="button"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[#52606D]">
              <span className="font-semibold text-[#1E4E79] flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1E4E79]/8 border border-[#1E4E79]/15">
                <Building2 size={13} className="text-[#1E4E79]" />
                Comunidad Clara
              </span>
              <span className="text-slate-300">/</span>
              <span className="truncate">{vistaInfo.categoria}</span>
              <span className="text-slate-300">/</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold font-heading text-[#173C5E] tracking-tight truncate">
              {vistaInfo.titulo}
            </h1>
          </div>
        </div>

        {/* Zona derecha: el perfil, candado y logout ya están en el sidebar para evitar duplicidad */}
        <div className="hidden sm:flex items-center gap-2 shrink-0 text-xs text-[#52606D]">
          <span className="w-2 h-2 rounded-full bg-[#47705A] animate-pulse"></span>
          <span className="font-medium text-[11px] text-[#52606D]">Plataforma Activa</span>
        </div>
      </div>
    </header>
  );
};
