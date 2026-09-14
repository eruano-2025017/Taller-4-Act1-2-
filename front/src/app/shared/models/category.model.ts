export interface CategoryItem {
  id: number;
  user_id?: number;
  nombre: string;
  tipo: "ingreso" | "egreso";
  icono: string;
  color: string;
  descripcion?: string | null;
  movimientos?: number;
  total_monto?: number;
  created_at?: string;
}

export interface CategorySummary {
  totalCategorias: number;
  categoriasIngreso: number;
  categoriasEgreso: number;
}

export interface CategoryDashboardData {
  summary: CategorySummary;
  categories: CategoryItem[];
}

export interface CreateCategoryDto {
  nombre: string;
  tipo: "ingreso" | "egreso";
  icono?: string;
  color?: string;
  descripcion?: string;
}

