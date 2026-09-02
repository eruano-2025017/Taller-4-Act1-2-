export interface IncomeItem {
  id: number;
  user_id: number;
  tipo: "ingreso";
  categoria: string;
  descripcion: string;
  monto: number;
  metodo: string;
  observacion?: string | null;
  fecha: string;
  created_at: string;
}

export interface IncomeSummary {
  totalIngresos: number;
  variacionMes: string;
  ultimoIngreso: number;
  promedioMensual: number;
}

export interface EvolutionDataPoint {
  label: string;
  monto: number;
}

export interface IncomeDashboardData {
  summary: IncomeSummary;
  evolucion: EvolutionDataPoint[];
  incomes: IncomeItem[];
}

export interface CreateIncomeDto {
  descripcion: string;
  monto: number;
  categoria: string;
  metodo: string;
  observacion?: string;
  fecha?: string;
}

