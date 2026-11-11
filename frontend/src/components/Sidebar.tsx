import React, { useState, useEffect, useRef } from "react";
import {
  MessagesSquare,
  Headphones,
  LogOut,
  Plus,
  Star,
  CheckCircle2,
  LockKeyhole,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  ArrowLeft,
} from "lucide-react";

import type { Usuario, ConversacionResumen } from "../types";
import { API_URL } from "../utils/api";
import { useEsMovil } from "../utils/useEnLinea";
import { Marca, MarcaIcono, Fachada } from "./ui/Fachada";
import { Esqueleto } from "./ui/Skeleton";
import { itemsDeRol, ETIQUETA_ROL, type VistaApp } from "./navegacion";

export type { VistaApp } from "./navegacion";

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

type Grupo = "Hoy" | "Ayer" | "Últimos 7 días" | "Anteriores";
const GRUPOS_ORDEN: Grupo[] = ["Hoy", "Ayer", "Últimos 7 días", "Anteriores"];

const categorizarFecha = (fechaStr?: string): Grupo => {
  if (!fechaStr) return "Anteriores";
  try {
    const fecha = new Date(fechaStr.replace(" ", "T"));
    const ahora = new Date();
    const fechaDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const hoyDia = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const diff = Math.floor((hoyDia.getTime() - fechaDia.getTime()) / 86400000);
    if (diff <= 0) return "Hoy";
    if (diff === 1) return "Ayer";
    if (diff <= 7) return "Últimos 7 días";
    return "Anteriores";
  } catch {
    return "Anteriores";
  }
};

