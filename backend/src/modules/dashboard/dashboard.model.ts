import { pool } from "../../config/db";

export interface FinancialSummaryRaw {
  total_ingresos: number;
  total_egresos: number;
  gastos_fijos: number;
  gastos_variables: number;
}

export interface MonthlyChartRow {
  mes: string;
  mes_num: number;
  anio: number;
  ingresos: number;
  egresos: number;
}

export interface CategoryExpenseRow {
  categoria: string;
  monto: number;
}

export interface TransactionRecord {
  id: number;
  tipo: "ingreso" | "egreso";
  categoria: string;
  descripcion: string;
  monto: number;
  es_fijo: boolean;
  fecha: string;
  created_at: string;
}

export const DashboardModel = {
  async getSummary(userId: number): Promise<FinancialSummaryRaw> {
    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::FLOAT AS total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::FLOAT AS total_egresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND es_fijo = true THEN monto ELSE 0 END), 0)::FLOAT AS gastos_fijos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND (es_fijo IS NULL OR es_fijo = false) THEN monto ELSE 0 END), 0)::FLOAT AS gastos_variables
      FROM transactions
      WHERE user_id = $1
    `;
    const result = await pool.query<FinancialSummaryRaw>(query, [userId]);
    return result.rows[0] ?? {
      total_ingresos: 0,
      total_egresos: 0,
      gastos_fijos: 0,
      gastos_variables: 0,
    };
  },

  async getMonthlyMovements(userId: number): Promise<Array<{ mes_num: number; anio: number; ingresos: number; egresos: number }>> {
    const query = `
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes_num,
        EXTRACT(YEAR FROM fecha)::INT AS anio,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::FLOAT AS ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::FLOAT AS egresos
      FROM transactions
      WHERE user_id = $1
      GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
      ORDER BY anio ASC, mes_num ASC
    `;
    const result = await pool.query<{ mes_num: number; anio: number; ingresos: number; egresos: number }>(query, [userId]);
    return result.rows;
  },

  async getExpensesByCategory(userId: number): Promise<CategoryExpenseRow[]> {
    const query = `
      SELECT
        categoria,
        COALESCE(SUM(monto), 0)::FLOAT AS monto
      FROM transactions
      WHERE user_id = $1 AND tipo = 'egreso'
      GROUP BY categoria
      ORDER BY monto DESC
      LIMIT 5
    `;
    const result = await pool.query<CategoryExpenseRow>(query, [userId]);
    return result.rows;
  },

  async getRecentTransactions(userId: number, limit: number = 5): Promise<TransactionRecord[]> {
    const query = `
      SELECT
        id,
        tipo,
        categoria,
        descripcion,
        monto::FLOAT AS monto,
        es_fijo,
        fecha,
        created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY fecha DESC, id DESC
      LIMIT $2
    `;
    const result = await pool.query<TransactionRecord>(query, [userId, limit]);
    return result.rows;
  },
};

