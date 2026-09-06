import React from "react";
import {
  Bot,
  MessageSquare,
  Ticket,
  Users,
  Database,
  BarChart3,
  ShieldCheck,
  Headphones,
  LogOut,
  ChevronRight,
} from "lucide-react";
import type { Usuario } from "../types";

export type VistaApp =
  // Cliente
  | "chat"
  | "mis_tickets"
  // Ejecutivo
  | "atender_tickets"
  | "escaladas"
  // Admin
  | "admin_conocimiento"
  | "admin_usuarios"
  | "metricas"
  | "auditoria";

interface SidebarProps {
  usuario: Usuario;
  vistaActiva: VistaApp;
  setVistaActiva: (vista: VistaApp) => void;
  onCerrarSesion: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  usuario,
  vistaActiva,
  setVistaActiva,
  onCerrarSesion,
}) => {
  return (
    <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col justify-between shrink-0 select-none border-r border-slate-800">
      <div className="p-4 space-y-6">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
            <Bot size={30} />
          </div>
          <div>
            <h1 className="font-semibold text-base text-white leading-none">SupportAI</h1>
            <span className="text-[13px] text-blue-400 font-medium">{usuario.rol_nombre}</span>
          </div>
        </div>

        {/* Menú por Roles */}
        <nav className="space-y-1.5">
          {/* VISTAS CLIENTE */}
          {usuario.rol_nombre === "Cliente" && (
            <>
              <button
                onClick={() => setVistaActiva("chat")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "chat"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={17} />
                  <span>Conversar con IA</span>
                </div>
                {vistaActiva === "chat" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("mis_tickets")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "mis_tickets"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Ticket size={17} />
                  <span>Mis solicitudes</span>
                </div>
                {vistaActiva === "mis_tickets" && <ChevronRight size={15} />}
              </button>
            </>
          )}

          {/* VISTAS EJECUTIVO */}
          {usuario.rol_nombre === "Ejecutivo" && (
            <>
              <button
                onClick={() => setVistaActiva("atender_tickets")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "atender_tickets"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Headphones size={17} />
                  <span>Atender Tickets</span>
                </div>
                {vistaActiva === "atender_tickets" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("escaladas")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "escaladas"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={17} />
                  <span>Conversaciones Escaladas</span>
                </div>
                {vistaActiva === "escaladas" && <ChevronRight size={15} />}
              </button>
            </>
          )}

          {/* VISTAS ADMINISTRADOR */}
          {usuario.rol_nombre === "Administrador" && (
            <>
              <button
                onClick={() => setVistaActiva("admin_conocimiento")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "admin_conocimiento"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Database size={17} />
                  <span>Base de Conocimiento</span>
                </div>
                {vistaActiva === "admin_conocimiento" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("metricas")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "metricas"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 size={17} />
                  <span>Métricas del Sistema</span>
                </div>
                {vistaActiva === "metricas" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("auditoria")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "auditoria"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck size={17} />
                  <span>Log de Auditoría</span>
                </div>
                {vistaActiva === "auditoria" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("admin_usuarios")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  vistaActiva === "admin_usuarios"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users size={17} />
                  <span>Gestión de Usuarios</span>
                </div>
                {vistaActiva === "admin_usuarios" && <ChevronRight size={15} />}
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Perfil footer */}
      <div className="p-4 border-t border-slate-800 space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center">
            {usuario.nombre.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="text-xs text-slate-400 truncate">{usuario.correo}</p>
          </div>
        </div>

        <button
          onClick={onCerrarSesion}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};