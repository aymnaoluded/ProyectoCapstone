import React, { useEffect, useState } from "react";
import { Users, UserCheck, Search, Plus, UserPlus, Headphones, Home, AlertCircle, MailCheck } from "lucide-react";

import { API_URL } from "../utils/api";
import { useToast } from "../context/ToastContext";
import { EncabezadoPagina, BotonRecargar, Kpi, EstadoVacio, Aviso } from "./ui/Pagina";
import { Modal } from "./ui/Modal";
import { IndicadorVentanas } from "./ui/Fachada";
import { Esqueleto } from "./ui/Skeleton";

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

const ROLES = [
  { id: 1, nombre: "Administrador" },
  { id: 2, nombre: "Ejecutivo" },
  { id: 3, nombre: "Cliente" },
];

const CLASE_ROL: Record<string, string> = {
  Administrador: "bg-noche text-menta",
  Ejecutivo: "insignia-coral",
  Cliente: "insignia-proceso",
};

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
        const item = error as { loc?: Array<string | number>; msg?: string };
        const campo = Array.isArray(item.loc) ? item.loc.join(".") : "Campo desconocido";
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
  abierto: boolean;
  onClose: () => void;
  onUsuarioCreado: (correoEnviado: boolean) => void;
}

const ModalAgregarUsuario: React.FC<ModalAgregarUsuarioProps> = ({ abierto, onClose, onUsuarioCreado }) => {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [rol, setRol] = useState(3);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Formulario limpio cada vez que se abre (ajuste durante el render, no en un efecto)
  const [abiertoPrevio, setAbiertoPrevio] = useState(abierto);
  if (abiertoPrevio !== abierto) {
    setAbiertoPrevio(abierto);
    if (abierto) {
      setNombre("");
      setApellido("");
      setCorreo("");
      setRol(3);
      setError(null);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const token = getToken();

    if (!token) {
      setError("Tu sesión ha expirado. Vuelve a iniciar sesión.");
      return;
    }

    if (!nombre.trim() || !apellido.trim() || !correo.trim()) {
      setError("Debes completar todos los campos.");
      return;
    }

    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/api/admin/usuarios`, {
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
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        console.error("Error al crear usuario:", res.status, data);
        throw new Error(obtenerMensajeError(data));
      }

      onUsuarioCreado(data?.correo_enviado === true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onClose}
      bloqueado={enviando}
      ancho="md"
      icono={<UserPlus size={18} />}
      titulo="Agregar usuario"
      descripcion="La persona recibirá un correo con un enlace para activar su cuenta y crear su contraseña."
      pie={
        <>
          <button type="button" onClick={onClose} disabled={enviando} className="boton boton-fantasma">
            Cancelar
          </button>
          <button type="submit" form="form-nuevo-usuario" disabled={enviando} className="boton boton-primario">
            {enviando ? <IndicadorVentanas /> : <UserPlus size={16} />}
            {enviando ? "Creando…" : "Crear usuario"}
          </button>
        </>
      }
    >
      <form id="form-nuevo-usuario" onSubmit={handleSubmit} className="space-y-4 pb-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="nuevo-usuario-nombre" className="etiqueta">
              Nombre
            </label>
            <input
              id="nuevo-usuario-nombre"
              type="text"
              required
              maxLength={100}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="given-name"
              className="campo"
            />
          </div>
          <div>
            <label htmlFor="nuevo-usuario-apellido" className="etiqueta">
              Apellido
            </label>
            <input
              id="nuevo-usuario-apellido"
              type="text"
              required
              maxLength={100}
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              autoComplete="family-name"
              className="campo"
            />
          </div>
        </div>

        <div>
          <label htmlFor="nuevo-usuario-correo" className="etiqueta">
            Correo
          </label>
          <input
            id="nuevo-usuario-correo"
            type="email"
            required
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoComplete="email"
            placeholder="nombre@correo.com"
            className="campo"
          />
        </div>

        <fieldset>
          <legend className="etiqueta">Rol</legend>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {ROLES.map((r) => (
              <label
                key={r.id}
                className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[0.8125rem] font-semibold cursor-pointer transition-all
                  has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-petroleo
                  ${rol === r.id ? "border-petroleo bg-menta-2 text-petroleo-hover" : "border-linea-fuerte text-tinta-2 hover:border-tinta-3"}`}
              >
                <input
                  type="radio"
                  name="nuevo-usuario-rol"
                  value={r.id}
                  checked={rol === r.id}
                  onChange={() => setRol(r.id)}
                  className="sr-only"
                />
                {r.id === 1 ? <Users size={17} /> : r.id === 2 ? <Headphones size={17} /> : <Home size={17} />}
                {r.nombre}
              </label>
            ))}
          </div>
        </fieldset>

        {error && <Aviso icono={<AlertCircle size={16} />}>{error}</Aviso>}
      </form>
    </Modal>
  );
};

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export const GestionUsuarios: React.FC = () => {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalAbierto, setModalAbierto] = useState(false);

  const cargarUsuarios = async () => {
    setCargando(true);

    try {
      const token = getToken();

      const res = await fetch(`${API_URL}/api/admin/usuarios?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        setUsuarios(await res.json());
      } else {
        console.error("No se pudo cargar la lista de usuarios:", res.status);
      }
    } catch (err) {
      console.error("Error al cargar lista de usuarios:", err);
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

  // Se ejecuta cuando el backend confirma la creación.
  const handleUsuarioCreado = (correoEnviado: boolean) => {
    setModalAbierto(false);
    void cargarUsuarios();

    if (correoEnviado) {
      toast.exito("Usuario creado correctamente", "Se envió el correo de activación al nuevo usuario.");
    } else {
      toast.aviso(
        "Usuario creado con advertencia",
        "La cuenta fue creada, pero no se pudo confirmar el envío del correo de activación. Revisa el backend antes de intentar crearla nuevamente."
      );
    }
  };

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rol_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalOnline = usuarios.filter((u) => u.online).length;
  const totalEquipo = usuarios.filter((u) => u.rol_nombre !== "Cliente").length;
  const totalResidentes = usuarios.length - totalEquipo;
  const cargaInicial = cargando && usuarios.length === 0;

  const conexion = (u: UsuarioAdmin) =>
    u.online ? (
      <span className="inline-flex items-center gap-2 text-[0.8125rem] font-semibold text-tinta">
        <span className="ventana ventana-encendida w-[7px] h-[9px]" aria-hidden="true" /> En línea
      </span>
    ) : (
      <span className="inline-flex items-center gap-2 text-[0.8125rem] text-tinta-2">
        <span className="ventana ventana-clara w-[7px] h-[9px]" aria-hidden="true" /> Desconectado
      </span>
    );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto barra-fina">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 space-y-7">
        <EncabezadoPagina
          ceja="Administración"
          titulo={
            <>
              Gestión de <em>usuarios</em>
            </>
          }
          descripcion="Cuentas de residentes, ejecutivos y administración. La conexión se actualiza sola cada 15 segundos."
          acciones={
            <>
              <BotonRecargar onClick={cargarUsuarios} cargando={cargando} soloIcono etiqueta="Actualizar usuarios" />
              <button type="button" onClick={() => setModalAbierto(true)} className="boton boton-primario">
                <Plus size={17} />
                Agregar usuario
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 escalonado">
          <Kpi etiqueta="Cuentas" valor={usuarios.length} detalle="Registradas en la plataforma" icono={<Users size={16} />} />
          <Kpi etiqueta="En línea" valor={totalOnline} detalle="Conectadas ahora mismo" icono={<UserCheck size={16} />} tono="luz" />
          <Kpi etiqueta="Equipo" valor={totalEquipo} detalle="Administración y ejecutivos" icono={<Headphones size={16} />} tono="coral" />
          <Kpi etiqueta="Residentes" valor={totalResidentes} detalle="Cuentas de clientes" icono={<Home size={16} />} tono="exito" />
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tinta-3 pointer-events-none" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o rol"
            aria-label="Buscar usuarios por nombre, correo o rol"
            className="campo !pl-10 !rounded-full !min-h-[2.5rem]"
          />
        </div>

        <div className="superficie overflow-hidden">
          {cargaInicial ? (
            <div className="p-5 space-y-4" role="status" aria-label="Cargando usuarios">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Esqueleto className="w-9 h-10 !rounded-t-full" />
                  <div className="flex-1 space-y-2">
                    <Esqueleto className="h-3.5 w-1/3" />
                    <Esqueleto className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <EstadoVacio
              compacto
              titulo={usuarios.length === 0 ? "Aún no hay usuarios" : "Sin coincidencias"}
              descripcion={usuarios.length === 0 ? "Agrega la primera cuenta para comenzar." : `Ningún usuario coincide con “${busqueda}”.`}
            />
          ) : (
            <>
              {/* Escritorio: tabla */}
              <div className="hidden md:block overflow-x-auto">
                <table className="tabla">
                  <caption className="sr-only">Usuarios de la plataforma</caption>
                  <thead>
                    <tr>
                      <th scope="col">Usuario</th>
                      <th scope="col">Rol</th>
                      <th scope="col">Conexión</th>
                      <th scope="col">Última conexión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((u) => (
                      <tr key={u.id_usuario}>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="arco grid place-items-center w-8 h-9 shrink-0 bg-papel-2 text-tinta-2 text-[0.8125rem] font-semibold">
                              {u.nombre.trim().charAt(0).toUpperCase()}
                            </span>
                            <div className="min-w-0">
                              <p className="font-semibold text-tinta truncate">{u.nombre}</p>
                              <p className="text-[0.8125rem] text-tinta-2 truncate">{u.correo}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`insignia insignia-sin-punto ${CLASE_ROL[u.rol_nombre] ?? "insignia-cerrado"}`}>{u.rol_nombre}</span>
                        </td>
                        <td>
                          {conexion(u)}
                        </td>
                        <td className="text-tinta-2 tabular-nums whitespace-nowrap">{u.ultima_conexion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Celular: tarjetas */}
              <ul className="md:hidden divide-y divide-linea">
                {filtrados.map((u) => (
                  <li key={u.id_usuario} className="flex items-start gap-3 px-4 py-3.5">
                    <span className="arco grid place-items-center w-8 h-9 shrink-0 bg-papel-2 text-tinta-2 text-[0.8125rem] font-semibold">
                      {u.nombre.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-tinta truncate">{u.nombre}</p>
                        <span className={`insignia insignia-sin-punto shrink-0 ${CLASE_ROL[u.rol_nombre] ?? "insignia-cerrado"}`}>
                          {u.rol_nombre}
                        </span>
                      </div>
                      <p className="text-[0.8125rem] text-tinta-2 truncate">{u.correo}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        {conexion(u)}
                        <span className="text-[0.75rem] text-tinta-3 tabular-nums">{u.ultima_conexion}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <p className="flex items-center gap-2 text-[0.8125rem] text-tinta-3">
          <MailCheck size={15} /> Las cuentas nuevas quedan pendientes hasta que la persona active su enlace.
        </p>
      </div>

      <ModalAgregarUsuario abierto={modalAbierto} onClose={() => setModalAbierto(false)} onUsuarioCreado={handleUsuarioCreado} />
    </div>
  );
};
