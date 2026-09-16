import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard que protege la ruta /dashboard.
 * Si el usuario NO tiene token/sesión → redirige a /login.
 * Si está autenticado → permite el acceso.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado()) {
    authService.sesionConfirmada.set(true);
    return true;
  }

  authService.sesionConfirmada.set(false);
  return router.createUrlTree(['/login']);
};
