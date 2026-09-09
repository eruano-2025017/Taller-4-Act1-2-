import { Component, OnInit, inject, signal, computed, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { ExpenseService } from "../services/expense.service";
import { CategoryService } from "../services/category.service";
import { FormLivePreviewComponent } from "../shared/components/form-live-preview/form-live-preview.component";
import {
  ExpenseItem,
  ExpenseDashboardData,
  EvolutionDataPoint,
} from "../shared/models/expense.model";

@Component({
  selector: "app-expenses",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, FormLivePreviewComponent],
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

  // Signal reactivo para sincronización instantánea de cada pulsación de tecla
  formValue = signal(this.form.getRawValue());

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
    return this.formValue().descripcion?.trim() || "";
  });

  previewMonto = computed(() => {
    const val = this.formValue().monto;
    return val !== null && val !== undefined && !isNaN(Number(val)) ? Number(val) : 0;
  });

  previewCategoria = computed(() => {
    return this.formValue().categoria || "";
  });

  categoriaObjeto = computed(() => {
    const catNom = (this.previewCategoria() || "").toLowerCase().trim();
    if (!catNom) return null;
    return (
      this.categoryService.expenseCategories().find(
        (c) => c.nombre.toLowerCase().trim() === catNom
      ) ||
      this.categoryService.categories().find(
        (c) => c.nombre.toLowerCase().trim() === catNom
      ) ||
      null
    );
  });

  previewCategoriaIcono = computed(() => {
    return this.categoriaObjeto()?.icono || "shopping_cart";
  });

  previewCategoriaColor = computed(() => {
    return this.categoriaObjeto()?.color || "#EF4444";
  });

  previewMetodo = computed(() => {
    return this.formValue().metodo || "Transferencia";
  });

  previewFecha = computed(() => {
    return this.formValue().fecha || "";
  });

  previewObservacion = computed(() => {
    return this.formValue().observacion || "";
  });

  @HostListener("document:keydown.escape")
  onEscapePress(): void {
    if (this.drawerAbierto()) {
      this.cerrarDrawer();
    }
  }

  agregarMonto(cantidad: number): void {
    const actual = Number(this.form.value.monto) || 0;
    const nuevo = Math.round((actual + cantidad) * 100) / 100;
    this.form.patchValue({ monto: nuevo });
    this.formValue.set(this.form.getRawValue());
  }

  fijarMonto(cantidad: number): void {
    this.form.patchValue({ monto: cantidad });
    this.formValue.set(this.form.getRawValue());
  }

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

  // Métricas analíticas exclusivas del Centro de Control de Egresos
  totalEgresosFiltrados = computed(() => {
    return this.egresosFiltrados().reduce((acc, item) => acc + (Number(item.monto) || 0), 0);
  });

  cantidadEgresos = computed(() => {
    return this.egresosFiltrados().length;
  });

  promedioPorEgreso = computed(() => {
    const total = this.totalEgresosFiltrados();
    const count = this.cantidadEgresos();
    return count > 0 ? total / count : 0;
  });

  mayorEgresoItem = computed(() => {
    const items = this.egresosFiltrados();
    if (items.length === 0) return null;
    return [...items].sort((a, b) => (Number(b.monto) || 0) - (Number(a.monto) || 0))[0];
  });

  ngOnInit(): void {
    this.cargarDatos();
    this.categoryService.ensureCategoriesLoaded();
    this.form.valueChanges.subscribe(() => {
      this.formValue.set(this.form.getRawValue());
    });
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
    this.formValue.set(this.form.getRawValue());
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
    this.formValue.set(this.form.getRawValue());
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
          this.lanzarToast("No se pudo actualizar el egreso. Inténtelo de nuevo.", "error");
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
          this.lanzarToast("No se pudo registrar el egreso. Revise los datos.", "error");
        },
      });
    }
  }

  solicitarEliminar(egreso: ExpenseItem, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm(`¿Está seguro de eliminar el egreso "${egreso.descripcion}"?`)) {
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



  getCategoryInfo(nombre: string): { color: string; icono: string; nombre: string } {
    const nomLower = (nombre || "").toLowerCase().trim();
    const found =
      this.categoryService.expenseCategories().find((c) => c.nombre.toLowerCase().trim() === nomLower) ||
      this.categoryService.categories().find((c) => c.nombre.toLowerCase().trim() === nomLower);

    if (found) {
      return { color: found.color || "#EF4444", icono: found.icono || "shopping_cart", nombre: found.nombre };
    }

    // Colores y badges de fallback semánticos
    if (nomLower.includes("aliment") || nomLower.includes("comida")) {
      return { color: "#F43F5E", icono: "restaurant", nombre };
    }
    if (nomLower.includes("transporte") || nomLower.includes("gasolina")) {
      return { color: "#F59E0B", icono: "local_gas_station", nombre };
    }
    if (nomLower.includes("vivienda") || nomLower.includes("casa") || nomLower.includes("alquiler")) {
      return { color: "#6366F1", icono: "home", nombre };
    }
    if (nomLower.includes("servicio") || nomLower.includes("luz") || nomLower.includes("agua")) {
      return { color: "#EAB308", icono: "bolt", nombre };
    }
    if (nomLower.includes("salud") || nomLower.includes("med")) {
      return { color: "#14B8A6", icono: "medical_services", nombre };
    }
    if (nomLower.includes("entretenimiento") || nomLower.includes("ocio")) {
      return { color: "#A855F7", icono: "movie", nombre };
    }

    return { color: "#EF4444", icono: "receipt_long", nombre };
  }

  formatoFechaRelativa(fechaStr: string | null | undefined): string {
    if (!fechaStr) return "-";
    try {
      const d = new Date(fechaStr);
      return new Intl.DateTimeFormat("es-GT", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return fechaStr;
    }
  }

  trackByExpenseId(_index: number, item: ExpenseItem): number {
    return item.id;
  }
}

