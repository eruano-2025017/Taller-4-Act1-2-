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
        metodo VARCHAR(50) DEFAULT 'Transferencia',
        observacion TEXT,
        es_fijo BOOLEAN DEFAULT FALSE,
        fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metodo VARCHAR(50) DEFAULT 'Transferencia';
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS observacion TEXT;

      ALTER TABLE users ADD COLUMN IF NOT EXISTS telefono VARCHAR(30);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS nit VARCHAR(20);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);

      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo VARCHAR(50) NOT NULL,
        titulo VARCHAR(150) NOT NULL,
        descripcion VARCHAR(255),
        categoria VARCHAR(50),
        monto NUMERIC(12, 2),
        icono VARCHAR(50) DEFAULT 'receipt_long',
        leido BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      ALTER TABLE activities ADD COLUMN IF NOT EXISTS leido BOOLEAN DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nombre VARCHAR(50) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ingreso', 'egreso')),
        icono VARCHAR(50) DEFAULT 'category',
        color VARCHAR(20) DEFAULT '#ff7a00',
        descripcion VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        numero_factura VARCHAR(50) NOT NULL,
        cliente_nombre VARCHAR(150) NOT NULL,
        cliente_nit VARCHAR(30) DEFAULT 'C/F',
        cliente_email VARCHAR(150),
        cliente_direccion VARCHAR(255),
        emisor_nombre VARCHAR(150) DEFAULT 'KINAL FINANCE',
        emisor_nit VARCHAR(30) DEFAULT '839210-4',
        emisor_direccion VARCHAR(255) DEFAULT 'Ciudad de Guatemala, Guatemala',
        fecha_emision DATE DEFAULT CURRENT_DATE,
        fecha_vencimiento DATE DEFAULT CURRENT_DATE,
        metodo_pago VARCHAR(50) DEFAULT 'Transferencia Bancaria',
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
        impuesto NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total NUMERIC(12, 2) NOT NULL DEFAULT 0,
        estado VARCHAR(30) DEFAULT 'EMITIDA',
        notas TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        descripcion VARCHAR(255) NOT NULL,
        cantidad NUMERIC(10, 2) NOT NULL DEFAULT 1,
        precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0,
        subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha);
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
      CREATE INDEX IF NOT EXISTS idx_invoices_fecha ON invoices(fecha_emision);
      CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);

      -- Limpieza preventiva de duplicados existentes conservando el registro con menor id
      DELETE FROM categories c1
      USING categories c2
      WHERE c1.user_id = c2.user_id
        AND LOWER(c1.nombre) = LOWER(c2.nombre)
        AND c1.id > c2.id;

      -- Indice unico case-insensitive por usuario y nombre de categoria
      CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_nombre_lower ON categories (user_id, LOWER(nombre));
    `);
    console.log("✅ Tablas de la base de datos (users, transactions, activities, categories, invoices) verificadas/inicializadas.");
  } catch (error) {
    console.error("⚠️ Error al inicializar tablas en PostgreSQL:", error);
  }
}
