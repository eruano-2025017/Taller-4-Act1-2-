import { Component, OnInit, AfterViewInit, OnDestroy, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { IdleSessionService } from "../services/idle-session.service";
import { environment } from "../../environments/environment";

declare const google: any;

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private idleSession = inject(IdleSessionService);

  cargando = signal(false);
  cargandoGoogle = signal(false);
  googleBtnListo = signal(false);
  errorMsg = signal<string | null>(null);
  mostrarPassword = signal(false);

  private googleInterval: any = null;

  /**
   * Alerta de sesión expirada.
   * Se puebla SOLO cuando el sistema redirigió al Login por expiración del JWT o inactividad.
   * Se limpia del servicio inmediatamente para no reaparecer en un page refresh.
   */
  alertaSesion = signal<string | null>(null);

  form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  ngOnInit(): void {
    // Lee el mensaje que dejó el flujo de inactividad / expiración JWT (si aplica)
    const mensaje = this.authService.mensajeExpiracion();
    if (mensaje) {
      this.alertaSesion.set(mensaje);
      // Lo borra del servicio de inmediato: no reaparece si el usuario refresca
      this.authService.limpiarMensajeExpiracion();
    }
  }

  ngAfterViewInit(): void {
    this.iniciarGoogleAuth();
  }

  private iniciarGoogleAuth(): void {
    if (typeof google !== "undefined" && google?.accounts?.id) {
      this.configurarBotonGoogle();
      return;
    }

    let intentos = 0;
    this.googleInterval = setInterval(() => {
      intentos++;
      if (typeof google !== "undefined" && google?.accounts?.id) {
        clearInterval(this.googleInterval);
        this.configurarBotonGoogle();
      } else if (intentos > 25) {
        clearInterval(this.googleInterval);
        console.warn("[LoginComponent] Tiempo de espera del SDK de Google superado.");
      }
    }, 200);
  }

  private configurarBotonGoogle(): void {
    try {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (res: any) => this.handleGoogleCredential(res),
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      const container = document.getElementById("googleBtnContainer");
      if (container) {
        container.innerHTML = "";
        google.accounts.id.renderButton(container, {
          theme: "outline",
          size: "large",
          type: "standard",
          shape: "rectangular",
          text: "continue_with",
          logo_alignment: "center",
          width: 380,
        });
        this.googleBtnListo.set(true);
      }
    } catch (e) {
      console.warn("[LoginComponent] Error al inicializar botón de Google:", e);
    }
  }

  handleGoogleCredential(res: any): void {
    if (!res?.credential) {
      this.errorMsg.set("No se recibió credencial de Google.");
      return;
    }

    this.cargandoGoogle.set(true);
    this.errorMsg.set(null);
    this.alertaSesion.set(null);

    this.authService.loginConGoogle(res.credential).subscribe({
      next: () => {
        this.cargandoGoogle.set(false);
        this.idleSession.iniciarMonitoreo();
        this.router.navigate(["/dashboard"]);
      },
      error: (err: any) => {
        this.cargandoGoogle.set(false);
        this.errorMsg.set(
          err?.error?.message ?? "Error al iniciar sesión con Google. Intente nuevamente."
        );
      },
    });
  }

  /** Cierra la alerta manualmente */
  cerrarAlerta(): void {
    this.alertaSesion.set(null);
  }

  /** Alterna la visibilidad de la contraseña entre oculta y visible */
  toggleMostrarPassword(): void {
    this.mostrarPassword.update((visible) => !visible);
  }

  /**
   * Limpia selección automática y muestra el selector de cuentas de Google.
   */
  cambiarCuentaGoogle(event?: Event): void {
    if (event) event.preventDefault();
    this.authService.cerrarSesionGoogle(false);
    if (typeof google !== "undefined" && google?.accounts?.id) {
      google.accounts.id.disableAutoSelect();
      google.accounts.id.prompt();
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMsg.set(null);
    this.alertaSesion.set(null); // Descarta la alerta al intentar login
    this.cargando.set(true);

    const { email, password } = this.form.getRawValue();

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.cargando.set(false);
        this.idleSession.iniciarMonitoreo();
        this.router.navigate(["/dashboard"]);
      },
      error: (err: any) => {
        this.cargando.set(false);
        this.errorMsg.set(
          err?.error?.message ?? "No se pudo iniciar sesion. Intenta de nuevo."
        );
      },
    });
  }

  ngOnDestroy(): void {
    if (this.googleInterval) {
      clearInterval(this.googleInterval);
    }
  }
}