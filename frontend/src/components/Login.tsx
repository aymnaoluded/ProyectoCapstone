import React, { useState } from "react";
import { Building2, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import type { Usuario } from "../types";
import { guardarSesionSegura } from "../utils/storage";
import { API_URL } from "../utils/api";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
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
    <div className="min-h-screen w-screen bg-[#F5F7FA] flex items-center justify-center p-4 font-sans select-none">
      {/* Tarjeta Institucional Central con esquinas de 8 px */}
      <div className="w-full max-w-md bg-[#FFFFFF] rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 sm:p-9 border border-[#E4E7EB] shadow-sm space-y-6 relative z-10 animate-fade-in">
        {/* Cabecera Corporativa */}
        <div className="text-center space-y-2.5">
          <div className="w-13 h-13 bg-[#1E4E79] text-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
            <Building2 size={28} />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-[#173C5E]">
              Comunidad Clara
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#52606D] mt-1">
              Administraciones Ltda. · Plataforma Institucional
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
            <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600" />
            <div className="text-xs font-medium leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#52606D] tracking-wide">
              Correo institucional
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-[#52606D] pointer-events-none" size={17} />
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="ejemplo@correo.com"
                className="w-full bg-white border border-[#CBD2D9] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#52606D] tracking-wide">
              Contraseña
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-[#52606D] pointer-events-none" size={17} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="••••••••"
                className="w-full bg-white border border-[#CBD2D9] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end pt-0.5">
            <a
              href="/recuperar-password"
              className="text-xs font-medium text-[#1E4E79] hover:text-[#173C5E] hover:underline transition-all"
            >
              ¿Olvidaste tu contraseña?
            </a>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-[#1E4E79] hover:bg-[#173C5E] text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-heading font-semibold transition-all cursor-pointer shadow-sm disabled:opacity-50"
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

        {/* Accesos rápidos institucionales para demostración */}
        <div className="pt-4 border-t border-[#E4E7EB] text-center space-y-2">
          <p className="text-[11px] text-[#52606D] font-medium">
            Accesos directos de demostración:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => rellenarCredencial("nraguileo@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#CBD2D9] text-[#1F2933] hover:border-[#1E4E79] hover:text-[#1E4E79] transition-all cursor-pointer"
            >
              Cliente / Residente
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("bvega@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#CBD2D9] text-[#1F2933] hover:border-[#1E4E79] hover:text-[#1E4E79] transition-all cursor-pointer"
            >
              Ejecutivo / Comité
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("mirarrazabal@gmail.com")}
              className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#CBD2D9] text-[#1F2933] hover:border-[#1E4E79] hover:text-[#1E4E79] transition-all cursor-pointer"
            >
              Administrador
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
