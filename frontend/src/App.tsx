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
import {
  obtenerSesionSegura,
  eliminarSesionSegura,
} from "./utils/storage";

export default function App() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [vistaActiva, setVistaActivaState] = useState<VistaApp>("chat");

  const setVistaActiva = (nuevaVista: VistaApp) => {
    setVistaActivaState(nuevaVista);
    localStorage.setItem("vistaActiva", nuevaVista);
  };

  const getVistaInicial = (rol: string): VistaApp => {
    if (rol === "Administrador") return "admin_conocimiento";
    if (rol === "Ejecutivo") return "bandeja_tickets";
    return "chat";
  };

  useEffect(() => {
    const user = obtenerSesionSegura<Usuario>("user_session");
    const savedVista = localStorage.getItem("vistaActiva") as VistaApp | null;

    if (user) {
      setUsuario(user);
      if (savedVista && savedVista !== ("escaladas" as any)) {
        setVistaActivaState(savedVista);
      } else {
        const inicial = getVistaInicial(user.rol_nombre);
        setVistaActivaState(inicial);
        localStorage.setItem("vistaActiva", inicial);
      }
    }
  }, []);

  // Heartbeat automático cada 60s
  useEffect(() => {
    if (!usuario) return;

    const ping = () => {
      fetch("http://localhost:8000/api/admin/usuarios/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_usuario: usuario.id_usuario }),
      }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, 60000);
    return () => clearInterval(interval);
  }, [usuario]);

  const handleLogin = (user: Usuario) => {
    setUsuario(user);
    const vistaDefecto = getVistaInicial(user.rol_nombre);
    setVistaActiva(vistaDefecto);
  };

  const handleCerrarSesion = async () => {
    if (usuario) {
      try {
        await fetch("http://localhost:8000/api/admin/usuarios/desconectar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id_usuario: usuario.id_usuario }),
        });
      } catch {}
    }

    eliminarSesionSegura("user_session");
    localStorage.removeItem("vistaActiva");
    setUsuario(null);
  };

  if (!usuario) {
    return <Login onLoginSuccess={handleLogin} />;
  }

  return (
    <div className="flex h-screen w-screen bg-slate-100 overflow-hidden font-sans">
      <Sidebar
        usuario={usuario}
        vistaActiva={vistaActiva}
        setVistaActiva={setVistaActiva}
        onCerrarSesion={handleCerrarSesion}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        {/* VISTAS CLIENTE */}
        {vistaActiva === "chat" && <Chat usuario={usuario} />}
        {vistaActiva === "mis_tickets" && <MisSolicitudes usuario={usuario} />}

        {/* BANDEJA DE TICKETS (Ejecutivo y Administrador) */}
        {vistaActiva === "bandeja_tickets" && (
          <BandejaEjecutivo usuario={usuario} />
        )}

        {/* VISTAS ADMINISTRADOR */}
        {vistaActiva === "admin_conocimiento" && <BaseConocimiento usuario={usuario} />}
        {vistaActiva === "admin_usuarios" && <GestionUsuarios />}
        {vistaActiva === "metricas" && <MetricasSistema />}
        {vistaActiva === "auditoria" && <LogAuditoria />}
      </main>
    </div>
  );
}