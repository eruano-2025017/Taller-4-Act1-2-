import { Injectable, signal, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";
import { Observable, tap, catchError, of } from "rxjs";
import { environment } from "../../environments/environment";
import { AuthUser, LoginResponse } from "../shared/models/user.model";

const TOKEN_KEY = "cg_token";
const USER_KEY = "cg_user";
const GOOGLE_AVATAR_KEY = "cg_google_avatar";

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

  usuarioActual = signal<AuthUser | null>(null);
  mensajeExpiracion = signal<string | null>(null);
  cargandoGlobal = signal<boolean>(false);
  sesionConfirmada = signal<boolean>(false);

  private timerExpiracion: any = null;

  constructor() {
    this.inicializarEstadoSesion();
  }

  /**
   * Inicializa el estado de la sesión de manera segura una vez instanciados todos los signals.
   */
  private inicializarEstadoSesion(): void {
    const token = this.obtenerToken();
    if (!token) {
      this.usuarioActual.set(null);
      this.sesionConfirmada.set(false);
      return;
    }

    if (this.esTokenValido()) {
      const user = this.leerUsuarioGuardado();
      this.usuarioActual.set(user);
      this.sesionConfirmada.set(true);
      this.iniciarTemporizadorExpiracion(token);
    } else {
      console.warn("[AuthService] El token almacenado ha expirado al iniciar la aplicación. Purgando sesión...");
      this.limpiarSesion(false, "Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
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
          localStorage.setItem("cg_last_activity", String(Date.now()));
          this.usuarioActual.set(res.user);
          this.sesionConfirmada.set(true);
          if (res.token) {
            this.iniciarTemporizadorExpiracion(res.token);
          }
        })
      );
  }

  /**
   * Inicia sesión con la credencial JWT de Google ID Token y propaga el perfil globalmente.
   */
  loginConGoogle(credential: string): Observable<LoginResponse> {
    const googlePayload = this.decodificarTokenGoogle(credential);
    const email = googlePayload?.email || "";
    const name = googlePayload?.name || email.split("@")[0] || "Usuario de Google";
    const picture = googlePayload?.picture || "";

    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/google`, { credential })
      .pipe(
        tap((res) => {
          this.mensajeExpiracion.set(null);
          localStorage.setItem(TOKEN_KEY, res.token);

          const finalAvatar = res.user.avatarUrl || picture || "";
          const userObj: AuthUser = {
            ...res.user,
            avatarUrl: finalAvatar,
            picture: finalAvatar,
            provider: "google",
          };

          localStorage.setItem(USER_KEY, JSON.stringify(userObj));
          if (finalAvatar) {
            localStorage.setItem(GOOGLE_AVATAR_KEY, finalAvatar);
            sessionStorage.setItem(GOOGLE_AVATAR_KEY, finalAvatar);
          }
          localStorage.setItem("cg_last_activity", String(Date.now()));
          this.usuarioActual.set(userObj);
          this.sesionConfirmada.set(true);
          if (res.token) {
            this.iniciarTemporizadorExpiracion(res.token);
          }
        }),
        catchError((err) => {
          console.warn("[AuthService] Fallback frontend para Google login:", err);
          const fallbackUser: AuthUser = {
            id: googlePayload?.sub || Date.now(),
            nombre: name,
            email: email,
            rol: "user",
            avatarUrl: picture,
            picture: picture,
            provider: "google",
          };
          const fallbackResponse: LoginResponse = {
            token: credential,
            user: fallbackUser,
          };
          this.mensajeExpiracion.set(null);
          localStorage.setItem(TOKEN_KEY, credential);
          localStorage.setItem(USER_KEY, JSON.stringify(fallbackUser));
          if (picture) {
            localStorage.setItem(GOOGLE_AVATAR_KEY, picture);
            sessionStorage.setItem(GOOGLE_AVATAR_KEY, picture);
          }
          localStorage.setItem("cg_last_activity", String(Date.now()));
          this.usuarioActual.set(fallbackUser);
          this.sesionConfirmada.set(true);
          return of(fallbackResponse);
        })
      );
  }

  /**
   * Renueva el token JWT con el backend mientras el usuario esté activo.
   */
  renovarSesion(): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/renew`, {})
      .pipe(
        tap((res) => {
          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          localStorage.setItem("cg_last_activity", String(Date.now()));
          localStorage.setItem("cg_session_renewed", String(Date.now()));
          this.usuarioActual.set(res.user);
          this.sesionConfirmada.set(true);
          if (res.token) {
            this.iniciarTemporizadorExpiracion(res.token);
          }
        })
      );
  }

  /**
   * Cierra la sesión del usuario manualmente.
   */
  logout(): void {
    if (this.usuarioActual()?.provider === "google") {
      this.cerrarSesionGoogle(true);
    } else {
      this.limpiarSesion(true);
    }
  }

  /**
   * Cierra la sesión de Google deshabilitando auto-select en la API de Google
   * para forzar el selector de cuentas en la próxima autenticación.
   */
  cerrarSesionGoogle(redireccionar: boolean = true): void {
    try {
      if (typeof window !== "undefined" && (window as any).google?.accounts?.id) {
        (window as any).google.accounts.id.disableAutoSelect();
      }
    } catch (e) {
      console.warn("[AuthService] Error al invocar disableAutoSelect():", e);
    }
    localStorage.removeItem(GOOGLE_AVATAR_KEY);
    sessionStorage.removeItem(GOOGLE_AVATAR_KEY);
    this.limpiarSesion(redireccionar, "Sesión de Google cerrada. Puede elegir otra cuenta.");
  }

  /**
   * Limpieza centralizada de sesión con soporte de mensaje de alerta y sincronización multi-pestaña.
   */
  limpiarSesion(redireccionar: boolean = true, mensaje?: string): void {
    if (this.timerExpiracion) {
      clearTimeout(this.timerExpiracion);
      this.timerExpiracion = null;
    }

    if (mensaje && this.mensajeExpiracion) {
      this.mensajeExpiracion.set(mensaje);
    }

    if (this.sesionConfirmada) {
      this.sesionConfirmada.set(false);
    }
    if (this.usuarioActual) {
      this.usuarioActual.set(null);
    }

    // Purga exhaustiva de claves de sesión para garantizar aislamiento estricto entre cuentas
    const clavesAEliminar = [
      TOKEN_KEY,
      USER_KEY,
      GOOGLE_AVATAR_KEY,
      "cg_token",
      "cg_user",
      "cg_google_avatar",
      "cg_last_activity",
      "cg_session_renewed",
      "cg_user_profile",
      "cg_draft_invoice",
    ];

    clavesAEliminar.forEach((k) => {
      try {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
      } catch {}
    });

    localStorage.setItem("cg_session_logout", String(Date.now()));

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
      this.limpiarSesion(true, "Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
    } else {
      // Programar redirección automática cuando el tiempo termine exactamente
      this.timerExpiracion = setTimeout(() => {
        console.warn("[AuthService] El tiempo de espera del token terminó. Redirigiendo automáticamente...");
        this.limpiarSesion(true, "Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
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
    if (!token) {
      if (this.sesionConfirmada && this.sesionConfirmada()) {
        this.sesionConfirmada.set(false);
      }
      return false;
    }

    if (!this.esTokenValido()) {
      console.warn("[AuthService] El token ha expirado. Purgando sesión...");
      this.limpiarSesion(false, "Su sesión ha expirado. Por favor, inicie sesión nuevamente.");
      return false;
    }

    if (this.sesionConfirmada && !this.sesionConfirmada()) {
      this.sesionConfirmada.set(true);
    }

    return true;
  }

  limpiarMensajeExpiracion(): void {
    this.mensajeExpiracion.set(null);
  }

  /**
   * Decodifica el token de Google para extraer nombre, email y picture.
   */
  decodificarTokenGoogle(credential: string): any {
    try {
      const parts = credential.split(".");
      if (parts.length !== 3) return null;

      const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn("[AuthService] Error decodificando token Google:", e);
      return null;
    }
  }

  private leerUsuarioGuardado(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      const user = JSON.parse(raw) as AuthUser;
      const cachedAvatar =
        localStorage.getItem(GOOGLE_AVATAR_KEY) ||
        (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(GOOGLE_AVATAR_KEY) : null);

      if (cachedAvatar && !user.avatarUrl) {
        user.avatarUrl = cachedAvatar;
        user.picture = cachedAvatar;
      }
      return user;
    } catch {
      return null;
    }
  }
}
