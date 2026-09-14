import { InvoiceModel, InvoiceRecord, InvoiceItemRecord } from "./invoice.model";
import { ActivityService } from "../activity/activity.service";

export interface CreateInvoiceInput {
  cliente_nombre: string;
  cliente_nit?: string;
  cliente_email?: string;
  cliente_direccion?: string;
  emisor_nombre?: string;
  emisor_nit?: string;
  emisor_direccion?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  metodo_pago?: string;
  notas?: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

export const InvoiceService = {
  async getNextNumber(userId: number): Promise<string> {
    return await InvoiceModel.getNextInvoiceNumber(userId);
  },

  async getAll(userId: number): Promise<InvoiceRecord[]> {
    return await InvoiceModel.getByUserId(userId);
  },

  async getById(userId: number, invoiceId: number): Promise<InvoiceRecord | null> {
    return await InvoiceModel.getById(userId, invoiceId);
  },

  async create(userId: number, input: CreateInvoiceInput): Promise<InvoiceRecord> {
    if (!input.items || input.items.length === 0) {
      throw new Error("La factura debe contener al menos un producto o servicio");
    }

    const calculatedItems = input.items.map((item) => {
      const cantidad = Number(item.cantidad) || 1;
      const precio_unitario = Number(item.precio_unitario) || 0;
      const subtotal = Math.round(cantidad * precio_unitario * 100) / 100;
      return {
        descripcion: item.descripcion,
        cantidad,
        precio_unitario,
        subtotal,
      };
    });

    const subtotal = Math.round(calculatedItems.reduce((acc, i) => acc + i.subtotal, 0) * 100) / 100;
    // IVA estándar en Guatemala (12%)
    const impuesto = Math.round(subtotal * 0.12 * 100) / 100;
    const total = Math.round((subtotal + impuesto) * 100) / 100;

    const numero_factura = await InvoiceModel.getNextInvoiceNumber(userId);

    const created = await InvoiceModel.create(
      userId,
      {
        numero_factura,
        cliente_nombre: input.cliente_nombre,
        cliente_nit: input.cliente_nit || "C/F",
        cliente_email: input.cliente_email || null,
        cliente_direccion: input.cliente_direccion || null,
        emisor_nombre: input.emisor_nombre || "KINAL FINANCE",
        emisor_nit: input.emisor_nit || "839210-4",
        emisor_direccion: input.emisor_direccion || "Ciudad de Guatemala, Guatemala",
        fecha_emision: input.fecha_emision || new Date().toISOString().split("T")[0],
        fecha_vencimiento: input.fecha_vencimiento || new Date().toISOString().split("T")[0],
        metodo_pago: input.metodo_pago || "Transferencia Bancaria",
        subtotal,
        impuesto,
        total,
        estado: "EMITIDA",
        notas: input.notas || null,
      },
      calculatedItems
    );

    await ActivityService.registrar({
      userId,
      tipo: "FACTURA_EMITIDA",
      titulo: `Factura ${numero_factura} emitida`,
      descripcion: `Cliente: ${input.cliente_nombre} - Total: Q ${total.toFixed(2)}`,
      monto: total,
      icono: "receipt",
    });

    return created;
  },
};

