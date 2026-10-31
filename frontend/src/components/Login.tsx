import React, { useState } from "react";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, Loader2, Sun, Moon } from "lucide-react";
import type { Usuario } from "../types";
import { guardarSesionSegura } from "../utils/storage";
import { API_URL } from "../utils/api";
import { useTheme } from "../context/ThemeContext";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.detail || "No se pudo iniciar sesión. Verifica tus credenciales."
        );
      }

      const data = await res.json();
      if (!data.usuario) {
        throw new Error("Respuesta inválida del servidor de autenticación.");
      }

      if (data.access_token) {
        localStorage.setItem("access_token", data.access_token);
      }

      const userData: Usuario = data.usuario;
      guardarSesionSegura("user_session", userData);
      onLoginSuccess(userData);
    } catch (err: any) {
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const rellenarCredencial = (c: string) => {
    setCorreo(c);
    setPassword("Hola1234");
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[var(--bg-canvas)] ambient-gradient-mesh flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Botón flotante cambio de tema */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Alternar tema"
          className="p-2.5 rounded-full liquid-glass border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-indigo-500" />}
        </button>
      </div>

      {/* Tarjeta Glassmorphic Central */}
      <div className="w-full max-w-md liquid-glass-elevated rounded-3xl p-8 sm:p-10 border border-[var(--border-glass)] space-y-6 relative z-10 animate-scale-up">
        {/* Cabecera Apple */}
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 bg-gradient-to-br from-[#007AFF] via-[#3B82F6] to-[#5856D6] text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/30 ring-1 ring-white/30">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
              SupportAI
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1">
              Plataforma empresarial de soporte inteligente
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-[var(--accent-danger)] animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <div className="text-xs font-medium leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
              Correo institucional
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" size={17} />
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="ejemplo@correo.com"
                className="liquid-input w-full rounded-2xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] tracking-wide">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-[var(--text-tertiary)] pointer-events-none" size={17} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="••••••••"
                className="liquid-input w-full rounded-2xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-0.5">
            <a
              href="/recuperar-password"
              className="text-xs font-medium text-[var(--accent-primary)] hover:underline transition-all"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="apple-btn-primary w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all cursor-pointer shadow-md disabled:opacity-50"
          >
            {cargando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <>
                <span>Acceder a la plataforma</span>
                <ArrowRight size={17} />
              </>
            )}
          </button>
        </form>

        {/* Accesos rápidos de prueba con Glass Pills */}
        <div className="pt-4 border-t border-[var(--border-subtle)] text-center space-y-2">
          <p className="text-[11px] text-[var(--text-tertiary)] font-medium">
            Accesos directos de prueba:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => rellenarCredencial("nraguileo@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full liquid-glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("bvega@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full liquid-glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Ejecutivo
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("mirarrazabal@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-full liquid-glass border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              Administrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};