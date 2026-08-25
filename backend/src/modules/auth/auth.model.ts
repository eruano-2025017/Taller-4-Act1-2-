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
};
