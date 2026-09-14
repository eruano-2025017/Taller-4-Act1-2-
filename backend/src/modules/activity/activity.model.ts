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
  leido: boolean;
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
      RETURNING id, user_id, tipo, titulo, descripcion, categoria, monto::FLOAT AS monto, icono, COALESCE(leido, false) AS leido, created_at
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
        COALESCE(leido, false) AS leido,
        created_at
      FROM activities
      WHERE user_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2
    `;
    const result = await pool.query<ActivityRecord>(query, [userId, limit]);
    return result.rows;
  },

  async getAllByUserId(userId: number, limit: number = 20, onlyUnread: boolean = false): Promise<ActivityRecord[]> {
    let query = `
      SELECT
        id,
        user_id,
        tipo,
        titulo,
        descripcion,
        categoria,
        monto::FLOAT AS monto,
        icono,
        COALESCE(leido, false) AS leido,
        created_at
      FROM activities
      WHERE user_id = $1
    `;
    const values: any[] = [userId];

    if (onlyUnread) {
      query += ` AND (leido IS FALSE OR leido IS NULL)`;
    }

    query += ` ORDER BY created_at DESC, id DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const result = await pool.query<ActivityRecord>(query, values);
    return result.rows;
  },

  async getUnreadCount(userId: number): Promise<number> {
    const query = `
      SELECT COUNT(*)::INT AS total
      FROM activities
      WHERE user_id = $1 AND (leido IS FALSE OR leido IS NULL)
    `;
    const result = await pool.query<{ total: number }>(query, [userId]);
    return result.rows[0]?.total ?? 0;
  },

  async markAllAsRead(userId: number): Promise<void> {
    await pool.query(
      `UPDATE activities SET leido = TRUE WHERE user_id = $1 AND (leido IS FALSE OR leido IS NULL)`,
      [userId]
    );
  },

  async markAsRead(userId: number, activityId: number): Promise<boolean> {
    const result = await pool.query(
      `UPDATE activities SET leido = TRUE WHERE user_id = $1 AND id = $2 RETURNING id`,
      [userId, activityId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

