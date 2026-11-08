import React, { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Building2, Users, Leaf } from "lucide-react";
import type { Usuario } from "../types";
import { guardarSesionSegura } from "../utils/storage";
import { API_URL } from "../utils/api";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [correo, setCorreo]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
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
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "No se pudo iniciar sesión. Verifica tus credenciales.");
      }
      const data = await res.json();
      if (!data.usuario) throw new Error("Respuesta inválida del servidor.");
      if (data.access_token) localStorage.setItem("access_token", data.access_token);
      guardarSesionSegura("user_session", data.usuario as Usuario);
      onLoginSuccess(data.usuario as Usuario);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const rellenar = (c: string) => { setCorreo(c); setPassword("Hola1234"); setError(null); };

  return (
    <div className="min-h-screen w-screen flex font-sans select-none overflow-hidden">
      {/* ── Panel izquierdo: imagen + overlay ─────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col justify-between p-10 overflow-hidden">
        {/* Fondo fotográfico con CSS gradient simulado — arquitectura residencial */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1400&q=80')`,
          }}
        />
        {/* Overlay verde petróleo */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E5450]/92 via-[#286D68]/88 to-[#3A8A84]/80" />
        {/* Patrón decorativo sutil */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: "40px 40px",
          }}
        />

        {/* Contenido superpuesto */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[14px] bg-white/15 border border-white/25
              flex items-center justify-center backdrop-blur-sm">
              <Building2 size={22} className="text-[#DCEFEA]" />
            </div>
            <div>
              <p className="text-white font-heading font-bold text-[15px] leading-tight">Comunidad Clara</p>
              <p className="text-white/60 text-[11px]">Administraciones Ltda.</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <h2 className="text-white font-heading font-bold text-3xl xl:text-4xl leading-tight tracking-tight">
              Una comunidad mejor<br />comienza con una<br />
              <span className="text-[#DCEFEA]">buena comunicación.</span>
            </h2>
            <p className="text-white/65 text-sm leading-relaxed max-w-sm">
              Gestión inteligente de condominios con asistente IA, seguimiento de incidencias
              y comunicación directa con la administración.
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 gap-3 max-w-sm">
            {[
              { icon: <Building2 size={15} />, text: "Gestión integral de edificios y condominios" },
              { icon: <Users size={15} />,     text: "Comunicación directa con la administración" },
              { icon: <Leaf size={15} />,      text: "Asistente IA disponible las 24 horas" },
            ].map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/8 border border-white/12
                rounded-xl px-4 py-2.5 backdrop-blur-sm">
                <span className="text-[#DCEFEA] shrink-0">{f.icon}</span>
                <p className="text-white/85 text-xs font-medium">{f.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pie del panel */}
        <div className="relative z-10 text-white/40 text-[11px]">
          © 2026 Comunidad Clara Administraciones Ltda.
        </div>
      </div>

      {/* ── Panel derecho: formulario ──────────────────────── */}
      <div className="flex-1 bg-[#F6F5F0] flex items-center justify-center p-6 sm:p-10 overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-7 animate-fade-in">

          {/* Logo (solo mobile) */}
          <div className="flex lg:hidden items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-[12px] bg-[#286D68] flex items-center justify-center shadow-md">
              <Building2 size={20} className="text-[#DCEFEA]" />
            </div>
            <div>
              <p className="font-heading font-bold text-[#293A3B] text-sm leading-tight">Comunidad Clara</p>
              <p className="text-[#788583] text-[11px]">Administraciones Ltda.</p>
            </div>
          </div>

          {/* Encabezado formulario */}
          <div className="space-y-1.5">
            <h1 className="text-2xl font-heading font-bold text-[#293A3B] tracking-tight">
              Bienvenido de vuelta
            </h1>
            <p className="text-[#788583] text-sm">
              Ingresa con tu correo institucional para acceder a la plataforma.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200
              rounded-xl text-red-700 animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" />
              <p className="text-xs font-medium leading-relaxed">{error}</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#5A6968] tracking-wide block">
                Correo institucional
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3.5 text-[#A0AFAE] pointer-events-none" size={16} />
                <input
                  type="email"
                  value={correo}
                  onChange={e => { setCorreo(e.target.value); if (error) setError(null); }}
                  required
                  placeholder="ejemplo@correo.com"
                  className="cc-input w-full py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#5A6968] tracking-wide">
                  Contraseña
                </label>
                <a
                  href="/recuperar-password"
                  className="text-xs font-medium text-[#286D68] hover:text-[#1E5450]
                    hover:underline transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#A0AFAE] pointer-events-none" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (error) setError(null); }}
                  required
                  placeholder="••••••••"
                  className="cc-input w-full py-2.5 pl-10 pr-4 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="cc-btn-primary w-full py-2.5 px-4 text-sm mt-2"
            >
              {cargando ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <span>Acceder a la plataforma</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Accesos demo */}
          <div className="pt-1 border-t border-[#E7EAE7] space-y-3">
            <p className="text-[11px] text-[#A0AFAE] font-medium text-center">
              Accesos directos de demostración
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Residente",     correo: "nraguileo@gmail.com" },
                { label: "Ejecutivo",     correo: "bvega@gmail.com" },
                { label: "Administrador", correo: "mirarrazabal@gmail.com" },
              ].map(d => (
                <button
                  key={d.correo}
                  type="button"
                  onClick={() => rellenar(d.correo)}
                  className="text-[11px] font-medium px-2 py-2 rounded-xl
                    bg-white border border-[#E7EAE7] text-[#5A6968]
                    hover:border-[#286D68] hover:text-[#286D68] hover:bg-[#EDF5F4]
                    transition-all cursor-pointer text-center"
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
