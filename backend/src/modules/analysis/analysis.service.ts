import { AnalysisModel, AnalysisFilters, AnalysisCategoryItem, MonthlyTrendItem } from "./analysis.model";

export interface AnalysisResponse {
  periodo: {
    year: number;
    month?: number;
    aniosDisponibles: number[];
  };
  metricas: {
    totalIngresos: number;
    totalEgresos: number;
    balanceNeto: number;
    tasaAhorroPorcentaje: number;
    promedioIngresoPorTransaccion: number;
    promedioEgresoPorTransaccion: number;
    gastosFijos: number;
    gastosVariables: number;
    porcentajeFijos: number;
    porcentajeVariables: number;
    totalTransacciones: number;
    categoriaMayorGasto: string;
    montoMayorGasto: number;
    categoriaMayorIngreso: string;
    montoMayorIngreso: number;
  };
  categorias: AnalysisCategoryItem[];
  tendenciaMensual: MonthlyTrendItem[];
  tieneMovimientos: boolean;
}

export const AnalysisService = {
  async getAnalysis(userId: number, filters: AnalysisFilters): Promise<AnalysisResponse> {
    const aniosDisponibles = await AnalysisModel.getAvailableYears(userId);
    const year = filters.year || (aniosDisponibles[0] || new Date().getFullYear());
    const effectiveFilters = { ...filters, year };

    const [metricsRaw, categorias, tendenciaMensual] = await Promise.all([
      AnalysisModel.getMetrics(userId, effectiveFilters),
      AnalysisModel.getCategoriesBreakdown(userId, effectiveFilters),
      AnalysisModel.getMonthlyTrends(userId, year),
    ]);

    const totalIngresos = Number(metricsRaw.total_ingresos) || 0;
    const totalEgresos = Number(metricsRaw.total_egresos) || 0;
    const balanceNeto = totalIngresos - totalEgresos;
    const tasaAhorroPorcentaje =
      totalIngresos > 0 ? Math.round((balanceNeto / totalIngresos) * 1000) / 10 : 0;

    const gastosFijos = Number(metricsRaw.gastos_fijos) || 0;
    const gastosVariables = Number(metricsRaw.gastos_variables) || 0;
    const totalGastos = gastosFijos + gastosVariables;
    const porcentajeFijos = totalGastos > 0 ? Math.round((gastosFijos / totalGastos) * 100) : 0;
    const porcentajeVariables = totalGastos > 0 ? 100 - porcentajeFijos : 0;

    const totalTransacciones =
      Number(metricsRaw.total_transacciones_ingreso || 0) +
      Number(metricsRaw.total_transacciones_egreso || 0);

    // Identificar categoría de mayor gasto y mayor ingreso
    const gastosCat = categorias.filter((c) => c.tipo === "egreso");
    const ingresosCat = categorias.filter((c) => c.tipo === "ingreso");

    const catMayorGasto = gastosCat.length > 0 ? gastosCat[0].categoria : "Ninguna";
    const montoMayorGasto = gastosCat.length > 0 ? gastosCat[0].total : 0;

    const catMayorIngreso = ingresosCat.length > 0 ? ingresosCat[0].categoria : "Ninguna";
    const montoMayorIngreso = ingresosCat.length > 0 ? ingresosCat[0].total : 0;

    const tieneMovimientos = totalTransacciones > 0;

    return {
      periodo: {
        year,
        month: filters.month,
        aniosDisponibles,
      },
      metricas: {
        totalIngresos,
        totalEgresos,
        balanceNeto,
        tasaAhorroPorcentaje,
        promedioIngresoPorTransaccion: Math.round(Number(metricsRaw.promedio_ingresos) * 100) / 100,
        promedioEgresoPorTransaccion: Math.round(Number(metricsRaw.promedio_egresos) * 100) / 100,
        gastosFijos,
        gastosVariables,
        porcentajeFijos,
        porcentajeVariables,
        totalTransacciones,
        categoriaMayorGasto: catMayorGasto,
        montoMayorGasto,
        categoriaMayorIngreso: catMayorIngreso,
        montoMayorIngreso,
      },
      categorias,
      tendenciaMensual,
      tieneMovimientos,
    };
  },
};

