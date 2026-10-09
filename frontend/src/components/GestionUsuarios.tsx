
import React, { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Shield,
  Search,
  RefreshCw,
  Circle,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { API_URL } from "../utils/api";

interface UsuarioAdmin {
  id_usuario: number;
  nombre: string;
  correo: string;
  rol_id: number;
  rol_nombre: string;
  fecha_registro: string;
  ultima_conexion: string;
  online: boolean;
}

type Notificacion = {
  tipo: "exito" | "advertencia";
  titulo: string;
  mensaje: string;
};

const ROLES = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Ejecutivo" },
  { id: 3, nombre: "Cliente" },
];

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

// Convierte los errores de FastAPI en mensajes legibles.
function obtenerMensajeError(data: unknown): string {
  if (!data || typeof data !== "object") {
    return "No se pudo completar la operación.";
  }

  const detalle = (data as { detail?: unknown }).detail;

  if (typeof detalle === "string") {
    return detalle;
  }

  if (Array.isArray(detalle)) {
    return detalle
      .map((error: unknown) => {
        if (!error || typeof error !== "object") {
          return "Error de validación.";
        }

        const item = error as {
          loc?: Array<string | number>;
          msg?: string;
        };

        const campo = Array.isArray(item.loc)
          ? item.loc.join(".")
          : "Campo desconocido";

        return `${campo}: ${item.msg || "Valor inválido"}`;
      })
      .join(" | ");
  }

  return "No se pudo completar la operación.";
}

// ============================================================
// MODAL PARA CREAR UN USUARIO NUEVO
// ============================================================

interface ModalAgregarUsuarioProps {
  onClose: () => void;
  onUsuarioCreado: (correoEnviado: boolean) => void;
}

