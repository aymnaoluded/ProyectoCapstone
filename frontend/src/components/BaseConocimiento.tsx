import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Database,
  BookOpen,
  FileText,
  Upload,
  X,
  Loader2,
  RefreshCw,
  Edit3,
  AlertCircle,
  CheckCircle2,
  Trash2,
  UploadCloud,
  Files,
  Sparkles
} from "lucide-react";
import type { Usuario } from "../types";
import { API_URL, cabecerasAuth } from "../utils/api";

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

export const BaseConocimiento: React.FC<BaseConocimientoProps> = ({ usuario }) => {
  const [stats, setStats] = useState<Stats>({
    documentos: 0,
    publicados: 0,
    fragmentos_indexados: 0,
    consultas_atendidas: 0,
  });
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);
  const [procesandoDocId, setProcesandoDocId] = useState<number | null>(null);

  // Notificaciones
  const [mensajeGlobal, setMensajeGlobal] = useState<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Modal para agregar documentos
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tabCarga, setTabCarga] = useState<"masiva" | "individual">("masiva");
  const [titulo, setTitulo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const notificarTemporal = (tipo: "exito" | "error", texto: string) => {
    setMensajeGlobal({ tipo, texto });
    setTimeout(() => setMensajeGlobal(null), 5000);
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

  const handleSubirDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !titulo.trim()) return;

    setSubiendo(true);
    setErrorCrear(null);

    const formData = new FormData();
    formData.append("titulo", titulo.trim());
    formData.append("admin_id", usuario.id_usuario.toString());
    formData.append("archivo", archivo);

    try {
      const res = await fetch(`${API_URL}/api/documentos`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (res.ok) {
        setModalAbierto(false);
        setTitulo("");
        setArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        notificarTemporal("exito", "Documento indexado con éxito en la base vectorial.");
        await cargarDatos();
      } else {
        const errorData = await res.json().catch(() => null);
        setErrorCrear(errorData?.detail || "Error al indexar el archivo en el servidor.");
      }
    } catch (err) {
      console.error("Fallo al subir documento:", err);
      setErrorCrear("Error de conexión al subir e indexar el archivo.");
    } finally {
      setSubiendo(false);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-y-auto apple-scrollbar">
      {/* Cabecera Superior Glass */}
      <div className="liquid-glass border-b border-[var(--border-glass)] px-6 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[var(--text-primary)]">
            Base de Conocimiento
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gestión e indexación vectorial (RAG) con embeddings de Gemini
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={cargarDatos}
            title="Recargar listado"
            className="p-2.5 rounded-xl liquid-glass border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer shadow-xs active:scale-95"
          >
            <RefreshCw size={15} className={cargandoLista ? "animate-spin text-[var(--accent-primary)]" : ""} />
          </button>
          <button
            onClick={() => {
              setErrorCrear(null);
              setModalAbierto(true);
            }}
            className="apple-btn-primary flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
          >
            <Plus size={16} />
            <span>Agregar Documento</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Banner de Notificación Global */}
        {mensajeGlobal && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-medium transition-all animate-fade-in shadow-xs ${
              mensajeGlobal.tipo === "exito"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                : "bg-red-500/10 border-red-500/20 text-[var(--accent-danger)]"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {mensajeGlobal.tipo === "exito" ? (
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle size={16} className="text-red-500 shrink-0" />
              )}
              <span>{mensajeGlobal.texto}</span>
            </div>
            <button
              onClick={() => setMensajeGlobal(null)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Métricas Superiores estilo Apple Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="liquid-glass-card rounded-3xl p-5 shadow-xs">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight block">
              {stats.documentos}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] mt-1 block">
              Documentos totales
            </span>
          </div>

          <div className="liquid-glass-card rounded-3xl p-5 shadow-xs">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight block">
              {stats.publicados}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] mt-1 block">
              Publicados (Activos en RAG)
            </span>
          </div>

          <div className="liquid-glass-card rounded-3xl p-5 shadow-xs">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight block">
              {stats.fragmentos_indexados}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] mt-1 block">
              Fragmentos vectoriales
            </span>
          </div>

          <div className="liquid-glass-card rounded-3xl p-5 shadow-xs">
            <span className="text-2xl sm:text-3xl font-bold text-[var(--accent-primary)] tracking-tight block">
              {stats.consultas_atendidas}
            </span>
            <span className="text-xs font-medium text-[var(--text-secondary)] mt-1 block">
              Consultas asistidas
            </span>
          </div>
        </div>

        {/* Listado de Documentos en Cards Liquid Glass */}
        {cargandoLista && documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-tertiary)] space-y-2">
            <Loader2 className="animate-spin text-[var(--accent-primary)]" size={28} />
            <p className="text-xs font-medium">Cargando base de conocimiento...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-16 liquid-glass-card rounded-3xl p-8 space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[var(--accent-primary)] flex items-center justify-center mx-auto border border-blue-500/20">
              <Database size={26} />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">No hay documentos indexados</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-sm mx-auto leading-relaxed">
              Presiona "Agregar Documento" para cargar archivos PDF, DOCX o TXT y generar fragmentos con embeddings en pgvector.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentos.map((doc) => (
              <div
                key={doc.id_documento}
                className="liquid-glass-card rounded-3xl p-5 shadow-xs flex flex-col justify-between transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-secondary)] shrink-0 mt-0.5">
                      {doc.titulo.toLowerCase().includes("faq") ? (
                        <BookOpen size={18} />
                      ) : doc.titulo.toLowerCase().includes("api") ? (
                        <FileText size={18} />
                      ) : (
                        <Database size={18} />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-[var(--text-primary)] text-sm leading-snug">
                        {doc.titulo}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] px-2.5 py-0.5 rounded-full">
                          Manual
                        </span>
                        <span className="text-[11px] text-[var(--text-tertiary)]">·</span>
                        <span className="text-[11px] text-[var(--text-secondary)] font-medium">
                          {doc.total_fragmentos} fragmentos
                        </span>
                      </div>
                    </div>
                  </div>

                  {doc.activo ? (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                      Publicado
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full shrink-0">
                      Despublicado
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                  <span className="text-[11px] text-[var(--text-tertiary)]">Actualizado {doc.fecha}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => abrirModalEdicion(doc)}
                      title="Editar o reemplazar archivo"
                      className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-colors cursor-pointer border border-transparent"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      onClick={() => handleToggleActivo(doc.id_documento)}
                      disabled={procesandoDocId === doc.id_documento}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        doc.activo
                          ? "text-[var(--accent-danger)] hover:bg-red-500/10 border border-red-500/20"
                          : "apple-btn-primary shadow-xs"
                      }`}
                    >
                      {procesandoDocId === doc.id_documento && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      <span>{doc.activo ? "Despublicar" : "Publicar"}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Carga Masiva / Individual estilo Apple Sheet */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass-elevated border border-[var(--border-glass)] rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 max-h-[90vh] flex flex-col animate-scale-up">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-[var(--accent-primary)] rounded-2xl flex items-center justify-center">
                  <Database size={20} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">
                    Cargar a la Base de Conocimiento
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Indexación vectorial para el motor RAG de SupportAI
                  </p>
                </div>
              </div>
              <button
                onClick={() => !subiendo && !subiendoMasivo && setModalAbierto(false)}
                disabled={subiendo || subiendoMasivo}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 p-1.5 rounded-xl hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de pestañas estilo Apple Segmented Control */}
            <div className="apple-segmented-container p-1 rounded-2xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setTabCarga("masiva");
                  setErrorCrear(null);
                }}
                disabled={subiendo || subiendoMasivo}
                className={`apple-segmented-item flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  tabCarga === "masiva" ? "active" : ""
                }`}
              >
                <Files size={14} />
                <span>Carga Masiva Drag & Drop</span>
                {archivosMasivos.length > 0 && (
                  <span className="bg-blue-500/20 text-[var(--accent-primary)] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {archivosMasivos.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTabCarga("individual");
                  setErrorCrear(null);
                }}
                disabled={subiendo || subiendoMasivo}
                className={`apple-segmented-item flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  tabCarga === "individual" ? "active" : ""
                }`}
              >
                <FileText size={14} />
                <span>Carga Individual con Título</span>
              </button>
            </div>

            {/* Error */}
            {errorCrear && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-[var(--accent-danger)] rounded-2xl text-xs animate-fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-snug">{errorCrear}</span>
              </div>
            )}

            {/* Contenido según pestaña */}
            <div className="flex-1 overflow-y-auto space-y-4 apple-scrollbar">
              {tabCarga === "masiva" ? (
                <div className="space-y-4">
                  {/* Dropzone Drag & Drop */}
                  <div
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
                    onClick={() => {
                      if (!subiendoMasivo && multiFileInputRef.current) {
                        multiFileInputRef.current.click();
                      }
                    }}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5 select-none ${
                      arrastrando
                        ? "border-[var(--accent-primary)] bg-blue-500/10 scale-[1.01]"
                        : "border-[var(--border-glass)] bg-[var(--bg-surface-elevated)]/40 hover:bg-[var(--bg-card-hover)]"
                    } ${subiendoMasivo ? "opacity-50 pointer-events-none" : ""}`}
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
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-[var(--accent-primary)] shadow-sm">
                      <UploadCloud size={26} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Arrastra y suelta varios documentos aquí
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                        o <span className="text-[var(--accent-primary)] font-semibold underline underline-offset-2">explora tus archivos</span> (PDF, DOCX o TXT)
                      </p>
                    </div>
                    <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                      Hasta 30 archivos simultáneos • Máximo 25 MB por archivo
                    </span>
                  </div>

                  {/* Resumen de resultados si hubo carga */}
                  {resumenMasivo && (
                    <div className="p-3.5 liquid-glass border border-[var(--border-subtle)] rounded-2xl space-y-1.5 text-xs">
                      <div className="font-semibold text-[var(--text-primary)] flex items-center justify-between">
                        <span>Resumen ({resumenMasivo.total} archivos procesados):</span>
                        <button
                          type="button"
                          onClick={() => setResumenMasivo(null)}
                          className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] text-[11px]"
                        >
                          Ocultar
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center font-semibold">
                        <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20">
                          <span className="block text-base font-bold">{resumenMasivo.exitosos}</span>
                          <span>Indexados</span>
                        </div>
                        <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl border border-amber-500/20">
                          <span className="block text-base font-bold">{resumenMasivo.duplicados}</span>
                          <span>Duplicados</span>
                        </div>
                        <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl border border-red-500/20">
                          <span className="block text-base font-bold">{resumenMasivo.fallidos}</span>
                          <span>Con error</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de archivos en cola */}
                  {archivosMasivos.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                        <span>Archivos en cola ({archivosMasivos.length}/30):</span>
                        {!subiendoMasivo && (
                          <button
                            type="button"
                            onClick={limpiarListaMasiva}
                            className="text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] transition-colors flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Limpiar lista</span>
                          </button>
                        )}
                      </div>

                      <div className="max-h-56 overflow-y-auto space-y-2 pr-1 border border-[var(--border-subtle)] rounded-2xl p-2.5 bg-[var(--bg-surface-elevated)]/30 apple-scrollbar">
                        {archivosMasivos.map((item) => {
                          const ext = item.file.name.slice(item.file.name.lastIndexOf(".")).toLowerCase();
                          const sizeKb = Math.round(item.file.size / 1024);
                          const sizeDisplay =
                            sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;

                          return (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2.5 rounded-xl liquid-glass border border-[var(--border-subtle)] text-xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                    ext === ".pdf"
                                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                      : ext === ".docx"
                                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                      : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20"
                                  }`}
                                >
                                  {ext.replace(".", "")}
                                </span>
                                <div className="min-w-0">
                                  <p className="font-semibold text-[var(--text-primary)] truncate" title={item.file.name}>
                                    {item.file.name}
                                  </p>
                                  <span className="text-[10px] text-[var(--text-tertiary)]">
                                    {sizeDisplay}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {item.status === "pendiente" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-500/10 text-[var(--text-secondary)]">
                                    Pendiente
                                  </span>
                                )}
                                {item.status === "subiendo" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-[var(--accent-primary)] flex items-center gap-1">
                                    <Loader2 size={10} className="animate-spin" />
                                    <span>Indexando</span>
                                  </span>
                                )}
                                {item.status === "exito" && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 size={11} />
                                    <span>Indexado</span>
                                  </span>
                                )}
                                {item.status === "duplicado" && (
                                  <span
                                    title={item.mensaje}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1 cursor-help"
                                  >
                                    <AlertCircle size={11} />
                                    <span>Duplicado</span>
                                  </span>
                                )}
                                {item.status === "error" && (
                                  <span
                                    title={item.mensaje}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-500/10 text-[var(--accent-danger)] flex items-center gap-1 cursor-help"
                                  >
                                    <AlertCircle size={11} />
                                    <span>Error</span>
                                  </span>
                                )}

                                {!subiendoMasivo && (
                                  <button
                                    type="button"
                                    onClick={() => eliminarArchivoMasivo(item.id)}
                                    title="Quitar"
                                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--accent-danger)] rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Acciones para Carga Masiva */}
                  <div className="pt-2 flex items-center justify-between border-t border-[var(--border-subtle)]">
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {archivosMasivos.filter((a) => a.status === "pendiente").length} archivo(s) listos para indexar
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setModalAbierto(false)}
                        disabled={subiendoMasivo}
                        className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={handleSubirMasivo}
                        disabled={
                          subiendoMasivo ||
                          archivosMasivos.filter(
                            (a) => a.status === "pendiente" || a.status === "error"
                          ).length === 0
                        }
                        className="apple-btn-primary flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {subiendoMasivo ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            <span>Indexando lote en RAG...</span>
                          </>
                        ) : (
                          <>
                            <Upload size={14} />
                            <span>
                              Subir e Indexar Lote (
                              {
                                archivosMasivos.filter(
                                  (a) => a.status === "pendiente" || a.status === "error"
                                ).length
                              }
                              )
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Formulario de Carga Individual */
                <form onSubmit={handleSubirDocumento} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                      Título personalizado del documento
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Manual de Políticas y Procedimientos 2026"
                      value={titulo}
                      onChange={(e) => {
                        setTitulo(e.target.value);
                        if (errorCrear) setErrorCrear(null);
                      }}
                      disabled={subiendo}
                      className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                      Seleccionar archivo (PDF, DOCX o TXT)
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      required
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => {
                        setArchivo(e.target.files?.[0] || null);
                        if (errorCrear) setErrorCrear(null);
                      }}
                      disabled={subiendo}
                      className="liquid-input w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-[var(--accent-primary)] hover:file:bg-blue-500/20 rounded-xl p-1 disabled:opacity-50 cursor-pointer"
                    />
                    <span className="text-[11px] text-[var(--text-tertiary)] mt-1 block">
                      Tamaño máximo admitido: 25 MB
                    </span>
                  </div>

                  <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
                    <button
                      type="button"
                      onClick={() => setModalAbierto(false)}
                      disabled={subiendo}
                      className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={subiendo || !archivo || !titulo.trim()}
                      className="apple-btn-primary flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {subiendo ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          <span>Indexando fragmentos...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={14} />
                          <span>Subir e Indexar</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edición y Reindexación */}
      {modalEditarAbierto && docAEditar && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="liquid-glass-elevated border border-[var(--border-glass)] rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[var(--text-primary)] tracking-tight">Editar documento</h2>
              <button
                onClick={() => !guardandoEdicion && setModalEditarAbierto(false)}
                disabled={guardandoEdicion}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {errorEditar && (
              <div className="flex items-start gap-2.5 p-3 bg-red-500/10 border border-red-500/20 text-[var(--accent-danger)] rounded-xl text-xs">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-snug">{errorEditar}</span>
              </div>
            )}

            <form onSubmit={handleActualizarDocumento} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Título del documento
                </label>
                <input
                  type="text"
                  required
                  value={editTitulo}
                  onChange={(e) => {
                    setEditTitulo(e.target.value);
                    if (errorEditar) setErrorEditar(null);
                  }}
                  disabled={guardandoEdicion}
                  className="liquid-input w-full rounded-xl px-3.5 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                  Reemplazar archivo adjunto (Opcional)
                </label>
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => {
                    setEditArchivo(e.target.files?.[0] || null);
                    if (errorEditar) setErrorEditar(null);
                  }}
                  disabled={guardandoEdicion}
                  className="liquid-input w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-[var(--accent-primary)] hover:file:bg-blue-500/20 rounded-xl p-1 disabled:opacity-50 cursor-pointer"
                />
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                  {editArchivo
                    ? "Al adjuntar un nuevo archivo se recalculan los fragmentos y embeddings en pgvector."
                    : "Deja este campo vacío si solo deseas renombrar el documento."}
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setModalEditarAbierto(false)}
                  disabled={guardandoEdicion}
                  className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoEdicion || !editTitulo.trim()}
                  className="apple-btn-primary flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {guardandoEdicion ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>{editArchivo ? "Regenerando embeddings..." : "Guardando cambios..."}</span>
                    </>
                  ) : (
                    <span>Guardar cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};