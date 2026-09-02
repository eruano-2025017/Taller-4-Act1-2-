import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import {
  IncomeDashboardData,
  IncomeItem,
  CreateIncomeDto,
} from "../shared/models/income.model";
import { DataSyncService } from "./data-sync.service";

@Injectable({ providedIn: "root" })
export class IncomeService {
  private http = inject(HttpClient);
  private sync = inject(DataSyncService);

  data = signal<IncomeDashboardData | null>(null);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  getIncomeData(search?: string, categoria?: string): Observable<IncomeDashboardData> {
    this.cargando.set(true);
    this.errorMsg.set(null);

    let params = new HttpParams();
    if (search && search.trim() !== "") {
      params = params.set("q", search.trim());
    }
    if (categoria && categoria.trim() !== "" && categoria.toLowerCase() !== "todas") {
      params = params.set("categoria", categoria.trim());
    }

    return this.http
      .get<IncomeDashboardData>(`${environment.apiUrl}/incomes`, { params })
      .pipe(
        tap({
          next: (res) => {
            this.data.set(res);
            this.cargando.set(false);
          },
          error: (err) => {
            console.error("[IncomeService] Error al cargar ingresos:", err);
            this.errorMsg.set("No se pudieron cargar los datos de ingresos.");
            this.cargando.set(false);
          },
        })
      );
  }

  createIncome(dto: CreateIncomeDto): Observable<IncomeItem> {
    return this.http.post<IncomeItem>(`${environment.apiUrl}/incomes`, dto).pipe(
      tap(() => this.sync.notifyChange())
    );
  }

  updateIncome(id: number, dto: Partial<CreateIncomeDto>): Observable<IncomeItem> {
    return this.http.put<IncomeItem>(`${environment.apiUrl}/incomes/${id}`, dto).pipe(
      tap(() => this.sync.notifyChange())
    );
  }

  deleteIncome(id: number): Observable<{ message: string; id: number }> {
    return this.http.delete<{ message: string; id: number }>(
      `${environment.apiUrl}/incomes/${id}`
    ).pipe(
      tap(() => this.sync.notifyChange())
    );
  }
}

