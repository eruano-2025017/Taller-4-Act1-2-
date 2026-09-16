export type Rol = "admin" | "user";

export interface AuthUser {
  id: number | string;
  nombre: string;
  email: string;
  rol: Rol;
  avatarUrl?: string;
  picture?: string;
  provider?: "google" | "local";
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
