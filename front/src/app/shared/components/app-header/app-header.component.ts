import {
  Component,
  Input,
  Output,
  EventEmitter,
  inject,
  signal,
  ElementRef,
  HostListener,
  OnInit,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { AuthService } from "../../../services/auth.service";
import { NotificationService } from "../../../services/notification.service";
import { NotificationItem } from "../../models/notification.model";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="glass sticky top-0 h-16 z-40 flex justify-between items-center px-8 transition-all duration-200 ease-in-out border-b border-white/40">
      <!-- Left: Title & Date indicator -->
      <div class="flex items-center gap-4">
        <h2 class="text-[24px] sm:text-[26px] font-bold text-slate-900 tracking-tight font-headline-md flex items-center gap-2">
          {{ title }}
        </h2>
        <div class="h-6 w-px bg-border-subtle hidden sm:block"></div>
        <div class="hidden sm:flex items-center gap-2 text-slate-700 bg-white/70 backdrop-blur-sm px-3.5 py-1.5 rounded-lg text-[13.5px] font-semibold border border-slate-200/70 shadow-sm">
          <span class="material-symbols-outlined text-[18px] text-orange-600">calendar_today</span>
          {{ mesActual }}
        </div>
      </div>

      <!-- Right: Action Buttons + Bell + Gear + Profile -->
      <div class="flex items-center gap-4 sm:gap-6">
        <!-- Optional Quick Action Buttons -->
        <div *ngIf="showQuickActions" class="hidden md:flex items-center gap-2.5">
          <button
            (click)="onNuevoIngresoClick()"
            class="bg-primary-orange text-white text-[13.5px] font-bold py-2 px-4 rounded-full hover:shadow-lg hover:shadow-orange-500/20 hover:bg-orange-500 transition-all flex items-center gap-1.5 border border-orange-500/20 btn-interactive shadow-sm"
          >
            <span class="material-symbols-outlined text-[17px]">add_circle</span>
            Nuevo Ingreso
          </button>
          <button
            (click)="onAgregarGastoClick()"
            class="glass bg-white/80 text-primary-orange text-[13.5px] font-bold py-2 px-4 rounded-full hover:bg-white transition-all flex items-center gap-1.5 border border-slate-200/80 btn-interactive shadow-sm"
          >
            <span class="material-symbols-outlined text-[17px]">remove_circle</span>
            Agregar Gasto
          </button>
        </div>

        <div class="flex items-center gap-3 border-l border-border-subtle pl-4 sm:pl-6 relative">
          <!-- 1. CAMPANA DE NOTIFICACIONES (FUNCIONAL) -->
          <div class="relative notif-container">
            <button
              (click)="toggleNotificaciones($event)"
              class="text-tertiary-text hover:text-primary-orange rounded-full p-2.5 transition-colors relative hover:bg-white/70 btn-interactive focus:outline-none"
              [class.bg-orange-50]="mostrarNotificaciones()"
              [class.text-primary-orange]="mostrarNotificaciones()"
              aria-label="Campana de notificaciones"
              title="Notificaciones y avisos del sistema"
            >
              <span class="material-symbols-outlined text-[23px]">notifications</span>
              <!-- Badge reactivo si hay notificaciones no leídas -->
              <span
                *ngIf="notificationService.noLeidas() > 0"
                class="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-primary-orange text-white text-[10.5px] font-extrabold rounded-full border-2 border-white flex items-center justify-center animate-pulse shadow-sm"
              >
                {{ notificationService.noLeidas() > 9 ? '9+' : notificationService.noLeidas() }}
              </span>
            </button>

            <!-- Dropdown de Notificaciones -->
            <div
              *ngIf="mostrarNotificaciones()"
              class="absolute right-0 sm:-right-8 mt-2 w-[360px] sm:w-[410px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-scale-in"
              style="box-shadow: 0 16px 40px -8px rgba(5, 16, 33, 0.18);"
            >
              <!-- Dropdown Header -->
              <div class="p-4 bg-gradient-to-r from-slate-900 to-[#0c1c33] text-white flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-primary-orange">
                    <span class="material-symbols-outlined text-[20px]">notifications_active</span>
                  </div>
                  <div>
                    <h3 class="text-[15px] font-bold tracking-tight">Centro de Notificaciones</h3>
                    <p class="text-[11.5px] text-slate-300">
                      {{ notificationService.noLeidas() }} {{ notificationService.noLeidas() === 1 ? 'nueva sin leer' : 'nuevas sin leer' }}
                    </p>
                  </div>
                </div>
                <button
                  *ngIf="notificationService.noLeidas() > 0"
                  (click)="marcarTodasLeidas($event)"
                  class="text-[11.5px] font-bold text-orange-400 hover:text-orange-300 transition-colors bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-md"
                  title="Marcar todas como leídas"
                >
                  Marcar leídas
                </button>
              </div>

              <!-- Filter tabs -->
              <div class="flex border-b border-slate-100 bg-slate-50/80 px-4 pt-2 gap-2 text-[12.5px] font-semibold">
                <button
                  (click)="filtroNotif = 'todas'"
                  class="pb-2 px-2 transition-all border-b-2"
                  [class.border-primary-orange]="filtroNotif === 'todas'"
                  [class.text-primary-orange]="filtroNotif === 'todas'"
                  [class.border-transparent]="filtroNotif !== 'todas'"
                  [class.text-slate-500]="filtroNotif !== 'todas'"
                >
                  Todas ({{ notificationService.notificaciones().length }})
                </button>
                <button
                  (click)="filtroNotif = 'noleidas'"
                  class="pb-2 px-2 transition-all border-b-2"
                  [class.border-primary-orange]="filtroNotif === 'noleidas'"
                  [class.text-primary-orange]="filtroNotif === 'noleidas'"
                  [class.border-transparent]="filtroNotif !== 'noleidas'"
                  [class.text-slate-500]="filtroNotif !== 'noleidas'"
                >
                  No leídas ({{ notificationService.noLeidas() }})
                </button>
              </div>

              <!-- Notifications List -->
              <div class="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                <div *ngIf="notificationService.cargando()" class="p-6 text-center text-slate-400 text-[13px]">
                  <span class="material-symbols-outlined animate-spin text-[24px] text-primary-orange mb-1">sync</span>
                  <p>Cargando actividad...</p>
                </div>

                <!-- Empty State -->
                <div
                  *ngIf="!notificationService.cargando() && notificacionesFiltradas.length === 0"
                  class="py-10 px-6 text-center"
                >
                  <div class="w-14 h-14 rounded-full bg-orange-50 text-primary-orange flex items-center justify-center mx-auto mb-3">
                    <span class="material-symbols-outlined text-[28px]">notifications_off</span>
                  </div>
                  <h4 class="text-[14px] font-bold text-slate-800 mb-1">No tienes nuevas notificaciones</h4>
                  <p class="text-[12px] text-slate-500">
                    {{ filtroNotif === 'noleidas' ? 'Has leído todos tus avisos.' : 'Aquí aparecerán los avisos de tus transacciones y movimientos.' }}
                  </p>
                </div>

                <!-- Items -->
                <div
                  *ngFor="let notif of notificacionesFiltradas"
                  (click)="marcarLeida(notif)"
                  class="p-3.5 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer group"
                  [ngClass]="{ 'bg-orange-50': !notif.leido }"
                >
                  <!-- Icon Badge -->
                  <div
                    class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
                    [ngClass]="obtenerClaseIcono(notif.tipo)"
                  >
                    <span class="material-symbols-outlined text-[20px]">{{ notif.icono }}</span>
                  </div>

                  <!-- Details -->
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-1 mb-0.5">
                      <span class="text-[13.5px] font-bold text-slate-800 truncate">{{ notif.titulo }}</span>
                      <span *ngIf="notif.monto !== null" class="text-[12.5px] font-extrabold text-slate-900 shrink-0 font-mono">
                        Q {{ notif.monto | number:'1.2-2' }}
                      </span>
                    </div>
                    <p class="text-[12px] text-slate-600 line-clamp-2 leading-snug mb-1">
                      {{ notif.descripcion }}
                    </p>
                    <div class="flex items-center justify-between text-[11px] text-slate-400">
                      <span class="flex items-center gap-1">
                        <span class="material-symbols-outlined text-[13px]">schedule</span>
                        {{ notif.fechaRelativa }}
                      </span>
                      <span *ngIf="!notif.leido" class="inline-flex items-center gap-1 text-primary-orange font-bold text-[10.5px]">
                        <span class="w-1.5 h-1.5 rounded-full bg-primary-orange"></span>
                        Nuevo
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Dropdown Footer -->
              <div class="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[12px]">
                <span class="text-slate-500 font-medium">KINAL FINANCE Security</span>
                <a
                  routerLink="/dashboard"
                  (click)="mostrarNotificaciones.set(false)"
                  class="text-primary-orange font-bold hover:underline"
                >
                  Ver actividad completa &rarr;
                </a>
              </div>
            </div>
          </div>

          <!-- 2. TUERCA / CONFIGURACIÓN (FUNCIONAL) -->
          <button
            (click)="irAConfiguracion()"
            class="text-tertiary-text hover:text-primary-orange rounded-full p-2.5 transition-colors hover:bg-white/70 btn-interactive focus:outline-none"
            aria-label="Ir a Configuración"
            title="Configuración del sistema"
          >
            <span class="material-symbols-outlined text-[23px]">settings</span>
          </button>

          <!-- 3. PERFIL DEL USUARIO (FUNCIONAL) -->
          <div class="relative user-menu-container">
            <div
              (click)="toggleMenuUsuario($event)"
              class="flex items-center gap-2.5 cursor-pointer py-1 px-2 rounded-xl hover:bg-white/70 transition-colors btn-interactive"
              role="button"
              tabindex="0"
              aria-label="Menú de perfil"
            >
              <div class="w-9 h-9 rounded-full bg-sidebar-bg text-white flex items-center justify-center font-extrabold text-[14.5px] border-2 border-white shadow-sm hover:scale-105 transition-transform overflow-hidden shrink-0">
                <img
                  *ngIf="auth.usuarioActual()?.avatarUrl"
                  [src]="auth.usuarioActual()?.avatarUrl"
                  [alt]="auth.usuarioActual()?.nombre ?? 'Usuario'"
                  referrerpolicy="no-referrer"
                  class="w-full h-full object-cover"
                />
                <span *ngIf="!auth.usuarioActual()?.avatarUrl">{{ inicialUsuario }}</span>
              </div>
              <div class="hidden lg:flex flex-col text-left">
                <span class="text-[13.5px] font-bold text-slate-900 leading-tight">
                  {{ auth.usuarioActual()?.nombre ?? 'Administrador' }}
                </span>
                <span class="text-[11px] font-bold text-slate-500 capitalize flex items-center gap-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  {{ auth.usuarioActual()?.rol ?? 'admin' }}
                </span>
              </div>
              <span class="material-symbols-outlined text-[18px] text-slate-400 hidden sm:inline-block transition-transform" [class.rotate-180]="mostrarMenuUsuario()">
                expand_more
              </span>
            </div>

            <!-- Profile Dropdown Menu -->
            <div
              *ngIf="mostrarMenuUsuario()"
              class="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200/80 z-50 overflow-hidden animate-scale-in"
              style="box-shadow: 0 16px 40px -8px rgba(5, 16, 33, 0.18);"
            >
              <!-- User Info Card inside Dropdown -->
              <div class="p-4 bg-gradient-to-br from-slate-900 via-[#0c1c33] to-[#152a4a] text-white">
                <div class="flex items-center gap-3 mb-2">
                  <div class="w-11 h-11 rounded-full bg-primary-orange text-white flex items-center justify-center font-extrabold text-[16px] border-2 border-white/30 shadow-md overflow-hidden shrink-0">
                    <img
                      *ngIf="auth.usuarioActual()?.avatarUrl"
                      [src]="auth.usuarioActual()?.avatarUrl"
                      [alt]="auth.usuarioActual()?.nombre ?? 'Usuario'"
                      referrerpolicy="no-referrer"
                      class="w-full h-full object-cover"
                    />
                    <span *ngIf="!auth.usuarioActual()?.avatarUrl">{{ inicialUsuario }}</span>
                  </div>
                  <div class="min-w-0">
                    <p class="text-[14px] font-bold truncate leading-tight">{{ auth.usuarioActual()?.nombre ?? 'Administrador' }}</p>
                    <p class="text-[11.5px] text-slate-300 truncate">{{ auth.usuarioActual()?.email ?? 'admin@kinal.edu.gt' }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300">
                  <span class="px-2 py-0.5 rounded-full bg-white/10 font-bold uppercase tracking-wider text-orange-300 text-[10px]">
                    Rol: {{ auth.usuarioActual()?.rol ?? 'admin' }}
                  </span>
                  <span *ngIf="auth.usuarioActual()?.provider === 'google' || auth.usuarioActual()?.avatarUrl" class="px-2 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 font-bold text-[10px]">
                    Google
                  </span>
                  <span class="text-slate-400">• Kinal Finance</span>
                </div>
              </div>

              <!-- Menu Items -->
              <div class="p-2 flex flex-col gap-1 text-[13px] font-semibold text-slate-700">
                <button
                  (click)="navegarTabConfig('perfil')"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-primary-orange transition-colors text-left group"
                >
                  <span class="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-primary-orange transition-colors">
                    account_circle
                  </span>
                  <span>Mi Perfil</span>
                </button>

                <button
                  (click)="navegarTabConfig('configuracion')"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-primary-orange transition-colors text-left group"
                >
                  <span class="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-primary-orange transition-colors">
                    tune
                  </span>
                  <span>Configuración General</span>
                </button>

                <button
                  (click)="navegarTabConfig('sesiones')"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-primary-orange transition-colors text-left group"
                >
                  <span class="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-primary-orange transition-colors">
                    timer
                  </span>
                  <span>Sesión & Inactividad</span>
                </button>

                <button
                  (click)="navegarTabConfig('seguridad')"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 hover:text-primary-orange transition-colors text-left group"
                >
                  <span class="material-symbols-outlined text-[19px] text-slate-400 group-hover:text-primary-orange transition-colors">
                    lock
                  </span>
                  <span>Seguridad de la Cuenta</span>
                </button>

                <button
                  (click)="cambiarCuentaGoogle()"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-orange-50 text-orange-600 transition-colors text-left group font-semibold"
                  title="Cierra sesión de Google y permite elegir otra cuenta"
                >
                  <span class="material-symbols-outlined text-[19px] text-orange-500 group-hover:scale-110 transition-transform">
                    switch_account
                  </span>
                  <span>Cambiar de cuenta</span>
                </button>

                <div class="my-1 border-t border-slate-100"></div>

                <button
                  (click)="cerrarSesion()"
                  class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-left group font-bold"
                >
                  <span class="material-symbols-outlined text-[19px] text-red-500 group-hover:scale-110 transition-transform">
                    logout
                  </span>
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  `,
})
export class AppHeaderComponent implements OnInit {
  auth = inject(AuthService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  @Input() title: string = "Dashboard";
  @Input() showQuickActions: boolean = true;

  @Output() nuevoIngreso = new EventEmitter<void>();
  @Output() agregarGasto = new EventEmitter<void>();

  mostrarNotificaciones = signal<boolean>(false);
  mostrarMenuUsuario = signal<boolean>(false);
  filtroNotif: "todas" | "noleidas" = "todas";

  mesActual: string = "";

  ngOnInit() {
    this.calcularMesActual();
    this.notificationService.cargarNotificaciones().subscribe();
  }

  get inicialUsuario(): string {
    const nombre = this.auth.usuarioActual()?.nombre;
    return nombre ? nombre.charAt(0).toUpperCase() : "A";
  }

  get notificacionesFiltradas(): NotificationItem[] {
    const lista = this.notificationService.notificaciones();
    if (this.filtroNotif === "noleidas") {
      return lista.filter((n) => !n.leido);
    }
    return lista;
  }

  toggleNotificaciones(event: Event) {
    event.stopPropagation();
    this.mostrarMenuUsuario.set(false);
    this.mostrarNotificaciones.update((v) => !v);
  }

  toggleMenuUsuario(event: Event) {
    event.stopPropagation();
    this.mostrarNotificaciones.set(false);
    this.mostrarMenuUsuario.update((v) => !v);
  }

  irAConfiguracion() {
    this.mostrarNotificaciones.set(false);
    this.mostrarMenuUsuario.set(false);
    this.router.navigate(["/configuracion"]);
  }

  navegarTabConfig(tab: string) {
    this.mostrarMenuUsuario.set(false);
    this.router.navigate(["/configuracion"], { queryParams: { tab } });
  }

  cerrarSesion() {
    this.mostrarMenuUsuario.set(false);
    this.auth.logout();
  }

  cambiarCuentaGoogle() {
    this.mostrarMenuUsuario.set(false);
    this.auth.cerrarSesionGoogle(true);
  }

  marcarTodasLeidas(event: Event) {
    event.stopPropagation();
    this.notificationService.marcarTodasComoLeidas().subscribe();
  }

  marcarLeida(notif: NotificationItem) {
    if (!notif.leido) {
      this.notificationService.marcarComoLeida(notif.id).subscribe();
    }
  }

  obtenerClaseIcono(tipo: string): string {
    const t = (tipo || "").toUpperCase();
    if (t.includes("INGRESO")) return "bg-emerald-100 text-emerald-700";
    if (t.includes("EGRESO") || t.includes("GASTO")) return "bg-red-100 text-red-600";
    if (t.includes("FACTURA")) return "bg-orange-100 text-primary-orange";
    if (t.includes("PASSWORD") || t.includes("SEGURIDAD")) return "bg-amber-100 text-amber-700";
    return "bg-blue-100 text-blue-700";
  }

  onNuevoIngresoClick() {
    if (this.nuevoIngreso.observed) {
      this.nuevoIngreso.emit();
    } else {
      this.router.navigate(["/ingresos"]);
    }
  }

  onAgregarGastoClick() {
    if (this.agregarGasto.observed) {
      this.agregarGasto.emit();
    } else {
      this.router.navigate(["/egresos"]);
    }
  }

  @HostListener("document:click", ["$event"])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.mostrarNotificaciones.set(false);
      this.mostrarMenuUsuario.set(false);
    }
  }

  @HostListener("document:keydown.escape")
  onEscape() {
    this.mostrarNotificaciones.set(false);
    this.mostrarMenuUsuario.set(false);
  }

  private calcularMesActual() {
    const ahora = new Date();
    const meses = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    this.mesActual = `${meses[ahora.getMonth()]} ${ahora.getFullYear()}`;
  }
}
