import CryptoJS from "crypto-js";

// Sin VITE_SECRET_KEY (por ejemplo, un clon nuevo sin frontend/.env) CryptoJS fallaba en silencio,
// la sesión no se guardaba y al recargar la página volvía al login. Este cifrado solo ofusca:
// la seguridad real la da el token JWT que valida el backend, por eso basta una clave de respaldo.
const CLAVE_RESPALDO = "supportai-sesion-local";
const SECRET_KEY: string = import.meta.env.VITE_SECRET_KEY || CLAVE_RESPALDO;

if (!import.meta.env.VITE_SECRET_KEY) {
  console.warn("VITE_SECRET_KEY no está definida en frontend/.env: se usa una clave de respaldo para la sesión.");
}

export const guardarSesionSegura = <T>(key: string, data: T): void => {
  try {
    const textoPlano = JSON.stringify(data);
    const ciphertext = CryptoJS.AES.encrypt(textoPlano, SECRET_KEY).toString();
    localStorage.setItem(key, ciphertext);
  } catch (error) {
    console.error("Error al cifrar sesión:", error);
  }
};

export const obtenerSesionSegura = <T>(key: string): T | null => {
  try {
    const ciphertext = localStorage.getItem(key);
    if (!ciphertext) return null;

    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const textoPlano = bytes.toString(CryptoJS.enc.Utf8);
    if (!textoPlano) return null;

    return JSON.parse(textoPlano) as T;
  } catch (error) {
    console.error("Error al descifrar sesión o datos alterados:", error);
    return null;
  }
};

export const eliminarSesionSegura = (key: string): void => {
  localStorage.removeItem(key);
};