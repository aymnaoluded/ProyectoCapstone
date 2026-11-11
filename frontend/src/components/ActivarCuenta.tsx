import React, { useState } from "react";
import { Lock, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { API_URL } from "../utils/api";
import { PantallaAcceso, CampoConIcono, LargoClave } from "./ui/PantallaAcceso";
import { Aviso } from "./ui/Pagina";
import { IndicadorVentanas } from "./ui/Fachada";

const ActivarCuenta: React.FC = () => {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [mostrar, setMostrar] = useState(false);
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

  if (activada) {
    return (
      <PantallaAcceso
        ceja="Cuenta activada"
        titulo={
          <>
            Ya eres parte de <em>Comunidad Clara</em>
          </>
        }
        descripcion="Tu contraseña quedó configurada. Ya puedes ingresar a la plataforma."
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
      ceja="Activación de cuenta"
      titulo={
        <>
          Crea tu <em>contraseña</em>
        </>
      }
      descripcion="Es el último paso para activar tu cuenta y empezar a usar la plataforma."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {(error || !token) && (
          <Aviso icono={<AlertCircle size={16} />}>
            {error || "El enlace de activación no contiene un token. Abre el enlace que recibiste en tu correo."}
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
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            required
            minLength={8}
            maxLength={256}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
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
          value={confirmarPassword}
          onChange={(e) => {
            setConfirmarPassword(e.target.value);
            if (error) setError(null);
          }}
          required
          minLength={8}
          maxLength={256}
          autoComplete="new-password"
          placeholder="Repite la contraseña"
        />

        <button type="submit" disabled={cargando || !token} className="boton boton-primario boton-lg w-full">
          {cargando ? (
            <>
              <IndicadorVentanas />
              Activando…
            </>
          ) : (
            <>
              Activar cuenta
              <ArrowRight size={17} />
            </>
          )}
        </button>
      </form>

      <div className="mt-7 pt-5 border-t border-linea flex items-center justify-between gap-3 text-[0.8125rem]">
        <span className="flex items-center gap-1.5 text-tinta-2">
          <ShieldCheck size={15} className="text-exito" /> Activación segura
        </span>
        <a href="/" className="font-semibold text-petroleo hover:underline underline-offset-4">
          Volver al inicio
        </a>
      </div>
    </PantallaAcceso>
  );
};

export default ActivarCuenta;
