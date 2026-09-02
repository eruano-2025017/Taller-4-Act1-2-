import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, tap, throwError } from "rxjs";
import { AuthService } from "./auth.service";
import { IdleSessionService } from "./idle-session.service";

const TOKEN_KEY = "cg_token";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const idleSessionService = inject(IdleSessionService);
  const token = localStorage.getItem(TOKEN_KEY);

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    tap(() => {
      // Toda petición HTTP exitosa a la API cuenta como actividad humana/operativa
      if (!req.url.includes("/auth/login")) {
        idleSessionService.registrarActividad(true);
      }
    }),
    catchError((error: HttpErrorResponse) => {
      // 401 Unauthorized: Token expirado, manipulado o sesión cerrada en servidor
      if (error.status === 401 && !req.url.includes("/auth/login")) {
        console.warn("[AuthInterceptor] 401 Unauthorized recibido de la API. Sesión no válida.");
        idleSessionService.detenerMonitoreo();
        authService.limpiarSesion(true, "Tu sesión se cerró automáticamente por inactividad.");
      }

      return throwError(() => error);
    })
  );
};

