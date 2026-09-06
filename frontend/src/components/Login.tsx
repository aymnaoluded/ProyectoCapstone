import React, { useState } from "react";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import type { Usuario } from "../types";
import { guardarSesionSegura } from "../utils/storage";

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
      const res = await fetch("http://localhost:8000/api/auth/login", {
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

      const userData: Usuario = await res.json();
      guardarSesionSegura("user_session", userData);;
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
    <div className="min-h-screen w-screen bg-[#0d131f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">
        
        {/* Cabecera */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sparkles size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">SupportAI</h1>
          <p className="text-xs text-slate-500">Ingresa tus credenciales para acceder a la plataforma</p>
        </div>

        {/* Alerta de error integrada en la aplicación */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 animate-in fade-in duration-200">
            <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
            <div className="text-xs font-medium leading-relaxed">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Correo institucional</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3.5 text-slate-400" size={16} />
              <input
                type="email"
                value={correo}
                onChange={(e) => {
                  setCorreo(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="ejemplo@correo.com"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700">Contraseña</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3.5 text-slate-400" size={16} />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                required
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            {cargando ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Iniciar sesión</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Cuentas de prueba de tu base de datos */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 mb-2 font-medium">Accesos directos de prueba:</p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => rellenarCredencial("nraguileo@gmail.com")}
              className="text-[11px] bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg text-slate-600 font-medium transition-colors"
            >
              Cliente
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("bvega@gmail.com")}
              className="text-[11px] bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg text-slate-600 font-medium transition-colors"
            >
              Ejecutivo
            </button>
            <button
              type="button"
              onClick={() => rellenarCredencial("mirarrazabal@gmail.com")}
              className="text-[11px] bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1 rounded-lg text-slate-600 font-medium transition-colors"
            >
              Admin
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};