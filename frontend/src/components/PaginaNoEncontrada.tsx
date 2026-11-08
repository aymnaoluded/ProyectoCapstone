import { Building2, Compass, ArrowLeft } from "lucide-react";

const PaginaNoEncontrada = () => {
  return (
    <div className="min-h-screen w-screen bg-[#F6F5F0] flex items-center justify-center p-4 font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-[0_12px_40px_rgba(31,41,51,0.06)] border border-slate-200/80 shadow-sm border border-[#E7EAE7] space-y-6 text-center">
        <div className="space-y-2">
          <div className="w-12 h-12 bg-[#286D68] text-white rounded-2xl bg-gradient-to-br from-[#286D68] to-[#1E5450] text-white flex items-center justify-center mx-auto shadow-md ring-1 ring-white/20">
            <Building2 size={24} />
          </div>
          <h1 className="text-2xl font-bold font-heading text-[#1E5450]">
            Comunidad Clara
          </h1>
          <p className="text-xs text-[#788583]">Administraciones Ltda.</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-[#286D68]/10 text-[#286D68] rounded-xl flex items-center justify-center">
              <Compass size={30} />
            </div>
          </div>

          <p className="text-5xl font-bold font-heading text-[#286D68] tracking-tight">404</p>

          <h2 className="text-lg font-bold font-heading text-[#1E5450]">
            Página no encontrada
          </h2>

          <p className="text-sm text-[#788583] leading-relaxed">
            La dirección que buscas no existe o fue movida en la plataforma.
          </p>

          <p className="text-xs font-mono text-[#788583] bg-[#F6F5F0] border border-[#CDD4D3] rounded-xl px-3 py-2 [overflow-wrap:anywhere]">
            {window.location.pathname}
          </p>

          <button
            type="button"
            onClick={() => window.location.assign("/")}
            className="w-full bg-[#286D68] hover:bg-[#1E5450] text-white font-heading font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-xs transition-all cursor-pointer"
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
