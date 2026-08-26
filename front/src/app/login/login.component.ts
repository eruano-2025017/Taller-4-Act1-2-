import { Component, OnInit, inject, signal } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: "./login.component.html",
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);

  cargando = signal(false);
  errorMsg = signal<string | null>(null);

  /**
   * Alerta de sesión expirada.
   * Se puebla SOLO cuando el sistema redirigió al Login por expiración del JWT.
   * Se limpia del servicio inmediatamente para no reaparecer en un page refresh.
   */
  alertaSesion = signal<string | null>(null);

  form = this.fb.group({
    email: ["", [Validators.required, Validators.email]],
    password: ["", [Validators.required]],
  });

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Lee el mensaje que dejó el flujo de expiración JWT (si aplica)
    const mensaje = this.authService.mensajeExpiracion();
    if (mensaje) {
      this.alertaSesion.set(mensaje);
      // Lo borra del servicio de inmediato: no reaparece si el usuario refresca
      this.authService.limpiarMensajeExpiracion();
    }
  }

  /** Cierra la alerta manualmente */
  cerrarAlerta(): void {
    this.alertaSesion.set(null);
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
        this.router.navigate(["/dashboard"]);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorMsg.set(
          err?.error?.message ?? "No se pudo iniciar sesion. Intenta de nuevo."
        );
      },
    });
  }
}