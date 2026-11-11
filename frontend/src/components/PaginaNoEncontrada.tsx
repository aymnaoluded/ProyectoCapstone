import { ArrowLeft } from "lucide-react";
import { PantallaAcceso } from "./ui/PantallaAcceso";

/* 404: un edificio con todas sus ventanas encendidas… menos la que buscabas */
const PaginaNoEncontrada = () => (
  <PantallaAcceso
    ceja="Error 404"
    titulo={
      <>
        Esta puerta <em>no existe</em>
      </>
    }
    descripcion="La dirección que buscas no existe o fue movida dentro de la plataforma."
    ilustracion={
      <div aria-hidden="true" className="arco bg-noche w-fit px-4 pt-7 pb-4 mb-6 shadow-[0_20px_40px_-24px_rgba(14,38,36,0.8)]">
        <div className="grid grid-cols-4 gap-[7px]">
          {Array.from({ length: 12 }, (_, i) => (
            <span
              key={i}
              className={`ventana w-[13px] h-[17px] ${i === 6 ? "!bg-transparent border border-dashed border-menta/40" : "ventana-encendida"}`}
            />
          ))}
        </div>
      </div>
    }
  >
    <p className="text-[0.8125rem] text-tinta-2 bg-papel-2/70 border border-linea rounded-xl px-3.5 py-2.5 font-mono [overflow-wrap:anywhere]">
      {window.location.pathname}
    </p>
    <button type="button" onClick={() => window.location.assign("/")} className="boton boton-primario boton-lg w-full mt-5">
      <ArrowLeft size={17} />
      Volver al inicio
    </button>
  </PantallaAcceso>
);

export default PaginaNoEncontrada;
