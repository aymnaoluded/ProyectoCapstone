export const obtenerToken = (): string | null => {
  try {
    return localStorage.getItem("access_token");
  } catch {
    return null;
  }
};
 
export const cabecerasAuth = (
  extra: Record<string, string> = {}
): Record<string, string> => {
  const token = obtenerToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
};
 
export const tokenVigente = (): boolean => {
  const token = obtenerToken();
  if (!token) return false;
 
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return typeof payload.exp === "number" ? payload.exp * 1000 > Date.now() : true;
  } catch {
    return false;
  }
};
 
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";