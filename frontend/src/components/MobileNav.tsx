import React from "react";
import {
  MessageSquare,
  Ticket,
  Users,
  Database,
  BarChart3,
  ShieldCheck,
  Inbox,
  Clock,
} from "lucide-react";
import type { Usuario } from "../types";
import type { VistaApp } from "./Sidebar";

interface MobileNavProps {
  usuario: Usuario;
  vistaActiva: VistaApp;
  setVistaActiva: (vista: VistaApp) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  usuario,
  vistaActiva,
  setVistaActiva,
}) => {
  // Construir opciones según el rol del usuario
  const items: Array<{ id: VistaApp; label: string; icon: React.ReactNode }> = [];

  if (usuario.rol_nombre === "Cliente") {
    items.push(
      { id: "chat", label: "Chat IA", icon: <MessageSquare size={19} /> },
      { id: "mis_tickets", label: "Mis Tickets", icon: <Ticket size={19} /> }
    );
  } else if (usuario.rol_nombre === "Ejecutivo") {
    items.push(
      { id: "bandeja_tickets", label: "Bandeja", icon: <Inbox size={19} /> },
      { id: "tickets_asignados", label: "Asignados", icon: <Ticket size={19} /> },
      { id: "historial_tickets", label: "Historial", icon: <Clock size={19} /> }
    );
  } else if (usuario.rol_nombre === "Administrador") {
    items.push(
      { id: "admin_conocimiento", label: "RAG Docs", icon: <Database size={19} /> },
      { id: "admin_usuarios", label: "Usuarios", icon: <Users size={19} /> },
      { id: "metricas", label: "Métricas", icon: <BarChart3 size={19} /> },
      { id: "bandeja_tickets", label: "Tickets", icon: <Inbox size={19} /> },
      { id: "auditoria", label: "Auditoría", icon: <ShieldCheck size={19} /> }
    );
  }

  return (
    <nav className="md:hidden fixed bottom-3 inset-x-3 z-40">
      <div className="liquid-glass-elevated rounded-3xl p-1.5 flex items-center justify-around shadow-2xl border border-white/20 dark:border-white/10">
        {items.map((item) => {
          const isActive = vistaActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setVistaActiva(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/25 scale-[1.02]"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 active:scale-95"
              }`}
            >
              <div className="transition-transform duration-200">
                {item.icon}
              </div>
              <span className="text-[10px] font-semibold mt-0.5 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
