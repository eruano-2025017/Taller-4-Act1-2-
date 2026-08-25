import { Component, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { DashboardService } from '../services/dashboard.service';
import { DashboardData, RecentActivityItem } from '../shared/models/dashboard.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  public auth = inject(AuthService);
  private dashboardService = inject(DashboardService);

  cargando = signal<boolean>(true);
  errorMsg = signal<string | null>(null);
  data = signal<DashboardData | null>(null);

  inicialUsuario = computed(() => {
    const nombre = this.auth.usuarioActual()?.nombre ?? 'U';
    return nombre.charAt(0).toUpperCase();
  });

  mesActual = computed(() => {
    const d = new Date();
    const str = new Intl.DateTimeFormat('es-GT', { month: 'long', year: 'numeric' }).format(d);
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);
    this.errorMsg.set(null);

    this.dashboardService.getDashboardData().subscribe({
      next: (res) => {
        this.data.set(res);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('[DashboardComponent] Error al obtener datos:', err);
        this.errorMsg.set('No se pudo cargar la información financiera. Verifica tu conexión con el servidor.');
        this.cargando.set(false);
      },
    });
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
    const d = this.data();
    if (!d || !d.graficaMensual || d.graficaMensual.length === 0) return 1;
    let max = 0;
    for (const item of d.graficaMensual) {
      if (item.ingresos > max) max = item.ingresos;
      if (item.egresos > max) max = item.egresos;
    }
    return max > 0 ? max : 1;
  }

  getBarHeight(val: number, max: number): string {
    if (!val || val <= 0 || max <= 0) return '6px';
    const pct = Math.max(6, Math.min(95, Math.round((val / max) * 100)));
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
    console.info('[Dashboard] Acción: Nuevo Registro');
  }

  onNuevoIngreso(): void {
    console.info('[Dashboard] Acción: Nuevo Ingreso');
  }

  onAgregarGasto(): void {
    console.info('[Dashboard] Acción: Agregar Gasto');
  }
}
