import { Component, inject, OnInit, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, RouterModule } from "@angular/router";
import { AppSidebarComponent } from "../shared/components/app-sidebar/app-sidebar.component";
import { AppHeaderComponent } from "../shared/components/app-header/app-header.component";
import { AuthService } from "../services/auth.service";
import { UserService, UserProfileData } from "../services/user.service";
import { SESSION_CONFIG, getSessionDurations } from "./session.config";

@Component({
  selector: "app-config",
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, AppSidebarComponent, AppHeaderComponent],
  templateUrl: "./config.component.html",
})
export class ConfigComponent implements OnInit {
  auth = inject(AuthService);
  userService = inject(UserService);
  private route = inject(ActivatedRoute);

  tabActiva = signal<"perfil" | "sesiones" | "seguridad" | "preferencias">("perfil");

  // Configuración centralizada de sesión
  readonly sessionConfig = SESSION_CONFIG;
  readonly sessionDurations = getSessionDurations();

  // Estado del Perfil
  perfil = signal<UserProfileData | null>(null);
  cargandoPerfil = signal<boolean>(false);
  guardandoPerfil = signal<boolean>(false);
  mensajePerfil = signal<{ tipo: "exito" | "error"; texto: string } | null>(null);

  formPerfil = {
    nombre: "",
    email: "",
    telefono: "",
    nit: "",
    direccion: "",
  };

  // Estado de Seguridad / Contraseña
  formPassword = {
    passwordActual: "",
    nuevaPassword: "",
    confirmarPassword: "",
  };
  guardandoPassword = signal<boolean>(false);
  mensajePassword = signal<{ tipo: "exito" | "error"; texto: string } | null>(null);

  // Estado de Preferencias Financieras
  preferencias = {
    moneda: "GTQ",
    simbolo: "Q",
    metodoPredeterminado: "Transferencia Bancaria",
    alertasGastosAltos: true,
    umbralAlertaGasto: 1000,
    resumenSemanal: true,
    notificarInactividad: true,
  };
  guardandoPreferencias = signal<boolean>(false);
  mensajePreferencias = signal<string | null>(null);

  ngOnInit() {
    this.cargarPerfil();
    this.route.queryParams.subscribe((params) => {
      if (params["tab"] && ["perfil", "sesiones", "seguridad", "preferencias"].includes(params["tab"])) {
        this.tabActiva.set(params["tab"] as any);
      }
    });
  }

  cambiarTab(tab: "perfil" | "sesiones" | "seguridad" | "preferencias") {
    this.tabActiva.set(tab);
    this.mensajePerfil.set(null);
    this.mensajePassword.set(null);
    this.mensajePreferencias.set(null);
  }

  cargarPerfil() {
    this.cargandoPerfil.set(true);
    this.userService.getProfile().subscribe({
      next: (data) => {
        this.perfil.set(data);
        this.formPerfil = {
          nombre: data.nombre || "",
          email: data.email || "",
          telefono: data.telefono || "",
          nit: data.nit || "",
          direccion: data.direccion || "",
        };
        this.cargandoPerfil.set(false);
      },
      error: () => {
        this.cargandoPerfil.set(false);
        // Fallback con usuario en sesión
        const u = this.auth.usuarioActual();
        if (u) {
          this.formPerfil.nombre = u.nombre;
          this.formPerfil.email = u.email;
        }
      },
    });
  }

  guardarPerfil() {
    if (!this.formPerfil.nombre.trim()) {
      this.mensajePerfil.set({ tipo: "error", texto: "El nombre completo es requerido." });
      return;
    }

    this.guardandoPerfil.set(true);
    this.mensajePerfil.set(null);

    this.userService
      .updateProfile({
        nombre: this.formPerfil.nombre,
        telefono: this.formPerfil.telefono,
        nit: this.formPerfil.nit,
        direccion: this.formPerfil.direccion,
      })
      .subscribe({
        next: (res) => {
          this.perfil.set(res);
          // Actualizar AuthService reactivamente
          const current = this.auth.usuarioActual();
          if (current) {
            const updated = { ...current, nombre: res.nombre };
            this.auth.usuarioActual.set(updated);
            localStorage.setItem("cg_user", JSON.stringify(updated));
          }
          this.guardandoPerfil.set(false);
          this.mensajePerfil.set({ tipo: "exito", texto: "Tu perfil ha sido actualizado correctamente." });
        },
        error: (err) => {
          this.guardandoPerfil.set(false);
          this.mensajePerfil.set({
            tipo: "error",
            texto: err?.error?.message || "Ocurrió un error al actualizar los datos.",
          });
        },
      });
  }

  guardarPassword() {
    if (!this.formPassword.passwordActual) {
      this.mensajePassword.set({ tipo: "error", texto: "Ingresa tu contraseña actual." });
      return;
    }
    if (this.formPassword.nuevaPassword.length < 6) {
      this.mensajePassword.set({ tipo: "error", texto: "La nueva contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (this.formPassword.nuevaPassword !== this.formPassword.confirmarPassword) {
      this.mensajePassword.set({ tipo: "error", texto: "Las contraseñas no coinciden." });
      return;
    }

    this.guardandoPassword.set(true);
    this.mensajePassword.set(null);

    this.userService
      .updatePassword({
        passwordActual: this.formPassword.passwordActual,
        nuevaPassword: this.formPassword.nuevaPassword,
      })
      .subscribe({
        next: () => {
          this.guardandoPassword.set(false);
          this.mensajePassword.set({
            tipo: "exito",
            texto: "Contraseña actualizada exitosamente. Tu cuenta está protegida.",
          });
          this.formPassword = {
            passwordActual: "",
            nuevaPassword: "",
            confirmarPassword: "",
          };
        },
        error: (err) => {
          this.guardandoPassword.set(false);
          this.mensajePassword.set({
            tipo: "error",
            texto: err?.error?.message || "Contraseña actual incorrecta.",
          });
        },
      });
  }

  guardarPreferencias() {
    this.guardandoPreferencias.set(true);
    setTimeout(() => {
      this.guardandoPreferencias.set(false);
      this.mensajePreferencias.set("Preferencias financieras guardadas exitosamente.");
      setTimeout(() => this.mensajePreferencias.set(null), 4000);
    }, 400);
  }
}

