import React, { useEffect, useState, useRef } from "react";
import { Plus, Database, BookOpen, FileText, Upload, X, Loader2, RefreshCw } from "lucide-react";
import type { Usuario } from "../types";

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
  const [modalAbierto, setModalAbierto] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarDatos = async () => {
    setCargandoLista(true);
    try {
      const timestamp = Date.now();
      const [resStats, resDocs] = await Promise.all([
        fetch(`http://localhost:8000/api/admin/conocimiento/stats?t=${timestamp}`, {
          cache: "no-store",
        }),
        fetch(`http://localhost:8000/api/admin/documentos?t=${timestamp}`, {
          cache: "no-store",
        }),
      ]);

      if (resStats.ok) {
        const statsData = await resStats.json();
        setStats(statsData);
      }

      if (resDocs.ok) {
        const docsData = await resDocs.json();
        setDocumentos(docsData);
      }
    } catch (err) {
      console.error("Error al cargar la base de conocimiento:", err);
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
      const res = await fetch(
        `http://localhost:8000/api/admin/documentos/${id}/toggle?usuario_id=${usuario.id_usuario}`,
        {
          method: "PATCH",
        }
      );
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
      }
    } catch (err) {
      console.error("Error al alternar estado del documento:", err);
    } finally {
      setProcesandoDocId(null);
    }
  };

  const handleSubirDocumento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo || !titulo.trim()) return;

    setSubiendo(true);
    const formData = new FormData();
    formData.append("titulo", titulo.trim());
    formData.append("admin_id", usuario.id_usuario.toString());
    formData.append("archivo", archivo);

    try {
      const res = await fetch("http://localhost:8000/api/documentos", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setModalAbierto(false);
        setTitulo("");
        setArchivo(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        await cargarDatos();
      } else {
        const errorData = await res.json().catch(() => ({ detail: "Error desconocido" }));
        alert(`Error al indexar: ${errorData.detail || "Error en el servidor"}`);
      }
    } catch (err) {
      alert("Fallo en la comunicación con el servidor al subir el archivo.");
      console.error(err);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Cabecera Superior */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Base de conocimiento</h1>
          <p className="text-xs text-slate-500 mt-1">
            Documentos, manuales y directrices indexados para el motor RAG.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={cargarDatos}
            title="Recargar listado"
            className="p-2 text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={15} className={cargandoLista ? "animate-spin text-blue-600" : ""} />
          </button>
          <button
            onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>Agregar documento</span>
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Métricas Superiores */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-2xl font-bold text-slate-900 block">{stats.documentos}</span>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Documentos totales</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-2xl font-bold text-emerald-600 block">{stats.publicados}</span>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Publicados (Activos RAG)</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-2xl font-bold text-slate-900 block">{stats.fragmentos_indexados}</span>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Fragmentos indexados</span>
          </div>
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
            <span className="text-2xl font-bold text-slate-900 block">{stats.consultas_atendidas}</span>
            <span className="text-xs font-medium text-slate-500 mt-1 block">Consultas atendidas</span>
          </div>
        </div>

        {/* Estado de Carga o Lista de Documentos */}
        {cargandoLista && documentos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
            <Loader2 className="animate-spin text-blue-600" size={24} />
            <p className="text-xs">Cargando base de conocimiento...</p>
          </div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl p-8 space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-400">
              <Database size={24} />
            </div>
            <h3 className="text-sm font-semibold text-slate-700">No hay documentos indexados</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Presiona el botón "Agregar documento" para subir un PDF y procesar los fragmentos en pgvector.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documentos.map((doc) => (
              <div
                key={doc.id_documento}
                className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                      {doc.titulo.toLowerCase().includes("faq") ? (
                        <BookOpen size={18} />
                      ) : doc.titulo.toLowerCase().includes("api") ? (
                        <FileText size={18} />
                      ) : (
                        <Database size={18} />
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm leading-snug">{doc.titulo}</h3>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          Manual
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500">
                          {doc.total_fragmentos} fragmentos
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500">{doc.usos} usos</span>
                      </div>
                    </div>
                  </div>

                  {doc.activo ? (
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 rounded-full shrink-0">
                      Publicado
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-0.5 rounded-full shrink-0">
                      Despublicado
                    </span>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Actualizado {doc.fecha}</span>
                  <button
                    onClick={() => handleToggleActivo(doc.id_documento)}
                    disabled={procesandoDocId === doc.id_documento}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                      doc.activo
                        ? "text-slate-700 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200"
                        : "text-white bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20"
                    }`}
                  >
                    {procesandoDocId === doc.id_documento && (
                      <Loader2 size={12} className="animate-spin" />
                    )}
                    <span>{doc.activo ? "Despublicar" : "Publicar"}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Carga */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">Agregar nuevo documento</h2>
              <button
                onClick={() => !subiendo && setModalAbierto(false)}
                disabled={subiendo}
                className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubirDocumento} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Título del documento
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Manual de Atención y Políticas"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  disabled={subiendo}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Archivo (PDF, DOCX o TXT)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  required
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setArchivo(e.target.files?.[0] || null)}
                  disabled={subiendo}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 border border-slate-200 rounded-xl p-1 disabled:opacity-50"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  disabled={subiendo}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={subiendo || !archivo || !titulo.trim()}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
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
          </div>
        </div>
      )}
    </div>
  );
};