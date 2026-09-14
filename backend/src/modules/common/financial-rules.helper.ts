import { Pool, PoolClient } from "pg";

export class FinancialBusinessError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "FinancialBusinessError";
    this.statusCode = statusCode;
  }
}

export interface UserBalances {
  total_ingresos: number;
  total_egresos: number;
  saldo_disponible: number;
}

/**
 * Redondea un monto financiero a 2 decimales para evitar imprecisiones de coma flotante.
 */
export function redondearGTQ(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Consulta los saldos reales consolidados del usuario en la base de datos.
 */
export async function obtenerSaldosUsuario(
  client: PoolClient | Pool,
  userId: number
): Promise<UserBalances> {
  const query = `
    SELECT 
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END), 0)::NUMERIC(12, 2) AS total_ingresos,
      COALESCE(SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END), 0)::NUMERIC(12, 2) AS total_egresos,
      COALESCE(SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE -monto END), 0)::NUMERIC(12, 2) AS saldo_disponible
    FROM transactions
    WHERE user_id = $1
  `;
  const res = await client.query(query, [userId]);
  const row = res.rows[0] || {};
  return {
    total_ingresos: Number(row.total_ingresos) || 0,
    total_egresos: Number(row.total_egresos) || 0,
    saldo_disponible: Number(row.saldo_disponible) || 0,
  };
}

/**
 * Valida que una categoría exista para el usuario y corresponda al tipo de transacción (ingreso o egreso).
 */
export async function validarCategoriaParaTransaccion(
  client: PoolClient | Pool,
  userId: number,
  categoriaNombre: string,
  tipoEsperado: "ingreso" | "egreso"
): Promise<string> {
  const query = `
    SELECT id, nombre, tipo 
    FROM categories 
    WHERE user_id = $1 AND LOWER(nombre) = LOWER($2)
    LIMIT 1
  `;
  const res = await client.query(query, [userId, categoriaNombre.trim()]);
  if (res.rows.length === 0) {
    throw new FinancialBusinessError(
      `La categoría "${categoriaNombre}" no existe. Selecciona una categoría registrada o crea una nueva.`,
      400
    );
  }

  const cat = res.rows[0];
  if (cat.tipo !== tipoEsperado) {
    throw new FinancialBusinessError(
      `La categoría "${cat.nombre}" es de tipo ${cat.tipo}. No se puede utilizar para registrar un ${tipoEsperado}.`,
      400
    );
  }

  return cat.nombre;
}

/**
 * Valida y bloquea que el saldo disponible sea suficiente para crear un nuevo egreso.
 * Utiliza bloqueo pesimista en la fila del usuario para prevenir condiciones de carrera.
 */
export async function validarSaldoParaNuevoEgreso(
  client: PoolClient,
  userId: number,
  montoEgreso: number
): Promise<UserBalances> {
  // 1. Bloqueo de fila pesimista para serializar transacciones concurrentes del mismo usuario
  await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

  // 2. Monto debe ser mayor a cero
  const monto = redondearGTQ(montoEgreso);
  if (isNaN(monto) || monto <= 0) {
    throw new FinancialBusinessError("El monto del egreso debe ser mayor que Q0.00.", 400);
  }

  // 3. Obtener saldos actualizados
  const saldos = await obtenerSaldosUsuario(client, userId);

  // 4. Regla 1: No permitir egresos sin fondos
  if (saldos.saldo_disponible <= 0) {
    throw new FinancialBusinessError(
      "No tienes fondos disponibles para registrar este egreso. Primero debes registrar un ingreso.",
      400
    );
  }

  // 5. Regla 2 & 3: Comparar contra saldo disponible
  if (monto > saldos.saldo_disponible) {
    throw new FinancialBusinessError(
      `No puedes registrar un egreso de Q${monto.toFixed(2)} porque tu saldo disponible es de Q${saldos.saldo_disponible.toFixed(2)}.`,
      400
    );
  }

  return saldos;
}

/**
 * Valida que una modificación de egreso no sobrepase el saldo disponible real.
 */
export async function validarSaldoParaEditarEgreso(
  client: PoolClient,
  userId: number,
  expenseId: number,
  nuevoMonto: number
): Promise<{ montoAnterior: number; saldoMaximo: number }> {
  await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

  const monto = redondearGTQ(nuevoMonto);
  if (isNaN(monto) || monto <= 0) {
    throw new FinancialBusinessError("El monto del egreso debe ser mayor que Q0.00.", 400);
  }

  const existingRes = await client.query(
    `SELECT id, monto::FLOAT AS monto FROM transactions WHERE id = $1 AND user_id = $2 AND tipo = 'egreso'`,
    [expenseId, userId]
  );
  if (existingRes.rows.length === 0) {
    throw new FinancialBusinessError("Egreso no encontrado", 404);
  }

  const montoAnterior = redondearGTQ(Number(existingRes.rows[0].monto));
  const saldos = await obtenerSaldosUsuario(client, userId);

  // Saldo disponible para edición = Saldo actual + el monto del egreso anterior
  const saldoMaximo = redondearGTQ(saldos.saldo_disponible + montoAnterior);

  if (monto > saldoMaximo) {
    throw new FinancialBusinessError(
      `No puedes modificar el egreso a Q${monto.toFixed(2)} porque tu saldo disponible máximo para esta operación es de Q${saldoMaximo.toFixed(2)}.`,
      400
    );
  }

  return { montoAnterior, saldoMaximo };
}

/**
 * Valida que una reducción de ingreso no provoque saldo negativo.
 */
export async function validarSaldoParaEditarIngreso(
  client: PoolClient,
  userId: number,
  incomeId: number,
  nuevoMonto: number
): Promise<{ montoAnterior: number; montoMinimoPermitido: number }> {
  await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

  const monto = redondearGTQ(nuevoMonto);
  if (isNaN(monto) || monto <= 0) {
    throw new FinancialBusinessError("El monto del ingreso debe ser mayor que Q0.00.", 400);
  }

  const existingRes = await client.query(
    `SELECT id, monto::FLOAT AS monto FROM transactions WHERE id = $1 AND user_id = $2 AND tipo = 'ingreso'`,
    [incomeId, userId]
  );
  if (existingRes.rows.length === 0) {
    throw new FinancialBusinessError("Ingreso no encontrado", 404);
  }

  const montoAnterior = redondearGTQ(Number(existingRes.rows[0].monto));
  const saldos = await obtenerSaldosUsuario(client, userId);

  // Nuevo Total Ingresos = (Total Ingresos - Monto Anterior) + nuevoMonto
  const totalOtrosIngresos = redondearGTQ(saldos.total_ingresos - montoAnterior);
  const nuevoTotalIngresos = redondearGTQ(totalOtrosIngresos + monto);

  if (nuevoTotalIngresos < saldos.total_egresos) {
    const montoMinimo = redondearGTQ(Math.max(0, saldos.total_egresos - totalOtrosIngresos));
    throw new FinancialBusinessError(
      `No puedes reducir este ingreso a Q${monto.toFixed(2)} porque existen egresos registrados por Q${saldos.total_egresos.toFixed(2)} que dependen de esos fondos. El monto mínimo permitido para este ingreso es Q${montoMinimo.toFixed(2)}.`,
      400
    );
  }

  const montoMinimoPermitido = redondearGTQ(Math.max(0, saldos.total_egresos - totalOtrosIngresos));
  return { montoAnterior, montoMinimoPermitido };
}

/**
 * Valida que la eliminación de un ingreso no deje la cuenta en descubierto.
 */
export async function validarSaldoParaEliminarIngreso(
  client: PoolClient,
  userId: number,
  incomeId: number
): Promise<{ monto: number }> {
  await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [userId]);

  const existingRes = await client.query(
    `SELECT id, monto::FLOAT AS monto FROM transactions WHERE id = $1 AND user_id = $2 AND tipo = 'ingreso'`,
    [incomeId, userId]
  );
  if (existingRes.rows.length === 0) {
    throw new FinancialBusinessError("Ingreso no encontrado", 404);
  }

  const montoEliminar = redondearGTQ(Number(existingRes.rows[0].monto));
  const saldos = await obtenerSaldosUsuario(client, userId);

  const nuevoTotalIngresos = redondearGTQ(saldos.total_ingresos - montoEliminar);
  if (nuevoTotalIngresos < saldos.total_egresos) {
    throw new FinancialBusinessError(
      `No puedes eliminar este ingreso de Q${montoEliminar.toFixed(2)} porque existen egresos registrados por Q${saldos.total_egresos.toFixed(2)} que dependen de estos fondos. Elimina o reduce primero los egresos correspondientes.`,
      400
    );
  }

  return { monto: montoEliminar };
}

