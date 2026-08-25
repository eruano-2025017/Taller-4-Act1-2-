import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthUser, LoginResponse } from "../shared/models/user.model";

const TOKEN_KEY = "cg_token";
const USER_KEY = "cg_user";

export interface JwtPayloadDecoded {
  sub: number;
  email: string;
  rol: "admin" | "user";
  exp?: number;
  iat?: number;
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  usuarioActual = signal<AuthUser | null>(this.leerUsuarioGuardado());
  mensajeExpiracion = signal<string | null>(null);

  private timerExpiracion: any = null;

  constructor() {
    // Si ya existe una sesión válida al cargar la app, programar el temporizador automático
    if (this.estaAutenticado()) {
      const token = this.obtenerToken();
      if (token) {
        this.iniciarTemporizadorExpiracion(token);
      }
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap((res) => {
          this.mensajeExpiracion.set(null);
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.usuarioActual.set(res.user);

          // Iniciar temporizador automático para cuando el token expire en tiempo real
          this.iniciarTemporizadorExpiracion(res.token);
        })
      );
  }

  /**
   * Cierra la sesión del usuario manualmente.
   */
  logout(): void {
    this.limpiarSesion(true);
  }

  /**
   * Limpieza centralizada de sesión con soporte de mensaje de alerta.
   */
  limpiarSesion(redireccionar: boolean = true, mensaje?: string): void {
    if (this.timerExpiracion) {
      clearTimeout(this.timerExpiracion);
      this.timerExpiracion = null;
    }

    if (mensaje) {
      this.mensajeExpiracion.set(mensaje);
    }

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.usuarioActual.set(null);

    if (redireccionar && !this.router.url.includes("/login")) {
      this.router.navigate(["/login"]);
    }
  }

  /**
   * Programa la expiración automática en tiempo real basada en el tiempo de vida del JWT.
   */
  private iniciarTemporizadorExpiracion(token: string): void {
    if (this.timerExpiracion) {
      clearTimeout(this.timerExpiracion);
      this.timerExpiracion = null;
    }

    const payload = this.obtenerPayloadToken(token);
    if (!payload?.exp) return;

    const tiempoRestanteMs = payload.exp * 1000 - Date.now();

    if (tiempoRestanteMs <= 0) {
      // Ya expiró
      this.limpiarSesion(true, "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
    } else {
      // Programar redirección automática cuando el tiempo termine exactamente
      this.timerExpiracion = setTimeout(() => {
        console.warn("[AuthService] El tiempo de espera del token terminó. Redirigiendo automáticamente...");
        this.limpiarSesion(true, "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
      }, tiempoRestanteMs);
    }
  }

  obtenerToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Decodifica el payload del JWT de forma segura.
   */
  obtenerPayloadToken(tokenCustom?: string): JwtPayloadDecoded | null {
    const token = tokenCustom || this.obtenerToken();
    if (!token) return null;

    try {
      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload) as JwtPayloadDecoded;
    } catch (e) {
      console.warn("[AuthService] No se pudo decodificar el payload del token:", e);
      return null;
    }
  }

  /**
   * Verifica si el token existe, tiene estructura válida y NO ha expirado.
   */
  esTokenValido(): boolean {
    const payload = this.obtenerPayloadToken();
    if (!payload) return false;

    if (payload.exp) {
      const ahoraSegundos = Math.floor(Date.now() / 1000);
      return payload.exp > ahoraSegundos;
    }

    return true;
  }

  /**
   * Fuente única de verdad para verificar autenticación.
   */
  estaAutenticado(): boolean {
    const token = this.obtenerToken();
    if (!token) return false;

    if (!this.esTokenValido()) {
      console.warn("[AuthService] El token ha expirado. Purgando sesión...");
      this.limpiarSesion(false, "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
      return false;
    }

    return true;
  }

  limpiarMensajeExpiracion(): void {
    this.mensajeExpiracion.set(null);
  }

  private leerUsuarioGuardado(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
