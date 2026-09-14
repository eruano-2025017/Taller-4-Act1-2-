import { Request, Response } from "express";
import { z } from "zod";
import { InvoiceService } from "./invoice.service";

const invoiceItemSchema = z.object({
  descripcion: z.string().min(1, "La descripción del ítem es requerida"),
  cantidad: z.number().positive("La cantidad debe ser mayor a 0"),
  precio_unitario: z.number().min(0, "El precio unitario no puede ser negativo"),
});

const createInvoiceSchema = z.object({
  cliente_nombre: z.string().min(1, "El nombre del cliente es requerido"),
  cliente_nit: z.string().optional(),
  cliente_email: z.string().email("Email inválido").optional().or(z.literal("")),
  cliente_direccion: z.string().optional(),
  emisor_nombre: z.string().optional(),
  emisor_nit: z.string().optional(),
  emisor_direccion: z.string().optional(),
  fecha_emision: z.string().optional(),
  fecha_vencimiento: z.string().optional(),
  metodo_pago: z.string().optional(),
  notas: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Debe agregar al menos un producto o servicio"),
});

export const InvoiceController = {
  async getNextNumber(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const nextNumber = await InvoiceService.getNextNumber(userId);
      res.json({ nextNumber });
    } catch (error) {
      console.error("[InvoiceController] Error al obtener correlativo:", error);
      res.status(500).json({ message: "Error interno al obtener número de factura" });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const facturas = await InvoiceService.getAll(userId);
      res.json(facturas);
    } catch (error) {
      console.error("[InvoiceController] Error al listar facturas:", error);
      res.status(500).json({ message: "Error interno al listar facturas" });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ message: "ID de factura inválido" });

      const factura = await InvoiceService.getById(userId, id);
      if (!factura) return res.status(404).json({ message: "Factura no encontrada" });

      res.json(factura);
    } catch (error) {
      console.error("[InvoiceController] Error al obtener factura:", error);
      res.status(500).json({ message: "Error interno al obtener factura" });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos de factura inválidos",
          errors: parsed.error.flatten(),
        });
      }

      const nuevaFactura = await InvoiceService.create(userId, parsed.data as any);
      res.status(201).json(nuevaFactura);
    } catch (error: any) {
      console.error("[InvoiceController] Error al crear factura:", error);
      res.status(500).json({ message: error?.message || "Error interno al crear factura" });
    }
  },
};

