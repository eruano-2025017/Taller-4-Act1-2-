import { Component, OnInit, inject, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { IncomeService } from "../services/income.service";
import {
  IncomeItem,
  IncomeDashboardData,
  EvolutionDataPoint,
} from "../shared/models/income.model";

@Component({
  selector: "app-incomes",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
  templateUrl: "./incomes.component.html",
})
export class IncomesComponent implements OnInit {
  public auth = inject(AuthService);
  public incomeService = inject(IncomeService);
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
    return this.form.value.descripcion?.trim() || "Descripción del ingreso";
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

  // Lista filtrada de ingresos
  ingresosFiltrados = computed(() => {
    const data = this.incomeService.data();
    if (!data?.incomes) return [];
    let items = data.incomes;

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
  }

  cargarDatos(): void {
    this.incomeService
      .getIncomeData(this.filtroTexto(), this.categoriaSeleccionada())
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
    this.form.reset({
      descripcion: "",
      monto: null,
      fecha: new Date().toISOString().split("T")[0],
      categoria: "",
      metodo: "Transferencia",
      observacion: "",
    });
    this.drawerAbierto.set(true);
  }

  abrirDrawerEditar(ingreso: IncomeItem): void {
    this.editandoId.set(ingreso.id);
    const fechaFormatted = ingreso.fecha
      ? new Date(ingreso.fecha).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    this.form.patchValue({
      descripcion: ingreso.descripcion,
      monto: ingreso.monto,
      fecha: fechaFormatted,
      categoria: ingreso.categoria,
      metodo: ingreso.metodo || "Transferencia",
      observacion: ingreso.observacion || "",
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
      // Actualización
      this.incomeService.updateIncome(id, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Ingreso actualizado exitosamente");
        },
        error: (err) => {
          console.error("[IncomesComponent] Error al actualizar ingreso:", err);
          this.guardando.set(false);
          alert("No se pudo actualizar el ingreso. Inténtalo de nuevo.");
        },
      });
    } else {
      // Creación
      this.incomeService.createIncome(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Ingreso registrado exitosamente");
        },
        error: (err) => {
          console.error("[IncomesComponent] Error al crear ingreso:", err);
          this.guardando.set(false);
          alert("No se pudo registrar el ingreso. Inténtalo de nuevo.");
        },
      });
    }
  }

  confirmarEliminar(id: number): void {
    if (confirm("¿Estás seguro de que deseas eliminar este ingreso?")) {
      this.eliminandoId.set(id);
      this.incomeService.deleteIncome(id).subscribe({
        next: () => {
          this.eliminandoId.set(null);
          this.cargarDatos();
          this.lanzarToast("Ingreso eliminado");
        },
        error: (err) => {
          console.error("[IncomesComponent] Error al eliminar ingreso:", err);
          this.eliminandoId.set(null);
          alert("No se pudo eliminar el registro.");
        },
      });
    }
  }

  lanzarToast(mensaje: string): void {
    this.mensajeToast.set(mensaje);
    this.mostrarToast.set(true);
    setTimeout(() => {
      this.mostrarToast.set(false);
    }, 3500);
  }

  // Formateadores y Utilidades
  formatoMoneda(val: number | null | undefined): string {
    const num = val ?? 0;
    const formatted = new Intl.NumberFormat("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `Q ${formatted}`;
  }

  formatoFechaTabla(fechaStr: string): string {
    if (!fechaStr) return "-";
    try {
      const d = new Date(fechaStr);
      return new Intl.DateTimeFormat("es-GT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return fechaStr;
    }
  }

  getCategoriaBadgeClass(cat: string): string {
    const c = (cat || "").toLowerCase();
    if (c.includes("salario") || c.includes("sueldo") || c.includes("nómina")) {
      return "bg-blue-50 text-blue-700 border-blue-200/80";
    }
    if (c.includes("freelance") || c.includes("consultor")) {
      return "bg-orange-50 text-orange-700 border-orange-200/80";
    }
    if (c.includes("venta") || c.includes("comercio")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
    }
    if (c.includes("inversi") || c.includes("dividendo")) {
      return "bg-purple-50 text-purple-700 border-purple-200/80";
    }
    if (c.includes("bono") || c.includes("bonificaci")) {
      return "bg-amber-50 text-amber-700 border-amber-200/80";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  }

  // ── FUNCIONES DE LA GRÁFICA REDISEÑADA ──────────────────────────────

  /**
   * Calcula las etiquetas del eje Y basadas en el valor máximo real de los datos.
   * Retorna 5 etiquetas desde el máximo hasta 0 (de arriba hacia abajo).
   */
  getYAxisLabels(): string[] {
    const raw = this.incomeService.data()?.evolucion || [];
    const maxRaw = raw.length > 0 ? Math.max(...raw.map((p) => p.monto)) : 0;
    const maxVal = maxRaw > 0 ? this.redondearEscala(maxRaw) : 8000;
    const step = maxVal / 4;
    return [maxVal, step * 3, step * 2, step, 0].map((v) => this.formatearEjeY(v));
  }

  /**
   * Genera las coordenadas Y para las líneas de grilla (5 niveles).
   * Alineadas con el eje Y del SVG viewBox 540×156, padding 10px.
   */
  getGridLines(): Array<{ y: number }> {
    const height = 156;
    const padTop = 10;
    const padBottom = 10;
    const drawH = height - padTop - padBottom;
    return [0, 1, 2, 3, 4].map((i) => ({
      y: padTop + (i / 4) * drawH,
    }));
  }

  /**
   * Generador de datos para la gráfica rediseñada.
   * ViewBox: 540×156. Preserva la funcionalidad original de datos.
   */
  getChartData(): {
    path: string;
    area: string;
    points: Array<{ x: number; y: number; label: string; monto: number }>;
  } {
    const raw = this.incomeService.data()?.evolucion || [];

    const width = 540;
    const height = 156;
    const padTop = 10;
    const padBottom = 10;
    const padLeft = 8;
    const padRight = 8;

    if (raw.length === 0) {
      return {
        path: `M ${padLeft} ${height - padBottom} L ${width - padRight} ${height - padBottom}`,
        area: `M ${padLeft} ${height - padBottom} L ${width - padRight} ${height - padBottom} L ${width - padRight} ${height} L ${padLeft} ${height} Z`,
        points: [],
      };
    }

    const maxRaw = Math.max(...raw.map((p) => p.monto), 1);
    const maxVal = this.redondearEscala(maxRaw);
    const drawW = width - padLeft - padRight;
    const drawH = height - padTop - padBottom;
    const stepX = raw.length > 1 ? drawW / (raw.length - 1) : drawW;

    const coords = raw.map((item, i) => {
      const x = padLeft + i * stepX;
      const normalizedY = Math.min(item.monto / maxVal, 1);
      const y = height - padBottom - normalizedY * drawH;
      return { x, y, label: item.label, monto: item.monto };
    });

    if (coords.length === 1) {
      const p = coords[0];
      return {
        path: `M ${padLeft} ${p.y} L ${width - padRight} ${p.y}`,
        area: `M ${padLeft} ${p.y} L ${width - padRight} ${p.y} L ${width - padRight} ${height - padBottom} L ${padLeft} ${height - padBottom} Z`,
        points: coords,
      };
    }

    // Curva Bezier cúbica suave
    let path = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX1 = curr.x + (next.x - curr.x) / 2;
      const cpX2 = cpX1;
      path += ` C ${cpX1} ${curr.y}, ${cpX2} ${next.y}, ${next.x} ${next.y}`;
    }

    const last = coords[coords.length - 1];
    const first = coords[0];
    const baseline = height - padBottom;
    const area = `${path} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;

    return { path, area, points: coords };
  }

  // ── UTILIDADES DE ESCALA ─────────────────────────────────────────────

  private redondearEscala(val: number): number {
    if (val <= 0) return 1000;
    const magnitude = Math.pow(10, Math.floor(Math.log10(val)));
    const factor = val / magnitude;
    let nice: number;
    if (factor <= 1) nice = 1;
    else if (factor <= 2) nice = 2;
    else if (factor <= 5) nice = 5;
    else nice = 10;
    return nice * magnitude;
  }

  private formatearEjeY(val: number): string {
    if (val === 0) return 'Q 0';
    if (val >= 1000000) return `Q ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `Q ${(val / 1000).toFixed(0)},000`;
    return `Q ${val.toFixed(0)}`;
  }

  // ── FUNCIÓN ORIGINAL CONSERVADA (alias) ─────────────────────────────

  getSvgPathData(): { path: string; area: string; points: Array<{ x: number; y: number; label: string; monto: number }> } {
    return this.getChartData();
  }
}


