
import React, { useState } from "react";
import {
  Sparkles, Mail, ArrowRight, ArrowLeft,
  AlertCircle, Loader2, CheckCircle2
} from "lucide-react";
import { API_URL } from "../utils/api";

const RecuperarPassword: React.FC = () => {
  const [correo, setCorreo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);

    try {
      const res = await fetch(
        `${API_URL}/api/auth/solicitar-recuperacion`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            correo: correo.trim().toLowerCase()
          })
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(
          typeof data?.detail === "string"
            ? data.detail
            : "No se pudo procesar la solicitud."
        );
      }

      setEnviado(true);
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
            Recuperación de contraseña
          </p>
        </div>

        {enviado ? (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-900">
              Revisa tu correo
            </h2>

            <p className="text-sm text-slate-500 leading-relaxed">
              Si existe una cuenta activa asociada a ese correo,
              recibirás un enlace para restablecer tu contraseña.
              El enlace tendrá una validez de 15 minutos.
            </p>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-500/20 transition-all"
            >
              Volver al inicio de sesión
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-slate-500">
                Ingresa el correo asociado a tu cuenta.
                Te enviaremos un enlace para crear una nueva contraseña.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="correo-recuperacion"
                  className="text-sm font-semibold text-slate-700"
                >
                  Correo electrónico
                </label>

                <div className="relative flex items-center">
                  <Mail
                    className="absolute left-3.5 text-slate-400"
                    size={16}
                  />
                  <input
                    id="correo-recuperacion"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm sm:text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-500/20 transition-all"
              >
                {cargando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar enlace
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full flex items-center justify-center gap-2 text-sm text-slate-500 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RecuperarPassword;
