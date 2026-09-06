import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import type { VistaApp } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { Login } from "./components/Login";
import type { Usuario } from "./types";
import { BaseConocimiento } from "./components/BaseConocimiento";
import { GestionUsuarios } from "./components/GestionUsuarios";
import { LogAuditoria } from "./components/LogAuditoria";
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

  useEffect(() => {
    const user = obtenerSesionSegura<Usuario>("user_session");
    const savedVista = localStorage.getItem("vistaActiva") as VistaApp | null;

    if (user) {
      setUsuario(user);
      if (savedVista) {
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

  const getVistaInicial = (rol: string): VistaApp => {
    if (rol === "Administrador") return "admin_conocimiento";
    if (rol === "Ejecutivo") return "atender_tickets";
    return "chat";
  };

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
        {vistaActiva === "mis_tickets" && (
          <div className="p-8 text-slate-700">
            <h2 className="text-xl font-bold mb-4">Mis Solicitudes</h2>
            <p className="text-sm text-slate-500">Historial de tickets consultados a través del asistente.</p>
          </div>
        )}

        {/* VISTAS EJECUTIVO */}
        {vistaActiva === "atender_tickets" && (
          <div className="p-8 text-slate-700">
            <h2 className="text-xl font-bold mb-4">Bandeja de Tickets</h2>
            <p className="text-sm text-slate-500">Casos escalados por baja confianza del bot o solicitud directa.</p>
          </div>
        )}
        {vistaActiva === "escaladas" && (
          <div className="p-8 text-slate-700">
            <h2 className="text-xl font-bold mb-4">Conversaciones Escaladas</h2>
            <p className="text-sm text-slate-500">Revisión de diálogos con scores menores a 0.60.</p>
          </div>
        )}

        {/* VISTAS ADMINISTRADOR */}
        {vistaActiva === "admin_conocimiento" && <BaseConocimiento usuario={usuario} />}
        {vistaActiva === "admin_usuarios" && <GestionUsuarios />}
        
        {vistaActiva === "metricas" && (
          <div className="p-8 text-slate-700">
            <h2 className="text-xl font-bold mb-4">Métricas del Sistema</h2>
            <p className="text-sm text-slate-500">Rendimiento del modelo, umbrales de confianza y volumen de tickets.</p>
          </div>
        )}
        {vistaActiva === "auditoria" && <LogAuditoria />}
      </main>
    </div>
  );
}