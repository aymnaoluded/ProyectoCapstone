import React from "react";

/* ─────────────────────────────────────────────────────────────────────
   Formato ligero para las respuestas del asistente (estilo Markdown):
   **negrita**, listas con "-", "*" o "•", listas numeradas y párrafos.
   No usa HTML crudo: todo se construye como elementos de React.
   ───────────────────────────────────────────────────────────────────── */

const enLinea = (texto: string, clave: string): React.ReactNode[] =>
  texto.split(/(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/g).map((parte, i) => {
    if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
      return (
        <strong key={`${clave}-${i}`} className="font-semibold">
          {parte.slice(2, -2)}
        </strong>
      );
    }
    if (parte.startsWith("*") && parte.endsWith("*") && parte.length > 2) {
      return (
        <em key={`${clave}-${i}`} className="italic text-tinta-2">
          {parte.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={`${clave}-${i}`}>{parte}</React.Fragment>;
  });

type Bloque =
  | { tipo: "parrafo"; lineas: string[] }
  | { tipo: "lista"; items: string[] }
  | { tipo: "numerada"; items: string[] };

const VINETA = /^\s*(?:[-*•])\s+(.*)$/;
const NUMERO = /^\s*\d+[.)]\s+(.*)$/;

const aBloques = (texto: string): Bloque[] => {
  const bloques: Bloque[] = [];
  for (const linea of texto.replace(/\r\n/g, "\n").split("\n")) {
    const vineta = linea.match(VINETA);
    const numero = linea.match(NUMERO);
    const ultimo = bloques[bloques.length - 1];
    if (vineta) {
      if (ultimo?.tipo === "lista") ultimo.items.push(vineta[1]);
      else bloques.push({ tipo: "lista", items: [vineta[1]] });
    } else if (numero) {
      if (ultimo?.tipo === "numerada") ultimo.items.push(numero[1]);
      else bloques.push({ tipo: "numerada", items: [numero[1]] });
    } else if (linea.trim() === "") {
      if (ultimo && !(ultimo.tipo === "parrafo" && ultimo.lineas.length === 0)) bloques.push({ tipo: "parrafo", lineas: [] });
    } else if (ultimo?.tipo === "parrafo") {
      ultimo.lineas.push(linea);
    } else {
      bloques.push({ tipo: "parrafo", lineas: [linea] });
    }
  }
  return bloques.filter((b) => (b.tipo === "parrafo" ? b.lineas.length > 0 : b.items.length > 0));
};

export const TextoFormateado = ({ texto, className = "" }: { texto: string; className?: string }) => {
  const bloques = aBloques(texto || "");
  return (
    <div className={`space-y-2.5 [overflow-wrap:anywhere] ${className}`}>
      {bloques.map((b, i) => {
        if (b.tipo === "lista") {
          return (
            <ul key={i} className="space-y-1.5 pl-1">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden="true" className="mt-[0.6em] w-[5px] h-[6px] rounded-[1px] bg-luz shrink-0" />
                  <span className="min-w-0">{enLinea(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (b.tipo === "numerada") {
          return (
            <ol key={i} className="space-y-1.5">
              {b.items.map((item, j) => (
                <li key={j} className="flex gap-2.5">
                  <span aria-hidden="true" className="numeral text-petroleo shrink-0 w-4 text-right">
                    {j + 1}
                  </span>
                  <span className="min-w-0">{enLinea(item, `${i}-${j}`)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {b.lineas.map((l, j) => (
              <React.Fragment key={j}>
                {j > 0 && "\n"}
                {enLinea(l, `${i}-${j}`)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
};