/**
 * Valida que la categoría a eliminar no tenga movimientos asociados.
 * El usuario tiene control total para eliminar cualquier categoría (incluso predeterminadas si lo desea),
 * pero no puede dejar transacciones huérfanas sin categoría en la base de datos.
 */
export async function validarEliminarCategoria(
  client: PoolClient | Pool,
  userId: number,
  categoryId: number
): Promise<{ nombre: string }> {
  const query = `
    SELECT 
      c.id, 
      c.nombre, 
      COUNT(t.id)::INT AS movimientos
    FROM categories c
    LEFT JOIN transactions t 
      ON t.user_id = c.user_id 
      AND LOWER(t.categoria) = LOWER(c.nombre)
    WHERE c.user_id = $1 AND c.id = $2
    GROUP BY c.id, c.nombre
  `;
  const res = await client.query(query, [userId, categoryId]);
  if (res.rows.length === 0) {
    throw new FinancialBusinessError("Categoría no encontrada o ya eliminada", 404);
  }

  const cat = res.rows[0];
  if (cat.movimientos > 0) {
    throw new FinancialBusinessError(
      `No puedes eliminar la categoría "${cat.nombre}" porque tiene ${cat.movimientos} movimiento(s) asociado(s). Reasigna o elimina los movimientos antes de borrarla.`,
      400
    );
  }

  return { nombre: cat.nombre };
}

