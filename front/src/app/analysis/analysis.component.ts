import { Component, inject, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule, Router } from "@angular/router";
import { AppSidebarComponent } from "../shared/components/app-sidebar/app-sidebar.component";
import { AppHeaderComponent } from "../shared/components/app-header/app-header.component";
import { InvoicesComponent } from "../invoices/invoices.component";
import { AnalysisService, AnalysisResponse, AnalysisCategoryItem, MonthlyTrendItem } from "../services/analysis.service";

@Component({
  selector: "app-analysis",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AppSidebarComponent, AppHeaderComponent, InvoicesComponent],
  templateUrl: "./analysis.component.html",
})
export class AnalysisComponent implements OnInit {
  protected readonly Math = Math;
  analysisService = inject(AnalysisService);
  private router = inject(Router);

  // Experiencia activa dentro de Análisis: análisis financiero o facturación
  vistaActiva = signal<"analisis" | "facturacion">("analisis");

  cargando = signal<boolean>(false);
  errorMsg = signal<string | null>(null);
  data = signal<AnalysisResponse | null>(null);

  // Filtros reactivos
  anioSeleccionado = signal<number>(new Date().getFullYear());
  mesSeleccionado = signal<number | undefined>(undefined);
  tipoSeleccionado = signal<"todos" | "ingreso" | "egreso">("todos");

  // Elemento seleccionado para interacción / modal de detalle
  mesDetalle = signal<MonthlyTrendItem | null>(null);
  categoriaDetalle = signal<AnalysisCategoryItem | null>(null);

  readonly mesesNombres = [
    { num: 1, nombre: "Enero" },
    { num: 2, nombre: "Febrero" },
    { num: 3, nombre: "Marzo" },
    { num: 4, nombre: "Abril" },
    { num: 5, nombre: "Mayo" },
    { num: 6, nombre: "Junio" },
    { num: 7, nombre: "Julio" },
    { num: 8, nombre: "Agosto" },
    { num: 9, nombre: "Septiembre" },
    { num: 10, nombre: "Octubre" },
    { num: 11, nombre: "Noviembre" },
    { num: 12, nombre: "Diciembre" },
  ];

  // Máximo valor en la gráfica mensual para escalar las barras proporcionalmente
  maxValorMes = computed(() => {
    const list = this.data()?.tendenciaMensual || [];
    let max = 1000;
    for (const m of list) {
      if (m.ingresos > max) max = m.ingresos;
      if (m.egresos > max) max = m.egresos;
    }
    return max;
  });

  ngOnInit() {
    this.cargarAnalisis();
  }

  cargarAnalisis() {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.analysisService
      .getAnalysis({
        year: this.anioSeleccionado(),
        month: this.mesSeleccionado(),
        tipo: this.tipoSeleccionado(),
      })
      .subscribe({
        next: (res) => {
          this.data.set(res);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error("[AnalysisComponent] Error al cargar análisis:", err);
          this.errorMsg.set("No se pudieron calcular las estadísticas financieras.");
          this.cargando.set(false);
        },
      });
  }

  cambiarAnio(anio: number) {
    this.anioSeleccionado.set(anio);
    this.cargarAnalisis();
  }

  cambiarMes(mesNum: number | undefined) {
    this.mesSeleccionado.set(mesNum);
    this.cargarAnalisis();
  }

  cambiarTipo(tipo: "todos" | "ingreso" | "egreso") {
    this.tipoSeleccionado.set(tipo);
    this.cargarAnalisis();
  }

  verDetalleMes(item: MonthlyTrendItem) {
    this.mesDetalle.set(item);
  }

  cerrarDetalleMes() {
    this.mesDetalle.set(null);
  }

  verDetalleCategoria(cat: AnalysisCategoryItem) {
    this.categoriaDetalle.set(cat);
  }

  cerrarDetalleCategoria() {
    this.categoriaDetalle.set(null);
  }

  irANuevoMovimiento() {
    this.router.navigate(["/ingresos"]);
  }

  formatoMoneda(valor: number | undefined | null): string {
    if (valor === undefined || valor === null) return "Q 0.00";
    return (
      "Q " +
      valor.toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  calcularPorcentajeAltura(valor: number): number {
    const max = this.maxValorMes();
    if (max <= 0) return 0;
    const pct = (valor / max) * 100;
    return Math.max(4, Math.min(100, Math.round(pct)));
  }

  obtenerColorCategoria(index: number): string {
    const colors = [
      "#ff7a00", // Orange
      "#051021", // Navy
      "#10b981", // Emerald
      "#3b82f6", // Blue
      "#8b5cf6", // Purple
      "#ec4899", // Pink
      "#f59e0b", // Amber
    ];
    return colors[index % colors.length];
  }
}
