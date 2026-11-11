import { useEffect, useMemo, useState } from "react";

/* ─────────────────────────────────────────────────────────────────────
   Elementos de la firma visual "Ventanas encendidas"
   ───────────────────────────────────────────────────────────────────── */

const prefiereMenosMovimiento = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Generador pseudoaleatorio con semilla: la fachada se ve igual en cada carga
const aleatorio = (semilla: number) => () => {
  semilla = (semilla * 9301 + 49297) % 233280;
  return semilla / 233280;
};

/* Ícono de la marca: edificio con remate en arco y dos ventanas encendidas */
export const MarcaIcono = ({ size = 36, className = "" }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    aria-hidden="true"
    className={className}
  >
    <rect width="64" height="64" rx="16" fill="#0E2624" />
    <path d="M17 54V29a15 15 0 0 1 30 0v25z" fill="#1A403D" stroke="#63A69B" strokeWidth="2.5" strokeLinejoin="round" />
    <rect x="23" y="25" width="7" height="7" rx="1.5" fill="#DCEFEA" fillOpacity=".22" />
    <rect x="34" y="25" width="7" height="7" rx="1.5" fill="#F2B441" />
    <rect x="23" y="35" width="7" height="7" rx="1.5" fill="#F2B441" />
    <rect x="34" y="35" width="7" height="7" rx="1.5" fill="#DCEFEA" fillOpacity=".22" />
    <rect x="28.5" y="45" width="7" height="9" rx="1.5" fill="#DCEFEA" fillOpacity=".55" />
  </svg>
);

/* Marca completa: ícono + nombre en tipografía editorial */
export const Marca = ({
  tono = "noche",
  compacta = false,
  className = "",
}: {
  tono?: "noche" | "papel";
  compacta?: boolean;
  className?: string;
}) => (
  <div className={`flex items-center gap-3 min-w-0 ${className}`}>
    <MarcaIcono size={compacta ? 36 : 40} className="shrink-0 drop-shadow-[0_6px_14px_rgba(14,38,36,0.35)]" />
    {!compacta && (
      <div className="min-w-0 leading-none">
        <p className={`titular text-[1.2rem] truncate ${tono === "noche" ? "text-white" : "text-tinta"}`}>
          Comunidad <em>Clara</em>
        </p>
        <p className={`ceja mt-1.5 !tracking-[0.2em] !text-[0.625rem] ${tono === "noche" ? "!text-menta/60" : ""}`}>
          Administraciones
        </p>
      </div>
    )}
  </div>
);

/* Fachada: cuadrícula de ventanas que se encienden y apagan lentamente */
export const Fachada = ({
  columnas = 6,
  filas = 8,
  proporcion = 0.32,
  animada = true,
  tono = "noche",
  semilla = 7,
  intervalo = 1400,
  className = "",
  tamanoVentana = "1fr",
  separacion = "0.55rem",
}: {
  columnas?: number;
  filas?: number;
  proporcion?: number;
  animada?: boolean;
  tono?: "noche" | "papel";
  semilla?: number;
  intervalo?: number;
  className?: string;
  tamanoVentana?: string;
  separacion?: string;
}) => {
  const total = columnas * filas;
  const inicial = useMemo(() => {
    const azar = aleatorio(semilla);
    return Array.from({ length: total }, () => azar() < proporcion);
  }, [total, proporcion, semilla]);

  const [encendidas, setEncendidas] = useState<boolean[]>(inicial);

  // Si cambian las props (por ejemplo, al calificar se encienden todas), se reinicia durante el render
  const [inicialPrevio, setInicialPrevio] = useState(inicial);
  if (inicialPrevio !== inicial) {
    setInicialPrevio(inicial);
    setEncendidas(inicial);
  }

  useEffect(() => {
    if (!animada || prefiereMenosMovimiento()) return;
    const azar = aleatorio(semilla + 13);
    const id = window.setInterval(() => {
      setEncendidas((prev) => {
        const siguiente = [...prev];
        const i = Math.floor(azar() * total);
        siguiente[i] = !siguiente[i];
        return siguiente;
      });
    }, intervalo);
    return () => window.clearInterval(id);
  }, [inicial, animada, intervalo, semilla, total]);

  return (
    <div
      aria-hidden="true"
      className={`grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(${columnas}, ${tamanoVentana})`,
        gap: separacion,
      }}
    >
      {encendidas.map((on, i) => (
        <span
          key={i}
          className={`ventana aspect-[3/4] ${tono === "papel" ? "ventana-clara" : ""} ${on ? "ventana-encendida" : ""}`}
        />
      ))}
    </div>
  );
};

