import { Request, Response } from "express";
import { z } from "zod";
import { ExpenseService } from "./expense.service";

const createExpenseSchema = z.object({
  descripcion: z.string().min(1, "La descripción es requerida").max(255),
  monto: z.number().positive("El monto debe ser mayor a 0"),
  categoria: z.string().min(1, "La categoría es requerida"),
  metodo: z.string().optional(),
  observacion: z.string().optional(),
  fecha: z.string().optional(),
});

const updateExpenseSchema = createExpenseSchema.partial();

export const ExpenseController = {
  async getExpenses(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const categoria = typeof req.query.categoria === "string" ? req.query.categoria : undefined;

      const data = await ExpenseService.getExpenseDashboard(userId, search, categoria);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[ExpenseController] Error al obtener egresos:", error);
      return res.status(500).json({ message: "Error interno al obtener los egresos" });
    }
  },

  async createExpense(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const parsed = createExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para el egreso",
          errors: parsed.error.flatten(),
        });
      }

      const nuevoEgreso = await ExpenseService.createExpense(userId, parsed.data);
      return res.status(201).json(nuevoEgreso);
    } catch (error) {
      console.error("[ExpenseController] Error al crear egreso:", error);
      return res.status(500).json({ message: "Error al registrar el egreso" });
    }
  },

  async updateExpense(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de egreso no válido" });
      }

      const parsed = updateExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para la actualización",
          errors: parsed.error.flatten(),
        });
      }

      const actualizado = await ExpenseService.updateExpense(userId, id, parsed.data);
      if (!actualizado) {
        return res.status(404).json({ message: "Egreso no encontrado" });
      }

      return res.status(200).json(actualizado);
    } catch (error) {
      console.error("[ExpenseController] Error al actualizar egreso:", error);
      return res.status(500).json({ message: "Error al actualizar el egreso" });
    }
  },

  async deleteExpense(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ message: "ID de egreso no válido" });
      }

      const eliminado = await ExpenseService.deleteExpense(userId, id);
      if (!eliminado) {
        return res.status(404).json({ message: "Egreso no encontrado o ya eliminado" });
      }

      return res.status(200).json({ message: "Egreso eliminado exitosamente", id });
    } catch (error) {
      console.error("[ExpenseController] Error al eliminar egreso:", error);
      return res.status(500).json({ message: "Error al eliminar el egreso" });
    }
  },
};

