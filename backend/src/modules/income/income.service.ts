import { IncomeModel, CreateIncomeInput, IncomeRecord, IncomeSummaryMetrics, EvolutionDataPoint } from "./income.model";
import { ActivityService } from "../activity/activity.service";

export interface IncomeViewData {
  summary: IncomeSummaryMetrics;
  evolucion: EvolutionDataPoint[];
  incomes: IncomeRecord[];
}

export const IncomeService = {
  async getIncomeDashboard(
    userId: number,
    search?: string,
    categoria?: string
  ): Promise<IncomeViewData> {
    const [summary, evolucion, incomes] = await Promise.all([
      IncomeModel.getSummary(userId),
      IncomeModel.getEvolution(userId),
      IncomeModel.getIncomes(userId, search, categoria),
    ]);

    return {
      summary,
      evolucion,
      incomes,
    };
  },

  async createIncome(userId: number, input: CreateIncomeInput): Promise<IncomeRecord> {
    const nuevo = await IncomeModel.create(userId, input);

    // Registro de auditoría/actividad desacoplado
    try {
      await ActivityService.registrar({
        userId,
        tipo: "INGRESO_CREADO",
        titulo: `Ingreso registrado: ${nuevo.descripcion}`,
        descripcion: `Monto: Q ${nuevo.monto.toFixed(2)} (${nuevo.metodo})`,
        categoria: nuevo.categoria,
        monto: nuevo.monto,
        icono: "payments",
      });
    } catch (err) {
      console.warn("[IncomeService] No se pudo registrar la actividad:", err);
    }

    return nuevo;
  },

  async updateIncome(
    userId: number,
    incomeId: number,
    input: Partial<CreateIncomeInput>
  ): Promise<IncomeRecord | null> {
    const actualizado = await IncomeModel.update(userId, incomeId, input);
    return actualizado;
  },

  async deleteIncome(userId: number, incomeId: number): Promise<boolean> {
    const eliminado = await IncomeModel.delete(userId, incomeId);

    if (eliminado) {
      try {
        await ActivityService.registrar({
          userId,
          tipo: "INGRESO_ELIMINADO",
          titulo: "Ingreso eliminado",
          descripcion: `Registro #${incomeId} eliminado`,
          categoria: "Ingreso",
          monto: null,
          icono: "delete_sweep",
        });
      } catch (err) {
        console.warn("[IncomeService] No se pudo registrar la actividad de borrado:", err);
      }
    }

    return eliminado;
  },
};

