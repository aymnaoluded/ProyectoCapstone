import React, { useState, useEffect } from "react";
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
  Inbox,
  History,
  Plus,
  Star,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import type { Usuario, ConversacionResumen } from "../types";

export type VistaApp =
  // Cliente
  | "chat"
  | "mis_tickets"
  // Ejecutivo / Admin
  | "bandeja_tickets"
  | "tickets_asignados"
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
  conversacionActivaId?: number | null;
  onSeleccionarConversacion?: (id: number) => void;
  onNuevaConversacion?: () => void;
  refreshHistorialTrigger?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  usuario,
  vistaActiva,
  setVistaActiva,
  onCerrarSesion,
  conversacionActivaId,
  onSeleccionarConversacion,
  onNuevaConversacion,
  refreshHistorialTrigger = 0,
}) => {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (!usuario || usuario.rol_nombre !== "Cliente") return;

    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `http://localhost:8000/api/chat/conversaciones?cliente_id=${usuario.id_usuario}`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }
        );
        if (res.ok) {
          const data = await res.json();
          setConversaciones(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error al cargar historial de conversaciones:", err);
      } finally {
        setCargandoHistorial(false);
      }
    };

    cargarHistorial();
  }, [usuario?.id_usuario, usuario?.rol_nombre, refreshHistorialTrigger]);

  // Si usuario no existe en memoria durante el render, previene el colapso del DOM
  if (!usuario) {
    return null;
  }

  const categorizarFecha = (
    fechaStr?: string
  ): "Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores" => {
    if (!fechaStr) return "Anteriores";
    try {
      const fecha = new Date(fechaStr.replace(" ", "T"));
      const ahora = new Date();

      const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      const hoyDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

      const diffTiempo = hoyDia.getTime() - fechaDia.getTime();
      const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

      if (diffDias <= 0) return "Hoy";
      if (diffDias === 1) return "Ayer";
      if (diffDias <= 7) return "Últimos 7 días";
      return "Anteriores";
    } catch {
      return "Anteriores";
    }
  };

  const formatearHoraOFecha = (fechaStr?: string, grupo?: string): string => {
    if (!fechaStr) return "";
    try {
      const fecha = new Date(fechaStr.replace(" ", "T"));
      const hora = fecha.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (grupo === "Hoy") {
        return hora;
      }
      if (grupo === "Ayer") {
        return `Ayer ${hora}`;
      }
      const dia = String(fecha.getDate()).padStart(2, "0");
      const mes = String(fecha.getMonth() + 1).padStart(2, "0");
      return `${dia}/${mes} ${hora}`;
    } catch {
      return "";
    }
  };

  const gruposOrden: ("Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores")[] = [
    "Hoy",
    "Ayer",
    "Últimos 7 días",
    "Anteriores",
  ];

  const grupos = gruposOrden.reduce<Record<string, ConversacionResumen[]>>(
    (acc, grupo) => {
      acc[grupo] = conversaciones.filter(
        (c) => categorizarFecha(c.fecha_ultimo_mensaje || c.fecha_inicio) === grupo
      );
      return acc;
    },
    {}
  );

  const inicialNombre = (usuario.nombre?.trim()?.charAt(0) || "U").toUpperCase();

  return (
    <aside className="w-64 bg-[#111827] text-slate-300 flex flex-col justify-between shrink-0 select-none border-r border-slate-800 h-screen">
      {/* Cabecera del Sidebar */}
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
            <Bot size={22} />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-semibold text-base text-white leading-none truncate">SupportAI</h1>
            <span className="text-[12px] text-blue-400 font-medium">
              {usuario.rol_nombre || "Usuario"}
            </span>
          </div>
        </div>
      </div>

      {/* Contenido Central Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5 min-h-0">
        <nav className="space-y-1.5">
          {/* VISTAS CLIENTE */}
          {usuario.rol_nombre === "Cliente" && (
            <>
              <button
                onClick={() => {
                  if (onNuevaConversacion) {
                    onNuevaConversacion();
                  } else {
                    setVistaActiva("chat");
                  }
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  vistaActiva === "chat" &&
                  (!conversacionActivaId || !conversaciones.some((c) => c.id_conversacion === conversacionActivaId))
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare size={17} />
                  <span>Conversar con IA</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[11px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300 border border-slate-700/60 font-semibold">
                    + Nuevo
                  </span>
                </div>
              </button>

              <button
                onClick={() => setVistaActiva("mis_tickets")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
              onClick={() => setVistaActiva("bandeja_tickets")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                vistaActiva === "bandeja_tickets"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Headphones size={17} />
                <span>Bandeja de Tickets</span>
              </div>
              {vistaActiva === "bandeja_tickets" && <ChevronRight size={15} />}
            </button>

            <button
              onClick={() => setVistaActiva("tickets_asignados")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                vistaActiva === "tickets_asignados"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <Headphones size={17} />
                <span>Tickets Asignados</span>
              </div>
              {vistaActiva === "tickets_asignados" && <ChevronRight size={15} />}
            </button>
            </>
          )}

          {/* VISTAS ADMINISTRADOR */}
          {usuario.rol_nombre === "Administrador" && (
            <>
              <button
                onClick={() => setVistaActiva("admin_conocimiento")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
                onClick={() => setVistaActiva("bandeja_tickets")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  vistaActiva === "bandeja_tickets"
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Inbox size={17} />
                  <span>Supervisión de Tickets</span>
                </div>
                {vistaActiva === "bandeja_tickets" && <ChevronRight size={15} />}
              </button>

              <button
                onClick={() => setVistaActiva("admin_usuarios")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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

              <button
                onClick={() => setVistaActiva("metricas")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
            </>
          )}
        </nav>

        {/* HISTORIAL: SECCIÓN "CHATS Y TAREAS" (Solo Rol Cliente) */}
        {usuario.rol_nombre === "Cliente" && (
          <div className="pt-3 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <History size={13} className="text-blue-400" />
                <span>Chats y tareas</span>
              </div>
              <button
                onClick={onNuevaConversacion}
                title="Iniciar nueva conversación"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Listado de Chats */}
            {cargandoHistorial && conversaciones.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span>Cargando chats...</span>
              </div>
            ) : conversaciones.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl border border-slate-800/50">
                <p>No tienes chats previos.</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Inicia una consulta para verla aquí.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {gruposOrden.map((grupo) => {
                  const items = grupos[grupo];
                  if (!items || items.length === 0) return null;

                  return (
                    <div key={grupo} className="space-y-1">
                      <p className="px-2 text-[11px] font-semibold text-slate-400 tracking-wider">
                        {grupo}
                      </p>
                      <div className="space-y-1">
                        {items.map((conv) => {
                          const esActivo =
                            vistaActiva === "chat" &&
                            conversacionActivaId === conv.id_conversacion;

                          return (
                            <button
                              key={conv.id_conversacion}
                              onClick={() => {
                                if (onSeleccionarConversacion) {
                                  onSeleccionarConversacion(conv.id_conversacion);
                                }
                              }}
                              title={conv.titulo || conv.primer_mensaje}
                              className={`w-full text-left group px-2.5 py-2 rounded-xl transition-all flex flex-col gap-1 cursor-pointer border ${
                                esActivo
                                  ? "bg-blue-600/25 border-blue-500/60 text-white shadow-xs ring-1 ring-blue-500/30 font-medium"
                                  : "border-transparent text-slate-300 hover:bg-slate-800/60 hover:text-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {conv.escalada ? (
                                  <Headphones
                                    size={13}
                                    className="text-amber-400 shrink-0"
                                  />
                                ) : conv.finalizada ? (
                                  <CheckCircle
                                    size={13}
                                    className="text-emerald-400 shrink-0"
                                  />
                                ) : (
                                  <MessageSquare
                                    size={13}
                                    className={
                                      esActivo
                                        ? "text-blue-400 shrink-0"
                                        : "text-slate-400 shrink-0 group-hover:text-blue-400"
                                    }
                                  />
                                )}
                                <span className="text-xs font-medium truncate flex-1 leading-snug">
                                  {conv.titulo || conv.primer_mensaje}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pl-5 text-[10.5px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {formatearHoraOFecha(conv.fecha_ultimo_mensaje || conv.fecha_inicio, grupo)}
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {conv.calificacion && (
                                    <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                                      <Star size={10} className="fill-amber-400" />
                                      {conv.calificacion}
                                    </span>
                                  )}
                                  {conv.finalizada && (
                                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                                      Fin
                                    </span>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Perfil Footer Seguro */}
      <div className="p-4 border-t border-slate-800 space-y-4 shrink-0 bg-[#111827]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-9 h-9 rounded-xl bg-rose-500 text-white font-semibold text-sm flex items-center justify-center shrink-0">
            {inicialNombre}
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-white truncate leading-tight">
              {usuario.nombre || "Usuario"} {usuario.apellido || ""}
            </p>
            <p className="text-xs text-slate-400 truncate">{usuario.correo || ""}</p>
          </div>
        </div>

        <button
          onClick={onCerrarSesion}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut size={15} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
};