import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Database,
  FileText,
  Upload,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Trash2,
  UploadCloud,
  Layers,
  MessagesSquare,
  Eye,
  EyeOff,
  Search,
  CalendarDays,
} from "lucide-react";
import type { Usuario } from "../types";
import { API_URL, cabecerasAuth } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { EncabezadoPagina, BotonRecargar, Kpi, EstadoVacio, Aviso } from "./ui/Pagina";
import { EsqueletoTarjetas } from "./ui/Skeleton";
import { Modal } from "./ui/Modal";
import { IndicadorVentanas } from "./ui/Fachada";

interface Stats {
  documentos: number;
  publicados: number;
  fragmentos_indexados: number;
  consultas_atendidas: number;
}

interface DocumentoItem {
  id_documento: number;
  titulo: string;
  fecha: string;
  activo: boolean;
  total_fragmentos: number;
  usos: number;
}

interface ItemArchivoMasivo {
  id: string;
  file: File;
  status: "pendiente" | "subiendo" | "exito" | "duplicado" | "error";
  mensaje?: string;
}

interface BaseConocimientoProps {
  usuario: Usuario;
}

export const BaseConocimiento: React.FC<BaseConocimientoProps> = ({ usuario: _usuario }) => {
  const toast = useToast();
  const [busqueda, setBusqueda] = useState("");
  const [filtroPublicacion, setFiltroPublicacion] = useState<"todos" | "publicados" | "ocultos">("todos");
  const [stats, setStats] = useState<Stats>({
    documentos: 0,
    publicados: 0,
    fragmentos_indexados: 0,
    consultas_atendidas: 0,
  });
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [procesandoDocId, setProcesandoDocId] = useState<number | null>(null);

  // Modal para agregar documentos (Drag & Drop)
  const [modalAbierto, setModalAbierto] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Carga Masiva Drag & Drop
  const [archivosMasivos, setArchivosMasivos] = useState<ItemArchivoMasivo[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [subiendoMasivo, setSubiendoMasivo] = useState(false);
  const [resumenMasivo, setResumenMasivo] = useState<{
    total: number;
    exitosos: number;
    duplicados: number;
    fallidos: number;
  } | null>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Modal para editar / reindexar
  const [modalEditarAbierto, setModalEditarAbierto] = useState(false);
  const [docAEditar, setDocAEditar] = useState<DocumentoItem | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editArchivo, setEditArchivo] = useState<File | null>(null);
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const getAuthHeaders = (): HeadersInit => {
    return cabecerasAuth();
  };

  // Las notificaciones ahora usan el sistema global de avisos (toasts)
  const notificarTemporal = (tipo: "exito" | "error", texto: string) => {
    if (tipo === "exito") toast.exito(texto);
    else toast.error(texto);
  };

  const cargarDatos = async () => {
    setCargandoLista(true);
    try {
      const timestamp = Date.now();
      const headers = getAuthHeaders();

      const [resStats, resDocs] = await Promise.all([
        fetch(`${API_URL}/api/admin/conocimiento/stats?t=${timestamp}`, {
          cache: "no-store",
          headers,
        }),
        fetch(`${API_URL}/api/admin/documentos?t=${timestamp}`, {
          cache: "no-store",
          headers,
        }),
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }

      if (resDocs.ok) {
        const docsData = await resDocs.json();
        setDocumentos(Array.isArray(docsData) ? docsData : []);
      } else {
        notificarTemporal("error", "No se pudo sincronizar la lista de documentos.");
      }
    } catch (err) {
      console.error("Error al cargar la base de conocimiento:", err);
      notificarTemporal("error", "Error de conexión con el backend.");
    } finally {
      setCargandoLista(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleToggleActivo = async (id: number) => {
    setProcesandoDocId(id);
    try {
      const res = await fetch(`${API_URL}/api/admin/documentos/${id}/toggle`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setDocumentos((prev) =>
          prev.map((doc) =>
            doc.id_documento === id ? { ...doc, activo: data.activo } : doc
          )
        );
        setStats((prev) => ({
          ...prev,
          publicados: data.activo ? prev.publicados + 1 : Math.max(0, prev.publicados - 1),
        }));
        notificarTemporal(
          "exito",
          `Documento #${id} ${data.activo ? "publicado para el motor RAG" : "despublicado"}.`
        );
      } else {
        notificarTemporal("error", "No se pudo cambiar el estado del documento.");
      }
    } catch (err) {
      console.error("Error al alternar estado del documento:", err);
      notificarTemporal("error", "Error de red al alternar el estado.");
    } finally {
      setProcesandoDocId(null);
    }
  };

  const agregarArchivosMasivos = (files: FileList | File[]) => {
    const permitidas = [".pdf", ".docx", ".txt"];
    const lista = Array.from(files);
    const validos: ItemArchivoMasivo[] = [];
    let noPermitidos = 0;

    lista.forEach((f) => {
      const ext = f.name.slice(f.name.lastIndexOf(".")).toLowerCase();
      if (!permitidas.includes(ext)) {
        noPermitidos++;
        return;
      }
      if (f.size > 25 * 1024 * 1024) {
        validos.push({
          id: `${f.name}-${Date.now()}-${Math.random()}`,
          file: f,
          status: "error",
          mensaje: "Supera los 25 MB permitidos",
        });
        return;
      }
      validos.push({
        id: `${f.name}-${Date.now()}-${Math.random()}`,
        file: f,
        status: "pendiente",
      });
    });

    if (noPermitidos > 0) {
      setErrorCrear(
        `${noPermitidos} archivo(s) no fueron agregados porque solo se admiten formatos PDF, DOCX o TXT.`
      );
    } else {
      setErrorCrear(null);
    }

    setArchivosMasivos((prev) => {
      const combinados = [...prev];
      validos.forEach((item) => {
        if (!combinados.some((c) => c.file.name === item.file.name && c.file.size === item.file.size)) {
          combinados.push(item);
        }
      });
      return combinados.slice(0, 30);
    });
  };

  const eliminarArchivoMasivo = (id: string) => {
    setArchivosMasivos((prev) => prev.filter((item) => item.id !== id));
  };

  const limpiarListaMasiva = () => {
    setArchivosMasivos([]);
    setResumenMasivo(null);
    setErrorCrear(null);
    if (multiFileInputRef.current) multiFileInputRef.current.value = "";
  };

  const handleSubirMasivo = async () => {
    const archivosAProcesar = archivosMasivos.filter(
      (a) => a.status === "pendiente" || a.status === "error"
    );
    if (archivosAProcesar.length === 0) return;

    setSubiendoMasivo(true);
    setErrorCrear(null);
    setResumenMasivo(null);

    setArchivosMasivos((prev) =>
      prev.map((item) =>
        archivosAProcesar.some((a) => a.id === item.id)
          ? { ...item, status: "subiendo" }
          : item
      )
    );

    const formData = new FormData();
    archivosAProcesar.forEach((item) => {
      formData.append("archivos", item.file);
    });

    try {
      const res = await fetch(`${API_URL}/api/documentos/masivo`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const exitosos = new Set(
          (data.resultados?.exitosos || []).map((x: any) => x.nombre_archivo)
        );
        const duplicados = new Map<string, string>(
          (data.resultados?.duplicados || []).map((x: any) => [String(x.nombre_archivo), String(x.mensaje || "")])
        );
        const fallidos = new Map<string, string>(
          (data.resultados?.fallidos || []).map((x: any) => [String(x.nombre_archivo), String(x.mensaje || "")])
        );

        setArchivosMasivos((prev) =>
          prev.map((item): ItemArchivoMasivo => {
            if (exitosos.has(item.file.name)) {
              return { ...item, status: "exito", mensaje: "Indexado con éxito" };
            }
            if (duplicados.has(item.file.name)) {
              return {
                ...item,
                status: "duplicado",
                mensaje: duplicados.get(item.file.name) || "Archivo duplicado",
              };
            }
            if (fallidos.has(item.file.name)) {
              return {
                ...item,
                status: "error",
                mensaje: fallidos.get(item.file.name) || "Error al procesar",
              };
            }
            return item;
          })
        );

        setResumenMasivo({
          total: data.total_recibidos,
          exitosos: data.total_exitosos,
          duplicados: data.total_duplicados,
          fallidos: data.total_fallidos,
        });

        notificarTemporal(
          "exito",
          `Carga masiva: ${data.total_exitosos} documento(s) indexado(s), ${data.total_duplicados} duplicado(s).`
        );

        await cargarDatos();
      } else {
        const errJson = await res.json().catch(() => null);
        setErrorCrear(errJson?.detail || "Fallo en la carga masiva de archivos.");
        setArchivosMasivos((prev) =>
          prev.map((item) =>
            item.status === "subiendo" ? { ...item, status: "error" } : item
          )
        );
      }
    } catch (err) {
      console.error("Fallo de red en carga masiva:", err);
      setErrorCrear("Error de conexión al cargar y procesar los archivos.");
      setArchivosMasivos((prev) =>
        prev.map((item) =>
          item.status === "subiendo" ? { ...item, status: "error" } : item
        )
      );
    } finally {
      setSubiendoMasivo(false);
    }
  };

  const abrirModalEdicion = (doc: DocumentoItem) => {
    setDocAEditar(doc);
    setEditTitulo(doc.titulo);
    setEditArchivo(null);
    setErrorEditar(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    setModalEditarAbierto(true);
  };

  const handleActualizarDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docAEditar || !editTitulo.trim()) return;

    setGuardandoEdicion(true);
    setErrorEditar(null);

    const formData = new FormData();
    formData.append("titulo", editTitulo.trim());
    if (editArchivo) {
      formData.append("archivo", editArchivo);
    }

    try {
      const res = await fetch(
        `${API_URL}/api/admin/documentos/${docAEditar.id_documento}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: formData,
        }
      );

      if (res.ok) {
        const data = await res.json().catch(() => null);
        setModalEditarAbierto(false);
        setDocAEditar(null);
        setEditArchivo(null);
        notificarTemporal(
          "exito",
          data?.mensaje || "Documento actualizado correctamente."
        );
        await cargarDatos();
      } else {
        const errorData = await res.json().catch(() => null);
        setErrorEditar(errorData?.detail || "No se pudo actualizar el documento.");
      }
    } catch (err) {
      console.error("Error al actualizar el documento:", err);
      setErrorEditar("Error de conexión al intentar actualizar el documento.");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const termino = busqueda.trim().toLowerCase();
  const documentosFiltrados = documentos.filter((d) => {
    if (filtroPublicacion === "publicados" && !d.activo) return false;
    if (filtroPublicacion === "ocultos" && d.activo) return false;
    return !termino || d.titulo.toLowerCase().includes(termino);
  });
  const pendientesSubida = archivosMasivos.filter((a) => a.status === "pendiente" || a.status === "error").length;
  const listosSubida = archivosMasivos.filter((a) => a.status === "pendiente").length;

  const abrirCarga = () => {
    setErrorCrear(null);
    setModalAbierto(true);
  };

  const abrirSelectorArchivos = () => {
    if (!subiendoMasivo && multiFileInputRef.current) {
      multiFileInputRef.current.click();
    }
  };

  const ESTADO_ARCHIVO: Record<ItemArchivoMasivo["status"], { clase: string; texto: string }> = {
    pendiente: { clase: "insignia-cerrado", texto: "Pendiente" },
    subiendo: { clase: "insignia-proceso", texto: "Indexando" },
    exito: { clase: "insignia-resuelto", texto: "Indexado" },
    duplicado: { clase: "insignia-pendiente", texto: "Duplicado" },
    error: { clase: "insignia-error", texto: "Error" },
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 space-y-7">
        <EncabezadoPagina
          ceja="Administración"
          titulo={
            <>
              Base de <em>conocimiento</em>
            </>
          }
          descripcion="Los documentos que Luz, la asistente, consulta para responder a los residentes. Solo usa los que están publicados."
          acciones={
            <>
              <BotonRecargar onClick={cargarDatos} cargando={cargandoLista} soloIcono etiqueta="Recargar documentos" />
              <button type="button" onClick={abrirCarga} className="boton boton-primario">
                <Plus size={17} />
                Agregar documentos
              </button>
            </>
          }
        />

        {/* Indicadores */}
        {cargandoLista && documentos.length === 0 ? (
          <EsqueletoTarjetas cantidad={4} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" />
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 escalonado">
            <Kpi etiqueta="Documentos" valor={stats.documentos} detalle="Cargados en total" icono={<FileText size={16} />} />
            <Kpi etiqueta="Publicados" valor={stats.publicados} detalle="Disponibles para Luz" icono={<Eye size={16} />} tono="exito" />
            <Kpi
              etiqueta="Fragmentos"
              valor={stats.fragmentos_indexados}
              detalle="Trozos indexados con embeddings"
              icono={<Layers size={16} />}
              tono="luz"
            />
            <Kpi
              etiqueta="Consultas"
              valor={stats.consultas_atendidas}
              detalle="Atendidas por Luz"
              icono={<MessagesSquare size={16} />}
              tono="noche"
            />
          </div>
        )}

        {/* Búsqueda y filtro */}
        {documentos.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" />
              <input
                type="search"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por título"
                aria-label="Buscar documentos por título"
                className="campo !pl-10 !rounded-full !min-h-[2.5rem]"
              />
            </div>
            <div role="radiogroup" aria-label="Filtrar por publicación" className="inline-flex self-start p-1 rounded-full bg-papel-2 border border-linea">
              {(
                [
                  ["todos", "Todos"],
                  ["publicados", "Publicados"],
                  ["ocultos", "Sin publicar"],
                ] as const
              ).map(([valor, texto]) => (
                <button
                  key={valor}
                  type="button"
                  role="radio"
                  aria-checked={filtroPublicacion === valor}
                  onClick={() => setFiltroPublicacion(valor)}
                  className={`px-3.5 h-8 rounded-full text-[0.8125rem] font-semibold transition-all duration-200 ${
                    filtroPublicacion === valor ? "bg-superficie text-tinta shadow-[var(--sombra-papel)]" : "text-tinta-2 hover:text-tinta"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Documentos */}
        {cargandoLista && documentos.length === 0 ? (
          <EsqueletoTarjetas cantidad={4} className="grid md:grid-cols-2 gap-4" />
        ) : documentos.length === 0 ? (
          <div className="superficie">
            <EstadoVacio
              titulo="Todavía no hay documentos"
              descripcion="Carga reglamentos, circulares o actas en PDF, DOCX o TXT. El asistente solo responderá con lo que publiques aquí."
              accion={
                <button type="button" onClick={abrirCarga} className="boton boton-primario">
                  <Plus size={17} />
                  Agregar documentos
                </button>
              }
            />
          </div>
        ) : documentosFiltrados.length === 0 ? (
          <p className="text-center text-sm text-tinta-2 py-10">Ningún documento coincide con la búsqueda.</p>
        ) : (
          <ul className="grid md:grid-cols-2 gap-4 escalonado">
            {documentosFiltrados.map((doc) => (
              <li
                key={doc.id_documento}
                className={`superficie superficie-interactiva p-5 flex flex-col gap-4 ${doc.activo ? "" : "!bg-papel/70"}`}
              >
                <div className="flex items-start gap-3.5">
                  <span
                    className={`arco grid place-items-center w-10 h-11 shrink-0 transition-colors ${
                      doc.activo ? "bg-noche text-luz" : "bg-papel-2 text-tinta-3"
                    }`}
                    aria-hidden="true"
                  >
                    <FileText size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-[0.975rem] font-semibold text-tinta leading-snug [overflow-wrap:anywhere]">{doc.titulo}</h3>
                      <span className={`insignia shrink-0 ${doc.activo ? "insignia-resuelto" : "insignia-pendiente"}`}>
                        {doc.activo ? "Publicado" : "Sin publicar"}
                      </span>
                    </div>
                    <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem] text-tinta-2">
                      <span className="flex items-center gap-1.5">
                        <Layers size={13} className="text-tinta-3" /> {doc.total_fragmentos} fragmentos
                      </span>
                      <span className="flex items-center gap-1.5 tabular-nums">
                        <CalendarDays size={13} className="text-tinta-3" /> {doc.fecha}
                      </span>
                      <span className="numeral text-tinta-3">N.º {doc.id_documento}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-linea">
                  <button type="button" onClick={() => abrirModalEdicion(doc)} className="boton boton-fantasma boton-sm">
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActivo(doc.id_documento)}
                    disabled={procesandoDocId === doc.id_documento}
                    className={`boton boton-sm ${doc.activo ? "boton-secundario" : "boton-primario"}`}
                  >
                    {procesandoDocId === doc.id_documento ? (
                      <IndicadorVentanas />
                    ) : doc.activo ? (
                      <EyeOff size={14} />
                    ) : (
                      <Eye size={14} />
                    )}
                    {doc.activo ? "Despublicar" : "Publicar"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Carga de documentos ─────────────────────────────────── */}
      <Modal
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        bloqueado={subiendoMasivo}
        ancho="lg"
        icono={<Database size={18} />}
        titulo="Agregar documentos"
        descripcion="Cada archivo se divide en fragmentos y se indexa para que Luz pueda consultarlo."
        pie={
          <>
            <span className="sm:mr-auto self-center text-[0.8125rem] text-tinta-2">
              {listosSubida} {listosSubida === 1 ? "archivo listo" : "archivos listos"} para indexar
            </span>
            <button type="button" onClick={() => setModalAbierto(false)} disabled={subiendoMasivo} className="boton boton-fantasma">
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSubirMasivo}
              disabled={subiendoMasivo || pendientesSubida === 0}
              className="boton boton-primario"
            >
              {subiendoMasivo ? (
                <>
                  <IndicadorVentanas />
                  Indexando…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  {pendientesSubida === 1 ? "Subir e indexar" : `Subir e indexar (${pendientesSubida})`}
                </>
              )}
            </button>
          </>
        }
      >
        <div className="space-y-4 pb-2">
          {errorCrear && <Aviso icono={<AlertCircle size={16} />}>{errorCrear}</Aviso>}

          {/* Zona para arrastrar y soltar */}
          <div
            role="button"
            tabIndex={subiendoMasivo ? -1 : 0}
            aria-label="Seleccionar archivos PDF, DOCX o TXT para subir"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                abrirSelectorArchivos();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!subiendoMasivo) setArrastrando(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setArrastrando(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setArrastrando(false);
              if (!subiendoMasivo && e.dataTransfer.files) {
                agregarArchivosMasivos(e.dataTransfer.files);
              }
            }}
            onClick={abrirSelectorArchivos}
            className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center flex flex-col items-center gap-3 select-none transition-all duration-300 ease-curva
              ${arrastrando ? "border-petroleo bg-menta-2 scale-[1.01]" : "border-linea-fuerte bg-papel/60 hover:border-petroleo hover:bg-menta-2/60"}
              ${subiendoMasivo ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
          >
            <input
              ref={multiFileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  agregarArchivosMasivos(e.target.files);
                }
              }}
            />
            <span
              className={`arco grid place-items-center w-12 h-14 transition-colors duration-300 ${
                arrastrando ? "bg-noche text-luz" : "bg-menta text-petroleo-hover"
              }`}
            >
              <UploadCloud size={22} />
            </span>
            <div>
              <p className="text-[0.9375rem] font-semibold text-tinta">
                {arrastrando ? "Suelta los archivos aquí" : "Arrastra tus documentos aquí"}
              </p>
              <p className="text-[0.8125rem] text-tinta-2 mt-1">
                o <span className="font-semibold text-petroleo underline underline-offset-4">explora tus archivos</span> · PDF,
                DOCX o TXT
              </p>
            </div>
            <span className="text-[0.75rem] text-tinta-3">Hasta 30 archivos por carga · máximo 25 MB cada uno</span>
          </div>

          {/* Resumen de la última carga */}
          {resumenMasivo && (
            <div className="rounded-2xl border border-linea p-3.5 animate-aparecer">
              <div className="flex items-center justify-between text-[0.8125rem] font-semibold text-tinta">
                <span>Resultado · {resumenMasivo.total} archivos procesados</span>
                <button type="button" onClick={() => setResumenMasivo(null)} className="text-tinta-3 hover:text-tinta text-[0.75rem]">
                  Ocultar
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                <div className="rounded-xl bg-exito-suave text-exito py-2.5">
                  <span className="cifra block text-[1.6rem]">{resumenMasivo.exitosos}</span>
                  <span className="text-[0.75rem] font-semibold">Indexados</span>
                </div>
                <div className="rounded-xl bg-luz-suave text-luz-tinta py-2.5">
                  <span className="cifra block text-[1.6rem]">{resumenMasivo.duplicados}</span>
                  <span className="text-[0.75rem] font-semibold">Duplicados</span>
                </div>
                <div className="rounded-xl bg-error-suave text-error py-2.5">
                  <span className="cifra block text-[1.6rem]">{resumenMasivo.fallidos}</span>
                  <span className="text-[0.75rem] font-semibold">Con error</span>
                </div>
              </div>
            </div>
          )}

          {/* Cola de archivos */}
          {archivosMasivos.length > 0 && (
            <div>
              <div className="flex items-center justify-between pb-2">
                <p className="ceja">En cola · {archivosMasivos.length}/30</p>
                {!subiendoMasivo && (
                  <button
                    type="button"
                    onClick={limpiarListaMasiva}
                    className="flex items-center gap-1 text-[0.8125rem] font-medium text-tinta-2 hover:text-error transition-colors"
                  >
                    <Trash2 size={13} />
                    Limpiar lista
                  </button>
                )}
              </div>
              <ul className="max-h-56 overflow-y-auto barra-fina space-y-1.5 pr-1">
                {archivosMasivos.map((item) => {
                  const ext = item.file.name.slice(item.file.name.lastIndexOf(".")).toLowerCase();
                  const sizeKb = Math.round(item.file.size / 1024);
                  const sizeDisplay = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
                  const estadoArchivo = ESTADO_ARCHIVO[item.status];

                  return (
                    <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-linea bg-superficie px-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="numeral text-[0.75rem] uppercase w-9 text-center rounded-md bg-papel-2 text-tinta-2 py-0.5 shrink-0">
                          {ext.replace(".", "")}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[0.8125rem] font-semibold text-tinta truncate" title={item.file.name}>
                            {item.file.name}
                          </p>
                          <p className="text-[0.75rem] text-tinta-3 truncate" title={item.mensaje}>
                            {sizeDisplay}
                            {item.mensaje ? ` · ${item.mensaje}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`insignia ${estadoArchivo.clase}`}>
                          {item.status === "subiendo" ? <IndicadorVentanas /> : item.status === "exito" ? <CheckCircle2 size={12} /> : null}
                          {estadoArchivo.texto}
                        </span>
                        {!subiendoMasivo && (
                          <button
                            type="button"
                            onClick={() => eliminarArchivoMasivo(item.id)}
                            aria-label={`Quitar ${item.file.name}`}
                            className="boton-icono !w-8 !h-8 hover:!text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Edición y reindexación ──────────────────────────────── */}
      <Modal
        abierto={modalEditarAbierto && !!docAEditar}
        onCerrar={() => setModalEditarAbierto(false)}
        bloqueado={guardandoEdicion}
        icono={<Edit3 size={17} />}
        titulo="Editar documento"
        descripcion="Puedes renombrarlo o reemplazar el archivo; si lo reemplazas se vuelven a calcular sus fragmentos."
        pie={
          <>
            <button type="button" onClick={() => setModalEditarAbierto(false)} disabled={guardandoEdicion} className="boton boton-fantasma">
              Cancelar
            </button>
            <button type="submit" form="form-editar-documento" disabled={guardandoEdicion || !editTitulo.trim()} className="boton boton-primario">
              {guardandoEdicion ? (
                <>
                  <IndicadorVentanas />
                  {editArchivo ? "Regenerando embeddings…" : "Guardando…"}
                </>
              ) : (
                "Guardar cambios"
              )}
            </button>
          </>
        }
      >
        <form id="form-editar-documento" onSubmit={handleActualizarDocumento} className="space-y-4 pb-2">
          {errorEditar && <Aviso icono={<AlertCircle size={16} />}>{errorEditar}</Aviso>}
          <div>
            <label htmlFor="editar-titulo" className="etiqueta">
              Título del documento
            </label>
            <input
              id="editar-titulo"
              type="text"
              required
              value={editTitulo}
              onChange={(e) => {
                setEditTitulo(e.target.value);
                if (errorEditar) setErrorEditar(null);
              }}
              disabled={guardandoEdicion}
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="editar-archivo" className="etiqueta">
              Reemplazar archivo (opcional)
            </label>
            <input
              id="editar-archivo"
              ref={editFileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                setEditArchivo(e.target.files?.[0] || null);
                if (errorEditar) setErrorEditar(null);
              }}
              disabled={guardandoEdicion}
              className="campo !p-1.5 text-[0.8125rem] text-tinta-2 file:mr-3 file:h-8 file:px-3.5 file:rounded-full file:border-0 file:bg-menta file:text-petroleo-hover file:font-semibold hover:file:bg-menta-2"
            />
            <p className="text-[0.75rem] text-tinta-3 mt-1.5">
              {editArchivo
                ? "Al adjuntar un archivo nuevo se recalculan los fragmentos y embeddings."
                : "Déjalo vacío si solo quieres cambiar el título."}
            </p>
          </div>
        </form>
      </Modal>
    </div>
  );
};
