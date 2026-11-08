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
import { API_URL } from "../utils/api";

const RestablecerPassword: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [completado, setCompletado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("El enlace no contiene un token válido.");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/restablecer-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "No se pudo restablecer la contraseña."
        );
      }

      setCompletado(true);
      setPassword("");
      setConfirmar("");
      window.history.replaceState({}, "", window.location.pathname);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F6F5F0] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 shadow-sm border border-[#E7EAE7] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#286D68] text-white rounded-2xl bg-gradient-to-br from-[#286D68] to-[#1E5450] text-white flex items-center justify-center mx-auto shadow-md ring-1 ring-white/20">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#1E5450]">
            Comunidad Clara
          </h1>
          <p className="text-sm text-[#788583]">
            Restablecer contraseña institucional
          </p>
        </div>

        {completado ? (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-13 h-13 bg-[#52966A]/15 text-[#52966A] rounded-xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-lg font-bold font-heading text-[#1E5450]">
              ¡Contraseña actualizada con éxito!
            </h2>

            <p className="text-sm text-[#788583]">
              Tu contraseña se restableció correctamente. Ya puedes acceder a Comunidad Clara.
            </p>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-[#286D68] hover:bg-[#1E5450] text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all cursor-pointer shadow-xs"
            >
              Iniciar sesión
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            {(error || !token) && (
              <div role="alert" className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                <span className="text-xs font-medium">
                  {error || "El enlace no contiene un token. Solicita uno nuevo desde el inicio de sesión."}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="nueva-password" className="text-xs font-semibold text-[#788583]">
                  Nueva contraseña
                </label>

                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-[#788583]" size={16} />

                  <input
                    id="nueva-password"
                    type={mostrar ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                    className="w-full bg-white border border-[#CDD4D3] rounded-xl py-2.5 pl-10 pr-11 text-sm text-[#293A3B] placeholder-[#7B8794] focus:outline-none focus:border-[#286D68] focus:ring-2 focus:ring-[#286D68]/15 transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrar(!mostrar)}
                    aria-label={mostrar ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    className="absolute right-3.5 text-[#788583] hover:text-[#293A3B] cursor-pointer"
                  >
                    {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmar-password" className="text-xs font-semibold text-[#788583]">
                  Confirmar contraseña
                </label>

                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-[#788583]" size={16} />

                  <input
                    id="confirmar-password"
                    type={mostrar ? "text" : "password"}
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    placeholder="Repite la contraseña"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                    className="w-full bg-white border border-[#CDD4D3] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#293A3B] placeholder-[#7B8794] focus:outline-none focus:border-[#286D68] focus:ring-2 focus:ring-[#286D68]/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando || !token}
                className="w-full bg-[#286D68] hover:bg-[#1E5450] disabled:opacity-50 disabled:cursor-not-allowed text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
              >
                {cargando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>Restablecer contraseña</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => window.location.assign("/recuperar-password")}
              className="w-full text-xs font-medium text-[#286D68] hover:text-[#1E5450] hover:underline text-center cursor-pointer"
            >
              Solicitar un nuevo enlace
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RestablecerPassword;
