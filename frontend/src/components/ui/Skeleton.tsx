/* Esqueletos de carga: muestran la forma del contenido mientras llega */

export const Esqueleto = ({ className = "" }: { className?: string }) => (
  <span aria-hidden="true" className={`esqueleto block ${className}`} />
);

export const EsqueletoLista = ({ filas = 4 }: { filas?: number }) => (
  <div className="p-3 space-y-2" role="status" aria-label="Cargando">
    {Array.from({ length: filas }, (_, i) => (
      <div key={i} className="rounded-2xl p-4 space-y-2.5 bg-superficie/60">
        <div className="flex items-center justify-between gap-3">
          <Esqueleto className="h-3.5 w-2/3" />
          <Esqueleto className="h-4 w-16 !rounded-full" />
        </div>
        <Esqueleto className="h-3 w-full" />
        <Esqueleto className="h-3 w-4/5" />
      </div>
    ))}
  </div>
);

export const EsqueletoTarjetas = ({ cantidad = 4, className = "" }: { cantidad?: number; className?: string }) => (
  <div className={className} role="status" aria-label="Cargando">
    {Array.from({ length: cantidad }, (_, i) => (
      <div key={i} className="superficie p-5 space-y-3">
        <Esqueleto className="h-3 w-24" />
        <Esqueleto className="h-8 w-20" />
        <Esqueleto className="h-3 w-3/4" />
      </div>
    ))}
  </div>
);

export default Esqueleto;
