import { CategoryModel, CreateCategoryInput, CategoryRecord, CategorySummary } from "./category.model";
import { ActivityService } from "../activity/activity.service";

export interface CategoryDashboardData {
  summary: CategorySummary;
  categories: CategoryRecord[];
}

export const CategoryService = {
  async getCategoryDashboard(
    userId: number,
    search?: string,
    tipo?: string
  ): Promise<CategoryDashboardData> {
    // Llamar una sola vez antes de las queries paralelas para evitar condición de carrera
    await CategoryModel.ensureDefaultCategories(userId);

    const [summary, categories] = await Promise.all([
      CategoryModel.getSummary(userId, true),
      CategoryModel.getCategories(userId, search, tipo, true),
    ]);

    return {
      summary,
      categories,
    };
  },

  async createCategory(userId: number, input: CreateCategoryInput): Promise<CategoryRecord> {
    const nueva = await CategoryModel.create(userId, input);

    try {
      await ActivityService.registrar({
        userId,
        tipo: "CATEGORIA_CREADA",
        titulo: `Categoría creada: ${nueva.nombre}`,
        descripcion: `Tipo: ${nueva.tipo === "ingreso" ? "Ingreso" : "Egreso"}${nueva.descripcion ? ` - ${nueva.descripcion}` : ""}`,
        categoria: nueva.nombre,
        icono: nueva.icono,
      });
    } catch (err) {
      console.warn("[CategoryService] Error al registrar actividad:", err);
    }

    return nueva;
  },

  async updateCategory(
    userId: number,
    categoryId: number,
    input: Partial<CreateCategoryInput>
  ): Promise<CategoryRecord | null> {
    const actualizada = await CategoryModel.update(userId, categoryId, input);

    if (actualizada) {
      try {
        await ActivityService.registrar({
          userId,
          tipo: "CATEGORIA_ACTUALIZADA",
          titulo: `Categoría actualizada: ${actualizada.nombre}`,
          descripcion: `Tipo: ${actualizada.tipo === "ingreso" ? "Ingreso" : "Egreso"}`,
          categoria: actualizada.nombre,
          icono: actualizada.icono,
        });
      } catch (err) {
        console.warn("[CategoryService] Error al registrar actividad:", err);
      }
    }

    return actualizada;
  },

  async deleteCategory(userId: number, categoryId: number): Promise<boolean> {
    const existente = await CategoryModel.getById(userId, categoryId);
    const eliminada = await CategoryModel.delete(userId, categoryId);

    if (eliminada && existente) {
      try {
        await ActivityService.registrar({
          userId,
          tipo: "CATEGORIA_ELIMINADA",
          titulo: `Categoría eliminada: ${existente.nombre}`,
          descripcion: `Se eliminó la categoría de ${existente.tipo}`,
          categoria: existente.nombre,
          icono: "delete",
        });
      } catch (err) {
        console.warn("[CategoryService] Error al registrar actividad:", err);
      }
    }

    return eliminada;
  },
};

