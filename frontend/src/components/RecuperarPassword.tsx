import React, { useState } from "react";
import {
  Building2,
  Mail,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Loader2,
  CheckCircle2,
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
      const res = await fetch(`${API_URL}/api/auth/solicitar-recuperacion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: correo.trim().toLowerCase(),
        }),
      });

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
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#F5F7FA] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 shadow-sm border border-[#E4E7EB] space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-[#1E4E79] text-white rounded-2xl bg-gradient-to-br from-[#1E4E79] to-[#173C5E] text-white flex items-center justify-center mx-auto shadow-md ring-1 ring-white/20">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#173C5E]">
            Comunidad Clara
          </h1>
          <p className="text-sm text-[#52606D]">
            Recuperación de contraseña institucional
          </p>
        </div>

        {enviado ? (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="w-13 h-13 bg-[#47705A]/15 text-[#47705A] rounded-xl flex items-center justify-center">
                <CheckCircle2 size={30} />
              </div>
            </div>

            <h2 className="text-lg font-bold font-heading text-[#173C5E]">
              Revisa tu correo institucional
            </h2>

            <p className="text-sm text-[#52606D] leading-relaxed">
              Si existe una cuenta activa asociada a ese correo, recibirás un enlace para restablecer tu contraseña. El enlace tendrá una validez de 15 minutos.
            </p>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full bg-[#1E4E79] hover:bg-[#173C5E] text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
            >
              Volver al inicio de sesión
              <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div role="alert" className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertCircle size={18} className="shrink-0 text-red-600 mt-0.5" />
                <span className="text-xs font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-xs text-[#52606D]">
                Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace para crear una nueva contraseña.
              </p>

              <div className="space-y-1.5">
                <label htmlFor="correo-recuperacion" className="text-xs font-semibold text-[#52606D]">
                  Correo electrónico
                </label>

                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 text-[#52606D]" size={16} />
                  <input
                    id="correo-recuperacion"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    placeholder="ejemplo@correo.com"
                    className="w-full bg-white border border-[#CBD2D9] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[#1F2933] placeholder-[#7B8794] focus:outline-none focus:border-[#1E4E79] focus:ring-2 focus:ring-[#1E4E79]/15 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={cargando}
                className="w-full bg-[#1E4E79] hover:bg-[#173C5E] disabled:opacity-50 text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
              >
                {cargando ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <span>Enviar enlace</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            <button
              type="button"
              onClick={() => window.location.assign("/")}
              className="w-full flex items-center justify-center gap-2 text-xs font-medium text-[#52606D] hover:text-[#1E4E79] transition-colors cursor-pointer"
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
