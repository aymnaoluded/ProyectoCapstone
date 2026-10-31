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
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles
} from "lucide-react";

import type { Usuario, ConversacionResumen } from "../types";
import { API_URL } from "../utils/api";

export type VistaApp =
  // Cliente
  | "chat"
  | "mis_tickets"

  // Ejecutivo / Administrador
  | "bandeja_tickets"
  | "tickets_asignados"
  | "historial_tickets"

  // Administrador
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

  // Seguridad de la cuenta
  mostrarSeguridad: boolean;
  onCambiarPassword: () => void;

  // Control móvil
  mobileAbierto?: boolean;
  onCerrarMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  usuario,
  vistaActiva: vistaActual,
  setVistaActiva,
  onCerrarSesion,
  conversacionActivaId,
  onSeleccionarConversacion,
  onNuevaConversacion,
  refreshHistorialTrigger = 0,
  mostrarSeguridad,
  onCambiarPassword,
  mobileAbierto = false,
  onCerrarMobile
}) => {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  const vistaActiva: VistaApp | null = mostrarSeguridad ? null : vistaActual;

  // ============================================================
  // CARGAR HISTORIAL DE CONVERSACIONES (CLIENTE)
  // ============================================================
  useEffect(() => {
    if (!usuario || usuario.rol_nombre !== "Cliente") return;

    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `${API_URL}/api/chat/conversaciones?cliente_id=${usuario.id_usuario}`,
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

  if (!usuario) return null;

  const categorizarFecha = (fechaStr?: string): "Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores" => {
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
      if (grupo === "Hoy") return hora;
      if (grupo === "Ayer") return `Ayer ${hora}`;
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
    "Anteriores"
  ];

  const grupos = gruposOrden.reduce<Record<string, ConversacionResumen[]>>((acc, grupo) => {
    acc[grupo] = conversaciones.filter(
      (c) => categorizarFecha(c.fecha_ultimo_mensaje || c.fecha_inicio) === grupo
    );
    return acc;
  }, {});

  const inicialNombre = (usuario.nombre?.trim()?.charAt(0) || "U").toUpperCase();

  const handleNavClick = (vista: VistaApp) => {
    setVistaActiva(vista);
    if (onCerrarMobile) onCerrarMobile();
  };

  return (
    <>
      {/* Backdrop para móvil */}
      {mobileAbierto && (
        <div
          onClick={onCerrarMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between select-none transition-all duration-300 ease-out border-r shrink-0
          liquid-glass border-[var(--border-glass)] text-[var(--text-primary)]
          ${colapsado ? "w-[76px]" : "w-72"}
          ${mobileAbierto ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Cabecera estilo macOS */}
        {/* Contraído (76px): logo y botón no caben en una fila, se apilan centrados para no cortar el logo */}
        <div
          className={`border-b border-[var(--border-subtle)] flex items-center ${
            colapsado ? "flex-col gap-2 px-2 py-3" : "p-4 pb-3 justify-between"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#007AFF] to-[#5856D6] flex items-center justify-center text-white shadow-md shadow-blue-500/25 shrink-0 ring-1 ring-white/20">
              <Bot size={22} className="animate-pulse" />
            </div>

            {!colapsado && (
              <div className="overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <h1 className="font-semibold text-base tracking-tight text-[var(--text-primary)] truncate">
                    SupportAI
                  </h1>
                  <span className="inline-flex items-center px-1.5 py-0.2 text-[10px] font-semibold rounded-full bg-blue-500/10 text-[var(--accent-primary)] border border-blue-500/20">
                    Pro
                  </span>
                </div>
                <p className="text-[11px] font-medium text-[var(--text-secondary)] truncate">
                  {usuario.rol_nombre || "Usuario"}
                </p>
              </div>
            )}
          </div>

          {/* Botón colapsar / expandir en escritorio */}
          <button
            onClick={() => setColapsado((prev) => !prev)}
            title={colapsado ? "Expandir menú" : "Contraer menú"}
            className="hidden md:flex p-1.5 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
          >
            {colapsado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Contenido Central Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 min-h-0 apple-scrollbar">
          <nav className="space-y-1">
            {/* VISTAS CLIENTE */}
            {usuario.rol_nombre === "Cliente" && (
              <>
                <button
                  onClick={() => {
                    if (onNuevaConversacion) {
                      onNuevaConversacion();
                    } else {
                      handleNavClick("chat");
                    }
                  }}
                  title="Conversar con IA"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "chat" &&
                    (!conversacionActivaId || !conversaciones.some((c) => c.id_conversacion === conversacionActivaId))
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="shrink-0" />
                    {!colapsado && <span>Conversar con IA</span>}
                  </div>
                  {!colapsado && (
                    <span className="text-[10px] bg-white/20 backdrop-blur-xs px-1.5 py-0.5 rounded-lg text-current font-semibold flex items-center gap-1">
                      <Sparkles size={10} />
                      Nuevo
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavClick("mis_tickets")}
                  title="Mis solicitudes"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "mis_tickets"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Ticket size={18} className="shrink-0" />
                    {!colapsado && <span>Mis solicitudes</span>}
                  </div>
                  {!colapsado && vistaActiva === "mis_tickets" && <ChevronRight size={15} />}
                </button>
              </>
            )}

            {/* VISTAS EJECUTIVO */}
            {usuario.rol_nombre === "Ejecutivo" && (
              <>
                <button
                  onClick={() => handleNavClick("bandeja_tickets")}
                  title="Bandeja de Tickets"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "bandeja_tickets"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Headphones size={18} className="shrink-0" />
                    {!colapsado && <span>Bandeja de Tickets</span>}
                  </div>
                  {!colapsado && vistaActiva === "bandeja_tickets" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("tickets_asignados")}
                  title="Tickets Asignados"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "tickets_asignados"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Inbox size={18} className="shrink-0" />
                    {!colapsado && <span>Tickets Asignados</span>}
                  </div>
                  {!colapsado && vistaActiva === "tickets_asignados" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("historial_tickets")}
                  title="Historial de Tickets"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "historial_tickets"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <History size={18} className="shrink-0" />
                    {!colapsado && <span>Historial de Tickets</span>}
                  </div>
                  {!colapsado && vistaActiva === "historial_tickets" && <ChevronRight size={15} />}
                </button>
              </>
            )}

            {/* VISTAS ADMINISTRADOR */}
            {usuario.rol_nombre === "Administrador" && (
              <>
                <button
                  onClick={() => handleNavClick("admin_conocimiento")}
                  title="Base de Conocimiento"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "admin_conocimiento"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Database size={18} className="shrink-0" />
                    {!colapsado && <span>Base de Conocimiento</span>}
                  </div>
                  {!colapsado && vistaActiva === "admin_conocimiento" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("bandeja_tickets")}
                  title="Supervisión de Tickets"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "bandeja_tickets"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Inbox size={18} className="shrink-0" />
                    {!colapsado && <span>Supervisión Tickets</span>}
                  </div>
                  {!colapsado && vistaActiva === "bandeja_tickets" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("historial_tickets")}
                  title="Historial de Tickets"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "historial_tickets"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <History size={18} className="shrink-0" />
                    {!colapsado && <span>Historial de Tickets</span>}
                  </div>
                  {!colapsado && vistaActiva === "historial_tickets" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("admin_usuarios")}
                  title="Gestión de Usuarios"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "admin_usuarios"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Users size={18} className="shrink-0" />
                    {!colapsado && <span>Gestión de Usuarios</span>}
                  </div>
                  {!colapsado && vistaActiva === "admin_usuarios" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("metricas")}
                  title="Métricas del Sistema"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "metricas"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 size={18} className="shrink-0" />
                    {!colapsado && <span>Métricas del Sistema</span>}
                  </div>
                  {!colapsado && vistaActiva === "metricas" && <ChevronRight size={15} />}
                </button>

                <button
                  onClick={() => handleNavClick("auditoria")}
                  title="Log de Auditoría"
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                    vistaActiva === "auditoria"
                      ? "bg-[var(--accent-primary)] text-white shadow-md shadow-blue-500/25"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={18} className="shrink-0" />
                    {!colapsado && <span>Log de Auditoría</span>}
                  </div>
                  {!colapsado && vistaActiva === "auditoria" && <ChevronRight size={15} />}
                </button>
              </>
            )}
          </nav>

          {/* HISTORIAL: SECCIÓN "CHATS Y TAREAS" (Solo Rol Cliente y cuando no está colapsado) */}
          {usuario.rol_nombre === "Cliente" && !colapsado && (
            <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  <History size={13} className="text-[var(--accent-primary)]" />
                  <span>Historial de Chats</span>
                </div>
                <button
                  onClick={onNuevaConversacion}
                  title="Iniciar nueva conversación"
                  className="p-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Listado de Chats */}
              {cargandoHistorial && conversaciones.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--text-tertiary)]">
                  <Loader2 size={14} className="animate-spin text-[var(--accent-primary)]" />
                  <span>Cargando chats...</span>
                </div>
              ) : conversaciones.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-[var(--text-tertiary)] rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)]">
                  <p>Sin chats previos</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                    Tus consultas con la IA se archivarán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gruposOrden.map((grupo) => {
                    const items = grupos[grupo];
                    if (!items || items.length === 0) return null;

                    return (
                      <div key={grupo} className="space-y-1">
                        <p className="px-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                          {grupo}
                        </p>
                        <div className="space-y-0.5">
                          {items.map((conv) => {
                            const esActivo =
                              vistaActiva === "chat" && conversacionActivaId === conv.id_conversacion;

                            return (
                              <button
                                key={conv.id_conversacion}
                                onClick={() => {
                                  if (onSeleccionarConversacion) {
                                    onSeleccionarConversacion(conv.id_conversacion);
                                  }
                                  if (onCerrarMobile) onCerrarMobile();
                                }}
                                title={conv.titulo || conv.primer_mensaje}
                                className={`w-full text-left group px-2.5 py-2 rounded-xl transition-all flex flex-col gap-1 cursor-pointer border ${
                                  esActivo
                                    ? "bg-blue-500/10 border-blue-500/30 text-[var(--text-primary)] font-medium shadow-xs"
                                    : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {conv.escalada ? (
                                    <Headphones size={13} className="text-amber-500 shrink-0" />
                                  ) : conv.finalizada ? (
                                    <CheckCircle size={13} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <MessageSquare
                                      size={13}
                                      className={
                                        esActivo
                                          ? "text-[var(--accent-primary)] shrink-0"
                                          : "text-[var(--text-tertiary)] shrink-0 group-hover:text-[var(--accent-primary)]"
                                      }
                                    />
                                  )}
                                  <span className="text-xs font-medium truncate flex-1 leading-snug">
                                    {conv.titulo || conv.primer_mensaje}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pl-5 text-[10.5px] text-[var(--text-tertiary)]">
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatearHoraOFecha(
                                      conv.fecha_ultimo_mensaje || conv.fecha_inicio,
                                      grupo
                                    )}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {conv.calificacion && (
                                      <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                                        <Star size={10} className="fill-amber-500" />
                                        {conv.calificacion}
                                      </span>
                                    )}
                                    {conv.finalizada && (
                                      <span className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
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

        {/* Footer Seguro estilo Apple Card */}
        <div className="p-3 border-t border-[var(--border-subtle)] space-y-2 shrink-0 bg-[var(--bg-surface-elevated)]/40">
          {/* Cambiar contraseña */}
          <button
            type="button"
            onClick={onCambiarPassword}
            title="Seguridad de la cuenta"
            className={`w-full flex items-center gap-2.5 p-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              mostrarSeguridad
                ? "bg-[var(--accent-primary)] text-white shadow-xs"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]"
            } ${colapsado ? "justify-center px-0" : ""}`}
          >
            <LockKeyhole size={16} />
            {!colapsado && (
              <>
                <span className="truncate">{mostrarSeguridad ? "Volver" : "Seguridad"}</span>
                {mostrarSeguridad && <ChevronRight size={13} className="ml-auto" />}
              </>
            )}
          </button>

          {/* Datos del usuario */}
          <div className={`flex items-center gap-2.5 px-1 py-1 ${colapsado ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#FF2D55] to-[#FF375F] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/20">
              {inicialNombre}
            </div>

            {!colapsado && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate leading-tight">
                  {usuario.nombre || "Usuario"} {usuario.apellido || ""}
                </p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {usuario.correo || ""}
                </p>
              </div>
            )}
          </div>

          {/* Cerrar sesión */}
          <button
            type="button"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
            className={`w-full flex items-center gap-2.5 p-2 text-xs font-medium text-[var(--accent-danger)] hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer ${
              colapsado ? "justify-center px-0" : ""
            }`}
          >
            <LogOut size={16} />
            {!colapsado && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
