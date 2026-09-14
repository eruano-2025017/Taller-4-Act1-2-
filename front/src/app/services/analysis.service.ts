import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface AnalysisFilters {
  year?: number;
  month?: number;
  tipo?: "ingreso" | "egreso" | "todos";
  categoria?: string;
}

export interface AnalysisCategoryItem {
  categoria: string;
  tipo: "ingreso" | "egreso";
  total: number;
  transacciones: number;
  porcentaje: number;
  promedio: number;
}

export interface MonthlyTrendItem {
  mesNum: number;
  mesNombre: string;
  anio: number;
  ingresos: number;
  egresos: number;
  ahorroNeto: number;
  tasaAhorro: number;
}

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

@Injectable({ providedIn: "root" })
export class AnalysisService {
  private http = inject(HttpClient);

  getAnalysis(filters: AnalysisFilters = {}): Observable<AnalysisResponse> {
    let params = new HttpParams();
    if (filters.year) params = params.set("year", filters.year.toString());
    if (filters.month) params = params.set("month", filters.month.toString());
    if (filters.tipo) params = params.set("tipo", filters.tipo);
    if (filters.categoria) params = params.set("categoria", filters.categoria);

    return this.http.get<AnalysisResponse>(`${environment.apiUrl}/analysis`, { params });
  }
}

