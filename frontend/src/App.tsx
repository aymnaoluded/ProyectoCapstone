import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import type { VistaApp } from "./components/Sidebar";
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
import { ThemeProvider } from "./context/ThemeContext";
import {
  obtenerSesionSegura,
  eliminarSesionSegura,
} from "./utils/storage";
import { tokenVigente, API_URL } from "./utils/api";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vistaActiva, setVistaActivaState] = useState<VistaApp>("chat");
  const [conversacionActivaId, setConversacionActivaId] = useState<number | null>(null);
  const [refreshHistorialTrigger, setRefreshHistorialTrigger] = useState(0);
  const [mostrarSeguridad, setMostrarSeguridad] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const setVistaActiva = (nuevaVista: VistaApp) => {
    setMostrarSeguridad(false);
    setVistaActivaState(nuevaVista);
    localStorage.setItem("vistaActiva", nuevaVista);
  };

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
      if (savedVista && savedVista !== ("escaladas" as any)) {
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

  // Rutas públicas de activación y restablecimiento
  if (window.location.pathname === "/activar-cuenta") {
    return (
      <ThemeProvider>
        <ActivarCuenta />
      </ThemeProvider>
    );
  }

  if (window.location.pathname === "/recuperar-password") {
    return (
      <ThemeProvider>
        <RecuperarPassword />
      </ThemeProvider>
    );
  }

  if (window.location.pathname === "/restablecer-password") {
    return (
      <ThemeProvider>
        <RestablecerPassword />
      </ThemeProvider>
    );
  }

  if (!usuario) {
    return (
      <ThemeProvider>
        <Login onLoginSuccess={handleLogin} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="flex h-screen w-screen bg-[var(--bg-canvas)] overflow-hidden font-sans text-[var(--text-primary)] ambient-gradient-mesh relative selection:bg-blue-500/20 selection:text-[var(--accent-primary)]">
        {/* Sidebar Lateral */}
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
          onCerrarMobile={() => setMobileMenuOpen(false)}
        />

        {/* Contenido Principal con TopBar */}
        <main className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
          <TopBar
            usuario={usuario}
            vistaActiva={vistaActiva}
            onCerrarSesion={handleCerrarSesion}
            onCambiarPassword={() => setMostrarSeguridad((anterior) => !anterior)}
            mostrarSeguridad={mostrarSeguridad}
            onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          />

          <div className="flex-1 overflow-hidden relative flex flex-col pb-16 md:pb-0">
            {mostrarSeguridad ? (
              <CambiarPassword onPasswordCambiada={limpiarSesionLocal} />
            ) : (
              <>
                {/* Vistas Cliente */}
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

                {/* Bandeja de Tickets (Ejecutivo y Administrador) */}
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
          </div>

          {/* Navegación móvil inferior iOS */}
          <MobileNav
            usuario={usuario}
            vistaActiva={vistaActiva}
            setVistaActiva={setVistaActiva}
            onNuevaConversacion={handleNuevaConversacion}
          />
        </main>
      </div>
    </ThemeProvider>
  );
}
