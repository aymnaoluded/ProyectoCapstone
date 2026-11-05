import React, { useState } from "react";
import {
  Building2,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { API_URL } from "../utils/api";

const ActivarCuenta: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [activada, setActivada] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace de activación no es válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/activar-cuenta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "No se pudo activar la cuenta.");
      }

      setActivada(true);
      setPassword("");
      setConfirmarPassword("");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F5F7FA] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 shadow-sm border border-[#E4E7EB] space-y-6">
        {/* Cabecera institucional */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#1E4E79] text-white rounded-2xl bg-gradient-to-br from-[#1E4E79] to-[#173C5E] text-white flex items-center justify-center mx-auto shadow-md ring-1 ring-white/20">
            <Building2 size={24} />
          </div>

          <h1 className="text-2xl font-bold font-heading text-[#173C5E]">
            Comunidad Clara
          </h1>

          <p className="text-sm text-[#52606D]">
            {activada
              ? "Tu cuenta está lista para acceder a la plataforma institucional"
              : "Establece tus credenciales para activar tu cuenta"}
          </p>
        </div>

        {/* Mensajes de error */}
        {(error || (!token && !activada)) && (
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in">
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="text-xs font-medium leading-relaxed">
              {error ||
                "El enlace de activación no contiene un token. Abre el enlace que recibiste en tu correo."}
            </div>
          </div>
        )}

        {activada ? (
          <div className="space-y-5">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-13 h-13 bg-[#47705A]/15 text-[#47705A] rounded-xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="text-xl font-bold font-heading text-[#173C5E]">
                ¡Cuenta activada exitosamente!
              </h2>

              <p className="text-sm text-[#52606D]">
                Tu contraseña fue configurada correctamente. Ya puedes acceder a Comunidad Clara.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-[#1E4E79] hover:bg-[#173C5E] text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
            >
              <span>Iniciar sesión</span>
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="nueva-password" className="text-xs font-semibold text-[#52606D]">
                Nueva contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#52606D]" size={16} />
                <input
                  id="nueva-password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#CBD2D9] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmar-password" className="text-xs font-semibold text-[#52606D]">
                Confirmar contraseña
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 text-[#52606D]" size={16} />
                <input
                  id="confirmar-password"
                  type="password"
                  value={confirmarPassword}
                  onChange={(e) => {
                    setConfirmarPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                  minLength={8}
                  maxLength={256}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#CBD2D9] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={cargando || !token}
              className="w-full bg-[#1E4E79] hover:bg-[#173C5E] disabled:opacity-50 text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Activando...</span>
                </>
              ) : (
                <>
                  <span>Activar cuenta</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-[#E4E7EB] text-center">
          <div className="flex items-center justify-center gap-2 text-[#52606D] mb-3">
            <ShieldCheck size={14} className="text-[#47705A]" />
            <span className="text-[11px] font-medium">Activación segura de cuenta</span>
          </div>

          {!activada && (
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="text-[11px] bg-[#F5F7FA] hover:bg-[#E4E7EB] px-3 py-1.5 rounded-xl text-[#1F2933] font-medium transition-colors cursor-pointer"
            >
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivarCuenta;
