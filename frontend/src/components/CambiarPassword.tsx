
import React, { useState } from "react";
import {
  Sparkles,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";

import { API_URL, obtenerToken } from "../utils/api";

interface CambiarPasswordProps {
  onPasswordCambiada: () => void;
}

const CambiarPassword: React.FC<CambiarPasswordProps> = ({
  onPasswordCambiada,
}) => {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmar, setConfirmar] = useState("");

  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (nueva !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (actual === nueva) {
      setError("La nueva contraseña debe ser diferente de la actual.");
      return;
    }

    const token = obtenerToken();

    if (!token) {
      setError("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(
        `${API_URL}/api/auth/cambiar-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            password_actual: actual,
            password_nueva: nueva,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);

        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "No se pudo cambiar la contraseña."
        );
      }

      setActual("");
      setNueva("");
      setConfirmar("");
      setExito(true);

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
    <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-y-auto bg-[#f8fafc] p-4 font-sans">

      {/* TARJETA PRINCIPAL */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 space-y-6">

        {/* CABECERA: MISMO DISEÑO QUE LOGIN */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sparkles size={24} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            SupportAI
          </h1>

          <p className="text-sm text-slate-500">
            Cambia tu contraseña de forma segura
          </p>
        </div>

        {/* MENSAJES DE ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700"
          >
            <AlertCircle
              size={18}
              className="shrink-0 text-rose-500 mt-0.5"
            />
            <span className="text-xs font-medium leading-relaxed">
              {error}
            </span>
          </div>
        )}

        {exito ? (

          /* CONTRASEÑA ACTUALIZADA */
          <div className="space-y-5 text-center">

            <div className="flex justify-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-900">
              ¡Contraseña actualizada!
            </h2>

            <p className="text-sm text-slate-500">
              Tu contraseña se cambió correctamente.
              Por seguridad, debes iniciar sesión nuevamente.
            </p>

            <button
              type="button"
              onClick={onPasswordCambiada}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              <span>Iniciar sesión</span>
              <ArrowRight size={18} />
            </button>

          </div>

        ) : (

          /* FORMULARIO */
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* CONTRASEÑA ACTUAL */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-actual"
                className="text-sm font-semibold text-slate-700"
              >
                Contraseña actual
              </label>

              <div className="relative flex items-center">
                <Lock
                  size={16}
                  className="absolute left-3.5 text-slate-400"
                />

                <input
                  id="password-actual"
                  type={mostrarPassword ? "text" : "password"}
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-11 text-sm sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* NUEVA CONTRASEÑA */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-nueva"
                className="text-sm font-semibold text-slate-700"
              >
                Nueva contraseña
              </label>

              <div className="relative flex items-center">
                <Lock
                  size={16}
                  className="absolute left-3.5 text-slate-400"
                />

                <input
                  id="password-nueva"
                  type={mostrarPassword ? "text" : "password"}
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={256}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-11 text-sm sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div className="space-y-1.5">
              <label
                htmlFor="password-confirmar"
                className="text-sm font-semibold text-slate-700"
              >
                Confirmar nueva contraseña
              </label>

              <div className="relative flex items-center">
                <Lock
                  size={16}
                  className="absolute left-3.5 text-slate-400"
                />

                <input
                  id="password-confirmar"
                  type={mostrarPassword ? "text" : "password"}
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={256}
                  placeholder="Repite tu contraseña"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-11 text-sm sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* MOSTRAR CONTRASEÑAS */}
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
            >
              {mostrarPassword ? (
                <EyeOff size={15} />
              ) : (
                <Eye size={15} />
              )}

              {mostrarPassword
                ? "Ocultar contraseñas"
                : "Mostrar contraseñas"}
            </button>

            {/* BOTÓN GUARDAR */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs sm:text-base shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
            >
              {cargando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar nueva contraseña</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </form>
        )}

        {/* PIE DE TARJETA */}
        <div className="pt-4 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400 font-medium">
            Seguridad de cuenta · SupportAI
          </p>
        </div>

      </div>
    </div>
  );
};

export default CambiarPassword;
