export interface MonthlyBarItem {
  mes: string;
  ingresos: number;
  egresos: number;
}

export interface CategoryBreakdownItem {
  categoria: string;
  monto: number;
  porcentaje: number;
  color: string;
}

export interface RecentActivityItem {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  monto: number | null;
  icono: string;
  fechaRelativa: string;
  created_at: string;
}

export interface DashboardData {
  balance: number;
  totalIngresos: number;
  totalEgresos: number;
  gastosFijos: number;
  gastosVariables: number;
  porcentajeFijos: number;
  porcentajeVariables: number;
  saldoVariacion: string;
  ingresosVariacion: string;
  egresosVariacion: string;
  graficaMensual: MonthlyBarItem[];
  gastosPorCategoria: CategoryBreakdownItem[];
  actividadReciente: RecentActivityItem[];
  tieneMovimientos: boolean;
}
