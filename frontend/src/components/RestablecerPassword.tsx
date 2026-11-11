import React, { useState } from "react";
import { Lock, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { API_URL } from "../utils/api";
import { PantallaAcceso, CampoConIcono, LargoClave } from "./ui/PantallaAcceso";
import { Aviso } from "./ui/Pagina";
import { IndicadorVentanas } from "./ui/Fachada";

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
        throw new Error(typeof data?.detail === "string" ? data.detail : "No se pudo restablecer la contraseña.");
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

  if (completado) {
    return (
      <PantallaAcceso
        ceja="Contraseña actualizada"
        titulo={
          <>
            Todo listo, <em>vuelve a entrar</em>
          </>
        }
        descripcion="Tu contraseña se restableció correctamente. Ya puedes acceder a Comunidad Clara."
        ilustracion={
          <span className="arco grid place-items-center w-11 h-12 bg-exito-suave text-exito mb-5">
            <CheckCircle2 size={22} />
          </span>
        }
      >
        <button type="button" onClick={() => window.location.assign("/")} className="boton boton-primario boton-lg w-full">
          Iniciar sesión
          <ArrowRight size={17} />
        </button>
      </PantallaAcceso>
    );
  }

  return (
    <PantallaAcceso
      ceja="Restablecer contraseña"
      titulo={
        <>
          Elige una <em>nueva contraseña</em>
        </>
      }
      descripcion="Debe tener al menos 8 caracteres. Después podrás entrar con ella de inmediato."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {(error || !token) && (
          <Aviso icono={<AlertCircle size={16} />}>
            {error || "El enlace no contiene un token. Solicita uno nuevo desde el inicio de sesión."}
          </Aviso>
        )}

        <div>
          <CampoConIcono
            id="nueva-password"
            etiqueta="Nueva contraseña"
            icono={Lock}
            conMostrar
            mostrarControlado={mostrar}
            onToggleMostrar={() => setMostrar((v) => !v)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            minLength={8}
            maxLength={256}
            required
          />
          <LargoClave valor={password} />
        </div>

        <CampoConIcono
          id="confirmar-password"
          etiqueta="Confirmar contraseña"
          icono={Lock}
          conMostrar
          mostrarControlado={mostrar}
          onToggleMostrar={() => setMostrar((v) => !v)}
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          placeholder="Repite la contraseña"
          autoComplete="new-password"
          minLength={8}
          maxLength={256}
          required
        />

        <button type="submit" disabled={cargando || !token} className="boton boton-primario boton-lg w-full">
          {cargando ? (
            <>
              <IndicadorVentanas />
              Guardando…
            </>
          ) : (
            <>
              Restablecer contraseña
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <a
        href="/recuperar-password"
        className="mt-6 block text-center text-[0.875rem] font-semibold text-petroleo hover:underline underline-offset-4"
      >
        Solicitar un nuevo enlace
      </a>
    </PantallaAcceso>
  );
};

export default RestablecerPassword;
