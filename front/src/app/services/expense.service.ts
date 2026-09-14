import { Injectable, inject, signal } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import {
  ExpenseDashboardData,
  ExpenseItem,
  CreateExpenseDto,
} from "../shared/models/expense.model";
import { DataSyncService } from "./data-sync.service";

@Injectable({ providedIn: "root" })
export class ExpenseService {
  private http = inject(HttpClient);
  private sync = inject(DataSyncService);

  data = signal<ExpenseDashboardData | null>(null);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  getExpenseData(search?: string, categoria?: string): Observable<ExpenseDashboardData> {
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
      .get<ExpenseDashboardData>(`${environment.apiUrl}/expenses`, { params })
      .pipe(
        tap({
          next: (res) => {
            this.data.set(res);
            this.cargando.set(false);
          },
          error: (err) => {
            console.error("[ExpenseService] Error al cargar egresos:", err);
            this.errorMsg.set("No se pudieron cargar los datos de egresos.");
            this.cargando.set(false);
          },
        })
      );
  }

  createExpense(dto: CreateExpenseDto): Observable<ExpenseItem> {
    return this.http.post<ExpenseItem>(`${environment.apiUrl}/expenses`, dto).pipe(
      tap(() => this.sync.notifyChange())
    );
  }

  updateExpense(id: number, dto: Partial<CreateExpenseDto>): Observable<ExpenseItem> {
    return this.http.put<ExpenseItem>(`${environment.apiUrl}/expenses/${id}`, dto).pipe(
      tap(() => this.sync.notifyChange())
    );
  }

  deleteExpense(id: number): Observable<{ message: string; id: number }> {
    return this.http
      .delete<{ message: string; id: number }>(`${environment.apiUrl}/expenses/${id}`)
      .pipe(tap(() => this.sync.notifyChange()));
  }
}

