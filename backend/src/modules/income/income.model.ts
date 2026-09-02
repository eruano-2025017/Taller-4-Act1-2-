import { pool } from "../../config/db";

export interface IncomeRecord {
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

export interface IncomeSummaryMetrics {
  totalIngresos: number;
  variacionMes: string;
  ultimoIngreso: number;
  promedioMensual: number;
}

export interface EvolutionDataPoint {
  label: string;
  monto: number;
}

export interface CreateIncomeInput {
  descripcion: string;
  monto: number;
  categoria: string;
  metodo?: string;
  observacion?: string;
  fecha?: string;
}

export const IncomeModel = {
  async getIncomes(
    userId: number,
    search?: string,
    categoria?: string
  ): Promise<IncomeRecord[]> {
    let query = `
      SELECT
        id,
        user_id,
        tipo,
        categoria,
        descripcion,
        monto::FLOAT AS monto,
        COALESCE(metodo, 'Transferencia') AS metodo,
        observacion,
        fecha,
        created_at
      FROM transactions
      WHERE user_id = $1 AND tipo = 'ingreso'
    `;
    const params: any[] = [userId];

    if (categoria && categoria.trim() !== "" && categoria.toLowerCase() !== "todas") {
      params.push(categoria.trim());
      query += ` AND LOWER(categoria) = LOWER($${params.length})`;
    }

    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(descripcion) LIKE $${params.length} OR LOWER(categoria) LIKE $${params.length} OR LOWER(COALESCE(metodo, '')) LIKE $${params.length})`;
    }

    query += ` ORDER BY fecha DESC, id DESC`;

    const result = await pool.query<IncomeRecord>(query, params);
    return result.rows;
  },

  async getSummary(userId: number): Promise<IncomeSummaryMetrics> {
    // 1. Total de ingresos
    const totalQuery = `
      SELECT COALESCE(SUM(monto), 0)::FLOAT AS total
      FROM transactions
      WHERE user_id = $1 AND tipo = 'ingreso'
    `;
    const totalRes = await pool.query<{ total: number }>(totalQuery, [userId]);
    const totalIngresos = Number(totalRes.rows[0]?.total) || 0;

    // 2. Último ingreso registrado
    const lastQuery = `
      SELECT monto::FLOAT AS monto
      FROM transactions
      WHERE user_id = $1 AND tipo = 'ingreso'
      ORDER BY fecha DESC, id DESC
      LIMIT 1
    `;
    const lastRes = await pool.query<{ monto: number }>(lastQuery, [userId]);
    const ultimoIngreso = Number(lastRes.rows[0]?.monto) || 0;

    // 3. Promedio mensual
    const avgQuery = `
      SELECT COALESCE(AVG(monthly_sum), 0)::FLOAT AS promedio
      FROM (
        SELECT SUM(monto) AS monthly_sum
        FROM transactions
        WHERE user_id = $1 AND tipo = 'ingreso'
        GROUP BY EXTRACT(YEAR FROM fecha), EXTRACT(MONTH FROM fecha)
      ) AS monthly_totals
    `;
    const avgRes = await pool.query<{ promedio: number }>(avgQuery, [userId]);
    const promedioMensual = Number(avgRes.rows[0]?.promedio) || (totalIngresos > 0 ? totalIngresos : 0);

    // 4. Variación vs mes anterior
    const variationQuery = `
      WITH current_month AS (
        SELECT COALESCE(SUM(monto), 0)::FLOAT AS current_sum
        FROM transactions
        WHERE user_id = $1 AND tipo = 'ingreso'
          AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM NOW())
      ),
      prev_month AS (
        SELECT COALESCE(SUM(monto), 0)::FLOAT AS prev_sum
        FROM transactions
        WHERE user_id = $1 AND tipo = 'ingreso'
          AND fecha >= DATE_TRUNC('month', NOW() - INTERVAL '1 month')
          AND fecha < DATE_TRUNC('month', NOW())
      )
      SELECT current_sum, prev_sum FROM current_month, prev_month
    `;
    const varRes = await pool.query<{ current_sum: number; prev_sum: number }>(variationQuery, [userId]);
    const currentSum = Number(varRes.rows[0]?.current_sum) || 0;
    const prevSum = Number(varRes.rows[0]?.prev_sum) || 0;

    let variacionMes = "+0.0%";
    if (prevSum > 0) {
      const diff = ((currentSum - prevSum) / prevSum) * 100;
      variacionMes = `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`;
    } else if (currentSum > 0) {
      variacionMes = "+100%";
    }

    return {
      totalIngresos,
      variacionMes,
      ultimoIngreso,
      promedioMensual,
    };
  },

  async getEvolution(userId: number): Promise<EvolutionDataPoint[]> {
    const query = `
      SELECT
        TO_CHAR(fecha, 'DD Mon') AS label,
        DATE_TRUNC('day', fecha) AS dia_fecha,
        COALESCE(SUM(monto), 0)::FLOAT AS monto
      FROM transactions
      WHERE user_id = $1 AND tipo = 'ingreso'
        AND fecha >= NOW() - INTERVAL '30 days'
      GROUP BY DATE_TRUNC('day', fecha), TO_CHAR(fecha, 'DD Mon')
      ORDER BY dia_fecha ASC
    `;
    const result = await pool.query<{ label: string; monto: number }>(query, [userId]);

    if (result.rows.length === 0) {
      return [
        { label: "0", monto: 0 },
        { label: "5", monto: 0 },
        { label: "10", monto: 0 },
        { label: "15", monto: 0 },
        { label: "20", monto: 0 },
        { label: "25", monto: 0 },
        { label: "30", monto: 0 },
      ];
    }

    return result.rows.map((r) => ({
      label: r.label,
      monto: Number(r.monto),
    }));
  },

  async create(userId: number, input: CreateIncomeInput): Promise<IncomeRecord> {
    const fecha = input.fecha ? new Date(input.fecha) : new Date();
    const query = `
      INSERT INTO transactions (
        user_id,
        tipo,
        categoria,
        descripcion,
        monto,
        metodo,
        observacion,
        fecha
      )
      VALUES ($1, 'ingreso', $2, $3, $4, $5, $6, $7)
      RETURNING
        id,
        user_id,
        tipo,
        categoria,
        descripcion,
        monto::FLOAT AS monto,
        COALESCE(metodo, 'Transferencia') AS metodo,
        observacion,
        fecha,
        created_at
    `;
    const result = await pool.query<IncomeRecord>(query, [
      userId,
      input.categoria,
      input.descripcion,
      input.monto,
      input.metodo || "Transferencia",
      input.observacion || null,
      fecha,
    ]);
    return result.rows[0];
  },

  async update(
    userId: number,
    incomeId: number,
    input: Partial<CreateIncomeInput>
  ): Promise<IncomeRecord | null> {
    const query = `
      UPDATE transactions
      SET
        categoria = COALESCE($1, categoria),
        descripcion = COALESCE($2, descripcion),
        monto = COALESCE($3, monto),
        metodo = COALESCE($4, metodo),
        observacion = COALESCE($5, observacion),
        fecha = COALESCE($6, fecha)
      WHERE id = $7 AND user_id = $8 AND tipo = 'ingreso'
      RETURNING
        id,
        user_id,
        tipo,
        categoria,
        descripcion,
        monto::FLOAT AS monto,
        COALESCE(metodo, 'Transferencia') AS metodo,
        observacion,
        fecha,
        created_at
    `;
    const result = await pool.query<IncomeRecord>(query, [
      input.categoria ?? null,
      input.descripcion ?? null,
      input.monto ?? null,
      input.metodo ?? null,
      input.observacion ?? null,
      input.fecha ? new Date(input.fecha) : null,
      incomeId,
      userId,
    ]);
    return result.rows[0] ?? null;
  },

  async delete(userId: number, incomeId: number): Promise<boolean> {
    const query = `
      DELETE FROM transactions
      WHERE id = $1 AND user_id = $2 AND tipo = 'ingreso'
      RETURNING id
    `;
    const result = await pool.query(query, [incomeId, userId]);
    return (result.rowCount ?? 0) > 0;
  },
};

