import { Injectable, signal, computed, inject, NgZone, OnDestroy } from "@angular/core";
import { fromEvent, merge, Subscription, interval } from "rxjs";
import { throttleTime } from "rxjs/operators";
import { environment } from "../../environments/environment";
import { AuthService } from "./auth.service";

const LAST_ACTIVITY_KEY = "cg_last_activity";
const LOGOUT_SYNC_KEY = "cg_session_logout";
const RENEWED_SYNC_KEY = "cg_session_renewed";

@Injectable({ providedIn: "root" })
export class IdleSessionService implements OnDestroy {
  private authService = inject(AuthService);
  private ngZone = inject(NgZone);

  // Configuración de tiempos
  private readonly idleTimeoutMs = environment.session.idleTimeoutMs;
  private readonly warningTimeMs = environment.session.warningTimeMs;
  private readonly renewThresholdMs = environment.session.renewThresholdMs;
  private readonly activityThrottleMs = environment.session.activityThrottleMs;

  // Estado reactivo con Signals
  mostrarAdvertencia = signal<boolean>(false);
  segundosRestantes = signal<number>(0);
  renovando = signal<boolean>(false);

  // Texto formateado para la cuenta regresiva (ej. "01:45")
  tiempoFormateado = computed(() => {
    const totalSeg = this.segundosRestantes();
    const min = Math.floor(totalSeg / 60);
    const seg = totalSeg % 60;
    return `${String(min).padStart(2, "0")}:${String(seg).padStart(2, "0")}`;
  });

  private ultimaActividad: number = Date.now();
  private actividadSub?: Subscription;
  private timerSub?: Subscription;
  private storageListener?: (event: StorageEvent) => void;
  private monitoreando: boolean = false;

  constructor() {
    this.inicializarEscuchaStorage();
  }

  ngOnDestroy(): void {
    this.detenerMonitoreo();
    if (this.storageListener) {
      window.removeEventListener("storage", this.storageListener);
    }
  }

