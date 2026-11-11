import React, { useEffect, useState } from "react";
import {
  MessagesSquare,
  Gauge,
  Star,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Send,
  CircleAlert,
} from "lucide-react";
import { cabecerasAuth, API_URL } from "../utils/api";
import { EncabezadoPagina, BotonRecargar, Kpi, InsigniaEstado, Aviso } from "./ui/Pagina";
import { EsqueletoTarjetas } from "./ui/Skeleton";
import { IndicadorVentanas } from "./ui/Fachada";

interface TicketEstadoItem {
  estado: string;
  cantidad: number;
}

interface MetricasData {
  resumen?: {
    total_conversaciones: number;
    tasa_escalamiento: number;
    promedio_satisfaccion: number;
    total_evaluaciones: number;
    documentos_activos: number;
    fragmentos_indexados: number;
  };
  rag?: {
    total_respuestas: number;
    confianza_promedio: number;
    alta_confianza: number;
    media_confianza: number;
    baja_confianza: number;
  };
  tickets?: {
    total_tickets: number;
    por_estado: Record<string, number>;
  };
  tickets_estado?: TicketEstadoItem[];
}

interface EstadoGmail {
  exito: boolean;
  simulado: boolean;
  mensaje: string;
  detalles: {
    remitente?: string;
    client_id_enmascarado?: string;
    refresh_token_presente?: boolean;
  };
}

