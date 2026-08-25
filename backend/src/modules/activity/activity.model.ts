import { pool } from "../../config/db";

export interface ActivityRecord {
  id: number;
  user_id: number;
  tipo: string;
  titulo: string;
  descripcion: string | null;
  categoria: string | null;
  monto: number | null;
  icono: string;
  created_at: string;
}

export interface CreateActivityParams {
  userId: number;
  tipo: string;
  titulo: string;
  descripcion?: string | null;
  categoria?: string | null;
  monto?: number | null;
  icono?: string;
}

export const ActivityModel = {
  async create(params: CreateActivityParams): Promise<ActivityRecord> {
    const query = `
      INSERT INTO activities (user_id, tipo, titulo, descripcion, categoria, monto, icono)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, user_id, tipo, titulo, descripcion, categoria, monto::FLOAT AS monto, icono, created_at
    `;
    const values = [
      params.userId,
      params.tipo,
      params.titulo,
      params.descripcion || null,
      params.categoria || null,
      params.monto !== undefined && params.monto !== null ? params.monto : null,
      params.icono || "receipt_long",
    ];

    const result = await pool.query<ActivityRecord>(query, values);
    return result.rows[0];
  },

  async getRecentByUserId(userId: number, limit: number = 5): Promise<ActivityRecord[]> {
    const query = `
      SELECT
        id,
        user_id,
        tipo,
        titulo,
        descripcion,
        categoria,
        monto::FLOAT AS monto,
        icono,
        created_at
      FROM activities
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `;
    const result = await pool.query<ActivityRecord>(query, [userId, limit]);
    return result.rows;
  },
};

