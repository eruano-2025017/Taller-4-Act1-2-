import { Component, OnInit, computed, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { DataSyncService } from '../services/data-sync.service';
import { DashboardData, MonthlyBarItem, RecentActivityItem } from '../shared/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  public auth = inject(AuthService);
  private dashboardService = inject(DashboardService);
  private dataSync = inject(DataSyncService);
  private router = inject(Router);

  cargando = signal<boolean>(true);
  errorMsg = signal<string | null>(null);
  data = signal<DashboardData | null>(null);

  // Selector de Año y Mes
  readonly anioActual = new Date().getFullYear();
  anioSeleccionado = signal<number>(new Date().getFullYear());
  mesSeleccionado = signal<number | 'todos'>('todos');

  // Nombres de meses completos y abreviados
  readonly nombresMesesCompletos: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  readonly mesesAbreviados: string[] = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  inicialUsuario = computed(() => {
    const nombre = this.auth.usuarioActual()?.nombre ?? 'U';
    return nombre.charAt(0).toUpperCase();
  });

  mesActual = computed(() => {
    const d = new Date();
    const str = new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(d);
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  aniosOpciones = computed<number[]>(() => {
    const d = this.data();
    if (d?.aniosDisponibles && d.aniosDisponibles.length > 0) {
      return d.aniosDisponibles;
    }
    const cur = this.anioActual;
    return [cur + 1, cur, cur - 1, cur - 2];
  });

  // 12 meses garantizados de la gráfica
  grafica12Meses = computed<MonthlyBarItem[]>(() => {
    const d = this.data();
    if (!d || !d.graficaMensual || d.graficaMensual.length === 0) {
      return this.mesesAbreviados.map(m => ({ mes: m, ingresos: 0, egresos: 0 }));
    }
    if (d.graficaMensual.length === 12) {
      return d.graficaMensual;
    }
    return this.mesesAbreviados.map((m) => {
      const found = d.graficaMensual.find(item => item.mes.toLowerCase().startsWith(m.toLowerCase()));
      return {
        mes: m,
        ingresos: found ? found.ingresos : 0,
        egresos: found ? found.egresos : 0,
      };
    });
  });

  // Resumen del período seleccionado (Año o Mes específico)
  metricasPeriodo = computed(() => {
    const meses = this.grafica12Meses();
    const mesSel = this.mesSeleccionado();

    if (mesSel === 'todos') {
      const totalIng = meses.reduce((acc, m) => acc + m.ingresos, 0);
      const totalEg = meses.reduce((acc, m) => acc + m.egresos, 0);
      const balance = totalIng - totalEg;
      const tieneDatos = totalIng > 0 || totalEg > 0;
      return {
        tituloPeriodo: `Año Completo ${this.anioSeleccionado()}`,
        subtitulo: 'Consolidado anual de 12 meses',
        totalIngresos: totalIng,
        totalEgresos: totalEg,
        balance,
        tieneDatos,
        mesIndex: null,
      };
    } else {
      const idx = Number(mesSel);
      const item = meses[idx] || { mes: this.mesesAbreviados[idx], ingresos: 0, egresos: 0 };
      const balance = item.ingresos - item.egresos;
      const tieneDatos = item.ingresos > 0 || item.egresos > 0;
      return {
        tituloPeriodo: `${this.nombresMesesCompletos[idx]} ${this.anioSeleccionado()}`,
        subtitulo: `Detalle mensual seleccionado (${this.mesesAbreviados[idx]})`,
        totalIngresos: item.ingresos,
        totalEgresos: item.egresos,
        balance,
        tieneDatos,
        mesIndex: idx,
      };
    }
  });

  constructor() {
    // Sincronización reactiva automática con la base de datos
    effect(() => {
      const version = this.dataSync.version();
      if (version > 0) {
        console.info(`[DashboardComponent] Sincronización reactiva detectada (versión ${version}).`);
        this.cargarDatos(false);
      }
    });
  }

  ngOnInit(): void {
    this.cargarDatos(true);
  }

  cargarDatos(mostrarCargando: boolean = true): void {
    if (mostrarCargando) {
      this.cargando.set(true);
    }
    this.errorMsg.set(null);

    this.dashboardService.getDashboardData(this.anioSeleccionado()).subscribe({
      next: (res) => {
        this.data.set(res);
        if (res.anioSeleccionado) {
          this.anioSeleccionado.set(res.anioSeleccionado);
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('[DashboardComponent] Error al obtener datos:', err);
        this.errorMsg.set('No se pudo cargar la información financiera. Verifica tu conexión con el servidor.');
        this.cargando.set(false);
      },
    });
  }

  onCambiarAnio(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const year = parseInt(select.value, 10);
    if (!isNaN(year) && year !== this.anioSeleccionado()) {
      this.anioSeleccionado.set(year);
      this.cargarDatos(true);
    }
  }

  // Mes activo para el detalle emergente (null = ninguno)
  mesActivoDetalle = signal<number | null>(null);

  onToggleMesDetalle(idx: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    if (this.mesActivoDetalle() === idx) {
      this.mesActivoDetalle.set(null);
    } else {
      this.mesActivoDetalle.set(idx);
    }
  }

  onCerrarMesDetalle(): void {
    this.mesActivoDetalle.set(null);
  }

  getTooltipPositionClass(idx: number): string {
    // Ajuste inteligente para que el tooltip nunca se corte ni cubra información inadecuadamente
    if (idx <= 2) {
      return 'left-0 translate-x-0';
    }
    if (idx >= 9) {
      return 'right-0 translate-x-0';
    }
    return 'left-1/2 -translate-x-1/2';
  }

  isMesSeleccionadoEspecifico(mesIndex: number): boolean {
    return this.mesActivoDetalle() === mesIndex;
  }

  formatoMoneda(val: number | null | undefined): string {
    const num = val ?? 0;
    const formatted = new Intl.NumberFormat('es-GT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `Q ${formatted}`;
  }

  getMaxChartValue(): number {
    const meses = this.grafica12Meses();
    let max = 0;
    for (const item of meses) {
      if (item.ingresos > max) max = item.ingresos;
      if (item.egresos > max) max = item.egresos;
    }
    return max > 0 ? max : 1000;
  }

  getBarHeight(val: number, max: number): string {
    if (!val || val <= 0 || max <= 0) return '4px';
    const pct = Math.max(4, Math.min(95, Math.round((val / max) * 100)));
    return `${pct}%`;
  }

  getDonutStrokeDashoffset(porcentaje: number): number {
    const circumference = 251.2;
    return circumference - (circumference * (porcentaje / 100));
  }

  isIngreso(tipo: string): boolean {
    return (tipo || '').toUpperCase().includes('INGRESO');
  }

  isEgreso(tipo: string): boolean {
    const t = (tipo || '').toUpperCase();
    return t.includes('EGRESO') || t.includes('GASTO');
  }

  formatearBadgeTipo(tipo: string): string {
    const t = (tipo || '').toUpperCase();
    if (t.includes('INGRESO')) return 'Ingreso';
    if (t.includes('EGRESO') || t.includes('GASTO')) return 'Gasto';
    if (t.includes('CATEGORIA')) return 'Categoría';
    if (t.includes('LOGIN')) return 'Seguridad';
    return 'Actividad';
  }

  onNuevoRegistro(): void {
    this.router.navigate(['/ingresos']);
  }

  onNuevoIngreso(): void {
    this.router.navigate(['/ingresos']);
  }

  onAgregarGasto(): void {
    console.info('[Dashboard] Acción: Agregar Gasto');
  }
}