const formatearHoraOFecha = (fechaStr?: string, grupo?: Grupo): string => {
  if (!fechaStr) return "";
  try {
    const f = new Date(fechaStr.replace(" ", "T"));
    const hora = f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (grupo === "Hoy") return hora;
    if (grupo === "Ayer") return `Ayer, ${hora}`;
    return f.toLocaleDateString("es-CL", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
};

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
  const [filtro, setFiltro] = useState("");
  const asideRef = useRef<HTMLElement>(null);
  const esMovil = useEsMovil();

  const vistaActiva: VistaApp | null = mostrarSeguridad ? null : vistaActual;
  const esCliente = usuario?.rol_nombre === "Cliente";
  // En el menú del celular nunca se muestra contraído
  const contraido = colapsado && !mobileAbierto;

  useEffect(() => {
    if (!usuario || usuario.rol_nombre !== "Cliente") return;

    const cargarHistorial = async () => {
      setCargandoHistorial(true);
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_URL}/api/chat/conversaciones?cliente_id=${usuario.id_usuario}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
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

  // Menú del celular: Escape lo cierra y el foco entra al panel al abrirlo
  const cerrarMobileRef = useRef(onCerrarMobile);
  useEffect(() => {
    cerrarMobileRef.current = onCerrarMobile;
  });
  useEffect(() => {
    if (!mobileAbierto) return;
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrarMobileRef.current?.();
    };
    document.addEventListener("keydown", alTeclear);
    const t = window.setTimeout(() => asideRef.current?.querySelector<HTMLElement>("button")?.focus(), 60);
    return () => {
      document.removeEventListener("keydown", alTeclear);
      window.clearTimeout(t);
    };
  }, [mobileAbierto]);

  if (!usuario) return null;

  const termino = filtro.trim().toLowerCase();
  const filtradas = termino
    ? conversaciones.filter((c) => `${c.titulo ?? ""} ${c.primer_mensaje ?? ""}`.toLowerCase().includes(termino))
    : conversaciones;

  const grupos = GRUPOS_ORDEN.reduce<Record<Grupo, ConversacionResumen[]>>(
    (acc, g) => {
      acc[g] = filtradas.filter((c) => categorizarFecha(c.fecha_ultimo_mensaje || c.fecha_inicio) === g);
      return acc;
    },
    { Hoy: [], Ayer: [], "Últimos 7 días": [], Anteriores: [] }
  );

  const inicialNombre = (usuario.nombre?.trim()?.charAt(0) || "U").toUpperCase();
  const items = itemsDeRol(usuario.rol_nombre);

  const handleNavClick = (vista: VistaApp) => {
    setVistaActiva(vista);
    onCerrarMobile?.();
  };

  return (
    <>
      {/* Velo del menú en celular */}
      <div
        onClick={onCerrarMobile}
        aria-hidden="true"
        className={`fixed inset-0 z-[45] bg-noche/50 backdrop-blur-[2px] md:hidden transition-opacity duration-300
          ${mobileAbierto ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      <aside
        ref={asideRef}
        aria-label="Menú principal"
        inert={esMovil && !mobileAbierto}
        className={`zona-noche fixed md:static inset-y-0 left-0 z-50 flex flex-col shrink-0 select-none
          bg-noche text-white overflow-hidden
          transition-[width,transform] duration-[420ms] ease-curva
          ${contraido ? "md:w-[84px]" : "md:w-[288px]"} w-[min(88vw,320px)]
          ${mobileAbierto ? "translate-x-0 shadow-[24px_0_60px_-20px_rgba(0,0,0,0.5)]" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Brillo cálido muy sutil en la parte superior */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -left-16 w-72 h-72 rounded-full bg-turquesa/10 blur-3xl"
        />

        {/* ── Cabecera: marca ─────────────────────────────── */}
        <div className={`relative flex items-center shrink-0 pt-5 pb-4 ${contraido ? "flex-col gap-3 px-3" : "justify-between px-5"}`}>
          {contraido ? <MarcaIcono size={40} /> : <Marca tono="noche" />}
          <button
            onClick={() => setColapsado((p) => !p)}
            aria-label={contraido ? "Expandir menú" : "Contraer menú"}
            title={contraido ? "Expandir menú" : "Contraer menú"}
            type="button"
            className="hidden md:grid boton-icono !w-9 !h-9 !text-menta/60 hover:!text-white hover:!bg-white/10"
          >
            {contraido ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button
            onClick={onCerrarMobile}
            aria-label="Cerrar menú"
            type="button"
            className="md:hidden boton-icono !w-9 !h-9 !text-menta/70 hover:!text-white hover:!bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        {/* Rol del usuario */}
        {!contraido && (
          <div className="relative px-5 pb-4">
            <span className="insignia insignia-noche">
              {ETIQUETA_ROL[usuario.rol_nombre] ?? usuario.rol_nombre}
            </span>
          </div>
        )}

        {/* Nueva consulta (residente) */}
        {esCliente && onNuevaConversacion && (
          <div className={`relative pb-4 ${contraido ? "px-3" : "px-4"}`}>
            <button
              type="button"
              onClick={() => {
                onNuevaConversacion();
                onCerrarMobile?.();
              }}
              title="Nueva consulta"
              aria-label="Nueva consulta"
              className={`boton boton-luz w-full ${contraido ? "!px-0" : ""}`}
            >
              <Plus size={17} strokeWidth={2.5} />
              {!contraido && <span>Nueva consulta</span>}
            </button>
          </div>
        )}

        {/* ── Directorio de vistas ────────────────────────── */}
        <div className="relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden barra-fina pb-3">
          <nav aria-label="Secciones" className={contraido ? "px-3" : "px-3"}>
            {!contraido && <p className="ceja !text-menta/45 px-3 pb-2">Directorio</p>}
            <ul className="space-y-0.5">
              {items.map((item, i) => {
                const activo = vistaActiva === item.vista;
                const Icono = item.icono;
                return (
                  <li key={item.vista}>
                    <button
                      onClick={() => handleNavClick(item.vista)}
                      title={contraido ? item.etiqueta : undefined}
                      aria-label={contraido ? item.etiqueta : undefined}
                      aria-current={activo ? "page" : undefined}
                      type="button"
                      className={`group relative w-full flex items-center gap-3 rounded-xl text-[0.875rem] font-medium
                        transition-colors duration-200 active:scale-[0.985]
                        ${contraido ? "justify-center h-11" : "px-3 py-2.5"}
                        ${activo ? "bg-white/[0.08] text-white" : "text-menta/70 hover:text-white hover:bg-white/[0.05]"}`}
                    >
                      {/* Ventana encendida: marca la sección actual */}
                      <span
                        aria-hidden="true"
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-[5px] rounded-r-[2px] transition-all duration-300 ease-curva
                          ${activo ? "h-5 bg-luz shadow-[0_0_12px_rgba(242,180,65,0.8)]" : "h-0 bg-transparent"}`}
                      />
                      {!contraido && (
                        <span
                          aria-hidden="true"
                          className={`numeral text-[0.8rem] w-5 tabular-nums ${activo ? "text-luz" : "text-menta/35 group-hover:text-menta/60"}`}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                      )}
                      <Icono size={18} className={activo ? "text-white" : "text-menta/55 group-hover:text-menta"} />
                      {!contraido && <span className="truncate">{item.etiqueta}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ── Historial de consultas (residente) ─────────── */}
          {esCliente && !contraido && (
            <section aria-label="Historial de consultas" className="mt-5 px-3">
              <div className="flex items-center justify-between px-3 pb-2">
                <p className="ceja !text-menta/45">Tus consultas</p>
                {conversaciones.length > 0 && (
                  <span className="text-[0.6875rem] font-semibold text-menta/45 tabular-nums">{conversaciones.length}</span>
                )}
              </div>

              {conversaciones.length > 3 && (
                <div className="relative mx-1 mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-menta/40 pointer-events-none" />
                  <input
                    type="search"
                    value={filtro}
                    onChange={(e) => setFiltro(e.target.value)}
                    placeholder="Buscar en tus consultas"
                    aria-label="Buscar en tus consultas"
                    className="w-full h-9 rounded-full bg-white/[0.06] border border-white/10 pl-8 pr-3 text-[0.8125rem] text-white placeholder:text-menta/40
                      focus:outline-none focus:border-turquesa/60 focus:bg-white/[0.09] transition-colors"
                  />
                </div>
              )}

              {cargandoHistorial && conversaciones.length === 0 ? (
                <div className="space-y-2 px-2 py-1" aria-label="Cargando consultas" role="status">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="space-y-1.5 py-1.5">
                      <Esqueleto className="h-3 w-4/5 !bg-none !bg-white/10 !animate-pulse" />
                      <Esqueleto className="h-2.5 w-1/3 !bg-none !bg-white/[0.06] !animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : conversaciones.length === 0 ? (
                <div className="mx-1 rounded-2xl border border-dashed border-white/12 px-4 py-5 text-center">
                  <MessagesSquare size={18} className="mx-auto text-menta/40" />
                  <p className="text-[0.8125rem] font-medium text-menta/75 mt-2">Aún no hay consultas</p>
                  <p className="text-[0.75rem] text-menta/45 mt-1 leading-relaxed">
                    Cada conversación con Luz quedará guardada aquí.
                  </p>
                </div>
              ) : filtradas.length === 0 ? (
                <p className="px-3 py-3 text-[0.8125rem] text-menta/55">Ninguna consulta coincide con “{filtro}”.</p>
              ) : (
                <div className="space-y-3">
                  {GRUPOS_ORDEN.map((grupo) => {
                    const lista = grupos[grupo];
                    if (!lista.length) return null;
                    return (
                      <div key={grupo}>
                        <p className="px-3 pb-1 text-[0.6875rem] font-medium text-menta/40">{grupo}</p>
                        <ul className="space-y-px">
                          {lista.map((conv) => {
                            const esActivo = vistaActiva === "chat" && conversacionActivaId === conv.id_conversacion;
                            return (
                              <li key={conv.id_conversacion}>
                                <button
                                  onClick={() => {
                                    onSeleccionarConversacion?.(conv.id_conversacion);
                                    onCerrarMobile?.();
                                  }}
                                  title={conv.titulo || conv.primer_mensaje}
                                  aria-current={esActivo ? "true" : undefined}
                                  type="button"
                                  className={`relative w-full text-left px-3 py-2 rounded-xl transition-colors duration-150
                                    ${esActivo ? "bg-white/[0.09] text-white" : "text-menta/75 hover:bg-white/[0.05] hover:text-white"}`}
                                >
                                  {esActivo && (
                                    <span aria-hidden="true" className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r bg-luz" />
                                  )}
                                  <span className="block text-[0.8125rem] font-medium truncate leading-snug">
                                    {conv.titulo || conv.primer_mensaje || `Consulta #${conv.id_conversacion}`}
                                  </span>
                                  <span className="mt-1 flex items-center gap-2 text-[0.6875rem] text-menta/45">
                                    <span className="tabular-nums">
                                      {formatearHoraOFecha(conv.fecha_ultimo_mensaje || conv.fecha_inicio, grupo)}
                                    </span>
                                    {conv.escalada && (
                                      <span className="flex items-center gap-1 text-coral">
                                        <Headphones size={10} /> Con ejecutivo
                                      </span>
                                    )}
                                    {!conv.escalada && conv.finalizada && (
                                      <span className="flex items-center gap-1">
                                        <CheckCircle2 size={10} /> Finalizada
                                      </span>
                                    )}
                                    {conv.calificacion ? (
                                      <span className="flex items-center gap-0.5 text-luz ml-auto">
                                        <Star size={10} className="fill-luz" /> {conv.calificacion}
                                      </span>
                                    ) : null}
                                  </span>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Silueta de ventanas: separa el directorio del pie */}
        {!contraido && (
          <div className="relative px-5 pt-1 pb-3 opacity-80">
            <Fachada columnas={16} filas={1} proporcion={0.25} semilla={usuario.id_usuario + 2} tamanoVentana="1fr" separacion="4px" intervalo={2600} />
          </div>
        )}

        {/* ── Pie: cuenta ─────────────────────────────────── */}
        <div className={`relative shrink-0 border-t border-white/[0.08] bg-noche-2/60 ${contraido ? "p-2.5 space-y-1.5" : "p-3.5"}`}>
          <div className={`flex items-center gap-3 ${contraido ? "justify-center py-1" : "px-1.5 pb-3"}`}>
            <span
              className="arco grid place-items-center w-9 h-10 shrink-0 bg-petroleo text-white text-sm font-semibold"
              title={contraido ? `${usuario.nombre} ${usuario.apellido}` : undefined}
            >
              {inicialNombre}
            </span>
            {!contraido && (
              <div className="min-w-0">
                <p className="text-[0.875rem] font-semibold text-white truncate leading-tight">
                  {usuario.nombre} {usuario.apellido}
                </p>
                <p className="text-[0.75rem] text-menta/50 truncate">{usuario.correo}</p>
              </div>
            )}
          </div>

          <div className={contraido ? "space-y-1" : "grid grid-cols-2 gap-1.5"}>
            <button
              type="button"
              onClick={() => {
                onCambiarPassword();
                onCerrarMobile?.();
              }}
              title="Seguridad de la cuenta"
              aria-label={contraido ? (mostrarSeguridad ? "Volver" : "Seguridad de la cuenta") : undefined}
              aria-pressed={mostrarSeguridad}
              className={`flex items-center justify-center gap-2 h-9 rounded-xl text-[0.8125rem] font-medium transition-colors w-full
                ${mostrarSeguridad ? "bg-menta text-noche" : "text-menta/75 hover:text-white bg-white/[0.05] hover:bg-white/[0.09]"}`}
            >
              {mostrarSeguridad ? <ArrowLeft size={15} /> : <LockKeyhole size={15} />}
              {!contraido && <span>{mostrarSeguridad ? "Volver" : "Seguridad"}</span>}
            </button>
            <button
              type="button"
              onClick={onCerrarSesion}
              title="Cerrar sesión"
              aria-label={contraido ? "Cerrar sesión" : undefined}
              className="flex items-center justify-center gap-2 h-9 rounded-xl text-[0.8125rem] font-medium text-menta/75 hover:text-white bg-white/[0.05] hover:bg-coral/25 transition-colors w-full"
            >
              <LogOut size={15} />
              {!contraido && <span>Salir</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
