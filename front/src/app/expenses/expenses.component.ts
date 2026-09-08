import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { ExpenseService } from "../services/expense.service";
import { CategoryService } from "../services/category.service";
import {
  ExpenseItem,
  ExpenseDashboardData,
  EvolutionDataPoint,
} from "../shared/models/expense.model";

@Component({
  selector: "app-expenses",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: "./expenses.component.html",
})
export class ExpensesComponent implements OnInit {
  public auth = inject(AuthService);
  public expenseService = inject(ExpenseService);
  public categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  // Estados reactivos con Signals
  drawerAbierto = signal<boolean>(false);
  editandoId = signal<number | null>(null);
  guardando = signal<boolean>(false);
  eliminandoId = signal<number | null>(null);
  filtroTexto = signal<string>("");
  categoriaSeleccionada = signal<string>("todas");
  periodoSeleccionado = signal<string>("Este Mes");
  mostrarToast = signal<boolean>(false);
  mensajeToast = signal<string>("");
  tipoToast = signal<"success" | "error">("success");

  // Formulario reactivo
  form = this.fb.group({
    descripcion: ["", [Validators.required, Validators.maxLength(255)]],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    fecha: [new Date().toISOString().split("T")[0], [Validators.required]],
    categoria: ["", [Validators.required]],
    metodo: ["Transferencia", [Validators.required]],
    observacion: [""],
  });

  // Cálculos reactivos
  inicialUsuario = computed(() => {
    const nombre = this.auth.usuarioActual()?.nombre ?? "U";
    return nombre.charAt(0).toUpperCase();
  });

