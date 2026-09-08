import { Request, Response } from "express";
import { z } from "zod";
import { CategoryService } from "./category.service";

const createCategorySchema = z.object({
  nombre: z.string().min(1, "El nombre de la categoría es requerido").max(50, "Máximo 50 caracteres"),
  tipo: z.enum(["ingreso", "egreso"], {
    errorMap: () => ({ message: "El tipo debe ser 'ingreso' o 'egreso'" }),
  }),
  icono: z.string().max(50).optional(),
  color: z.string().max(20).optional(),
  descripcion: z.string().max(255).optional(),
});

const updateCategorySchema = createCategorySchema.partial();

export const CategoryController = {
  async getCategories(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const search = typeof req.query.q === "string" ? req.query.q : undefined;
      const tipo = typeof req.query.tipo === "string" ? req.query.tipo : undefined;

      const data = await CategoryService.getCategoryDashboard(userId, search, tipo);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[CategoryController] Error al obtener categorías:", error);
      return res.status(500).json({ message: "Error interno al obtener categorías" });
    }
  },

  async createCategory(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const parsed = createCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para la categoría",
          errors: parsed.error.flatten(),
        });
      }

      const nueva = await CategoryService.createCategory(userId, parsed.data);
      return res.status(201).json(nueva);
    } catch (error: any) {
      console.error("[CategoryController] Error al crear categoría:", error);
      if (error?.message?.includes("DUPLICATE_CATEGORY_NAME") || error?.code === "23505") {
        return res.status(400).json({ message: "Ya existe una categoría con este nombre" });
      }
      return res.status(500).json({ message: "Error al registrar la categoría" });
    }
  },

  async updateCategory(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID de categoría inválido" });
      }

      const parsed = updateCategorySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para actualizar la categoría",
          errors: parsed.error.flatten(),
        });
      }

      const actualizada = await CategoryService.updateCategory(userId, categoryId, parsed.data);
      if (!actualizada) {
        return res.status(404).json({ message: "Categoría no encontrada" });
      }

      return res.status(200).json(actualizada);
    } catch (error: any) {
      console.error("[CategoryController] Error al actualizar categoría:", error);
      if (error?.message?.includes("DUPLICATE_CATEGORY_NAME") || error?.code === "23505") {
        return res.status(400).json({ message: "Ya existe otra categoría con este nombre" });
      }
      return res.status(500).json({ message: "Error al actualizar la categoría" });
    }
  },

  async deleteCategory(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const categoryId = parseInt(req.params.id, 10);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "ID de categoría inválido" });
      }

      const eliminada = await CategoryService.deleteCategory(userId, categoryId);
      if (!eliminada) {
        return res.status(404).json({ message: "Categoría no encontrada o no pudo eliminarse" });
      }

      return res.status(200).json({ message: "Categoría eliminada exitosamente", id: categoryId });
    } catch (error) {
      console.error("[CategoryController] Error al eliminar categoría:", error);
      return res.status(500).json({ message: "Error al eliminar la categoría" });
    }
  },
};