/* Indicador de "el asistente está trabajando": tres ventanas en secuencia */
export const IndicadorVentanas = ({ className = "" }: { className?: string }) => (
  <span className={`inline-flex items-end gap-[3px] ${className}`} aria-hidden="true">
    <span className="ventana ventana-clara ventana-latido w-[7px] h-[9px]" />
    <span className="ventana ventana-clara ventana-latido w-[7px] h-[9px]" />
    <span className="ventana ventana-clara ventana-latido w-[7px] h-[9px]" />
  </span>
);

/* Medidor de confianza de una respuesta: 3, 2 o 1 ventanas encendidas */
export const MedidorConfianza = ({
  nivel,
  className = "",
}: {
  nivel?: "ALTA" | "MEDIA" | "BAJA";
  className?: string;
}) => {
  const encendidas = nivel === "ALTA" ? 3 : nivel === "MEDIA" ? 2 : 1;
  return (
    <span className={`inline-flex items-end gap-[3px] ${className}`} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`ventana w-[6px] ${["h-[7px]", "h-[9px]", "h-[11px]"][i]} ${
            i < encendidas ? "ventana-encendida" : "ventana-clara"
          }`}
        />
      ))}
    </span>
  );
};

/* Skyline nocturno: edificios con remate en arco y ventanas que se encienden */
const EDIFICIOS = [
  { columnas: 3, filas: 6, semilla: 4, alto: "h-[62%]" },
  { columnas: 4, filas: 10, semilla: 9, alto: "h-full" },
  { columnas: 3, filas: 8, semilla: 21, alto: "h-[80%]" },
  { columnas: 2, filas: 5, semilla: 33, alto: "h-[48%]" },
];

export const Skyline = ({ className = "", ventana = "14px" }: { className?: string; ventana?: string }) => (
  <div aria-hidden="true" className={`flex items-end gap-3 xl:gap-4 ${className}`}>
    {EDIFICIOS.map((e, i) => (
      <div
        key={i}
        className={`arco ${e.alto} bg-noche-2 border border-white/[0.07] px-3 pt-8 flex flex-col overflow-hidden shadow-[0_-20px_60px_-30px_rgba(242,180,65,0.25)]`}
      >
        <Fachada
          columnas={e.columnas}
          filas={e.filas}
          proporcion={0.3}
          semilla={e.semilla}
          tamanoVentana={ventana}
          separacion="9px"
          intervalo={1100 + i * 350}
        />
      </div>
    ))}
  </div>
);

/* Avatar del asistente: arco con una ventana encendida */
export const AvatarAsistente = ({ size = 34, activo = false }: { size?: number; activo?: boolean }) => (
  <span
    aria-hidden="true"
    className="arco shrink-0 grid place-items-center bg-noche border border-noche-3 shadow-[0_6px_14px_-6px_rgba(14,38,36,0.6)]"
    style={{ width: size, height: size * 1.12 }}
  >
    <span className="grid grid-cols-2 gap-[3px] mt-1">
      <span className={`ventana w-[6px] h-[7px] ${activo ? "ventana-latido" : ""}`} />
      <span className="ventana ventana-encendida w-[6px] h-[7px]" />
      <span className="ventana ventana-encendida w-[6px] h-[7px]" />
      <span className={`ventana w-[6px] h-[7px] ${activo ? "ventana-latido" : ""}`} />
    </span>
  </span>
);