  /**
   * Inicia la detección de actividad y el ciclo de verificación de inactividad.
   */
  iniciarMonitoreo(): void {
    if (this.monitoreando) return;
    this.monitoreando = true;

    // Inicializar timestamp de última actividad
    const guardada = localStorage.getItem(LAST_ACTIVITY_KEY);
    this.ultimaActividad = guardada ? Number(guardada) : Date.now();
    if (!guardada) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(this.ultimaActividad));
    }

    // Escucha de eventos de usuario optimizada con throttle
    this.ngZone.runOutsideAngular(() => {
      const eventos$ = merge(
        fromEvent(window, "mousemove"),
        fromEvent(window, "mousedown"),
        fromEvent(window, "keydown"),
        fromEvent(window, "scroll", { passive: true }),
        fromEvent(window, "touchstart", { passive: true }),
        fromEvent(window, "pointerdown")
      ).pipe(throttleTime(this.activityThrottleMs, undefined, { leading: true, trailing: true }));

      this.actividadSub = eventos$.subscribe(() => {
        this.ngZone.run(() => {
          this.registrarActividad(true);
        });
      });

      // Ciclo de verificación cada 1 segundo
      this.timerSub = interval(1000).subscribe(() => {
        this.ngZone.run(() => {
          this.verificarInactividad();
        });
      });
    });
  }

  /**
   * Detiene el monitoreo al cerrar sesión.
   */
  detenerMonitoreo(): void {
    this.monitoreando = false;
    this.mostrarAdvertencia.set(false);
    this.segundosRestantes.set(0);
    this.actividadSub?.unsubscribe();
    this.timerSub?.unsubscribe();
  }

  /**
   * Registra actividad humana o petición API, reseteando el temporizador local y sincronizando storage.
   */
  registrarActividad(sincronizarStorage: boolean = true): void {
    if (!this.authService.estaAutenticado()) return;

    this.ultimaActividad = Date.now();

    if (sincronizarStorage) {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(this.ultimaActividad));
    }

    // Si la advertencia estaba visible, cerrarla porque el usuario acaba de interactuar
    if (this.mostrarAdvertencia()) {
      this.mostrarAdvertencia.set(false);
    }

    // Comprobar si el JWT está cerca de expirar mientras el usuario trabaja activamente
    this.verificarRenovacionAutomatica();
  }

  /**
   * Acción del usuario al presionar "Continuar sesión" en el modal de advertencia.
   */
  continuarSesion(): void {
    this.renovando.set(true);
    this.registrarActividad(true);

    this.authService.renovarSesion().subscribe({
      next: () => {
        this.renovando.set(false);
        this.mostrarAdvertencia.set(false);
      },
      error: (err) => {
        console.error("[IdleSessionService] Error al renovar sesión con backend:", err);
        this.renovando.set(false);
        // Si el backend rechaza la renovación (401), se purga la sesión
        this.authService.limpiarSesion(true, "Tu sesión ha expirado en el servidor. Inicia sesión de nuevo.");
      },
    });
  }

  /**
   * Acción del usuario al presionar "Cerrar sesión" en el modal de advertencia.
   */
  cerrarSesion(): void {
    this.detenerMonitoreo();
    this.authService.logout();
  }

  /**
   * Verifica periódicamente los tiempos de inactividad respecto a la última actividad registrada.
   */
  private verificarInactividad(): void {
    if (!this.authService.estaAutenticado()) {
      this.detenerMonitoreo();
      return;
    }

    // Leer la última actividad global (pudo actualizarse en otra pestaña)
    const guardada = localStorage.getItem(LAST_ACTIVITY_KEY);
    const ultimaGlobal = guardada ? Number(guardada) : this.ultimaActividad;
    if (ultimaGlobal > this.ultimaActividad) {
      this.ultimaActividad = ultimaGlobal;
      if (this.mostrarAdvertencia()) {
        this.mostrarAdvertencia.set(false);
      }
    }

    const tiempoInactivo = Date.now() - this.ultimaActividad;

    // CASO 1: Se alcanzó el límite máximo de inactividad
    if (tiempoInactivo >= this.idleTimeoutMs) {
      console.warn("[IdleSessionService] Tiempo de inactividad superado (15m). Cerrando sesión...");
      this.detenerMonitoreo();
      this.authService.limpiarSesion(true, "Tu sesión se cerró automáticamente por inactividad.");
      return;
    }

    // CASO 2: Entramos en la ventana de advertencia (últimos 2 minutos)
    const umbralAdvertencia = this.idleTimeoutMs - this.warningTimeMs;
    if (tiempoInactivo >= umbralAdvertencia) {
      const tiempoRestanteMs = Math.max(0, this.idleTimeoutMs - tiempoInactivo);
      this.segundosRestantes.set(Math.ceil(tiempoRestanteMs / 1000));
      this.mostrarAdvertencia.set(true);
    } else {
      if (this.mostrarAdvertencia()) {
        this.mostrarAdvertencia.set(false);
      }
    }
  }

  /**
   * Si el token JWT tiene menos de 5 minutos de vida y el usuario está trabajando activamente,
   * se renueva de forma transparente en segundo plano con el backend.
   */
  private verificarRenovacionAutomatica(): void {
    const payload = this.authService.obtenerPayloadToken();
    if (!payload?.exp) return;

    const expMs = payload.exp * 1000;
    const tiempoParaExpirar = expMs - Date.now();

    // Si faltan menos de renewThresholdMs (5 minutos) y aún es válido
    if (tiempoParaExpirar > 0 && tiempoParaExpirar <= this.renewThresholdMs && !this.renovando()) {
      this.renovando.set(true);
      this.authService.renovarSesion().subscribe({
        next: () => {
          this.renovando.set(false);
          console.info("[IdleSessionService] Token JWT renovado automáticamente por actividad continua.");
        },
        error: (err) => {
          this.renovando.set(false);
          console.warn("[IdleSessionService] No se pudo autorenovar el token:", err);
        },
      });
    }
  }

  /**
   * Sincronización entre múltiples pestañas del navegador.
   */
  private inicializarEscuchaStorage(): void {
    this.storageListener = (event: StorageEvent) => {
      // 1. Actividad en otra pestaña
      if (event.key === LAST_ACTIVITY_KEY && event.newValue) {
        const timestamp = Number(event.newValue);
        if (timestamp > this.ultimaActividad) {
          this.ultimaActividad = timestamp;
          if (this.mostrarAdvertencia()) {
            this.mostrarAdvertencia.set(false);
          }
        }
      }

      // 2. Cierre de sesión ejecutado en otra pestaña
      if (event.key === LOGOUT_SYNC_KEY || (event.key === "cg_token" && !event.newValue)) {
        this.detenerMonitoreo();
        if (this.authService.usuarioActual()) {
          this.authService.limpiarSesion(true, "Tu sesión se cerró desde otra pestaña.");
        }
      }

      // 3. Token renovado en otra pestaña
      if (event.key === RENEWED_SYNC_KEY && event.newValue) {
        if (this.mostrarAdvertencia()) {
          this.mostrarAdvertencia.set(false);
        }
      }
    };

    window.addEventListener("storage", this.storageListener);
  }
}