export const MetricasSistema: React.FC = () => {
  const [metricas, setMetricas] = useState<MetricasData | null>(null);
  const [cargando, setCargando] = useState(true);

  // Diagnóstico y prueba de Gmail API
  const [estadoGmail, setEstadoGmail] = useState<EstadoGmail | null>(null);
  const [cargandoGmail, setCargandoGmail] = useState(false);
  // El backend actual no expone el diagnóstico (responde 404): se informa en vez de simular que funciona
  const [gmailNoDisponible, setGmailNoDisponible] = useState(false);
  const [destinatarioPrueba, setDestinatarioPrueba] = useState("");
  const [enviandoPrueba, setEnviandoPrueba] = useState(false);
  const [resultadoPrueba, setResultadoPrueba] = useState<{ exito: boolean; mensaje: string } | null>(null);

  const cargarMetricas = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/metricas`, {
        headers: cabecerasAuth(),
      });
      if (res.ok) {
        const data = await res.json();
        setMetricas(data);
      }
    } catch (err) {
      console.error("Error al cargar métricas:", err);
    } finally {
      setCargando(false);
    }
  };

  const consultarEstadoGmail = async () => {
    setCargandoGmail(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/diagnostico/gmail`, {
        headers: cabecerasAuth(),
      });
      setGmailNoDisponible(res.status === 404);
      if (res.ok) {
        const data = await res.json();
        setEstadoGmail(data);
      }
    } catch (err) {
      console.error("Error al consultar estado de Gmail:", err);
    } finally {
      setCargandoGmail(false);
    }
  };

  const handleProbarGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinatarioPrueba.trim()) return;

    setEnviandoPrueba(true);
    setResultadoPrueba(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/diagnostico/probar-envio`, {
        method: "POST",
        headers: cabecerasAuth({ "Content-Type": "application/json" }),
        body: JSON.stringify({ destinatario: destinatarioPrueba.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.exito) {
        setResultadoPrueba({
          exito: true,
          mensaje: data.mensaje || "Correo de prueba enviado con éxito.",
        });
      } else {
        setResultadoPrueba({
          exito: false,
          mensaje: (typeof data.detail === "string" ? data.detail : "") || data.mensaje || "Falló el envío de prueba.",
        });
      }
    } catch {
      setResultadoPrueba({
        exito: false,
        mensaje: "Error de conexión al intentar enviar el correo.",
      });
    } finally {
      setEnviandoPrueba(false);
    }
  };

  useEffect(() => {
    cargarMetricas();
    consultarEstadoGmail();
  }, []);

  const totalRespuestasRAG = metricas?.rag?.total_respuestas || 0;
  const pct = (n?: number) => (totalRespuestasRAG > 0 ? Math.round(((n || 0) / totalRespuestasRAG) * 100) : 0);
  const pctAlta = pct(metricas?.rag?.alta_confianza);
  const pctMedia = pct(metricas?.rag?.media_confianza);
  const pctBaja = pct(metricas?.rag?.baja_confianza);

  // Soporta tanto metricas.tickets.por_estado como metricas.tickets_estado
  const ticketsPorEstado: Record<string, number> =
    metricas?.tickets?.por_estado ||
    (metricas?.tickets_estado
      ? Object.fromEntries(metricas.tickets_estado.map((item) => [item.estado, item.cantidad]))
      : {});

  const totalTickets =
    metricas?.tickets?.total_tickets ??
    (metricas?.tickets_estado
      ? metricas.tickets_estado.reduce((acc, curr) => acc + (curr.cantidad || 0), 0)
      : Object.values(ticketsPorEstado).reduce((acc, curr) => acc + curr, 0));

  const ordenEstados = ["Pendiente", "En Proceso", "En Espera", "Resuelto", "Cerrado"];
  const ticketsArray = ordenEstados
    .filter((estado) => ticketsPorEstado[estado] !== undefined)
    .map((estado) => ({
      estado,
      cantidad: ticketsPorEstado[estado],
    }));
  const maxTickets = Math.max(1, ...ticketsArray.map((t) => t.cantidad));

  const segmentos = [
    {
      clave: "alta",
      etiqueta: "Confianza alta",
      rango: "80% o más",
      cantidad: metricas?.rag?.alta_confianza || 0,
      pct: pctAlta,
      color: "bg-grafico-alta",
      icono: <CheckCircle2 size={15} className="text-grafico-alta" />,
    },
    {
      clave: "media",
      etiqueta: "Confianza parcial",
      rango: "60% a 79%",
      cantidad: metricas?.rag?.media_confianza || 0,
      pct: pctMedia,
      color: "bg-grafico-media",
      icono: <AlertTriangle size={15} className="text-grafico-media" />,
    },
    {
      clave: "baja",
      etiqueta: "Confianza baja o escalada",
      rango: "menos de 60%",
      cantidad: metricas?.rag?.baja_confianza || 0,
      pct: pctBaja,
      color: "bg-grafico-baja",
      icono: <CircleAlert size={15} className="text-grafico-baja" />,
    },
  ];

  const cargaInicial = cargando && !metricas;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 space-y-7">
        <EncabezadoPagina
          ceja="Analítica"
          titulo={
            <>
              Métricas del <em>sistema</em>
            </>
          }
          descripcion="Cuánto se usa Luz, qué tan seguras son sus respuestas y cómo avanza la atención humana."
          acciones={<BotonRecargar onClick={cargarMetricas} cargando={cargando} />}
        />

        {/* Indicadores principales */}
        {cargaInicial ? (
          <EsqueletoTarjetas cantidad={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 escalonado">
            <Kpi
              etiqueta="Conversaciones"
              valor={metricas?.resumen?.total_conversaciones || 0}
              detalle={`${metricas?.resumen?.tasa_escalamiento ?? 0}% requirió atención humana`}
              icono={<MessagesSquare size={16} />}
            />
            <Kpi
              etiqueta="Confianza"
              valor={`${Math.round((metricas?.rag?.confianza_promedio || 0) * 100)}%`}
              detalle="Similitud promedio de las respuestas con los documentos"
              icono={<Gauge size={16} />}
              tono="exito"
            />
            <Kpi
              etiqueta="Satisfacción"
              valor={
                <span className="flex items-baseline gap-1.5">
                  {metricas?.resumen?.promedio_satisfaccion ?? 0}
                  <span className="text-[1rem] text-tinta-3">/ 5</span>
                </span>
              }
              detalle={`Según ${metricas?.resumen?.total_evaluaciones || 0} evaluaciones`}
              icono={<Star size={16} />}
              tono="luz"
            />
            <Kpi
              etiqueta="Indexación"
              valor={metricas?.resumen?.fragmentos_indexados || 0}
              detalle={`Fragmentos en ${metricas?.resumen?.documentos_activos || 0} documentos activos`}
              icono={<Layers size={16} />}
              tono="noche"
            />
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-4 sm:gap-5">
          {/* Precisión de respuestas: barra apilada parte-del-todo */}
          <section className="superficie p-5 sm:p-6" aria-labelledby="titulo-precision">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titulo-precision" className="titular text-[1.3rem]">
                Precisión de las respuestas
              </h2>
              <span className="text-[0.8125rem] text-tinta-2 tabular-nums">{totalRespuestasRAG} respuestas</span>
            </div>
            <p className="text-[0.8125rem] text-tinta-2 mt-1">Según la similitud con los documentos oficiales.</p>

            <div
              className="mt-5 flex h-3 w-full gap-[2px] rounded-full overflow-hidden bg-papel-2"
              role="img"
              aria-label={`Confianza alta ${pctAlta}%, parcial ${pctMedia}%, baja ${pctBaja}%`}
            >
              {segmentos
                .filter((s) => s.pct > 0)
                .map((s) => (
                  <span
                    key={s.clave}
                    title={`${s.etiqueta}: ${s.cantidad} (${s.pct}%)`}
                    className={`${s.color} h-full transition-[width] duration-700 ease-curva hover:brightness-110`}
                    style={{ width: `${s.pct}%` }}
                  />
                ))}
            </div>

            <table className="w-full mt-5 text-[0.875rem]">
              <caption className="sr-only">Distribución de respuestas por nivel de confianza</caption>
              <tbody>
                {segmentos.map((s) => (
                  <tr key={s.clave} className="border-t border-linea first:border-t-0">
                    <th scope="row" className="py-2.5 text-left font-medium text-tinta">
                      <span className="flex items-center gap-2.5">
                        <span className={`w-2.5 h-2.5 rounded-[3px] ${s.color}`} aria-hidden="true" />
                        {s.icono}
                        <span>
                          {s.etiqueta} <span className="text-tinta-3 font-normal">· {s.rango}</span>
                        </span>
                      </span>
                    </th>
                    <td className="py-2.5 text-right tabular-nums text-tinta font-semibold w-14">{s.cantidad}</td>
                    <td className="py-2.5 text-right tabular-nums text-tinta-2 w-14">{s.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Tickets por estado: barras horizontales de un solo tono */}
          <section className="superficie p-5 sm:p-6" aria-labelledby="titulo-tickets">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="titulo-tickets" className="titular text-[1.3rem]">
                Tickets por estado
              </h2>
              <span className="text-[0.8125rem] text-tinta-2 tabular-nums">{totalTickets} en total</span>
            </div>
            <p className="text-[0.8125rem] text-tinta-2 mt-1">Casos derivados a la atención humana.</p>

            {ticketsArray.length === 0 ? (
              <p className="text-sm text-tinta-2 py-10 text-center">No hay tickets registrados aún.</p>
            ) : (
              <ul className="mt-5 space-y-3.5">
                {ticketsArray.map((item) => {
                  const porcentaje = totalTickets > 0 ? Math.round((item.cantidad / totalTickets) * 100) : 0;
                  return (
                    <li key={item.estado} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-3" title={`${item.estado}: ${item.cantidad} (${porcentaje}%)`}>
                      <InsigniaEstado estado={item.estado} className="justify-self-start" />
                      <span className="h-2.5 rounded-full bg-papel-2 overflow-hidden" aria-hidden="true">
                        <span
                          className="block h-full rounded-full bg-petroleo transition-[width] duration-700 ease-curva"
                          style={{ width: `${(item.cantidad / maxTickets) * 100}%` }}
                        />
                      </span>
                      <span className="text-[0.875rem] tabular-nums text-right w-20">
                        <span className="font-semibold text-tinta">{item.cantidad}</span>
                        <span className="text-tinta-2"> · {porcentaje}%</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Diagnóstico de Gmail API (OAuth 2.0) */}
        <section className="superficie p-5 sm:p-6" aria-labelledby="titulo-gmail">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <span className="arco grid place-items-center w-9 h-10 bg-menta text-petroleo-hover shrink-0">
                <Mail size={17} />
              </span>
              <div>
                <h2 id="titulo-gmail" className="titular text-[1.3rem]">
                  Correo de la plataforma
                </h2>
                <p className="text-[0.8125rem] text-tinta-2 mt-0.5">
                  Integración Gmail API (OAuth 2.0) para invitaciones, avisos y recuperación de contraseñas.
                </p>
              </div>
            </div>
            <BotonRecargar onClick={consultarEstadoGmail} cargando={cargandoGmail} soloIcono etiqueta="Refrescar estado de Gmail" />
          </div>

          {gmailNoDisponible ? (
            <div className="mt-5">
              <Aviso tono="luz" icono={<AlertTriangle size={16} />}>
                El servidor no tiene habilitado el diagnóstico de correo (las rutas <code className="font-mono">/api/admin/diagnostico</code> no
                existen en el backend actual), así que no se puede consultar el estado ni enviar una prueba desde aquí.
              </Aviso>
            </div>
          ) : (
          <div className="grid md:grid-cols-2 gap-5 mt-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-papel/70 border border-linea px-4 py-3">
                <span className="text-[0.8125rem] font-semibold text-tinta-2">Estado</span>
                {estadoGmail?.simulado ? (
                  <span className="insignia insignia-pendiente">Modo simulación (desarrollo)</span>
                ) : estadoGmail?.exito ? (
                  <span className="insignia insignia-resuelto">Conexión OAuth 2.0 activa</span>
                ) : (
                  <span className="insignia insignia-cerrado">{cargandoGmail ? "Consultando…" : "Sin datos"}</span>
                )}
              </div>

              <dl className="text-[0.875rem] divide-y divide-linea">
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-tinta-2">Remitente</dt>
                  <dd className="font-semibold text-tinta text-right [overflow-wrap:anywhere]">
                    {estadoGmail?.detalles?.remitente || "Sin configurar"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-tinta-2">Client ID</dt>
                  <dd className="font-mono text-[0.8125rem] text-tinta-2 text-right [overflow-wrap:anywhere]">
                    {estadoGmail?.detalles?.client_id_enmascarado || "No configurado"}
                  </dd>
                </div>
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-tinta-2">Refresh token</dt>
                  <dd className="font-semibold text-right">
                    {estadoGmail?.detalles?.refresh_token_presente ? (
                      <span className="text-exito">Configurado</span>
                    ) : (
                      <span className="text-luz-tinta">No detectado</span>
                    )}
                  </dd>
                </div>
              </dl>

              {estadoGmail?.simulado && (
                <Aviso tono="luz">
                  Para enviar correos reales, configura las credenciales de Gmail OAuth 2.0 en{" "}
                  <code className="font-mono bg-superficie/70 px-1 rounded">backend/.env</code>.
                </Aviso>
              )}
            </div>

            <div className="rounded-2xl bg-papel/70 border border-linea p-5 flex flex-col gap-3">
              <div>
                <h3 className="text-[0.9375rem] font-semibold text-tinta flex items-center gap-2">
                  <Send size={15} className="text-petroleo" />
                  Enviar un correo de prueba
                </h3>
                <p className="text-[0.8125rem] text-tinta-2 mt-1 leading-relaxed">
                  Comprueba que los correos salen y llegan sin dejar la plataforma.
                </p>
              </div>

              {resultadoPrueba && (
                <Aviso
                  tono={resultadoPrueba.exito ? "exito" : "error"}
                  icono={resultadoPrueba.exito ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                >
                  {resultadoPrueba.mensaje}
                </Aviso>
              )}

              <form onSubmit={handleProbarGmail} className="space-y-2.5 mt-auto">
                <label htmlFor="correo-prueba" className="sr-only">
                  Correo de destino
                </label>
                <input
                  id="correo-prueba"
                  type="email"
                  required
                  placeholder="destinatario@correo.com"
                  value={destinatarioPrueba}
                  onChange={(e) => setDestinatarioPrueba(e.target.value)}
                  disabled={enviandoPrueba}
                  className="campo"
                />
                <button
                  type="submit"
                  disabled={enviandoPrueba || !destinatarioPrueba.trim()}
                  className="boton boton-primario w-full"
                >
                  {enviandoPrueba ? (
                    <>
                      <IndicadorVentanas />
                      Enviando correo de prueba…
                    </>
                  ) : (
                    <>
                      <Send size={15} />
                      Enviar correo de verificación
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          )}
        </section>
      </div>
    </div>
  );
};
