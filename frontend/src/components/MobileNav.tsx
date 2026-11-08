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
      { id: "chat", label: "Asistente IA", icon: <MessageSquare size={18} /> },
      { id: "mis_tickets", label: "Mis Solicitudes", icon: <Ticket size={18} /> }
    );
  } else if (usuario.rol_nombre === "Ejecutivo") {
    items.push(
      { id: "bandeja_tickets", label: "Bandeja", icon: <Inbox size={18} /> },
      { id: "tickets_asignados", label: "Asignados", icon: <Ticket size={18} /> },
      { id: "historial_tickets", label: "Historial", icon: <Clock size={18} /> }
    );
  } else if (usuario.rol_nombre === "Administrador") {
    items.push(
      { id: "admin_conocimiento", label: "RAG Docs", icon: <Database size={18} /> },
      { id: "admin_usuarios", label: "Usuarios", icon: <Users size={18} /> },
      { id: "metricas", label: "Métricas", icon: <BarChart3 size={18} /> },
      { id: "bandeja_tickets", label: "Tickets", icon: <Inbox size={18} /> },
      { id: "auditoria", label: "Auditoría", icon: <ShieldCheck size={18} /> }
    );
  }

  return (
    <nav className="md:hidden fixed bottom-2 inset-x-2 z-40 font-sans">
      <div className="bg-white rounded-lg p-1.5 flex items-center justify-around shadow-lg border border-[#E7EAE7]">
        {items.map((item) => {
          const isActive = vistaActiva === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setVistaActiva(item.id)}
              type="button"
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-lg transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-[#DCEFEA] text-[#286D68] shadow-xs font-semibold"
                  : "text-[#788583] hover:text-[#293A3B] hover:bg-[#F6F5F0]"
              }`}
            >
              <div>{item.icon}</div>
              <span className="text-[10px] font-heading font-medium mt-0.5 tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
