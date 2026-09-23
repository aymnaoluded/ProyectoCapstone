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

export interface ConversacionResumen {
  id_conversacion: number;
  fecha_inicio: string;
  fecha_ultimo_mensaje?: string;
  fecha_fin: string | null;
  calificacion: number | null;
  escalada: boolean;
  finalizada: boolean;
  titulo: string;
  primer_mensaje: string;
  total_mensajes: number;
}

export interface ConversacionDetalle {
  id_conversacion: number;
  cliente_id: number;
  cliente_nombre: string;
  cliente_correo: string;
  fecha_inicio: string;
  fecha_fin: string | null;
  calificacion: number | null;
  escalada: boolean;
  finalizada: boolean;
  titulo: string;
}