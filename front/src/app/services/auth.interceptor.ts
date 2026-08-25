import { HttpInterceptorFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { catchError, throwError } from "rxjs";
import { AuthService } from "./auth.service";

const TOKEN_KEY = "cg_token";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem(TOKEN_KEY);

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si la API responde 401 (Unauthorized / Token expirado o inválido)
      // y NO es la petición de login de credenciales:
      if (error.status === 401 && !req.url.includes("/auth/login")) {
        console.warn("[AuthInterceptor] 401 Unauthorized recibido de la API. Sesión expirada.");
        authService.limpiarSesion(true);
      }

      return throwError(() => error);
    })
  );
};
