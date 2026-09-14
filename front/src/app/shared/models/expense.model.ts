export interface ExpenseItem {
  id: number;
  user_id: number;
  tipo: "egreso";
  categoria: string;
  descripcion: string;
  monto: number;
  metodo: string;
  observacion?: string | null;
  fecha: string;
  created_at: string;
}

export interface ExpenseSummary {
  totalEgresos: number;
  variacionMes: string;
  ultimoEgreso: number;
  promedioMensual: number;
}

export interface EvolutionDataPoint {
  label: string;
  monto: number;
}

export interface ExpenseDashboardData {
  summary: ExpenseSummary;
  evolucion: EvolutionDataPoint[];
  expenses: ExpenseItem[];
}

export interface CreateExpenseDto {
  descripcion: string;
  monto: number;
  categoria: string;
  metodo: string;
  observacion?: string;
  fecha?: string;
}

