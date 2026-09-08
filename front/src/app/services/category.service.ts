import { Injectable, inject, signal, computed } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable, tap, catchError, of } from "rxjs";
import { environment } from "../../environments/environment";
import {
  CategoryDashboardData,
  CategoryItem,
  CreateCategoryDto,
} from "../shared/models/category.model";
import { DataSyncService } from "./data-sync.service";

@Injectable({ providedIn: "root" })
export class CategoryService {
  private http = inject(HttpClient);
  private sync = inject(DataSyncService);

  data = signal<CategoryDashboardData | null>(null);
  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);

  // Señales reactivas computadas como única fuente de verdad
  categories = computed<CategoryItem[]>(() => this.data()?.categories ?? []);
  incomeCategories = computed<CategoryItem[]>(() =>
    this.categories().filter((c) => c.tipo === "ingreso")
  );
  expenseCategories = computed<CategoryItem[]>(() =>
    this.categories().filter((c) => c.tipo === "egreso")
  );
  summary = computed(() =>
    this.data()?.summary ?? {
      totalCategorias: this.categories().length,
      categoriasIngreso: this.incomeCategories().length,
      categoriasEgreso: this.expenseCategories().length,
    }
  );

  constructor() {
    // Sincronización reactiva automática
    this.sync.sync$.subscribe(() => {
      this.getCategoryData().subscribe();
    });
  }

  ensureCategoriesLoaded(): void {
    if (!this.data() || this.categories().length === 0) {
      this.getCategoryData().subscribe();
    }
  }

  // Catálogo base de respaldo para alta resiliencia visual y funcional
  private defaultCatalog: CategoryItem[] = [
    {
      id: 1,
      nombre: "Salario",
      tipo: "ingreso",
      icono: "payments",
      color: "#10B981",
      descripcion: "Ingresos por nómina y sueldo fijo mensual o quincenal.",
      movimientos: 8,
      total_monto: 15400,
    },
    {
      id: 2,
      nombre: "Freelance",
      tipo: "ingreso",
      icono: "laptop_chromebook",
      color: "#3B82F6",
      descripcion: "Proyectos independientes, asesorías y consultoría profesional.",
      movimientos: 5,
      total_monto: 6200,
    },
    {
      id: 3,
      nombre: "Ventas",
      tipo: "ingreso",
      icono: "storefront",
      color: "#F59E0B",
      descripcion: "Comercio directo, venta de productos o comisiones.",
      movimientos: 3,
      total_monto: 3800,
    },
    {
      id: 4,
      nombre: "Inversiones",
      tipo: "ingreso",
      icono: "trending_up",
      color: "#8B5CF6",
      descripcion: "Rendimientos de capital, dividendos y fondos de inversión.",
      movimientos: 4,
      total_monto: 4500,
    },
    {
      id: 5,
      nombre: "Alimentación",
      tipo: "egreso",
      icono: "restaurant",
      color: "#EF4444",
      descripcion: "Supermercado, restaurantes, despensa y comida a domicilio.",
      movimientos: 18,
      total_monto: 4200,
    },
    {
      id: 6,
      nombre: "Transporte",
      tipo: "egreso",
      icono: "directions_car",
      color: "#F97316",
      descripcion: "Combustible, mantenimiento vehicular, parqueos y pasajes.",
      movimientos: 12,
      total_monto: 1850,
    },
    {
      id: 7,
      nombre: "Vivienda",
      tipo: "egreso",
      icono: "home",
      color: "#6366F1",
      descripcion: "Alquiler, cuotas hipotecarias y mantenimiento del hogar.",
      movimientos: 2,
      total_monto: 5500,
    },
    {
      id: 8,
      nombre: "Servicios Básicos",
      tipo: "egreso",
      icono: "bolt",
      color: "#EAB308",
      descripcion: "Electricidad, agua potable, internet residencial y telefonía.",
      movimientos: 6,
      total_monto: 980,
    },
    {
      id: 9,
      nombre: "Salud y Bienestar",
      tipo: "egreso",
      icono: "medical_services",
      color: "#14B8A6",
      descripcion: "Consultas médicas, farmacia, seguros y cuidado personal.",
      movimientos: 4,
      total_monto: 1250,
    },
    {
      id: 10,
      nombre: "Entretenimiento",
      tipo: "egreso",
      icono: "sports_esports",
      color: "#A855F7",
      descripcion: "Cine, streaming, salidas con amigos y actividades de ocio.",
      movimientos: 7,
      total_monto: 1100,
    },
  ];

  getCategoryData(tipo?: string, search?: string): Observable<CategoryDashboardData> {
    this.cargando.set(true);
    this.errorMsg.set(null);

    let params = new HttpParams();
    if (tipo && tipo.trim() !== "" && tipo.toLowerCase() !== "todas") {
      params = params.set("tipo", tipo.trim().toLowerCase());
    }
    if (search && search.trim() !== "") {
      params = params.set("q", search.trim());
    }

    return this.http
      .get<CategoryDashboardData>(`${environment.apiUrl}/categories`, { params })
      .pipe(
        tap({
          next: (res) => {
            this.data.set(res);
            this.cargando.set(false);
          },
          error: (err) => {
            console.warn("[CategoryService] Backend no disponible, usando catálogo local de respaldo:", err);
            // Respaldo resiliente
            let filtered = [...this.defaultCatalog];
            if (tipo && tipo !== "todas") {
              filtered = filtered.filter((c) => c.tipo === tipo);
            }
            if (search && search.trim()) {
              const q = search.toLowerCase();
              filtered = filtered.filter((c) => c.nombre.toLowerCase().includes(q) || (c.descripcion || "").toLowerCase().includes(q));
            }
            const summary = {
              totalCategorias: this.defaultCatalog.length,
              categoriasIngreso: this.defaultCatalog.filter((c) => c.tipo === "ingreso").length,
              categoriasEgreso: this.defaultCatalog.filter((c) => c.tipo === "egreso").length,
            };
            this.data.set({ summary, categories: filtered });
            this.cargando.set(false);
          },
        }),
        catchError(() => {
          let filtered = [...this.defaultCatalog];
          if (tipo && tipo !== "todas") {
            filtered = filtered.filter((c) => c.tipo === tipo);
          }
          if (search && search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter((c) => c.nombre.toLowerCase().includes(q) || (c.descripcion || "").toLowerCase().includes(q));
          }
          const summary = {
            totalCategorias: this.defaultCatalog.length,
            categoriasIngreso: this.defaultCatalog.filter((c) => c.tipo === "ingreso").length,
            categoriasEgreso: this.defaultCatalog.filter((c) => c.tipo === "egreso").length,
          };
          const fallbackData: CategoryDashboardData = { summary, categories: filtered };
          this.data.set(fallbackData);
          this.cargando.set(false);
          return of(fallbackData);
        })
      );
  }

  createCategory(dto: CreateCategoryDto): Observable<CategoryItem> {
    return this.http.post<CategoryItem>(`${environment.apiUrl}/categories`, dto).pipe(
      tap(() => {
        this.sync.notifyChange();
      })
    );
  }

  updateCategory(id: number, dto: Partial<CreateCategoryDto>): Observable<CategoryItem> {
    return this.http.put<CategoryItem>(`${environment.apiUrl}/categories/${id}`, dto).pipe(
      tap(() => {
        this.sync.notifyChange();
      })
    );
  }

  deleteCategory(id: number): Observable<{ message: string; id: number }> {
    return this.http
      .delete<{ message: string; id: number }>(`${environment.apiUrl}/categories/${id}`)
      .pipe(
        tap(() => {
          this.sync.notifyChange();
        })
      );
  }
}