const ModalAgregarUsuario: React.FC<ModalAgregarUsuarioProps> = ({
  onClose,
  onUsuarioCreado,
}) => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState(3);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = getToken();

    if (!token) {
      setError(
        "Tu sesión ha expirado. Vuelve a iniciar sesión."
      );
      return;
    }

    if (!nombre.trim() || !apellido.trim() || !correo.trim()) {
      setError("Debes completar todos los campos.");
      return;
    }

    setEnviando(true);

    try {
      const res = await fetch(
        `${API_URL}/api/admin/usuarios`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            correo: correo.trim().toLowerCase(),
            rol,
          }),
        }
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error(
          "Error al crear usuario:",
          res.status,
          data
        );

        throw new Error(obtenerMensajeError(data));
      }

      // Informar al componente principal del resultado.
      // Ya no utilizamos alert() del navegador.
      onUsuarioCreado(data?.correo_enviado === true);

    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error inesperado."
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        {/* CABECERA */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">
            Agregar Usuario
          </h2>

          <button
            type="button"
            onClick={onClose}
            disabled={enviando}
            aria-label="Cerrar formulario"
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* NOMBRE Y APELLIDO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="nuevo-usuario-nombre"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Nombre
              </label>

              <input
                id="nuevo-usuario-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="nuevo-usuario-apellido"
                className="block text-xs font-semibold text-slate-600 mb-1"
              >
                Apellido
              </label>

              <input
                id="nuevo-usuario-apellido"
                type="text"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* CORREO */}
          <div>
            <label
              htmlFor="nuevo-usuario-correo"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Correo
            </label>

            <input
              id="nuevo-usuario-correo"
              type="email"
              required
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* INFORMACIÓN DE ACTIVACIÓN */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              El usuario recibirá un correo electrónico
              con un enlace para activar su cuenta
              y establecer su contraseña.
            </p>
          </div>

          {/* ROL */}
          <div>
            <label
              htmlFor="nuevo-usuario-rol"
              className="block text-xs font-semibold text-slate-600 mb-1"
            >
              Rol
            </label>

            <select
              id="nuevo-usuario-rol"
              value={rol}
              onChange={(e) => setRol(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* ERRORES DEL FORMULARIO */}
          {error && (
            <p
              role="alert"
              className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
            >
              {error}
            </p>
          )}

          {/* ACCIONES */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={enviando}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={enviando}
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
            >
              {enviando ? "Creando..." : "Crear usuario"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const GestionUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  // Nueva notificación integrada en SupportAI.
  const [notificacion, setNotificacion] =
    useState<Notificacion | null>(null);

  const cargarUsuarios = async () => {
    setCargando(true);

    try {
      const token = getToken();

      const res = await fetch(
        `${API_URL}/api/admin/usuarios?t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            ...(token
              ? { Authorization: `Bearer ${token}` }
              : {}),
          },
        }
      );

      if (res.ok) {
        setUsuarios(await res.json());
      } else {
        console.error(
          "No se pudo cargar la lista de usuarios:",
          res.status
        );
      }
    } catch (err) {
      console.error(
        "Error al cargar lista de usuarios:",
        err
      );
    } finally {
      setCargando(false);
    }
  };

  // Cargar usuarios y mantener actualización automática.
  useEffect(() => {
    cargarUsuarios();

    const interval = setInterval(cargarUsuarios, 15000);

    return () => clearInterval(interval);
  }, []);

  // Ocultar automáticamente la notificación tras 5 segundos.
  useEffect(() => {
    if (!notificacion) return;

    const timeout = window.setTimeout(() => {
      setNotificacion(null);
    }, 5000);

    return () => window.clearTimeout(timeout);
  }, [notificacion]);

  // Se ejecuta cuando el backend confirma la creación.
  const handleUsuarioCreado = (correoEnviado: boolean) => {
    // Cerrar el modal sin perder la notificación.
    setModalAbierto(false);

    // Actualizar la tabla sin interrumpir la operación.
    void cargarUsuarios();

    if (correoEnviado) {
      setNotificacion({
        tipo: "exito",
        titulo: "Usuario creado correctamente",
        mensaje:
          "Se envió el correo de activación al nuevo usuario.",
      });
    } else {
      setNotificacion({
        tipo: "advertencia",
        titulo: "Usuario creado con advertencia",
        mensaje:
          "La cuenta fue creada, pero no se pudo confirmar el envío del correo de activación. Revisa el backend antes de intentar crearla nuevamente.",
      });
    }
  };

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rol_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalOnline = usuarios.filter(
    (u) => u.online
  ).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">

      {/* NOTIFICACIÓN INTEGRADA */}
      {notificacion && (
        <div
          role={notificacion.tipo === "advertencia" ? "alert" : "status"}
          aria-live={notificacion.tipo === "advertencia" ? "assertive" : "polite"}
          className="fixed top-5 right-5 z-[60] w-[calc(100%-2.5rem)] max-w-sm animate-in fade-in slide-in-from-top-3 duration-300"
        >
          <div
            className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xl bg-white ${
              notificacion.tipo === "exito"
                ? "border-emerald-200"
                : "border-amber-200"
            }`}
          >
            {/* ICONO */}
            <div
              className={`shrink-0 rounded-xl p-2 ${
                notificacion.tipo === "exito"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-amber-50 text-amber-600"
              }`}
            >
              {notificacion.tipo === "exito" ? (
                <CheckCircle2 size={20} />
              ) : (
                <AlertTriangle size={20} />
              )}
            </div>

            {/* CONTENIDO */}
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-bold ${
                  notificacion.tipo === "exito"
                    ? "text-emerald-700"
                    : "text-amber-700"
                }`}
              >
                {notificacion.titulo}
              </p>

              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                {notificacion.mensaje}
              </p>
            </div>

            {/* CERRAR NOTIFICACIÓN */}
            <button
              type="button"
              onClick={() => setNotificacion(null)}
              aria-label="Cerrar notificación"
              className="shrink-0 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}

      {/* CABECERA SUPERIOR */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Gestión de Usuarios
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={cargarUsuarios}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw
              size={14}
              className={
                cargando
                  ? "animate-spin text-blue-600"
                  : ""
              }
            />
            <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNotificacion(null);
              setModalAbierto(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>Agregar Usuario</span>
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">

        {/* TARJETAS DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* TOTAL DE CUENTAS */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
                {usuarios.length}
              </span>

              <span className="text-xs font-medium text-slate-500 mt-1 block">
                Total de cuentas
              </span>
            </div>

            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          {/* USUARIOS EN LÍNEA */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 block">
                {totalOnline}
              </span>

              <span className="text-xs font-medium text-slate-500 mt-1 block">
                Conectados ahora
              </span>
            </div>

            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserCheck size={20} />
            </div>
          </div>

          {/* ROLES */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">
                {ROLES.length}
              </span>

              <span className="text-xs font-medium text-slate-500 mt-1 block">
                Roles definidos (RBAC)
              </span>
            </div>

            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
          </div>

        </div>

        {/* BARRA DE BÚSQUEDA */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-3 text-slate-400"
              size={18}
            />

            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o rol..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* TABLA DE USUARIOS */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">

              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">
                    Usuario
                  </th>

                  <th className="px-6 py-3.5">
                    Rol
                  </th>

                  <th className="px-6 py-3.5">
                    Estado de Conexión
                  </th>

                  <th className="px-6 py-3.5">
                    Última Conexión
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filtrados.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      {cargando
                        ? "Cargando usuarios..."
                        : "No se encontraron usuarios coincidentes."}
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => (
                    <tr
                      key={u.id_usuario}
                      className="hover:bg-slate-50/50 transition-colors"
                    >

                      {/* USUARIO */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {u.nombre}
                          </p>

                          <p className="text-[14px] text-slate-400">
                            {u.correo}
                          </p>
                        </div>
                      </td>

                      {/* ROL */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[13px] font-semibold border ${
                            u.rol_nombre === "Administrador"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : u.rol_nombre === "Ejecutivo"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {u.rol_nombre}
                        </span>
                      </td>

                      {/* ESTADO DE CONEXIÓN */}
                      <td className="px-6 py-4">
                        {u.online ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full w-fit">
                            <Circle
                              size={8}
                              className="fill-emerald-500 text-emerald-500"
                            />

                            <span>En línea</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 w-fit">
                            <Circle
                              size={8}
                              className="fill-slate-300 text-slate-300"
                            />

                            <span>Desconectado</span>
                          </div>
                        )}
                      </td>

                      {/* ÚLTIMA CONEXIÓN */}
                      <td className="px-6 py-4 text-slate-500 font-mono text-[15px]">
                        {u.ultima_conexion}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>

            </table>
          </div>
        </div>

      </div>

      {/* MODAL AGREGAR USUARIO */}
      {modalAbierto && (
        <ModalAgregarUsuario
          onClose={() => setModalAbierto(false)}
          onUsuarioCreado={handleUsuarioCreado}
        />
      )}

    </div>
  );
};
