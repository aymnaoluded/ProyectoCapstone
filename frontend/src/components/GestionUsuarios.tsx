import React, { useEffect, useState } from "react";
import { Users, UserCheck, Shield, Search, RefreshCw, Circle, Plus } from "lucide-react";

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

export const GestionUsuarios: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargarUsuarios = async () => {
    setCargando(true);
    try {
      const res = await fetch(`http://localhost:8000/api/admin/usuarios?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (res.ok) {
        setUsuarios(await res.json());
      }
    } catch (err) {
      console.error("Error al cargar lista de usuarios:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    // Auto-refresco cada 15 segundos para monitorear conexiones
    const interval = setInterval(cargarUsuarios, 15000);
    return () => clearInterval(interval);
  }, []);

  const filtrados = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.rol_nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const totalOnline = usuarios.filter((u) => u.online).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto">
      {/* Cabecera Superior */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-s text-slate-500 mt-1">
            Listado general de cuentas, roles asignados y monitoreo de presencia en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
          onClick={cargarUsuarios}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-all"
        >
          <RefreshCw size={14} className={cargando ? "animate-spin text-blue-600" : ""} />
          <span>Actualizar</span>
        </button>
        <button
            onClick={() => (true)} //Falta crear Modal para crear nuevos usuarios
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <Plus size={16} />
            <span>Agregar Usuario</span>
          </button>
        </div>
      </div>

      <div className="p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Tarjetas de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">{usuarios.length}</span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Total de cuentas</span>
            </div>
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-emerald-600 block">{totalOnline}</span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Conectados ahora</span>
            </div>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <UserCheck size={20} />
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-900 block">3</span>
              <span className="text-xs font-medium text-slate-500 mt-1 block">Roles definidos (RBAC)</span>
            </div>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Shield size={20} />
            </div>
          </div>
        </div>

        {/* Barra de búsqueda */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, correo o rol..."
              className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-s focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Tabla de Usuarios */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3.5">Usuario</th>
                  <th className="px-6 py-3.5">Rol</th>
                  <th className="px-6 py-3.5">Estado de Conexión</th>
                  <th className="px-6 py-3.5">Última Conexión</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      No se encontraron usuarios coincidentes.
                    </td>
                  </tr>
                ) : (
                  filtrados.map((u) => (
                    <tr key={u.id_usuario} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-slate-900">{u.nombre}</p>
                          <p className="text-[14px] text-slate-400">{u.correo}</p>
                        </div>
                      </td>
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
                      <td className="px-6 py-4">
                        {u.online ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200/70 px-2.5 py-0.5 rounded-full w-fit">
                            <Circle size={8} className="fill-emerald-500 text-emerald-500" />
                            <span>En línea</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 font-medium bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full w-fit">
                            <Circle size={8} className="fill-slate-300 text-slate-300" />
                            <span>Desconectado</span>
                          </div>
                        )}
                      </td>
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
    </div>
  );
};