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

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_fecha ON transactions(fecha);

