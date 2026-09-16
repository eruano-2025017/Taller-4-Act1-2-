import { Component, inject, Output, EventEmitter } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { AuthService } from "../../../services/auth.service";

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside
      class="fixed left-0 top-0 h-full w-[280px] bg-sidebar-bg text-white shadow-xl z-50 flex flex-col py-6 px-4 transition-all duration-300 ease-in-out border-r border-white/5"
    >
      <!-- Logo & Brand Header -->
      <div class="flex items-center gap-3 p-4 mb-4 cursor-pointer" (click)="irADashboard()">
        <img
          alt="Kinal Finance Logo"
          class="w-10 h-12 object-contain bg-white rounded-md p-1 shadow-sm"
          src="assets/kinal-finance-logo.png"
        />
        <div>
          <h1 class="text-[18px] font-bold text-white leading-tight font-headline-sm">
            KINAL<br />
            <span class="text-[11px] font-bold tracking-[0.18em] uppercase text-orange-400">Finance</span>
          </h1>
        </div>
      </div>

      <!-- Quick Action Button -->
      <button
        (click)="onNuevoClick()"
        class="bg-gradient-to-r from-primary-orange to-orange-500 text-white font-bold text-[15px] py-3.5 px-4 rounded-xl mb-6 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all btn-interactive flex items-center justify-center gap-2.5 border border-white/10"
      >
        <span class="material-symbols-outlined fill text-[20px]">add</span>
        Nuevo Registro
      </button>

      <!-- Main Navigation (ÚNICAMENTE vistas principales) -->
      <nav class="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1">
        <!-- Dashboard -->
        <a
          routerLink="/dashboard"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          [routerLinkActiveOptions]="{ exact: true }"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            dashboard
          </span>
          <span class="relative z-10">Dashboard</span>
        </a>

        <!-- Ingresos -->
        <a
          routerLink="/ingresos"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            payments
          </span>
          <span class="relative z-10">Ingresos</span>
        </a>

        <!-- Egresos -->
        <a
          routerLink="/egresos"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            shopping_cart
          </span>
          <span class="relative z-10">Egresos</span>
        </a>

        <!-- Categorías -->
        <a
          routerLink="/categorias"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            category
          </span>
          <span class="relative z-10">Categorías</span>
        </a>

        <!-- Análisis (análisis financiero + herramientas de facturación) -->
        <a
          routerLink="/analisis"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            analytics
          </span>
          <span class="relative z-10">Análisis</span>
        </a>

        <!-- Configuración (incluye Perfil, Seguridad, Sesión y Preferencias) -->
        <a
          routerLink="/configuracion"
          routerLinkActive="bg-gradient-to-r from-primary-orange/20 to-transparent text-primary-orange border-r-4 border-primary-orange font-bold shadow-[inset_0_0_15px_rgba(255,122,0,0.1)] active-nav"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-white font-semibold text-[14.5px] transition-colors rounded-lg p-3 flex items-center gap-3 group relative overflow-hidden"
        >
          <span class="material-symbols-outlined relative z-10 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.3)] transition-shadow rounded-full text-[22px]">
            settings
          </span>
          <span class="relative z-10">Configuración</span>
        </a>
      </nav>

      <!-- Bottom Nav: User Profile Card & Actions -->
      <div class="mt-auto pt-3 border-t border-white/10 flex flex-col gap-2">
        <div class="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
          <div class="w-9 h-9 rounded-full bg-primary-orange text-white flex items-center justify-center font-extrabold text-[14px] border border-white/20 shadow-inner overflow-hidden shrink-0">
            <img
              *ngIf="auth.usuarioActual()?.avatarUrl"
              [src]="auth.usuarioActual()?.avatarUrl"
              [alt]="auth.usuarioActual()?.nombre ?? 'Usuario'"
              referrerpolicy="no-referrer"
              class="w-full h-full object-cover"
            />
            <span *ngIf="!auth.usuarioActual()?.avatarUrl">{{ inicialUsuario }}</span>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-[13px] font-bold text-white truncate leading-tight">
              {{ auth.usuarioActual()?.nombre ?? 'Usuario' }}
            </p>
            <p class="text-[10.5px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
              <span *ngIf="auth.usuarioActual()?.provider === 'google' || auth.usuarioActual()?.avatarUrl" class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              {{ auth.usuarioActual()?.email ?? 'usuario@kinal.edu.gt' }}
            </p>
          </div>
        </div>

        <button
          *ngIf="auth.usuarioActual()?.provider === 'google' || auth.usuarioActual()?.avatarUrl"
          (click)="auth.cerrarSesionGoogle(true)"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-orange-400 font-semibold text-[13px] transition-colors rounded-lg p-2 flex items-center gap-2.5 w-full text-left"
          title="Cambiar cuenta de Google"
        >
          <span class="material-symbols-outlined text-[18px] text-orange-400">
            switch_account
          </span>
          <span>Cambiar cuenta Google</span>
        </button>

        <button
          (click)="auth.logout()"
          class="nav-item text-tertiary-fixed-dim hover:bg-white/5 hover:text-red-400 font-semibold text-[13px] transition-colors rounded-lg p-2 flex items-center gap-2.5 group w-full text-left"
        >
          <span class="material-symbols-outlined group-hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] transition-shadow rounded-full text-[19px] text-red-400">
            logout
          </span>
          Cerrar Sesión
        </button>
      </div>
    </aside>
  `,
  styles: [
    `
      .active-nav .material-symbols-outlined {
        font-variation-settings: "FILL" 1;
        color: #ff7a00;
      }
    `,
  ],
})
export class AppSidebarComponent {
  auth = inject(AuthService);
  private router = inject(Router);

  @Output() nuevoRegistro = new EventEmitter<void>();

  get inicialUsuario(): string {
    const nombre = this.auth.usuarioActual()?.nombre;
    return nombre ? nombre.charAt(0).toUpperCase() : "U";
  }

  irADashboard() {
    this.router.navigate(["/dashboard"]);
  }

  onNuevoClick() {
    if (this.nuevoRegistro.observed) {
      this.nuevoRegistro.emit();
    } else {
      this.router.navigate(["/ingresos"]);
    }
  }
}