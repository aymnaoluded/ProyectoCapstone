
import React, { useState } from "react";
import {
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { API_URL } from "../utils/api";

const ActivarCuenta: React.FC = () => {
  const token = new URLSearchParams(
    window.location.search
  ).get("token");

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
      const res = await fetch(
        `${API_URL}/api/auth/activar-cuenta`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
          "No se pudo activar la cuenta."
        );
      }

      setActivada(true);
      setPassword("");
      setConfirmarPassword("");

      // Eliminar el token de la barra de direcciones
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );

    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error al conectar con el servidor."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#0d131f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">

        {/* Cabecera: mismo diseño que Login */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sparkles size={24} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            SupportAI
          </h1>

          <p className="text-s text-slate-500">
            {activada
              ? "Tu cuenta está lista para acceder a la plataforma"
              : "Establece tus credenciales para activar tu cuenta"}
          </p>
        </div>

        {/* Mensajes de error */}
        {(error || (!token && !activada)) && (
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 animate-in fade-in duration-200">
            <AlertCircle
              size={18}
              className="shrink-0 text-rose-500 mt-0.5"
            />
            <div className="text-xs font-medium leading-relaxed">
              {error ||
                "El enlace de activación no contiene un token. Abre el enlace que recibiste en tu correo."}
            </div>
          </div>
        )}

        {activada ? (
          /* Cuenta activada correctamente */
          <div className="space-y-5">

            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                ¡Cuenta activada!
              </h2>

              <p className="text-sm text-slate-500">
                Tu contraseña fue configurada correctamente.
                Ya puedes iniciar sesión en SupportAI.
              </p>
            </div>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-base shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Iniciar sesión</span>
              <ArrowRight size={18} />
            </button>

          </div>
        ) : (
          /* Formulario de activación */
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nueva contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="nueva-password"
                className="text-s font-semibold text-slate-700"
              >
                Nueva contraseña
              </label>

              <div className="relative flex items-center">
                <Lock
                  className="absolute left-3.5 text-slate-400"
                  size={16}
                />

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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div className="space-y-1.5">
              <label
                htmlFor="confirmar-password"
                className="text-s font-semibold text-slate-700"
              >
                Confirmar contraseña
              </label>

              <div className="relative flex items-center">
                <Lock
                  className="absolute left-3.5 text-slate-400"
                  size={16}
                />

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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={cargando || !token}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-base shadow-sm shadow-blue-500/20 transition-all cursor-pointer disabled:cursor-not-allowed"
            >
              {cargando ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
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

        {/* Pie de tarjeta */}
        <div className="pt-4 border-t border-slate-100 text-center">

          <div className="flex items-center justify-center gap-2 text-slate-400 mb-3">
            <ShieldCheck size={14} />
            <span className="text-[11px] font-medium">
              Activación segura de cuenta
            </span>
          </div>

          {!activada && (
            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="text-[11px] bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 rounded-lg text-slate-600 font-medium transition-colors"
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
