import { pool } from "../../config/db";

export interface InvoiceItemRecord {
  id?: number;
  invoice_id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface InvoiceRecord {
  id: number;
  user_id: number;
  numero_factura: string;
  cliente_nombre: string;
  cliente_nit: string;
  cliente_email?: string | null;
  cliente_direccion?: string | null;
  emisor_nombre: string;
  emisor_nit: string;
  emisor_direccion: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  metodo_pago: string;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: string;
  notas?: string | null;
  created_at: string;
  items?: InvoiceItemRecord[];
}

export const InvoiceModel = {
  async getNextInvoiceNumber(userId: number): Promise<string> {
    const year = new Date().getFullYear();
    const query = `
      SELECT COUNT(*)::INT AS total
      FROM invoices
      WHERE user_id = $1 AND EXTRACT(YEAR FROM created_at) = $2
    `;
    const result = await pool.query<{ total: number }>(query, [userId, year]);
    const nextSeq = (result.rows[0]?.total || 0) + 1;
    return `FAC-${year}-${String(nextSeq).padStart(3, "0")}`;
  },

  async create(
    userId: number,
    data: Omit<InvoiceRecord, "id" | "user_id" | "created_at" | "items">,
    items: Array<Omit<InvoiceItemRecord, "id" | "invoice_id">>
  ): Promise<InvoiceRecord> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const invoiceQuery = `
        INSERT INTO invoices (
          user_id, numero_factura, cliente_nombre, cliente_nit, cliente_email,
          cliente_direccion, emisor_nombre, emisor_nit, emisor_direccion,
          fecha_emision, fecha_vencimiento, metodo_pago, subtotal, impuesto, total,
          estado, notas
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const invoiceValues = [
        userId,
        data.numero_factura,
        data.cliente_nombre,
        data.cliente_nit || "C/F",
        data.cliente_email || null,
        data.cliente_direccion || null,
        data.emisor_nombre || "KINAL FINANCE",
        data.emisor_nit || "839210-4",
        data.emisor_direccion || "Ciudad de Guatemala, Guatemala",
        data.fecha_emision || new Date(),
        data.fecha_vencimiento || new Date(),
        data.metodo_pago || "Transferencia Bancaria",
        data.subtotal,
        data.impuesto,
        data.total,
        data.estado || "EMITIDA",
        data.notas || null,
      ];

      const invRes = await client.query<InvoiceRecord>(invoiceQuery, invoiceValues);
      const invoice = invRes.rows[0];

      const createdItems: InvoiceItemRecord[] = [];

      for (const item of items) {
        const itemQuery = `
          INSERT INTO invoice_items (invoice_id, descripcion, cantidad, precio_unitario, subtotal)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, invoice_id, descripcion, cantidad::FLOAT AS cantidad, precio_unitario::FLOAT AS precio_unitario, subtotal::FLOAT AS subtotal
        `;
        const itemRes = await client.query<InvoiceItemRecord>(itemQuery, [
          invoice.id,
          item.descripcion,
          item.cantidad,
          item.precio_unitario,
          item.subtotal,
        ]);
        createdItems.push(itemRes.rows[0]);
      }

      await client.query("COMMIT");
      invoice.items = createdItems;
      return invoice;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },

  async getByUserId(userId: number): Promise<InvoiceRecord[]> {
    const query = `
      SELECT
        id, user_id, numero_factura, cliente_nombre, cliente_nit, cliente_email,
        cliente_direccion, emisor_nombre, emisor_nit, emisor_direccion,
        fecha_emision, fecha_vencimiento, metodo_pago,
        subtotal::FLOAT AS subtotal,
        impuesto::FLOAT AS impuesto,
        total::FLOAT AS total,
        estado, notas, created_at
      FROM invoices
      WHERE user_id = $1
      ORDER BY id DESC
    `;
    const result = await pool.query<InvoiceRecord>(query, [userId]);
    return result.rows;
  },

  async getById(userId: number, invoiceId: number): Promise<InvoiceRecord | null> {
    const query = `
      SELECT
        id, user_id, numero_factura, cliente_nombre, cliente_nit, cliente_email,
        cliente_direccion, emisor_nombre, emisor_nit, emisor_direccion,
        fecha_emision, fecha_vencimiento, metodo_pago,
        subtotal::FLOAT AS subtotal,
        impuesto::FLOAT AS impuesto,
        total::FLOAT AS total,
        estado, notas, created_at
      FROM invoices
      WHERE user_id = $1 AND id = $2
    `;
    const result = await pool.query<InvoiceRecord>(query, [userId, invoiceId]);
    if (result.rows.length === 0) return null;

    const invoice = result.rows[0];

    const itemsQuery = `
      SELECT
        id, invoice_id, descripcion,
        cantidad::FLOAT AS cantidad,
        precio_unitario::FLOAT AS precio_unitario,
        subtotal::FLOAT AS subtotal
      FROM invoice_items
      WHERE invoice_id = $1
      ORDER BY id ASC
    `;
    const itemsResult = await pool.query<InvoiceItemRecord>(itemsQuery, [invoiceId]);
    invoice.items = itemsResult.rows;

    return invoice;
  },
};

