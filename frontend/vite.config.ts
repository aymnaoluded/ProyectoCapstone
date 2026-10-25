import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Cabeceras de seguridad para la página del frontend (servidor de desarrollo y `vite preview`).
// En producción, el servidor que publique la app (Nginx, Vercel, etc.) debe enviar las mismas.
const cabecerasSeguridad = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { headers: cabecerasSeguridad },
  preview: { headers: cabecerasSeguridad },
})
