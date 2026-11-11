import React, { useState } from "react";
import { Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from "lucide-react";
import type { Usuario } from "../types";
import { guardarSesionSegura } from "../utils/storage";
import { API_URL } from "../utils/api";
import { Marca, Skyline, IndicadorVentanas } from "./ui/Fachada";
import { Aviso } from "./ui/Pagina";

interface LoginProps {
  onLoginSuccess: (user: Usuario) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [verPassword, setVerPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "No se pudo iniciar sesión. Verifica tus credenciales.");
      }
      const data = await res.json();
      if (!data.usuario) throw new Error("Respuesta inválida del servidor.");
      if (data.access_token) localStorage.setItem("access_token", data.access_token);
      guardarSesionSegura("user_session", data.usuario as Usuario);
      onLoginSuccess(data.usuario as Usuario);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  };

  const rellenar = (c: string) => {
    setCorreo(c);
    setPassword("Hola1234");
    setError(null);
  };

  return (
    <div className="min-h-dvh w-full flex bg-papel font-sans">
      {/* ── Panel nocturno (escritorio) ───────────────────────── */}
      <section className="zona-noche hidden lg:flex lg:w-[50%] xl:w-[54%] relative flex-col overflow-hidden bg-noche px-10 xl:px-14 pt-10 xl:pt-12">
        <div aria-hidden="true" className="pointer-events-none absolute -top-40 -left-24 w-[34rem] h-[34rem] rounded-full bg-turquesa/10 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-0 w-[30rem] h-[22rem] rounded-full bg-luz/10 blur-3xl" />

        <Marca tono="noche" className="relative" />

        <div className="relative mt-14 xl:mt-20 max-w-xl escalonado">
          <p className="ceja !text-menta/55">Administración de condominios</p>
          <h2 className="titular text-white text-[2.6rem] xl:text-[3.4rem] mt-4">
            Una comunidad mejor comienza con una <em>buena comunicación.</em>
          </h2>
          <p className="text-menta/70 text-[0.975rem] leading-relaxed mt-5 max-w-md">
            Gestión de condominios con Luz, nuestra asistente con IA, seguimiento de solicitudes y comunicación directa con la administración.
          </p>
          <ol className="mt-8 space-y-3">
            {[
              "Luz, tu asistente, disponible las 24 horas",
              "Solicitudes con seguimiento de principio a fin",
              "Comunicación directa con la administración",
            ].map((texto, i) => (
              <li key={texto} className="flex items-baseline gap-4 text-[0.9375rem] text-white/85">
                <span className="numeral text-luz text-[1.05rem] w-6">{String(i + 1).padStart(2, "0")}</span>
                {texto}
              </li>
            ))}
          </ol>
        </div>

        {/* Edificios: cada ventana encendida es un vecino atendido */}
        <div className="relative flex-1 min-h-[9rem] mt-10">
          <Skyline className="absolute bottom-0 right-0 h-[min(100%,25rem)]" />
          <p className="absolute bottom-6 left-0 text-[0.75rem] text-menta/40">
            © 2026 Comunidad Clara Administraciones Ltda.
          </p>
        </div>
      </section>

      {/* ── Formulario ────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col min-w-0">
        {/* Banda nocturna en celular y tablet */}
        <div className="zona-noche lg:hidden relative overflow-hidden bg-noche px-5 sm:px-8 pt-6 pb-0">
          <Marca tono="noche" />
          <div className="mt-6 h-28 relative">
            <Skyline className="absolute bottom-0 left-0 right-0 h-full justify-end" />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-5 sm:px-10 py-10">
          <div className="w-full max-w-[25rem] animate-aparecer">
            <p className="ceja">Portal de residentes y equipo</p>
            <h1 className="titular text-[2.25rem] sm:text-[2.6rem] mt-3">
              Bienvenido <em>de vuelta</em>
            </h1>
            <p className="text-tinta-2 text-[0.9375rem] mt-2.5">Ingresa con tu correo para acceder a la plataforma.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
              {error && <Aviso icono={<AlertCircle size={16} />}>{error}</Aviso>}

              <div>
                <label htmlFor="login-correo" className="etiqueta">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" size={17} />
                  <input
                    id="login-correo"
                    type="email"
                    value={correo}
                    onChange={(e) => {
                      setCorreo(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    autoComplete="email"
                    placeholder="nombre@correo.com"
                    className="campo !pl-11 !min-h-[3rem]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="login-password" className="etiqueta">
                    Contraseña
                  </label>
                  <a href="/recuperar-password" className="text-[0.8125rem] font-semibold text-petroleo hover:text-petroleo-hover hover:underline underline-offset-4">
                    ¿La olvidaste?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" size={17} />
                  <input
                    id="login-password"
                    type={verPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="campo !pl-11 !pr-12 !min-h-[3rem]"
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={verPassword}
                    className="boton-icono !w-9 !h-9 absolute right-1.5 top-1/2 -translate-y-1/2"
                  >
                    {verPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={cargando} className="boton boton-primario boton-lg w-full !mt-7">
                {cargando ? (
                  <>
                    <IndicadorVentanas />
                    <span>Entrando…</span>
                  </>
                ) : (
                  <>
                    <span>Entrar a la plataforma</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            {/* Accesos de demostración (entorno de pruebas) */}
            <div className="mt-9 pt-6 border-t border-linea">
              <p className="ceja text-center">Accesos de demostración</p>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {[
                  { label: "Residente", correo: "nraguileo@gmail.com" },
                  { label: "Ejecutivo", correo: "bvega@gmail.com" },
                  { label: "Administrador", correo: "mirarrazabal@gmail.com" },
                ].map((d) => (
                  <button
                    key={d.correo}
                    type="button"
                    onClick={() => rellenar(d.correo)}
                    aria-pressed={correo === d.correo}
                    className={`boton boton-sm !px-2 ${correo === d.correo ? "boton-primario" : "boton-secundario"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
