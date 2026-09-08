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

  // Fallback
  { path: '**', redirectTo: 'login' },
];
