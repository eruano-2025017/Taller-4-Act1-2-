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
  anioSeleccionado: number;
  aniosDisponibles: number[];
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

function calcVariacion(actual: number, anterior: number): string {
  if (anterior === 0 && actual === 0) return 'Sin movimientos';
  if (anterior === 0) return '+100% vs mes anterior';
  const diff = ((actual - anterior) / anterior) * 100;
  return `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs mes anterior`;
}

export const DashboardService = {
  async getDashboardData(userId: number, year?: number): Promise<DashboardResponse> {
    const summary = await DashboardModel.getSummary(userId);
    const totalIngresos = Number(summary.total_ingresos) || 0;
    const totalEgresos = Number(summary.total_egresos) || 0;
    const gastosFijos = Number(summary.gastos_fijos) || 0;
    const gastosVariables = Number(summary.gastos_variables) || 0;
    const balance = totalIngresos - totalEgresos;

    const totalGastosDesglose = gastosFijos + gastosVariables;
    const porcentajeFijos = totalGastosDesglose > 0 ? Math.round((gastosFijos / totalGastosDesglose) * 100) : 0;
    const porcentajeVariables = totalGastosDesglose > 0 ? 100 - porcentajeFijos : 0;

    // Año seleccionado y lista de años disponibles en la base de datos
    const aniosDisponibles = await DashboardModel.getAvailableYears(userId);
    const anioSeleccionado = year && !isNaN(year) ? year : (aniosDisponibles[0] || new Date().getFullYear());

    // Gráfica anual completa: exactamente los 12 meses (Ene-Dic)
    // Los meses sin movimientos aparecen con 0 garantizado
    const yearlyDb = await DashboardModel.getYearlyMovements(userId, anioSeleccionado);
    const graficaMensual: MonthlyBarItem[] = NOMBRES_MESES.map((nombre, index) => {
      const match = yearlyDb.find((m) => m.mes_num === index + 1);
      return {
        mes: nombre,
        ingresos: match ? Number(match.ingresos) : 0,
        egresos: match ? Number(match.egresos) : 0,
      };
    });

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

    const variations = await DashboardModel.getVariations(userId);
    const balanceActual = variations.ingresosActual - variations.egresosActual;
    const balanceAnterior = variations.ingresosAnterior - variations.egresosAnterior;
    
    let saldoVariacion = 'Sin movimientos previos';
    if (balanceAnterior === 0 && balanceActual === 0) {
      saldoVariacion = 'Sin movimientos';
    } else if (balanceAnterior === 0) {
      saldoVariacion = '+100% este mes';
    } else {
      const diff = ((balanceActual - balanceAnterior) / Math.abs(balanceAnterior)) * 100;
      saldoVariacion = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% este mes`;
    }

    const ingresosVariacion = calcVariacion(variations.ingresosActual, variations.ingresosAnterior);
    const egresosVariacion = calcVariacion(variations.egresosActual, variations.egresosAnterior);

    return {
      balance,
      totalIngresos,
      totalEgresos,
      gastosFijos,
      gastosVariables,
      porcentajeFijos,
      porcentajeVariables,
      saldoVariacion,
      ingresosVariacion,
      egresosVariacion,
      anioSeleccionado,
      aniosDisponibles,
      graficaMensual,
      gastosPorCategoria,
      actividadReciente,
      tieneMovimientos,
    };
  },

  async getYearChart(userId: number, year: number): Promise<{ anio: number; meses: MonthlyBarItem[] }> {
    const movements = await DashboardModel.getYearlyMovements(userId, year);
    const meses: MonthlyBarItem[] = NOMBRES_MESES.map((nombre, index) => {
      const match = movements.find((m) => m.mes_num === index + 1);
      return {
        mes: nombre,
        ingresos: match ? Number(match.ingresos) : 0,
        egresos: match ? Number(match.egresos) : 0,
      };
    });
    return { anio: year, meses };
  },
};
