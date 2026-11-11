import {
  MessagesSquare,
  Ticket,
  Inbox,
  Headphones,
  History,
  Database,
  Users,
  BarChart3,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { Usuario } from "../types";

/* Única fuente de verdad de la navegación: la usan el directorio lateral,
   la barra inferior del celular, la barra superior y los accesos rápidos. */

export type VistaApp =
  | "chat"
  | "mis_tickets"
  | "bandeja_tickets"
  | "tickets_asignados"
  | "historial_tickets"
  | "admin_conocimiento"
  | "admin_usuarios"
  | "metricas"
  | "auditoria";

export interface ItemNavegacion {
  vista: VistaApp;
  etiqueta: string;
  corta: string;
  icono: LucideIcon;
  categoria: string;
  descripcion: string;
  /** Si aparece en la barra inferior del celular (máximo 5) */
  enMovil?: boolean;
}

export const NAVEGACION: Record<Usuario["rol_nombre"], ItemNavegacion[]> = {
  Cliente: [
    {
      vista: "chat",
      etiqueta: "Asistente Luz",
      corta: "Luz",
      icono: MessagesSquare,
      categoria: "Atención al residente",
      descripcion: "Pregúntale a Luz por reglamentos y documentos de tu comunidad",
      enMovil: true,
    },
    {
      vista: "mis_tickets",
      etiqueta: "Mis solicitudes",
      corta: "Solicitudes",
      icono: Ticket,
      categoria: "Atención al residente",
      descripcion: "Seguimiento de tus casos con el equipo",
      enMovil: true,
    },
  ],
  Ejecutivo: [
    {
      vista: "bandeja_tickets",
      etiqueta: "Bandeja de tickets",
      corta: "Bandeja",
      icono: Inbox,
      categoria: "Mesa de ayuda",
      descripcion: "Casos escalados que esperan responsable",
      enMovil: true,
    },
    {
      vista: "tickets_asignados",
      etiqueta: "Tickets asignados",
      corta: "Asignados",
      icono: Headphones,
      categoria: "Mi trabajo",
      descripcion: "Casos que estás atendiendo",
      enMovil: true,
    },
    {
      vista: "historial_tickets",
      etiqueta: "Historial",
      corta: "Historial",
      icono: History,
      categoria: "Archivo de casos",
      descripcion: "Casos cerrados que atendiste",
      enMovil: true,
    },
  ],
  Administrador: [
    {
      vista: "admin_conocimiento",
      etiqueta: "Base de conocimiento",
      corta: "Documentos",
      icono: Database,
      categoria: "Administración",
      descripcion: "Documentos que usa Luz para responder",
      enMovil: true,
    },
    {
      vista: "bandeja_tickets",
      etiqueta: "Supervisión de tickets",
      corta: "Tickets",
      icono: Inbox,
      categoria: "Mesa de ayuda",
      descripcion: "Asigna y sigue los casos activos",
      enMovil: true,
    },
    {
      vista: "historial_tickets",
      etiqueta: "Historial de tickets",
      corta: "Historial",
      icono: History,
      categoria: "Archivo de casos",
      descripcion: "Casos cerrados; aquí se pueden reabrir",
    },
    {
      vista: "admin_usuarios",
      etiqueta: "Usuarios",
      corta: "Usuarios",
      icono: Users,
      categoria: "Administración",
      descripcion: "Cuentas, roles y conexión",
      enMovil: true,
    },
    {
      vista: "metricas",
      etiqueta: "Métricas",
      corta: "Métricas",
      icono: BarChart3,
      categoria: "Analítica",
      descripcion: "Uso de Luz, calidad y tickets",
      enMovil: true,
    },
    {
      vista: "auditoria",
      etiqueta: "Auditoría",
      corta: "Auditoría",
      icono: ShieldCheck,
      categoria: "Seguridad y trazabilidad",
      descripcion: "Registro de acciones en la plataforma",
      enMovil: true,
    },
  ],
};

export const ETIQUETA_ROL: Record<Usuario["rol_nombre"], string> = {
  Cliente: "Residente",
  Ejecutivo: "Ejecutivo",
  Administrador: "Administración",
};

export const itemsDeRol = (rol?: Usuario["rol_nombre"]): ItemNavegacion[] => (rol ? NAVEGACION[rol] ?? [] : []);

export const buscarItem = (rol: Usuario["rol_nombre"] | undefined, vista: VistaApp) =>
  itemsDeRol(rol).find((i) => i.vista === vista);