  mesActual = computed(() => {
    const d = new Date();
    const str = new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(d);
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Vista previa reactiva del Drawer
  previewDescripcion = computed(() => {
    return this.form.value.descripcion?.trim() || "Descripción del egreso";
  });

  previewMonto = computed(() => {
    const val = this.form.value.monto;
    return val !== null && val !== undefined && !isNaN(val) ? val : 0;
  });

  previewCategoria = computed(() => {
    return this.form.value.categoria || "Categoría";
  });

  previewMetodo = computed(() => {
    return this.form.value.metodo || "Transferencia";
  });

  previewFecha = computed(() => {
    const f = this.form.value.fecha;
    if (!f) return "Hoy";
    const partes = f.split("-");
    if (partes.length === 3) {
      const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
      return new Intl.DateTimeFormat("es-GT", { day: "2-digit", month: "short", year: "numeric" }).format(d);
    }
    return f;
  });

  // Lista filtrada de egresos
  egresosFiltrados = computed(() => {
    const data = this.expenseService.data();
    if (!data?.expenses) return [];
    let items = data.expenses;

    const cat = this.categoriaSeleccionada().toLowerCase();
    if (cat !== "todas") {
      items = items.filter((i) => (i.categoria || "").toLowerCase() === cat);
    }

    const q = this.filtroTexto().toLowerCase().trim();
    if (q) {
      items = items.filter(
        (i) =>
          (i.descripcion || "").toLowerCase().includes(q) ||
          (i.categoria || "").toLowerCase().includes(q) ||
          (i.metodo || "").toLowerCase().includes(q)
      );
    }

    return items;
  });

  ngOnInit(): void {
    this.cargarDatos();
    this.categoryService.ensureCategoriesLoaded();
  }

  cargarDatos(): void {
    this.expenseService
      .getExpenseData(this.filtroTexto(), this.categoriaSeleccionada())
      .subscribe();
  }

  onBuscar(termino: string): void {
    this.filtroTexto.set(termino);
  }

  onFiltrarCategoria(categoria: string): void {
    this.categoriaSeleccionada.set(categoria);
  }

  // Métodos del Drawer
  abrirDrawerNuevo(): void {
    this.editandoId.set(null);
    const categoriasDisponibles = this.categoryService.expenseCategories();
    const catInicial = categoriasDisponibles.length > 0 ? categoriasDisponibles[0].nombre : "";

    this.form.reset({
      descripcion: "",
      monto: null,
      fecha: new Date().toISOString().split("T")[0],
      categoria: catInicial,
      metodo: "Transferencia",
      observacion: "",
    });
    this.drawerAbierto.set(true);
  }

  abrirDrawerEditar(egreso: ExpenseItem): void {
    this.editandoId.set(egreso.id);
    const fechaFormatted = egreso.fecha
      ? new Date(egreso.fecha).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    this.form.patchValue({
      descripcion: egreso.descripcion,
      monto: egreso.monto,
      fecha: fechaFormatted,
      categoria: egreso.categoria,
      metodo: egreso.metodo || "Transferencia",
      observacion: egreso.observacion || "",
    });
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.editandoId.set(null);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const val = this.form.getRawValue();

    const payload = {
      descripcion: val.descripcion!,
      monto: Number(val.monto),
      fecha: val.fecha!,
      categoria: val.categoria!,
      metodo: val.metodo!,
      observacion: val.observacion || undefined,
    };

    const id = this.editandoId();

    if (id) {
      this.expenseService.updateExpense(id, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Egreso actualizado exitosamente", "success");
        },
        error: (err) => {
          console.error("[ExpensesComponent] Error al actualizar egreso:", err);
          this.guardando.set(false);
          this.lanzarToast("No se pudo actualizar el egreso. Inténtalo de nuevo.", "error");
        },
      });
    } else {
      this.expenseService.createExpense(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Egreso registrado exitosamente", "success");
        },
        error: (err) => {
          console.error("[ExpensesComponent] Error al registrar egreso:", err);
          this.guardando.set(false);
          this.lanzarToast("No se pudo registrar el egreso. Revisa los datos.", "error");
        },
      });
    }
  }

  solicitarEliminar(egreso: ExpenseItem, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar el egreso "${egreso.descripcion}"?`)) {
      this.eliminandoId.set(egreso.id);
      this.expenseService.deleteExpense(egreso.id).subscribe({
        next: () => {
          this.eliminandoId.set(null);
          this.cargarDatos();
          this.lanzarToast("Egreso eliminado correctamente", "success");
        },
        error: (err) => {
          console.error("[ExpensesComponent] Error al eliminar egreso:", err);
          this.eliminandoId.set(null);
          this.lanzarToast("Error al eliminar el egreso.", "error");
        },
      });
    }
  }

  lanzarToast(mensaje: string, tipo: "success" | "error" = "success"): void {
    this.mensajeToast.set(mensaje);
    this.tipoToast.set(tipo);
    this.mostrarToast.set(true);
    setTimeout(() => {
      this.mostrarToast.set(false);
    }, 3500);
  }

  formatoMoneda(val: number | null | undefined): string {
    const num = val ?? 0;
    return `Q ${new Intl.NumberFormat("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num)}`;
  }

  formatoFechaTabla(fechaStr: string | null | undefined): string {
    if (!fechaStr) return "-";
    const d = new Date(fechaStr);
    return new Intl.DateTimeFormat("es-GT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }

  getCategoriaBadgeClass(categoria: string): string {
    const cat = (categoria || "").toLowerCase();
    if (cat.includes("aliment") || cat.includes("comida")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (cat.includes("transporte") || cat.includes("gasolina")) {
      return "bg-amber-50 text-amber-800 border-amber-200";
    }
    if (cat.includes("vivienda") || cat.includes("alquiler") || cat.includes("casa")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    if (cat.includes("servicio") || cat.includes("luz") || cat.includes("agua")) {
      return "bg-yellow-50 text-yellow-800 border-yellow-200";
    }
    if (cat.includes("salud") || cat.includes("med")) {
      return "bg-teal-50 text-teal-700 border-teal-200";
    }
    if (cat.includes("entretenimiento") || cat.includes("ocio") || cat.includes("juego")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    return "bg-orange-50 text-orange-700 border-orange-200";
  }

  getMetodoBadgeClass(metodo: string): string {
    const m = (metodo || "").toLowerCase();
    if (m.includes("efectivo")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (m.includes("tarjeta")) return "bg-sky-50 text-sky-700 border-sky-200";
    if (m.includes("depósito") || m.includes("deposito")) return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  getChartData(): {
    pathD: string;
    areaD: string;
    points: { x: number; y: number; val: number; label: string }[];
    maxVal: number;
  } {
    const evolucion = this.expenseService.data()?.evolucion ?? [];
    if (evolucion.length === 0) {
      return { pathD: "", areaD: "", points: [], maxVal: 1000 };
    }

    const values = evolucion.map((p) => p.monto);
    const rawMax = Math.max(...values, 100);
    const maxVal = Math.ceil(rawMax / 100) * 100;

    const width = 540;
    const height = 156;
    const paddingX = 24;
    const paddingY = 16;
    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;

    const stepX = evolucion.length > 1 ? usableW / (evolucion.length - 1) : usableW;

    const coords = evolucion.map((pt, i) => {
      const x = paddingX + i * stepX;
      const normalizedY = maxVal > 0 ? pt.monto / maxVal : 0;
      const y = height - paddingY - normalizedY * usableH;
      return { x, y, val: pt.monto, label: pt.label };
    });

    let pathD = "";
    if (coords.length > 0) {
      pathD = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        const prev = coords[i - 1];
        const curr = coords[i];
        const cp1x = prev.x + (curr.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (curr.x - prev.x) / 2;
        const cp2y = curr.y;
        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
      }
    }

    let areaD = "";
    if (coords.length > 0) {
      const first = coords[0];
      const last = coords[coords.length - 1];
      const bottom = height - paddingY;
      areaD = `${pathD} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
    }

    return { pathD, areaD, points: coords, maxVal };
  }

  getYAxisLabels(): string[] {
    const rawMax = this.getChartData().maxVal;
    return [
      `Q ${(rawMax).toLocaleString("es-GT")}`,
      `Q ${(rawMax * 0.66).toFixed(0)}`,
      `Q ${(rawMax * 0.33).toFixed(0)}`,
      "Q 0",
    ];
  }
}

