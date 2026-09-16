import { pool } from "../../config/db";

export type Rol = "admin" | "user";

export interface UserRecord {
  id: number;
  nombre: string;
  email: string;
  password_hash: string;
  rol: Rol;
}

export const AuthModel = {
  async findByEmail(email: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      "SELECT id, nombre, email, password_hash, rol FROM users WHERE email = $1",
      [email]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: number): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      "SELECT id, nombre, email, password_hash, rol FROM users WHERE id = $1",
      [id]
    );
    return result.rows[0] ?? null;
  },

  async createGoogleUser(nombre: string, email: string): Promise<UserRecord> {
    const result = await pool.query<UserRecord>(
      `INSERT INTO users (nombre, email, password_hash, rol)
       VALUES ($1, $2, 'GOOGLE_OAUTH_USER', 'user')
       ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre
       RETURNING id, nombre, email, password_hash, rol`,
      [nombre, email]
    );
    return result.rows[0];
  },
};
