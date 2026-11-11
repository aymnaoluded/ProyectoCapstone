import React, { useState } from "react";
import { Lock, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";

import { API_URL, obtenerToken } from "../utils/api";
import { CampoConIcono, LargoClave } from "./ui/PantallaAcceso";
import { Aviso } from "./ui/Pagina";
import { IndicadorVentanas } from "./ui/Fachada";

interface CambiarPasswordProps {
  onPasswordCambiada: () => void;
}

const CambiarPassword: React.FC<CambiarPasswordProps> = ({ onPasswordCambiada }) => {
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
        throw new Error(typeof data?.detail === "string" ? data.detail : "No se pudo cambiar la contraseña.");
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

  const toggle = () => setMostrarPassword((v) => !v);

  return (
    <div className="flex-1 min-h-0 w-full overflow-y-auto barra-fina">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid lg:grid-cols-[1fr_27rem] gap-10 items-start">
        {/* Explicación */}
        <div className="animate-aparecer">
          <p className="ceja">Tu perfil</p>
          <h1 className="titular text-[2rem] sm:text-[2.6rem] mt-2.5">
            Seguridad de <em>tu cuenta</em>
          </h1>
          <p className="text-[0.9375rem] text-tinta-2 mt-3 max-w-md leading-relaxed">
            Cambia tu contraseña cuando quieras. Por seguridad, al guardarla se cerrará tu sesión y tendrás que volver a
            ingresar con la nueva.
          </p>
          <ul className="mt-7 space-y-3 max-w-md">
            {["Usa al menos 8 caracteres.", "Debe ser distinta de la actual.", "No la compartas con nadie, ni siquiera con la administración."].map(
              (t, i) => (
                <li key={t} className="flex items-baseline gap-3 text-[0.9rem] text-tinta">
                  <span className="numeral text-petroleo w-5">{String(i + 1).padStart(2, "0")}</span>
                  {t}
                </li>
              )
            )}
          </ul>
        </div>

        {/* Formulario */}
        <div className="superficie p-6 sm:p-8 animate-aparecer" style={{ animationDelay: "0.08s" }}>
          {exito ? (
            <div className="text-center py-4" role="status">
              <span className="arco grid place-items-center w-11 h-12 bg-exito-suave text-exito mx-auto">
                <CheckCircle2 size={22} />
              </span>
              <h2 className="titular text-[1.5rem] mt-4">Contraseña actualizada</h2>
              <p className="text-sm text-tinta-2 mt-2 leading-relaxed">
                Se cambió correctamente. Por seguridad, debes iniciar sesión nuevamente.
              </p>
              <button type="button" onClick={onPasswordCambiada} className="boton boton-primario boton-lg w-full mt-6">
                Iniciar sesión
                <ArrowRight size={17} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex items-center gap-3 pb-1">
                <span className="arco grid place-items-center w-9 h-10 bg-menta text-petroleo-hover">
                  <KeyRound size={17} />
                </span>
                <h2 className="text-[1rem] font-semibold">Cambiar contraseña</h2>
              </div>

              {error && <Aviso icono={<AlertCircle size={16} />}>{error}</Aviso>}

              <CampoConIcono
                id="password-actual"
                etiqueta="Contraseña actual"
                icono={Lock}
                conMostrar
                mostrarControlado={mostrarPassword}
                onToggleMostrar={toggle}
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                autoComplete="current-password"
                required
                maxLength={256}
                placeholder="••••••••"
              />

              <div>
                <CampoConIcono
                  id="password-nueva"
                  etiqueta="Nueva contraseña"
                  icono={Lock}
                  conMostrar
                  mostrarControlado={mostrarPassword}
                  onToggleMostrar={toggle}
                  value={nueva}
                  onChange={(e) => setNueva(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={256}
                  placeholder="Mínimo 8 caracteres"
                />
                <LargoClave valor={nueva} />
              </div>

              <CampoConIcono
                id="password-confirmar"
                etiqueta="Confirmar nueva contraseña"
                icono={Lock}
                conMostrar
                mostrarControlado={mostrarPassword}
                onToggleMostrar={toggle}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={256}
                placeholder="Repite tu contraseña"
              />

              <button type="submit" disabled={cargando} className="boton boton-primario boton-lg w-full">
                {cargando ? (
                  <>
                    <IndicadorVentanas />
                    Guardando…
                  </>
                ) : (
                  <>
                    Guardar nueva contraseña
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default CambiarPassword;
