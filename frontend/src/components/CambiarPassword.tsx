import React, { useState } from "react";
import {
  Building2,
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
      const res = await fetch(`${API_URL}/api/auth/cambiar-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password_actual: actual,
          password_nueva: nueva,
        }),
      });

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
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 w-full flex items-center justify-center overflow-y-auto bg-[#F6F5F0] p-4 font-sans select-none">
      {/* TARJETA PRINCIPAL CON ESQUINAS DE 8 PX */}
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 shadow-sm border border-[#E7EAE7] space-y-6">
        {/* CABECERA INSTITUCIONAL */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#286D68] text-white rounded-2xl bg-gradient-to-br from-[#286D68] to-[#1E5450] text-white flex items-center justify-center mx-auto shadow-md ring-1 ring-white/20">
            <Building2 size={24} />
          </div>

          <h1 className="text-2xl font-bold font-heading text-[#1E5450]">
            Comunidad Clara
          </h1>

          <p className="text-sm text-[#788583]">
            Gestión de seguridad y cambio de contraseña
          </p>
        </div>

        {/* MENSAJES DE ERROR */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 animate-fade-in"
          >
            <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <span className="text-xs font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {exito ? (
          /* CONTRASEÑA ACTUALIZADA */
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-13 h-13 bg-[#52966A]/15 text-[#52966A] rounded-xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-xl font-bold font-heading text-[#1E5450]">
              ¡Contraseña actualizada con éxito!
            </h2>

            <p className="text-sm text-[#788583]">
              Tu contraseña se cambió correctamente. Por seguridad institucional, debes iniciar sesión nuevamente.
            </p>

            <button
              type="button"
              onClick={onPasswordCambiada}
              className="w-full bg-[#286D68] hover:bg-[#1E5450] text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
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
              <label htmlFor="password-actual" className="text-xs font-semibold text-[#788583]">
                Contraseña actual
              </label>

              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#788583]" />

                <input
                  id="password-actual"
                  type={mostrarPassword ? "text" : "password"}
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  autoComplete="current-password"
                  required
                  maxLength={256}
                  placeholder="••••••••"
                  className="w-full bg-white border border-[#CDD4D3] rounded-xl py-2.5 pl-10 pr-11 text-sm text-[#293A3B] placeholder-[#7B8794] focus:outline-none focus:border-[#286D68] focus:ring-2 focus:ring-[#286D68]/15 transition-all"
                />
              </div>
            </div>

            {/* NUEVA CONTRASEÑA */}
            <div className="space-y-1.5">
              <label htmlFor="password-nueva" className="text-xs font-semibold text-[#788583]">
                Nueva contraseña
              </label>

              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#788583]" />

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
                  className="w-full bg-white border border-[#CDD4D3] rounded-xl py-2.5 pl-10 pr-11 text-sm text-[#293A3B] placeholder-[#7B8794] focus:outline-none focus:border-[#286D68] focus:ring-2 focus:ring-[#286D68]/15 transition-all"
                />
              </div>
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div className="space-y-1.5">
              <label htmlFor="password-confirmar" className="text-xs font-semibold text-[#788583]">
                Confirmar nueva contraseña
              </label>

              <div className="relative flex items-center">
                <Lock size={16} className="absolute left-3.5 text-[#788583]" />

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
                  className="w-full bg-white border border-[#CDD4D3] rounded-xl py-2.5 pl-10 pr-11 text-sm text-[#293A3B] placeholder-[#7B8794] focus:outline-none focus:border-[#286D68] focus:ring-2 focus:ring-[#286D68]/15 transition-all"
                />
              </div>
            </div>

            {/* MOSTRAR CONTRASEÑAS */}
            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="flex items-center gap-2 text-xs font-medium text-[#788583] hover:text-[#286D68] transition-colors cursor-pointer"
            >
              {mostrarPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{mostrarPassword ? "Ocultar contraseñas" : "Mostrar contraseñas"}</span>
            </button>

            {/* BOTÓN GUARDAR */}
            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-[#286D68] hover:bg-[#1E5450] disabled:opacity-50 text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
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
        <div className="pt-4 border-t border-[#E7EAE7] text-center">
          <p className="text-[11px] text-[#788583] font-medium">
            Seguridad institucional · Comunidad Clara Administraciones Ltda.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CambiarPassword;
