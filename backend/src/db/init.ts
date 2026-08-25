import { pool } from "../config/db";

export async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        rol VARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'user')),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
        categoria VARCHAR(50) NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        monto NUMERIC(12, 2) NOT NULL CHECK (monto > 0),
        es_fijo BOOLEAN DEFAULT FALSE,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        descripcion VARCHAR(255),
        categoria VARCHAR(50),
        monto NUMERIC(12, 2),
        icono VARCHAR(50) DEFAULT 'receipt_long',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha);
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
    `);
    console.log("✅ Tablas de la base de datos (users, transactions, activities) verificadas/inicializadas.");
  } catch (error) {
    console.error("⚠️ Error al inicializar tablas en PostgreSQL:", error);
  }
}
