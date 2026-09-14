import { pool } from "../../config/db";

export interface UserProfile {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "user";
  telefono: string | null;
  nit: string | null;
  direccion: string | null;
  created_at: string;
}

export const UserModel = {
  async getProfileById(userId: number): Promise<UserProfile | null> {
    const query = `
      SELECT id, nombre, email, rol, telefono, nit, direccion, created_at
      FROM users
      WHERE id = $1
    `;
    const result = await pool.query<UserProfile>(query, [userId]);
    return result.rows[0] ?? null;
  },

  async updateProfile(
    userId: number,
    data: { nombre: string; telefono?: string | null; nit?: string | null; direccion?: string | null }
  ): Promise<UserProfile | null> {
    const query = `
      UPDATE users
      SET
        nombre = $1,
        telefono = $2,
        nit = $3,
        direccion = $4
      WHERE id = $5
      RETURNING id, nombre, email, rol, telefono, nit, direccion, created_at
    `;
    const values = [
      data.nombre,
      data.telefono || null,
      data.nit || null,
      data.direccion || null,
      userId,
    ];
    const result = await pool.query<UserProfile>(query, values);
    return result.rows[0] ?? null;
  },

  async getPasswordHash(userId: number): Promise<string | null> {
    const result = await pool.query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    );
    return result.rows[0]?.password_hash ?? null;
  },

  async updatePassword(userId: number, newHash: string): Promise<boolean> {
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE id = $2",
      [newHash, userId]
    );
    return (result.rowCount ?? 0) > 0;
  },
};

