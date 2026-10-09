
import React, { useState } from "react";
import {
  Sparkles, Lock, ArrowRight, AlertCircle,
  Loader2, CheckCircle2, Eye, EyeOff
} from "lucide-react";
import { API_URL } from "../utils/api";

const RestablecerPassword: React.FC = () => {
  const token = new URLSearchParams(
    window.location.search
  ).get("token");

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
      const res = await fetch(
        `${API_URL}/api/auth/restablecer-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password })
        }
      );

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

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            SupportAI
          </h1>
          <p className="text-base text-slate-500">
            Restablecer contraseña
          </p>
        </div>

        {completado ? (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              ¡Contraseña actualizada!
            </h2>

            <p className="text-sm text-slate-500">
              Tu contraseña se restableció correctamente.
              Ya puedes acceder a SupportAI.
            </p>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base transition-all"
            >
              Iniciar sesión
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            {(error || !token) && (
              <div role="alert" className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-xs font-medium">
                  {error || "El enlace no contiene un token. Solicita uno nuevo desde el inicio de sesión."}
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="nueva-password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Nueva contraseña
                </label>

                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-slate-400" size={16} />

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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-11 text-sm sm:text-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrar(!mostrar)}
                    aria-label={mostrar ? "Ocultar contraseñas" : "Mostrar contraseñas"}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600"
                  >
                    {mostrar ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmar-password"
                  className="text-sm font-semibold text-slate-700"
                >
                  Confirmar contraseña
                </label>

                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 text-slate-400" size={16} />

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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm sm:text-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando || !token}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-500/20 transition-all"
              >
                {cargando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    Restablecer contraseña
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => window.location.assign("/recuperar-password")}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
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
