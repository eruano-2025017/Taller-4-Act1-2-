import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { pool } from "../config/db";

dotenv.config();

async function seed() {
  const adminPassword = await bcrypt.hash("Admin123!", 10);
  const userPassword = await bcrypt.hash("User123!", 10);

  await pool.query(
    `INSERT INTO users (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, 'admin')
     ON CONFLICT (email) DO NOTHING`,
    ["Administrador", "admin@kinalfinance.com", adminPassword]
  );

  await pool.query(
    `INSERT INTO users (nombre, email, password_hash, rol)
     VALUES ($1, $2, $3, 'user')
     ON CONFLICT (email) DO NOTHING`,
    ["Usuario Demo", "user@kinalfinance.com", userPassword]
  );

  console.log("Usuarios admin y user creados (o ya existian).");
  await pool.end();
}

seed().catch((err) => {
  console.error("Error al ejecutar el seed:", err);
  process.exit(1);
});
