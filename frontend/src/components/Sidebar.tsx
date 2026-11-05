import React, { useState, useEffect } from "react";
import {
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
  Sparkles,
  Building2,
} from "lucide-react";

import type { Usuario, ConversacionResumen } from "../types";
import { API_URL } from "../utils/api";

export type VistaApp =
  // Cliente / Residentes
  | "chat"
  | "mis_tickets"

  // Ejecutivo / Comité
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
  onCerrarMobile,
}) => {
  const [conversaciones, setConversaciones] = useState<ConversacionResumen[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [colapsado, setColapsado] = useState(false);

  const vistaActiva: VistaApp | null = mostrarSeguridad ? null : vistaActual;

  // Cargar historial de conversaciones (Cliente / Residente)
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
    "Anteriores",
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
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col justify-between select-none transition-all duration-300 ease-out border-r border-[#173C5E] shrink-0
          bg-[#1E4E79] text-white shadow-lg
          ${colapsado ? "w-[78px]" : "w-72"}
          ${mobileAbierto ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Cabecera Corporativa con Estilo iOS */}
        <div
          className={`bg-[#173C5E]/90 backdrop-blur-md border-b border-white/10 flex items-center ${
            colapsado ? "flex-col gap-2 px-2 py-3.5" : "p-4 pb-3.5 justify-between"
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden shrink-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1E4E79] to-[#173C5E] border border-white/20 flex items-center justify-center text-white shrink-0 shadow-md ring-1 ring-white/10">
              <Building2 size={22} className="text-[#E3A21A]" />
            </div>

            {!colapsado && (
              <div className="overflow-hidden">
                <h1 className="font-heading font-bold text-base text-white truncate leading-snug tracking-tight">
                  Comunidad Clara
                </h1>
                <p className="text-[11px] font-medium text-white/75 truncate">
                  Administraciones Ltda.
                </p>
                <div className="mt-1">
                  <span className="inline-block text-[10.5px] font-semibold text-white/95 bg-white/12 border border-white/15 px-2.5 py-0.5 rounded-full shadow-2xs">
                    {usuario.rol_nombre || "Usuario"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Botón colapsar / expandir en escritorio estilo iOS */}
          <button
            onClick={() => setColapsado((prev) => !prev)}
            title={colapsado ? "Expandir menú" : "Contraer menú"}
            type="button"
            className="hidden md:flex p-1.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            {colapsado ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Contenido Central Scrollable */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-4 min-h-0">
          <nav className="space-y-1">
            {/* VISTAS CLIENTE / RESIDENTES */}
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "chat" &&
                    (!conversacionActivaId || !conversaciones.some((c) => c.id_conversacion === conversacionActivaId))
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
                  } ${colapsado ? "justify-center px-0" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare size={18} className="shrink-0" />
                    {!colapsado && <span>Conversar con IA</span>}
                  </div>
                  {!colapsado && (
                    <span className="text-[10px] bg-[#E3A21A] text-[#173C5E] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                      <Sparkles size={10} />
                      Nuevo
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleNavClick("mis_tickets")}
                  title="Mis solicitudes"
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "mis_tickets"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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

            {/* VISTAS EJECUTIVO / COMITÉ */}
            {usuario.rol_nombre === "Ejecutivo" && (
              <>
                <button
                  onClick={() => handleNavClick("bandeja_tickets")}
                  title="Bandeja de Tickets"
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "bandeja_tickets"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "tickets_asignados"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "historial_tickets"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  title="Base de Conocimiento (RAG)"
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "admin_conocimiento"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "bandeja_tickets"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "historial_tickets"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "admin_usuarios"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "metricas"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
                  type="button"
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer active:scale-[0.98] ${
                    vistaActiva === "auditoria"
                      ? "bg-[#173C5E] text-white shadow-sm font-semibold border border-white/20"
                      : "text-white/85 hover:text-white hover:bg-white/10"
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
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-white/70 uppercase tracking-wider">
                  <History size={13} className="text-[#E3A21A]" />
                  <span>Historial de Consultas</span>
                </div>
                <button
                  onClick={onNuevaConversacion}
                  title="Iniciar nueva consulta"
                  type="button"
                  className="p-1 rounded-lg text-white/75 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Listado de Chats */}
              {cargandoHistorial && conversaciones.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-white/60">
                  <Loader2 size={14} className="animate-spin text-[#E3A21A]" />
                  <span>Cargando consultas...</span>
                </div>
              ) : conversaciones.length === 0 ? (
                <div className="px-3 py-3 text-center text-xs text-white/70 rounded-2xl bg-[#173C5E]/50 border border-white/10">
                  <p>Sin consultas previas</p>
                  <p className="text-[11px] text-white/50 mt-0.5">
                    Tus consultas con el asistente se archivarán aquí.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gruposOrden.map((grupo) => {
                    const items = grupos[grupo];
                    if (!items || items.length === 0) return null;

                    return (
                      <div key={grupo} className="space-y-1">
                        <p className="px-2 text-[10px] font-semibold text-white/50 uppercase tracking-wider">
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
                                type="button"
                                className={`w-full text-left group px-3 py-2.5 rounded-xl transition-all duration-150 flex flex-col gap-1 cursor-pointer border active:scale-[0.98] ${
                                  esActivo
                                    ? "bg-[#173C5E] border-white/20 text-white font-medium shadow-sm"
                                    : "border-transparent text-white/80 hover:bg-white/10 hover:text-white"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {conv.escalada ? (
                                    <Headphones size={13} className="text-[#E3A21A] shrink-0" />
                                  ) : conv.finalizada ? (
                                    <CheckCircle size={13} className="text-[#47705A] shrink-0" />
                                  ) : (
                                    <MessageSquare
                                      size={13}
                                      className={
                                        esActivo
                                          ? "text-[#E3A21A] shrink-0"
                                          : "text-white/60 shrink-0 group-hover:text-white"
                                      }
                                    />
                                  )}
                                  <span className="text-xs font-medium truncate flex-1 leading-snug">
                                    {conv.titulo || conv.primer_mensaje}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between pl-5 text-[10.5px] text-white/60">
                                  <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {formatearHoraOFecha(
                                      conv.fecha_ultimo_mensaje || conv.fecha_inicio,
                                      grupo
                                    )}
                                  </span>

                                  <div className="flex items-center gap-1.5">
                                    {conv.calificacion && (
                                      <span className="flex items-center gap-0.5 text-[#E3A21A] font-semibold">
                                        <Star size={10} className="fill-[#E3A21A]" />
                                        {conv.calificacion}
                                      </span>
                                    )}
                                    {conv.finalizada && (
                                      <span className="text-[9.5px] text-white font-semibold bg-[#47705A] px-1.5 py-0.2 rounded-full">
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

        {/* Footer Institucional estilo iOS Cápsula */}
        <div className="p-3 border-t border-white/10 space-y-2 shrink-0 bg-[#173C5E]/90 backdrop-blur-md">
          {/* Cambiar contraseña / Seguridad */}
          <button
            type="button"
            onClick={onCambiarPassword}
            title="Seguridad de la cuenta"
            className={`w-full flex items-center gap-2.5 p-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer active:scale-95 ${
              mostrarSeguridad
                ? "bg-[#1E4E79] text-white shadow-xs border border-white/20"
                : "text-white/80 hover:text-white hover:bg-white/10"
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

          {/* Datos del usuario en cápsula */}
          <div className={`flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-white/5 border border-white/10 ${colapsado ? "justify-center px-0" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-[#1E4E79] border border-white/20 text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {inicialNombre}
            </div>

            {!colapsado && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {usuario.nombre || "Usuario"} {usuario.apellido || ""}
                </p>
                <p className="text-[11px] text-white/70 truncate">
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
            className={`w-full flex items-center gap-2.5 p-2 text-xs font-medium text-red-300 hover:text-white hover:bg-red-500/20 rounded-xl transition-colors active:scale-95 cursor-pointer ${
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
