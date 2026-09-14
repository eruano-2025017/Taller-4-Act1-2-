import { pool } from "../../config/db";
import { FinancialBusinessError, validarEliminarCategoria } from "../common/financial-rules.helper";

export interface CategoryRecord {
  id: number;
  user_id: number;
  nombre: string;
  tipo: "ingreso" | "egreso";
  icono: string;
  color: string;
  descripcion: string | null;
  movimientos: number;
  total_monto: number;
  created_at: string;
}

export interface CreateCategoryInput {
  nombre: string;
  tipo: "ingreso" | "egreso";
  icono?: string;
  color?: string;
  descripcion?: string;
}

export interface CategorySummary {
  totalCategorias: number;
  categoriasIngreso: number;
  categoriasEgreso: number;
}

export const CategoryModel = {
  /**
   * Asegura que el usuario tenga un catálogo inicial de categorías si es su primera vez.
   */
  async ensureDefaultCategories(userId: number): Promise<void> {
    const defaults = [
      // Ingresos
      { nombre: "Salario", tipo: "ingreso", icono: "payments", color: "#10B981", descripcion: "Ingresos por nómina y sueldo fijo mensual o quincenal." },
      { nombre: "Freelance", tipo: "ingreso", icono: "laptop_chromebook", color: "#3B82F6", descripcion: "Proyectos independientes, asesorías y consultoría profesional." },
      { nombre: "Ventas", tipo: "ingreso", icono: "storefront", color: "#F59E0B", descripcion: "Comercio directo, venta de productos o comisiones." },
      { nombre: "Inversiones", tipo: "ingreso", icono: "trending_up", color: "#8B5CF6", descripcion: "Rendimientos de capital, dividendos y fondos de inversión." },
      { nombre: "Bonificación", tipo: "ingreso", icono: "card_giftcard", color: "#EC4899", descripcion: "Bonos de productividad, aguinaldos y gratificaciones." },
      { nombre: "Otros Ingresos", tipo: "ingreso", icono: "savings", color: "#06B6D4", descripcion: "Ingresos varios, reembolsos y entradas extraordinarias." },

      // Egresos
      { nombre: "Alimentación", tipo: "egreso", icono: "restaurant", color: "#EF4444", descripcion: "Supermercado, restaurantes, despensa y pedidos a domicilio." },
      { nombre: "Transporte", tipo: "egreso", icono: "directions_car", color: "#F97316", descripcion: "Combustible, mantenimiento vehicular, parqueos y pasajes." },
      { nombre: "Vivienda", tipo: "egreso", icono: "home", color: "#6366F1", descripcion: "Alquiler, cuotas hipotecarias y mantenimiento del hogar." },
      { nombre: "Servicios Básicos", tipo: "egreso", icono: "bolt", color: "#EAB308", descripcion: "Electricidad, agua potable, internet residencial y telefonía." },
      { nombre: "Salud y Bienestar", tipo: "egreso", icono: "medical_services", color: "#14B8A6", descripcion: "Consultas médicas, farmacia, seguros y cuidado personal." },
      { nombre: "Entretenimiento", tipo: "egreso", icono: "sports_esports", color: "#A855F7", descripcion: "Cine, streaming, salidas con amigos y actividades de ocio." },
    ];

    // Verificación: si el usuario ya cuenta con categorías inicializadas, no reinsertar automáticamente
    const countRes = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::INT AS count FROM categories WHERE user_id = $1`,
      [userId]
    );
    if (Number(countRes.rows[0]?.count) > 0) {
      return;
    }

    // Inserción atómica e idempotente usando el índice único (user_id, LOWER(nombre))
    for (const item of defaults) {
      await pool.query(
        `INSERT INTO categories (user_id, nombre, tipo, icono, color, descripcion)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id, (LOWER(nombre))) DO NOTHING`,
        [userId, item.nombre, item.tipo, item.icono, item.color, item.descripcion]
      );
    }
  },

  /**
   * Obtiene la lista de categorías con métricas reales de transacciones vinculadas.
   */
  async getCategories(
    userId: number,
    search?: string,
    tipo?: string,
    skipEnsure: boolean = false
  ): Promise<CategoryRecord[]> {
    if (!skipEnsure) {
      await this.ensureDefaultCategories(userId);
    }

    const params: any[] = [userId];
    let query = `
      SELECT 
        c.id,
        c.user_id,
        c.nombre,
        c.tipo,
        c.icono,
        c.color,
        c.descripcion,
        c.created_at,
        COUNT(t.id)::INT AS movimientos,
        COALESCE(SUM(t.monto), 0)::FLOAT AS total_monto
      FROM categories c
      LEFT JOIN transactions t 
        ON t.user_id = c.user_id 
        AND LOWER(t.categoria) = LOWER(c.nombre)
      WHERE c.user_id = $1
    `;

    if (tipo && tipo.toLowerCase() !== "todas" && (tipo === "ingreso" || tipo === "egreso")) {
      params.push(tipo.toLowerCase());
      query += ` AND c.tipo = $${params.length}`;
    }

    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(c.nombre) LIKE $${params.length} OR LOWER(COALESCE(c.descripcion, '')) LIKE $${params.length})`;
    }

    query += `
      GROUP BY c.id, c.user_id, c.nombre, c.tipo, c.icono, c.color, c.descripcion, c.created_at
      ORDER BY c.nombre ASC
    `;

    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Obtiene las métricas resumidas para los Bento Cards superiores.
   */
  async getSummary(userId: number, skipEnsure: boolean = false): Promise<CategorySummary> {
    if (!skipEnsure) {
      await this.ensureDefaultCategories(userId);
    }

    const query = `
      SELECT 
        COUNT(*)::INT AS total,
        COUNT(CASE WHEN tipo = 'ingreso' THEN 1 END)::INT AS ingresos,
        COUNT(CASE WHEN tipo = 'egreso' THEN 1 END)::INT AS egresos
      FROM categories
      WHERE user_id = $1
    `;

    const { rows } = await pool.query(query, [userId]);
    const r = rows[0] || { total: 0, ingresos: 0, egresos: 0 };
    return {
      totalCategorias: r.total,
      categoriasIngreso: r.ingresos,
      categoriasEgreso: r.egresos,
    };
  },

  /**
   * Obtiene una categoría por ID.
   */
  async getById(userId: number, categoryId: number): Promise<CategoryRecord | null> {
    const query = `
      SELECT 
        c.id,
        c.user_id,
        c.nombre,
        c.tipo,
        c.icono,
        c.color,
        c.descripcion,
        c.created_at,
        COUNT(t.id)::INT AS movimientos,
        COALESCE(SUM(t.monto), 0)::FLOAT AS total_monto
      FROM categories c
      LEFT JOIN transactions t 
        ON t.user_id = c.user_id 
        AND LOWER(t.categoria) = LOWER(c.nombre)
      WHERE c.user_id = $1 AND c.id = $2
      GROUP BY c.id, c.user_id, c.nombre, c.tipo, c.icono, c.color, c.descripcion, c.created_at
    `;
    const { rows } = await pool.query(query, [userId, categoryId]);
    return rows[0] || null;
  },

  /**
   * Crea una nueva categoría.
   */
  async create(userId: number, input: CreateCategoryInput): Promise<CategoryRecord> {
    const nombreNormalizado = input.nombre.trim();

    // Validar duplicado previo
    const dupCheck = await pool.query(
      `SELECT id FROM categories WHERE user_id = $1 AND LOWER(nombre) = LOWER($2)`,
      [userId, nombreNormalizado]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error("DUPLICATE_CATEGORY_NAME: Ya existe una categoría con este nombre");
    }

    const query = `
      INSERT INTO categories (user_id, nombre, tipo, icono, color, descripcion)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, user_id, nombre, tipo, icono, color, descripcion, created_at
    `;
    const values = [
      userId,
      nombreNormalizado,
      input.tipo,
      input.icono || "category",
      input.color || "#ff7a00",
      input.descripcion?.trim() || null,
    ];

    const { rows } = await pool.query(query, values);
    const created = rows[0];
    return {
      ...created,
      movimientos: 0,
      total_monto: 0,
    };
  },

  /**
   * Actualiza una categoría existente y sincroniza transacciones si cambió el nombre.
   */
  async update(
    userId: number,
    categoryId: number,
    input: Partial<CreateCategoryInput>
  ): Promise<CategoryRecord | null> {
    const actual = await this.getById(userId, categoryId);
    if (!actual) return null;

    const nombre = input.nombre !== undefined ? input.nombre.trim() : actual.nombre;
    const tipo = input.tipo !== undefined ? input.tipo : actual.tipo;
    const icono = input.icono !== undefined ? input.icono : actual.icono;
    const color = input.color !== undefined ? input.color : actual.color;
    const descripcion = input.descripcion !== undefined ? input.descripcion.trim() : actual.descripcion;

    // Si cambió el nombre, validar que no colisione con otra categoría existente
    if (input.nombre !== undefined && nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
      const dupCheck = await pool.query(
        `SELECT id FROM categories WHERE user_id = $1 AND LOWER(nombre) = LOWER($2) AND id != $3`,
        [userId, nombre, categoryId]
      );
      if (dupCheck.rows.length > 0) {
        throw new Error("DUPLICATE_CATEGORY_NAME: Ya existe otra categoría con este nombre");
      }
    }

    // Si intenta cambiar el tipo y ya tiene movimientos registrados, rechazar
    if (input.tipo !== undefined && input.tipo !== actual.tipo && actual.movimientos > 0) {
      throw new FinancialBusinessError(
        `No puedes cambiar el tipo de la categoría "${actual.nombre}" porque ya tiene ${actual.movimientos} movimiento(s) registrados como ${actual.tipo}.`,
        400
      );
    }

    const query = `
      UPDATE categories
      SET 
        nombre = $1,
        tipo = $2,
        icono = $3,
        color = $4,
        descripcion = $5
      WHERE user_id = $6 AND id = $7
      RETURNING id, user_id, nombre, tipo, icono, color, descripcion, created_at
    `;

    const { rows } = await pool.query(query, [
      nombre,
      tipo,
      icono,
      color,
      descripcion,
      userId,
      categoryId,
    ]);

    if (rows.length === 0) return null;

    // Si cambió el nombre, sincronizamos las transacciones existentes
    if (actual.nombre.toLowerCase() !== nombre.toLowerCase()) {
      await pool.query(
        `UPDATE transactions SET categoria = $1 WHERE user_id = $2 AND LOWER(categoria) = LOWER($3)`,
        [nombre, userId, actual.nombre]
      );
    }

    return this.getById(userId, categoryId);
  },

  /**
   * Elimina una categoría si no tiene movimientos asociados.
   * El usuario tiene control total sobre su catálogo personal.
   */
  async delete(userId: number, categoryId: number): Promise<boolean> {
    await validarEliminarCategoria(pool, userId, categoryId);
    const query = `DELETE FROM categories WHERE user_id = $1 AND id = $2 RETURNING id`;
    const { rowCount } = await pool.query(query, [userId, categoryId]);
    return (rowCount ?? 0) > 0;
  },
};

