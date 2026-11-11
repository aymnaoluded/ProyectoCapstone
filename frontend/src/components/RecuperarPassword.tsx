import React, { useState } from "react";
import { Mail, ArrowRight, ArrowLeft, AlertCircle, MailCheck } from "lucide-react";
import { API_URL } from "../utils/api";
import { PantallaAcceso, CampoConIcono } from "./ui/PantallaAcceso";
import { Aviso } from "./ui/Pagina";
import { IndicadorVentanas } from "./ui/Fachada";

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
        throw new Error(typeof data?.detail === "string" ? data.detail : "No se pudo procesar la solicitud.");
      }

      setEnviado(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  if (enviado) {
    return (
      <PantallaAcceso
        ceja="Revisa tu bandeja"
        titulo={
          <>
            Te enviamos un <em>enlace</em>
          </>
        }
        descripcion={
          <>
            Si existe una cuenta activa asociada a <strong className="text-tinta">{correo.trim().toLowerCase()}</strong>,
            recibirás un enlace para restablecer tu contraseña. El enlace tendrá una validez de 15 minutos.
          </>
        }
        ilustracion={
          <span className="arco grid place-items-center w-11 h-12 bg-menta text-petroleo-hover mb-5">
            <MailCheck size={21} />
          </span>
        }
      >
        <button type="button" onClick={() => window.location.assign("/")} className="boton boton-primario boton-lg w-full">
          Volver al inicio de sesión
          <ArrowRight size={17} />
        </button>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      ceja="Recuperar acceso"
      titulo={
        <>
          ¿Olvidaste tu <em>contraseña?</em>
        </>
      }
      descripcion="Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace para crear una nueva."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <Aviso icono={<AlertCircle size={16} />}>{error}</Aviso>}

        <CampoConIcono
          id="correo-recuperacion"
          etiqueta="Correo electrónico"
          icono={Mail}
          tipo="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
          maxLength={254}
          autoComplete="email"
          placeholder="nombre@correo.com"
        />

        <button type="submit" disabled={cargando} className="boton boton-primario boton-lg w-full">
          {cargando ? (
            <>
              <IndicadorVentanas />
              Enviando…
            </>
          ) : (
            <>
              Enviar enlace
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <a
        href="/"
        className="mt-6 flex items-center justify-center gap-2 text-[0.875rem] font-semibold text-tinta-2 hover:text-petroleo transition-colors"
      >
        <ArrowLeft size={16} />
        Volver al inicio de sesión
      </a>
    </PantallaAcceso>
  );
};

export default RecuperarPassword;
