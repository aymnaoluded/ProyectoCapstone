import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { Sidebar } from "./components/Sidebar";
import type { VistaApp } from "./components/Sidebar";
import { AccesosRapidos } from "./components/AccesosRapidos";
import { Chat } from "./components/Chat";
import { Login } from "./components/Login";
import type { Usuario } from "./types";
import { BaseConocimiento } from "./components/BaseConocimiento";
import { GestionUsuarios } from "./components/GestionUsuarios";
import { LogAuditoria } from "./components/LogAuditoria";
import { MisSolicitudes } from "./components/MisSolicitudes";
import { BandejaEjecutivo } from "./components/BandejaEjecutivo";
import { MetricasSistema } from "./components/MetricasSistema";
import ActivarCuenta from "./components/ActivarCuenta";
import RecuperarPassword from "./components/RecuperarPassword";
import RestablecerPassword from "./components/RestablecerPassword";
import CambiarPassword from "./components/CambiarPassword";
import { TopBar } from "./components/TopBar";
import { MobileNav } from "./components/MobileNav";
import PaginaNoEncontrada from "./components/PaginaNoEncontrada";
import {
  obtenerSesionSegura,
  eliminarSesionSegura,
} from "./utils/storage";
import { tokenVigente, API_URL } from "./utils/api";

// Rutas que existen; cualquier otra muestra la página 404
const RUTAS_VALIDAS = ["/", "/index.html", "/activar-cuenta", "/recuperar-password", "/restablecer-password"];

