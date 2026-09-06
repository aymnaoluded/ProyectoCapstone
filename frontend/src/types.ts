export interface Usuario {
  id_usuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  rol_id: number;
  rol_nombre: "Administrador" | "Ejecutivo" | "Cliente";
}

export interface Fuente {
  id_fragmento: number;
  similitud: number;
  extracto: string;
}

export interface Mensaje {
  id: string;
  emisor: "user" | "bot";
  texto: string;
  hora: string;
  nivelConfianza?: "ALTA" | "MEDIA" | "BAJA";
  scoreMaximo?: number;
  escalarEjecutivo?: boolean;
  fuentes?: Fuente[];
}