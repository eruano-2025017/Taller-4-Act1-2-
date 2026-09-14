import { Routes } from '@angular/router';
import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  // Ruta principal abre el login primero
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Login
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then((m) => m.LoginComponent),
  },

  // Dashboard — accesible tras login exitoso
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./dashboard/dashboard.component').then(
        (m) => m.DashboardComponent
      ),
  },

  // Ingresos — accesible tras login exitoso
  {
    path: 'ingresos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./incomes/incomes.component').then(
        (m) => m.IncomesComponent
      ),
  },

  // Categorías — accesible tras login exitoso
  {
    path: 'categorias',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./categories/categories.component').then(
        (m) => m.CategoriesComponent
      ),
  },

  // Egresos / Gastos — accesible tras login exitoso
  {
    path: 'egresos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./expenses/expenses.component').then(
        (m) => m.ExpensesComponent
      ),
  },
  { path: 'gastos', redirectTo: 'egresos', pathMatch: 'full' },

  // Análisis — Inteligencia Financiera
  {
    path: 'analisis',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./analysis/analysis.component').then(
        (m) => m.AnalysisComponent
      ),
  },

  // Facturas — ya no es vista independiente; se integra dentro de Análisis
  { path: 'facturas', redirectTo: 'analisis', pathMatch: 'full' },
  { path: 'factura', redirectTo: 'analisis', pathMatch: 'full' },

  // Configuración — Preferencias, Perfil y Sesión
  {
    path: 'configuracion',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./config/config.component').then(
        (m) => m.ConfigComponent
      ),
  },

  // Fallback
  { path: '**', redirectTo: 'login' },
];
