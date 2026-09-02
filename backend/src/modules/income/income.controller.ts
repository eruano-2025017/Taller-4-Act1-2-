import { Request, Response } from "express";
import { z } from "zod";
import { IncomeService } from "./income.service";

const createIncomeSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida").max(255),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  categoria: z.string().min(1, "La categoría es requerida"),
  metodo: z.string().optional(),
  observacion: z.string().optional(),
  fecha: z.string().optional(),
});

const updateIncomeSchema = createIncomeSchema.partial();

export const IncomeController = {
  async getIncomes(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;

      const data = await IncomeService.getIncomeDashboard(userId, search, categoria);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[IncomeController] Error al obtener ingresos:", error);
      return res.status(500).json({ message: "Error interno al obtener los ingresos" });
    }
  },

  async createIncome(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const parsed = createIncomeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para el ingreso",
          errors: parsed.error.flatten(),
        });
      }

      const nuevoIngreso = await IncomeService.createIncome(userId, parsed.data);
      return res.status(201).json(nuevoIngreso);
    } catch (error) {
      console.error("[IncomeController] Error al crear ingreso:", error);
      return res.status(500).json({ message: "Error al registrar el ingreso" });
    }
  },

  async updateIncome(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de ingreso no válido" });
      }

      const parsed = updateIncomeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para la actualización",
          errors: parsed.error.flatten(),
        });
      }

      const actualizado = await IncomeService.updateIncome(userId, id, parsed.data);
      if (!actualizado) {
        return res.status(404).json({ message: "Ingreso no encontrado" });
      }

      return res.status(200).json(actualizado);
    } catch (error) {
      console.error("[IncomeController] Error al actualizar ingreso:", error);
      return res.status(500).json({ message: "Error al actualizar el ingreso" });
    }
  },

  async deleteIncome(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de ingreso no válido" });
      }

      const eliminado = await IncomeService.deleteIncome(userId, id);
      if (!eliminado) {
        return res.status(404).json({ message: "Ingreso no encontrado" });
      }

      return res.status(200).json({ message: "Ingreso eliminado correctamente", id });
    } catch (error) {
      console.error("[IncomeController] Error al eliminar ingreso:", error);
      return res.status(500).json({ message: "Error al eliminar el ingreso" });
    }
  },
};

