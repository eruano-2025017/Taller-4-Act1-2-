import {
  ExpenseModel,
  CreateExpenseInput,
  ExpenseRecord,
  ExpenseSummaryMetrics,
  EvolutionDataPoint,
} from "./expense.model";
import { ActivityService } from "../activity/activity.service";

export interface ExpenseViewData {
  summary: ExpenseSummaryMetrics;
  evolucion: EvolutionDataPoint[];
  expenses: ExpenseRecord[];
}

export const ExpenseService = {
  async getExpenseDashboard(
    userId: number,
    search?: string,
    categoria?: string
  ): Promise<ExpenseViewData> {
    const [summary, evolucion, expenses] = await Promise.all([
      ExpenseModel.getSummary(userId),
      ExpenseModel.getEvolution(userId),
      ExpenseModel.getExpenses(userId, search, categoria),
    ]);

    return {
      summary,
      evolucion,
      expenses,
    };
  },

  async createExpense(userId: number, input: CreateExpenseInput): Promise<ExpenseRecord> {
    const nuevo = await ExpenseModel.create(userId, input);

    try {
      await ActivityService.registrar({
        userId,
        tipo: "EGRESO_REGISTRADO",
        titulo: `Egreso registrado: ${nuevo.descripcion}`,
        descripcion: `Monto: Q ${nuevo.monto.toFixed(2)} (${nuevo.metodo})`,
        categoria: nuevo.categoria,
        monto: nuevo.monto,
        icono: "shopping_cart",
      });
    } catch (err) {
      console.warn("[ExpenseService] No se pudo registrar la actividad:", err);
    }

    return nuevo;
  },

  async updateExpense(
    userId: number,
    expenseId: number,
    input: Partial<CreateExpenseInput>
  ): Promise<ExpenseRecord | null> {
    const actualizado = await ExpenseModel.update(userId, expenseId, input);

    if (actualizado) {
      try {
        await ActivityService.registrar({
          userId,
          tipo: "EGRESO_ACTUALIZADO",
          titulo: `Egreso modificado: ${actualizado.descripcion}`,
          descripcion: `Monto: Q ${actualizado.monto.toFixed(2)} (${actualizado.metodo})`,
          categoria: actualizado.categoria,
          monto: actualizado.monto,
          icono: "edit",
        });
      } catch (err) {
        console.warn("[ExpenseService] No se pudo registrar la actividad de actualización:", err);
      }
    }

    return actualizado;
  },

  async deleteExpense(userId: number, expenseId: number): Promise<boolean> {
    const existente = await ExpenseModel.getById(userId, expenseId);
    const eliminado = await ExpenseModel.delete(userId, expenseId);

    if (eliminado) {
      try {
        await ActivityService.registrar({
          userId,
          tipo: "EGRESO_ELIMINADO",
          titulo: `Egreso eliminado: ${existente?.descripcion || `#${expenseId}`}`,
          descripcion: `Se eliminó el gasto de ${existente?.categoria || "Egreso"}`,
          categoria: existente?.categoria || "Egreso",
          monto: existente?.monto ?? null,
          icono: "delete_sweep",
        });
      } catch (err) {
        console.warn("[ExpenseService] No se pudo registrar la actividad de borrado:", err);
      }
    }

    return eliminado;
  },
};

