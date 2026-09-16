import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import {
  Router,
  RouterOutlet,
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError,
} from "@angular/router";
import { SessionWarningModalComponent } from "./shared/components/session-warning-modal/session-warning-modal.component";
import { IdleSessionService } from "./services/idle-session.service";
import { AuthService } from "./services/auth.service";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, SessionWarningModalComponent],
  template: `
    <!-- Barra de progreso superior global (Anti-flicker) -->
    <div
      *ngIf="cargandoNavegacion() || authService.cargandoGlobal()"
      class="fixed top-0 left-0 right-0 h-[3px] z-[9999] overflow-hidden bg-orange-100/50 pointer-events-none"
    >
      <div class="h-full bg-gradient-to-r from-[#ea580c] via-[#ff7a00] to-[#f97316] animate-indeterminate-progress"></div>
    </div>

    <!-- Overlay sutil con micro-spinner si la carga toma más tiempo -->
    <div
      *ngIf="mostrarOverlayLoader()"
      class="fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-[2px] flex items-center justify-center pointer-events-none transition-opacity duration-200 animate-fade-in"
    >
      <div class="bg-white/95 backdrop-blur-md px-5 py-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-3">
        <span class="material-symbols-outlined text-primary-orange animate-spin text-[24px]">sync</span>
        <span class="text-[13.5px] font-bold text-slate-800">Cargando vista...</span>
      </div>
    </div>

    <router-outlet></router-outlet>
    <app-session-warning-modal></app-session-warning-modal>
  `,
  styles: [
    `
      @keyframes indeterminate {
        0% {
          transform: translateX(-100%);
        }
        50% {
          transform: translateX(30%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      .animate-indeterminate-progress {
        animation: indeterminate 1.2s infinite cubic-bezier(0.65, 0.815, 0.735, 0.395);
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  private idleSession = inject(IdleSessionService);
  authService = inject(AuthService);
  private router = inject(Router);

  cargandoNavegacion = signal(false);
  mostrarOverlayLoader = signal(false);
  private overlayTimer: any = null;

  ngOnInit(): void {
    if (this.authService.estaAutenticado()) {
      this.idleSession.iniciarMonitoreo();
    }

    // Escucha eventos del router para evitar parpadeos y destellos entre rutas perezosas
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.cargandoNavegacion.set(true);
        // Si la carga toma más de 120ms (ej. descarga de chunk), muestra el overlay sutil
        this.overlayTimer = setTimeout(() => {
          if (this.cargandoNavegacion()) {
            this.mostrarOverlayLoader.set(true);
          }
        }, 120);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (this.overlayTimer) {
          clearTimeout(this.overlayTimer);
          this.overlayTimer = null;
        }
        this.mostrarOverlayLoader.set(false);
        // Pequeño retardo para dar tiempo al componente a montar su DOM sin parpadeo
        setTimeout(() => {
          this.cargandoNavegacion.set(false);
        }, 60);
      }
    });
  }
}

