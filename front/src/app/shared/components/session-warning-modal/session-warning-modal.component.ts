import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IdleSessionService } from "../../../services/idle-session.service";

@Component({
  selector: "app-session-warning-modal",
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Overlay con desenfoque de fondo -->
    <div
      *ngIf="idleSession.mostrarAdvertencia()"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <!-- Modal Card -->
      <div
        class="relative w-full max-w-md rounded-3xl bg-white border border-slate-200/80 shadow-2xl p-6 sm:p-8 overflow-hidden text-slate-800 animate-[scaleUp_0.25s_ease-out]"
      >
        <!-- Decoración de fondo sutil -->
        <div class="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div class="relative z-10 flex flex-col items-center text-center">
          <!-- Icono de Advertencia con Pulso -->
          <div class="relative mb-5 flex items-center justify-center">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-sm text-amber-600">
              <span class="material-symbols-outlined text-[34px] animate-pulse">timer</span>
            </div>
            <span class="absolute -top-1 -right-1 flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-orange-500 border-2 border-white"></span>
            </span>
          </div>

          <!-- Título y Descripción -->
          <h3 id="modal-title" class="text-[22px] font-bold text-slate-900 tracking-tight mb-2">
            ¿Sigues ahí?
          </h3>
          <p class="text-[14.5px] text-slate-600 font-medium leading-relaxed mb-6">
            Tu sesión está a punto de expirar por inactividad. Si no realizas ninguna acción, se cerrará automáticamente.
          </p>

          <!-- Contador Regresivo Destacado -->
          <div class="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 flex flex-col items-center justify-center">
            <span class="text-[12px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Tiempo restante
            </span>
            <div class="text-[32px] sm:text-[36px] font-extrabold font-mono tracking-wider text-orange-600 leading-none">
              {{ idleSession.tiempoFormateado() }}
            </div>
          </div>

          <!-- Botones de Acción -->
          <div class="w-full flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              (click)="idleSession.continuarSesion()"
              [disabled]="idleSession.renovando()"
              class="flex-1 bg-gradient-to-r from-primary-orange to-orange-500 hover:from-orange-600 hover:to-primary-orange text-white font-bold text-[15px] py-3.5 px-5 rounded-xl shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 border border-orange-400/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span class="material-symbols-outlined text-[19px]" *ngIf="!idleSession.renovando()">refresh</span>
              <span>{{ idleSession.renovando() ? "Renovando..." : "Continuar sesión" }}</span>
            </button>

            <button
              type="button"
              (click)="idleSession.cerrarSesion()"
              class="sm:flex-initial bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[14.5px] py-3.5 px-5 rounded-xl transition-colors flex items-center justify-center gap-2 border border-slate-200"
            >
              <span class="material-symbols-outlined text-[19px]">logout</span>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SessionWarningModalComponent {
  public idleSession = inject(IdleSessionService);
}

