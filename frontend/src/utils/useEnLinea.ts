import { useEffect, useState } from "react";

/* Estado real de la conexión del navegador (eventos online/offline) */
export const useEnLinea = (): boolean => {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    const conectar = () => setEnLinea(true);
    const desconectar = () => setEnLinea(false);
    window.addEventListener("online", conectar);
    window.addEventListener("offline", desconectar);
    return () => {
      window.removeEventListener("online", conectar);
      window.removeEventListener("offline", desconectar);
    };
  }, []);

  return enLinea;
};

/* Verdadero mientras la pantalla es de celular (menor que el punto md de Tailwind) */
export const useEsMovil = (): boolean => {
  const consulta = "(max-width: 767.98px)";
  const [esMovil, setEsMovil] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(consulta);
    const alCambiar = () => setEsMovil(mq.matches);
    mq.addEventListener("change", alCambiar);
    return () => mq.removeEventListener("change", alCambiar);
  }, []);

  return esMovil;
};

/* Saludo según la hora local del usuario */
export const saludoSegunHora = (fecha = new Date()): string => {
  const h = fecha.getHours();
  if (h < 6) return "Buenas noches";
  if (h < 13) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
};