export default function App() {
  // Limpieza permanente de cualquier preferencia previa de tema oscuro
  useEffect(() => {
    localStorage.removeItem("supportai_theme");
    document.documentElement.classList.remove("dark");
  }, []);

  // La sesión se recupera antes del primer render: así al recargar no aparece el login por un instante
  const [usuario, setUsuario] = useState<Usuario | null>(() => {
    const guardado = obtenerSesionSegura<Usuario>("user_session");
    return guardado && guardado.rol_nombre && tokenVigente() ? guardado : null;
  });
  const [vistaActiva, setVistaActivaState] = useState<VistaApp>("chat");
  const [conversacionActivaId, setConversacionActivaId] = useState<number | null>(null);
  const [refreshHistorialTrigger, setRefreshHistorialTrigger] = useState(0);
  const [mostrarSeguridad, setMostrarSeguridad] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accesosAbiertos, setAccesosAbiertos] = useState(false);

  const setVistaActiva = useCallback((nuevaVista: VistaApp) => {
    setMostrarSeguridad(false);
    setVistaActivaState(nuevaVista);
    localStorage.setItem("vistaActiva", nuevaVista);
  }, []);

  const cerrarMenuMovil = useCallback(() => setMobileMenuOpen(false), []);

  // Ctrl/⌘ + K abre los accesos rápidos
  useEffect(() => {
    if (!usuario) return;
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAccesosAbiertos((a) => !a);
      }
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [usuario]);

  const limpiarSesionLocal = () => {
    eliminarSesionSegura("user_session");
    localStorage.removeItem("access_token");
    localStorage.removeItem("vistaActiva");
    setUsuario(null);
  };

  const handleNuevaConversacion = async () => {
    setVistaActiva("chat");
    if (!usuario) {
      setConversacionActivaId(null);
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_URL}/api/chat/nueva`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setConversacionActivaId(data.id_conversacion);
        setRefreshHistorialTrigger((prev) => prev + 1);
      } else {
        setConversacionActivaId(null);
      }
    } catch (err) {
      console.error("Error al iniciar nueva conversación:", err);
      setConversacionActivaId(null);
    }
  };

  const handleSeleccionarConversacion = (id: number) => {
    setConversacionActivaId(id);
    setVistaActiva("chat");
  };

  const handleConversacionCreada = (id: number) => {
    setConversacionActivaId(id);
    setRefreshHistorialTrigger((prev) => prev + 1);
  };

  const handleConversacionActualizada = () => {
    setRefreshHistorialTrigger((prev) => prev + 1);
  };

  const getVistaInicial = (rol?: string): VistaApp => {
    if (rol === "Administrador") return "admin_conocimiento";
    if (rol === "Ejecutivo") return "bandeja_tickets";
    return "chat";
  };

  useEffect(() => {
    const user = obtenerSesionSegura<Usuario>("user_session");
    const savedVista = localStorage.getItem("vistaActiva") as VistaApp | null;

    if (user && user.rol_nombre && tokenVigente()) {
      setUsuario(user);
      if (savedVista && (savedVista as string) !== "escaladas") {
        setVistaActivaState(savedVista);
      } else {
        const inicial = getVistaInicial(user.rol_nombre);
        setVistaActivaState(inicial);
        localStorage.setItem("vistaActiva", inicial);
      }
    } else {
      eliminarSesionSegura("user_session");
      localStorage.removeItem("access_token");
      setUsuario(null);
    }
  }, []);

  // Heartbeat automático cada 60s
  useEffect(() => {
    if (!usuario) return;

    const ping = () => {
      if (!tokenVigente()) {
        limpiarSesionLocal();
        return;
      }

      const token = localStorage.getItem("access_token");
      fetch(`${API_URL}/api/admin/usuarios/heartbeat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then((res) => {
          if (res.status === 401) limpiarSesionLocal();
        })
        .catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [usuario]);

  const handleLogin = (user: Usuario) => {
    setUsuario(user);
    setConversacionActivaId(null);
    const vistaDefecto = getVistaInicial(user.rol_nombre);
    setVistaActiva(vistaDefecto);
  };

  const handleCerrarSesion = async () => {
    const token = localStorage.getItem("access_token");
    if (token) {
      try {
        await fetch(`${API_URL}/api/admin/usuarios/desconectar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {}
    }
    limpiarSesionLocal();
  };

  // Cualquier dirección que no sea una ruta de la aplicación muestra la página 404
  if (!RUTAS_VALIDAS.includes(window.location.pathname)) {
    return <PaginaNoEncontrada />;
  }

  // Rutas públicas de activación y restablecimiento
  if (window.location.pathname === "/activar-cuenta") {
    return <ActivarCuenta />;
  }

  if (window.location.pathname === "/recuperar-password") {
    return <RecuperarPassword />;
  }

  if (window.location.pathname === "/restablecer-password") {
    return <RestablecerPassword />;
  }

  if (!usuario) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex h-dvh w-screen bg-papel overflow-hidden font-sans text-tinta relative">
      {/* Enlace para saltar directo al contenido con teclado */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] boton boton-primario"
      >
        Saltar al contenido
      </a>

      {/* Directorio lateral */}
      <Sidebar
        usuario={usuario}
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        onCerrarSesion={handleCerrarSesion}
        conversacionActivaId={conversacionActivaId}
        onSeleccionarConversacion={handleSeleccionarConversacion}
        onNuevaConversacion={handleNuevaConversacion}
        refreshHistorialTrigger={refreshHistorialTrigger}
        mostrarSeguridad={mostrarSeguridad}
        onCambiarPassword={() => setMostrarSeguridad((anterior) => !anterior)}
        mobileAbierto={mobileMenuOpen}
        onCerrarMobile={cerrarMenuMovil}
      />

      {/* Contenido principal */}
      <main id="contenido" className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
        <TopBar
          usuario={usuario}
          vistaActiva={vistaActiva}
          onCerrarSesion={handleCerrarSesion}
          onCambiarPassword={() => setMostrarSeguridad((anterior) => !anterior)}
          mostrarSeguridad={mostrarSeguridad}
          onToggleSidebarMobile={() => setMobileMenuOpen((prev) => !prev)}
          onAbrirAccesos={() => setAccesosAbiertos(true)}
        />

        <motion.div
          key={mostrarSeguridad ? "seguridad" : vistaActiva}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-h-0 overflow-hidden relative flex flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
        >
          {mostrarSeguridad ? (
            <CambiarPassword onPasswordCambiada={limpiarSesionLocal} />
          ) : (
            <>
              {/* Vistas Cliente / Residentes */}
              {vistaActiva === "chat" && (
                <Chat
                  usuario={usuario}
                  conversacionIdProp={conversacionActivaId}
                  onConversacionCreada={handleConversacionCreada}
                  onConversacionActualizada={handleConversacionActualizada}
                  onNuevaConversacion={handleNuevaConversacion}
                />
              )}

              {vistaActiva === "mis_tickets" && (
                <MisSolicitudes usuario={usuario} />
              )}

              {/* Bandeja de Tickets (Ejecutivo / Comité y Administrador) */}
              {vistaActiva === "bandeja_tickets" && (
                <BandejaEjecutivo usuario={usuario} />
              )}

              {vistaActiva === "tickets_asignados" && (
                <BandejaEjecutivo usuario={usuario} soloAsignados={true} />
              )}

              {vistaActiva === "historial_tickets" && (
                <BandejaEjecutivo usuario={usuario} soloHistorial={true} />
              )}

              {/* Vistas Administrador */}
              {vistaActiva === "admin_conocimiento" && (
                <BaseConocimiento usuario={usuario} />
              )}

              {vistaActiva === "admin_usuarios" && (
                <GestionUsuarios />
              )}

              {vistaActiva === "metricas" && (
                <MetricasSistema />
              )}

              {vistaActiva === "auditoria" && (
                <LogAuditoria />
              )}
            </>
          )}
        </motion.div>

        {/* Navegación móvil inferior */}
        <MobileNav
          usuario={usuario}
          vistaActiva={vistaActiva}
          setVistaActiva={setVistaActiva}
        />
      </main>

      {/* Accesos rápidos (Ctrl/⌘ + K) */}
      <AccesosRapidos
        abierto={accesosAbiertos}
        onCerrar={() => setAccesosAbiertos(false)}
        usuario={usuario}
        vistaActiva={vistaActiva}
        onIrA={setVistaActiva}
        onNuevaConversacion={usuario.rol_nombre === "Cliente" ? handleNuevaConversacion : undefined}
        onSeguridad={() => setMostrarSeguridad(true)}
        onCerrarSesion={handleCerrarSesion}
      />
    </div>
  );
}
