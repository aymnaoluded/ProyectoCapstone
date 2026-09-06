import CryptoJS from "crypto-js";

const SECRET_KEY = "SupportAI_SecureSessionKey_2026";

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