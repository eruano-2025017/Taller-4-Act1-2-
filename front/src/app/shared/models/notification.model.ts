export interface NotificationItem {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  monto: number | null;
  icono: string;
  leido: boolean;
  fechaRelativa: string;
  created_at: string;
}

export interface NotificationResponse {
  notificaciones: NotificationItem[];
  noLeidas: number;
  total: number;
}

