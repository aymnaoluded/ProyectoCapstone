import { Sparkles, Compass, ArrowLeft } from "lucide-react";

// Página 404: se muestra cuando la dirección no corresponde a ninguna ruta de la aplicación.
// Usa el mismo diseño que las páginas públicas (login, recuperar y restablecer contraseña).
const PaginaNoEncontrada = () => {
  return (
    <div className="min-h-screen w-screen bg-[#0d131f] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl border border-slate-100 space-y-6">

        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md shadow-blue-500/20">
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            SupportAI
          </h1>
        </div>

        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
              <Compass size={30} />
            </div>
          </div>

          <p className="text-5xl font-bold text-blue-600 tracking-tight">404</p>

          <h2 className="text-lg font-bold text-slate-900">
            Página no encontrada
          </h2>

          <p className="text-sm text-slate-500 leading-relaxed">
            La dirección que buscas no existe o fue movida.
          </p>

          {/* React escapa el texto, así que mostrar la ruta pedida no permite inyectar HTML */}
          <p className="text-xs font-mono text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 [overflow-wrap:anywhere]">
            {window.location.pathname}
          </p>

          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base shadow-sm shadow-blue-500/20 transition-all"
          >
            <ArrowLeft size={18} />
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaginaNoEncontrada;
