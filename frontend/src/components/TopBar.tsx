import React from "react";
import {
  Sun,
  Moon,
  Menu,
  Shield,
  LogOut,
  Bell,
  Sparkles,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import type { Usuario } from "../types";
import type { VistaApp } from "./Sidebar";

interface TopBarProps {
  usuario: Usuario;
  vistaActiva: VistaApp;
  onToggleSidebarMobile: () => void;
  onCerrarSesion: () => void;
  onCambiarPassword: () => void;
  mostrarSeguridad: boolean;
}

const NOMBRES_VISTAS: Record<VistaApp, { titulo: string; categoria: string }> = {
  chat: { titulo: "Asistente Virtual IA", categoria: "Soporte Inteligente" },
  mis_tickets: { titulo: "Mis Solicitudes", categoria: "Atención al Cliente" },
  bandeja_tickets: { titulo: "Bandeja de Tickets", categoria: "Gestión de Soporte" },
  tickets_asignados: { titulo: "Tickets Asignados", categoria: "Mi Trabajo" },
  historial_tickets: { titulo: "Historial de Tickets", categoria: "Archivo de Casos" },
  admin_conocimiento: { titulo: "Base de Conocimiento (RAG)", categoria: "Administración" },
  admin_usuarios: { titulo: "Gestión de Usuarios", categoria: "Administración" },
  metricas: { titulo: "Métricas del Sistema", categoria: "Analítica" },
  auditoria: { titulo: "Registro de Auditoría", categoria: "Seguridad y Trazabilidad" },
};

export const TopBar: React.FC<TopBarProps> = ({
  usuario,
  vistaActiva,
  onToggleSidebarMobile,
  onCerrarSesion,
  onCambiarPassword,
  mostrarSeguridad,
}) => {
  const { isDark, toggleTheme } = useTheme();

  const vistaInfo = mostrarSeguridad
    ? { titulo: "Seguridad de la Cuenta", categoria: "Ajustes de Perfil" }
    : NOMBRES_VISTAS[vistaActiva] || { titulo: "SupportAI", categoria: "Plataforma" };

  return (
    <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-3 transition-colors duration-200">
      <div className="liquid-glass rounded-2xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm border">
        {/* LADO IZQUIERDO: TOGGLE MÓVIL + BREADCRUMBS */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebarMobile}
            className="md:hidden p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/10 transition-colors"
            title="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span className="font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <Sparkles size={13} />
                SupportAI
              </span>
              <span>/</span>
              <span className="truncate">{vistaInfo.categoria}</span>
              <span>/</span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight truncate">
              {vistaInfo.titulo}
            </h1>
          </div>
        </div>

        {/* LADO DERECHO: HERRAMIENTAS APPLE */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Indicador de conexión / Heartbeat */}
          <div
            title="Conectado al servidor de SupportAI"
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>En línea</span>
          </div>

          {/* Toggle Modo Claro / Oscuro */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-all cursor-pointer border border-transparent hover:border-slate-300/40 dark:hover:border-white/10 active:scale-95"
          >
            {isDark ? (
              <Sun size={17} className="text-amber-400 animate-apple-fade-in" />
            ) : (
              <Moon size={17} className="text-slate-700 animate-apple-fade-in" />
            )}
          </button>

          {/* Perfil del usuario / Cápsula Apple */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 px-2.5 py-1.5 rounded-full">
              <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white text-[11px] font-bold shadow-xs">
                {usuario.nombre ? usuario.nombre[0].toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </span>
                <span className="block text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                  {usuario.rol_nombre}
                </span>
              </div>
            </div>

            {/* Botón Seguridad / Cambiar clave */}
            <button
              onClick={onCambiarPassword}
              title={mostrarSeguridad ? "Volver a la vista principal" : "Seguridad de la cuenta"}
              className={`p-2 rounded-xl transition-all cursor-pointer border ${
                mostrarSeguridad
                  ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100/70 dark:hover:bg-white/10 border-transparent"
              }`}
            >
              <LockKeyhole size={16} />
            </button>

            {/* Botón Cerrar Sesión */}
            <button
              onClick={onCerrarSesion}
              title="Cerrar sesión"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer border border-transparent hover:border-rose-500/20 active:scale-95"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
