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
  | "chat"
  | "mis_tickets"
  | "bandeja_tickets"
  | "tickets_asignados"
  | "historial_tickets"
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
  mostrarSeguridad: boolean;
  onCambiarPassword: () => void;
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

  useEffect(() => {
    if (!usuario || usuario.rol_nombre !== "Cliente") return;

    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(
          `${API_URL}/api/chat/conversaciones?cliente_id=${usuario.id_usuario}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (res.ok) {
          const data = await res.json();
          setConversaciones(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error al cargar historial:", err);
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
      const hoyDia  = new Date(ahora.getFullYear(),  ahora.getMonth(),  ahora.getDate());
      const diff    = Math.floor((hoyDia.getTime() - fechaDia.getTime()) / 86400000);
      if (diff <= 0) return "Hoy";
      if (diff === 1) return "Ayer";
      if (diff <= 7)  return "Últimos 7 días";
      return "Anteriores";
    } catch { return "Anteriores"; }
  };

  const formatearHoraOFecha = (fechaStr?: string, grupo?: string): string => {
    if (!fechaStr) return "";
    try {
      const f = new Date(fechaStr.replace(" ", "T"));
      const hora = f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      if (grupo === "Hoy")  return hora;
      if (grupo === "Ayer") return `Ayer ${hora}`;
      return `${String(f.getDate()).padStart(2,"0")}/${String(f.getMonth()+1).padStart(2,"0")} ${hora}`;
    } catch { return ""; }
  };

  const gruposOrden: ("Hoy"|"Ayer"|"Últimos 7 días"|"Anteriores")[] = ["Hoy","Ayer","Últimos 7 días","Anteriores"];
  const grupos = gruposOrden.reduce<Record<string, ConversacionResumen[]>>((acc, g) => {
    acc[g] = conversaciones.filter(c => categorizarFecha(c.fecha_ultimo_mensaje || c.fecha_inicio) === g);
    return acc;
  }, {});

  const inicialNombre = (usuario.nombre?.trim()?.charAt(0) || "U").toUpperCase();

  const handleNavClick = (vista: VistaApp) => {
    setVistaActiva(vista);
    if (onCerrarMobile) onCerrarMobile();
  };

  /* ── Ítem de navegación ─────────────────────────────── */
  const NavItem = ({
    vista, icon, label, badge,
  }: { vista: VistaApp; icon: React.ReactNode; label: string; badge?: React.ReactNode }) => {
    const activo = vistaActiva === vista;
    return (
      <button
        onClick={() => handleNavClick(vista)}
        title={label}
        type="button"
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium
          transition-all duration-150 cursor-pointer active:scale-[0.98]
          ${activo
            ? "bg-[#DCEFEA] text-[#1E5450] font-semibold shadow-[0_1px_4px_rgba(40,109,104,0.10)]"
            : "text-white/80 hover:text-white hover:bg-white/10"
          }
          ${colapsado ? "justify-center px-0" : ""}
        `}
      >
        <div className="flex items-center gap-3">
          <span className={activo ? "text-[#286D68]" : "text-white/70"}>
            {icon}
          </span>
          {!colapsado && <span>{label}</span>}
        </div>
        {!colapsado && (badge ?? (activo && <ChevronRight size={14} className="text-[#286D68] opacity-60" />))}
      </button>
    );
  };

  return (
    <>
      {/* Backdrop móvil */}
      {mobileAbierto && (
        <div
          onClick={onCerrarMobile}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col select-none
          transition-all duration-300 ease-out shrink-0
          border-r border-[#1E5450]
          bg-[#286D68] text-white shadow-lg
          ${colapsado ? "w-[76px]" : "w-[272px]"}
          ${mobileAbierto ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* ── Cabecera ──────────────────────────────────── */}
        <div className={`bg-[#1E5450] border-b border-white/10 flex items-center shrink-0
          ${colapsado ? "flex-col gap-2 px-2 py-3.5" : "p-4 pb-3.5 justify-between"}`}
        >
          <div className="flex items-center gap-3 overflow-hidden shrink-0">
            {/* Logo */}
            <div className="w-11 h-11 rounded-[14px] bg-white/12 border border-white/20
              flex items-center justify-center shrink-0 shadow-md">
              <Building2 size={22} className="text-[#DCEFEA]" />
            </div>

            {!colapsado && (
              <div className="overflow-hidden">
                <h1 className="font-heading font-bold text-[15px] text-white truncate leading-snug tracking-tight">
                  Comunidad Clara
                </h1>
                <p className="text-[11px] font-medium text-white/65 truncate">
                  Administraciones Ltda.
                </p>
                <div className="mt-1.5">
                  <span className="inline-block text-[10px] font-semibold text-[#DCEFEA]
                    bg-white/12 border border-white/15 px-2.5 py-0.5 rounded-full">
                    {usuario.rol_nombre || "Usuario"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setColapsado(p => !p)}
            title={colapsado ? "Expandir menú" : "Contraer menú"}
            type="button"
            className="hidden md:flex p-1.5 rounded-xl text-white/60 hover:text-white
              hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            {colapsado ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        {/* ── Navegación ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-3 py-3.5 space-y-1 min-h-0">
          <nav className="space-y-0.5">
            {/* Cliente */}
            {usuario.rol_nombre === "Cliente" && (
              <>
                <NavItem
                  vista="chat"
                  icon={<MessageSquare size={18} />}
                  label="Conversar con IA"
                  badge={!colapsado ? (
                    <span className="text-[10px] bg-[#DCEFEA] text-[#286D68]
                      font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ml-auto">
                      <Sparkles size={10} /> Nuevo
                    </span>
                  ) : undefined}
                />
                <NavItem vista="mis_tickets" icon={<Ticket size={18} />} label="Mis solicitudes" />
              </>
            )}

            {/* Ejecutivo */}
            {usuario.rol_nombre === "Ejecutivo" && (
              <>
                <NavItem vista="bandeja_tickets"    icon={<Headphones size={18} />} label="Bandeja de Tickets" />
                <NavItem vista="tickets_asignados"  icon={<Inbox size={18} />}      label="Tickets Asignados" />
                <NavItem vista="historial_tickets"  icon={<History size={18} />}    label="Historial de Tickets" />
              </>
            )}

            {/* Administrador */}
            {usuario.rol_nombre === "Administrador" && (
              <>
                <NavItem vista="admin_conocimiento" icon={<Database size={18} />}   label="Base de Conocimiento" />
                <NavItem vista="bandeja_tickets"    icon={<Inbox size={18} />}      label="Supervisión Tickets" />
                <NavItem vista="historial_tickets"  icon={<History size={18} />}    label="Historial de Tickets" />
                <NavItem vista="admin_usuarios"     icon={<Users size={18} />}      label="Gestión de Usuarios" />
                <NavItem vista="metricas"           icon={<BarChart3 size={18} />}  label="Métricas del Sistema" />
                <NavItem vista="auditoria"          icon={<ShieldCheck size={18} />} label="Log de Auditoría" />
              </>
            )}
          </nav>

          {/* ── Historial conversaciones (Cliente) ──────── */}
          {usuario.rol_nombre === "Cliente" && !colapsado && (
            <div className="pt-3 mt-2 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between px-1.5">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-white/55 uppercase tracking-wider">
                  <History size={12} className="text-[#DCEFEA]/70" />
                  <span>Historial de Consultas</span>
                </div>
                <button
                  onClick={onNuevaConversacion}
                  title="Nueva consulta"
                  type="button"
                  className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                </button>
              </div>

              {cargandoHistorial && conversaciones.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-4 text-xs text-white/55">
                  <Loader2 size={13} className="animate-spin text-[#DCEFEA]/70" />
                  <span>Cargando...</span>
                </div>
              ) : conversaciones.length === 0 ? (
                <div className="px-3 py-3.5 text-center text-xs text-white/60 rounded-xl bg-white/5 border border-white/10">
                  <p className="font-medium">Sin consultas previas</p>
                  <p className="text-[11px] text-white/40 mt-0.5">Tus consultas se archivarán aquí.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {gruposOrden.map(grupo => {
                    const items = grupos[grupo];
                    if (!items?.length) return null;
                    return (
                      <div key={grupo}>
                        <p className="px-1.5 mb-1 text-[10px] font-semibold text-white/40 uppercase tracking-wider">
                          {grupo}
                        </p>
                        <div className="space-y-0.5">
                          {items.map(conv => {
                            const esActivo = vistaActiva === "chat" && conversacionActivaId === conv.id_conversacion;
                            return (
                              <button
                                key={conv.id_conversacion}
                                onClick={() => {
                                  if (onSeleccionarConversacion) onSeleccionarConversacion(conv.id_conversacion);
                                  if (onCerrarMobile) onCerrarMobile();
                                }}
                                title={conv.titulo || conv.primer_mensaje}
                                type="button"
                                className={`w-full text-left group px-3 py-2 rounded-xl transition-all duration-150
                                  flex flex-col gap-0.5 cursor-pointer border active:scale-[0.98]
                                  ${esActivo
                                    ? "bg-[#DCEFEA] border-[#DCEFEA] text-[#1E5450]"
                                    : "border-transparent text-white/75 hover:bg-white/8 hover:text-white"
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  {conv.escalada ? (
                                    <Headphones size={12} className={esActivo ? "text-[#286D68]" : "text-[#DCEFEA]/60"} />
                                  ) : conv.finalizada ? (
                                    <CheckCircle size={12} className={esActivo ? "text-[#286D68]" : "text-[#DCEFEA]/60"} />
                                  ) : (
                                    <MessageSquare size={12} className={esActivo ? "text-[#286D68]" : "text-white/50"} />
                                  )}
                                  <span className="text-[12px] font-medium truncate flex-1 leading-snug">
                                    {conv.titulo || conv.primer_mensaje}
                                  </span>
                                </div>
                                <div className={`flex items-center justify-between pl-5 text-[10px]
                                  ${esActivo ? "text-[#286D68]/70" : "text-white/45"}`}>
                                  <span className="flex items-center gap-1">
                                    <Clock size={9} />
                                    {formatearHoraOFecha(conv.fecha_ultimo_mensaje || conv.fecha_inicio, grupo)}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {conv.calificacion && (
                                      <span className="flex items-center gap-0.5 text-[#DCEFEA] font-semibold">
                                        <Star size={9} className="fill-[#DCEFEA]" />
                                        {conv.calificacion}
                                      </span>
                                    )}
                                    {conv.finalizada && (
                                      <span className="text-[9px] font-semibold bg-white/15 px-1.5 py-0.5 rounded-full">
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

        {/* ── Footer ────────────────────────────────────── */}
        <div className={`p-3 border-t border-white/10 space-y-1.5 shrink-0 bg-[#1E5450]
          ${colapsado ? "items-center" : ""}`}>
          {/* Seguridad */}
          <button
            type="button"
            onClick={onCambiarPassword}
            title="Seguridad de la cuenta"
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium rounded-xl
              transition-all cursor-pointer active:scale-95
              ${mostrarSeguridad
                ? "bg-[#DCEFEA] text-[#1E5450] font-semibold"
                : "text-white/70 hover:text-white hover:bg-white/10"
              }
              ${colapsado ? "justify-center px-0" : ""}`}
          >
            <LockKeyhole size={16} />
            {!colapsado && (
              <>
                <span className="truncate">{mostrarSeguridad ? "Volver" : "Seguridad"}</span>
                {mostrarSeguridad && <ChevronRight size={13} className="ml-auto" />}
              </>
            )}
          </button>

          {/* Usuario */}
          <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-white/7 border border-white/10
            ${colapsado ? "justify-center" : ""}`}>
            <div className="w-8 h-8 rounded-xl bg-[#DCEFEA]/20 border border-white/20
              text-white font-semibold text-xs flex items-center justify-center shrink-0">
              {inicialNombre}
            </div>
            {!colapsado && (
              <div className="overflow-hidden min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-[10.5px] text-white/55 truncate">{usuario.correo}</p>
              </div>
            )}
          </div>

          {/* Cerrar sesión */}
          <button
            type="button"
            onClick={onCerrarSesion}
            title="Cerrar sesión"
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium
              text-white/55 hover:text-white hover:bg-white/8 rounded-xl
              transition-colors active:scale-95 cursor-pointer
              ${colapsado ? "justify-center px-0" : ""}`}
          >
            <LogOut size={15} />
            {!colapsado && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
