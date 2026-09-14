import { pool } from "../../config/db";

export interface AnalysisFilters {
  year?: number;
  month?: number;
  tipo?: "ingreso" | "egreso" | "todos";
  categoria?: string;
}

export interface AnalysisCategoryItem {
  categoria: string;
  tipo: "ingreso" | "egreso";
  total: number;
  transacciones: number;
  porcentaje: number;
  promedio: number;
}

export interface MonthlyTrendItem {
  mesNum: number;
  mesNombre: string;
  anio: number;
  ingresos: number;
  egresos: number;
  ahorroNeto: number;
  tasaAhorro: number;
}

export const AnalysisModel = {
  async getMetrics(userId: number, filters: AnalysisFilters) {
    let whereClauses = ["user_id = $1"];
    const values: any[] = [userId];

    if (filters.year) {
      values.push(filters.year);
      whereClauses.push(`EXTRACT(YEAR FROM fecha) = $${values.length}`);
    }

    if (filters.month) {
      values.push(filters.month);
      whereClauses.push(`EXTRACT(MONTH FROM fecha) = $${values.length}`);
    }

    if (filters.categoria && filters.categoria !== "todas") {
      values.push(filters.categoria);
      whereClauses.push(`categoria = $${values.length}`);
    }

    const where = whereClauses.join(" AND ");

    const query = `
      SELECT
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::FLOAT AS total_ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::FLOAT AS total_egresos,
        COALESCE(AVG(CASE WHEN tipo = 'ingreso' THEN monto ELSE NULL END), 0)::FLOAT AS promedio_ingresos,
        COALESCE(AVG(CASE WHEN tipo = 'egreso' THEN monto ELSE NULL END), 0)::FLOAT AS promedio_egresos,
        COUNT(CASE WHEN tipo = 'ingreso' THEN 1 END)::INT AS total_transacciones_ingreso,
        COUNT(CASE WHEN tipo = 'egreso' THEN 1 END)::INT AS total_transacciones_egreso,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND es_fijo = true THEN monto ELSE 0 END), 0)::FLOAT AS gastos_fijos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' AND (es_fijo IS NULL OR es_fijo = false) THEN monto ELSE 0 END), 0)::FLOAT AS gastos_variables
      FROM transactions
      WHERE ${where}
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  async getCategoriesBreakdown(userId: number, filters: AnalysisFilters): Promise<AnalysisCategoryItem[]> {
    let whereClauses = ["user_id = $1"];
    const values: any[] = [userId];

    if (filters.year) {
      values.push(filters.year);
      whereClauses.push(`EXTRACT(YEAR FROM fecha) = $${values.length}`);
    }

    if (filters.month) {
      values.push(filters.month);
      whereClauses.push(`EXTRACT(MONTH FROM fecha) = $${values.length}`);
    }

    if (filters.tipo && filters.tipo !== "todos") {
      values.push(filters.tipo);
      whereClauses.push(`tipo = $${values.length}`);
    }

    const where = whereClauses.join(" AND ");

    const query = `
      SELECT
        categoria,
        tipo,
        COALESCE(SUM(monto), 0)::FLOAT AS total,
        COUNT(id)::INT AS transacciones,
        COALESCE(AVG(monto), 0)::FLOAT AS promedio
      FROM transactions
      WHERE ${where}
      GROUP BY categoria, tipo
      ORDER BY total DESC
    `;

    const result = await pool.query(query, values);
    const rows = result.rows;

    const totalGeneral = rows.reduce((acc, r) => acc + Number(r.total), 0);

    return rows.map((r) => ({
      categoria: r.categoria,
      tipo: r.tipo,
      total: Number(r.total),
      transacciones: Number(r.transacciones),
      promedio: Math.round(Number(r.promedio) * 100) / 100,
      porcentaje: totalGeneral > 0 ? Math.round((Number(r.total) / totalGeneral) * 1000) / 10 : 0,
    }));
  },

  async getMonthlyTrends(userId: number, year: number): Promise<MonthlyTrendItem[]> {
    const query = `
      SELECT
        EXTRACT(MONTH FROM fecha)::INT AS mes_num,
        COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::FLOAT AS ingresos,
        COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::FLOAT AS egresos
      FROM transactions
      WHERE user_id = $1 AND EXTRACT(YEAR FROM fecha) = $2
      GROUP BY EXTRACT(MONTH FROM fecha)
      ORDER BY mes_num ASC
    `;

    const result = await pool.query(query, [userId, year]);
    const map = new Map<number, { ingresos: number; egresos: number }>();
    result.rows.forEach((r) => {
      map.set(r.mes_num, { ingresos: Number(r.ingresos), egresos: Number(r.egresos) });
    });

    const monthNames = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    return monthNames.map((nombre, i) => {
      const mesNum = i + 1;
      const data = map.get(mesNum) || { ingresos: 0, egresos: 0 };
      const ahorroNeto = data.ingresos - data.egresos;
      const tasaAhorro = data.ingresos > 0 ? Math.round((ahorroNeto / data.ingresos) * 1000) / 10 : 0;

      return {
        mesNum,
        mesNombre: nombre,
        anio: year,
        ingresos: data.ingresos,
        egresos: data.egresos,
        ahorroNeto,
        tasaAhorro,
      };
    });
  },

  async getAvailableYears(userId: number): Promise<number[]> {
    const query = `
      SELECT DISTINCT EXTRACT(YEAR FROM fecha)::INT AS anio
      FROM transactions
      WHERE user_id = $1
      ORDER BY anio DESC
    `;
    const result = await pool.query<{ anio: number }>(query, [userId]);
    const currentYear = new Date().getFullYear();
    const years = result.rows.map((r) => r.anio).filter(Boolean);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return Array.from(new Set(years));
  },
};

