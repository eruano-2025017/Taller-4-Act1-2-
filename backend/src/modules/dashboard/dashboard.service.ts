import { DashboardModel } from "./dashboard.model";
import { ActivityService, FormattedActivity } from "../activity/activity.service";

export interface MonthlyBarItem {
  mes: string;
  ingresos: number;
  egresos: number;
}

export interface CategoryBreakdownItem {
  categoria: string;
  monto: number;
  porcentaje: number;
  color: string;
}

export interface DashboardResponse {
  balance: number;
  totalIngresos: number;
  totalEgresos: number;
  gastosFijos: number;
  gastosVariables: number;
  porcentajeFijos: number;
  porcentajeVariables: number;
  saldoVariacion: string;
  ingresosVariacion: string;
  egresosVariacion: string;
  graficaMensual: MonthlyBarItem[];
  gastosPorCategoria: CategoryBreakdownItem[];
  actividadReciente: FormattedActivity[];
  tieneMovimientos: boolean;
}

const CATEGORY_COLORS = [
  "#051021", // Navy principal
  "#ff7a00", // Orange principal
  "#505f77", // Slate secundario
  "#16a34a", // Verde
  "#9333ea", // Púrpura
];

const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const DashboardService = {
  async getDashboardData(userId: number): Promise<DashboardResponse> {
    const summary = await DashboardModel.getSummary(userId);
    const totalIngresos = Number(summary.total_ingresos) || 0;
    const totalEgresos = Number(summary.total_egresos) || 0;
    const gastosFijos = Number(summary.gastos_fijos) || 0;
    const gastosVariables = Number(summary.gastos_variables) || 0;
    const balance = totalIngresos - totalEgresos;

    const totalGastosDesglose = gastosFijos + gastosVariables;
    const porcentajeFijos = totalGastosDesglose > 0 ? Math.round((gastosFijos / totalGastosDesglose) * 100) : 0;
    const porcentajeVariables = totalGastosDesglose > 0 ? 100 - porcentajeFijos : 0;

    // Movimientos mensuales para la gráfica (últimos 5 meses)
    const monthlyDb = await DashboardModel.getMonthlyMovements(userId);
    const ahora = new Date();
    const graficaMensual: MonthlyBarItem[] = [];

    for (let i = 4; i >= 0; i--) {
      const fechaMes = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
      const mesIndex = fechaMes.getMonth();
      const mesNum = mesIndex + 1;
      const anioNum = fechaMes.getFullYear();

      const match = monthlyDb.find((m) => m.mes_num === mesNum && m.anio === anioNum);
      graficaMensual.push({
        mes: NOMBRES_MESES[mesIndex],
        ingresos: match ? Number(match.ingresos) : 0,
        egresos: match ? Number(match.egresos) : 0,
      });
    }

    // Gastos por categoría
    const categoriesDb = await DashboardModel.getExpensesByCategory(userId);
    const totalCategorias = categoriesDb.reduce((acc, c) => acc + Number(c.monto), 0);

    const gastosPorCategoria: CategoryBreakdownItem[] = categoriesDb.map((c, index) => {
      const monto = Number(c.monto);
      const porcentaje = totalCategorias > 0 ? Math.round((monto / totalCategorias) * 100) : 0;
      return {
        categoria: c.categoria,
        monto,
        porcentaje,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      };
    });

    // Actividades reales desde el servicio de actividades
    const actividadReciente = await ActivityService.obtenerRecientes(userId, 5);

    const tieneMovimientos = totalIngresos > 0 || totalEgresos > 0 || actividadReciente.length > 0;

    return {
      balance,
      totalIngresos,
      totalEgresos,
      gastosFijos,
      gastosVariables,
      porcentajeFijos,
      porcentajeVariables,
      saldoVariacion: tieneMovimientos ? "+0.0% este mes" : "Sin movimientos previos",
      ingresosVariacion: tieneMovimientos ? "+0.0% vs mes anterior" : "Sin datos",
      egresosVariacion: tieneMovimientos ? "0.0% vs mes anterior" : "Sin datos",
      graficaMensual,
      gastosPorCategoria,
      actividadReciente,
      tieneMovimientos,
    };
  },
};
