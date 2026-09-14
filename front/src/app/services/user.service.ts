import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface UserProfileData {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "user";
  telefono: string | null;
  nit: string | null;
  direccion: string | null;
  created_at: string;
}

export interface UpdateProfileInput {
  nombre: string;
  telefono?: string | null;
  nit?: string | null;
  direccion?: string | null;
}

export interface UpdatePasswordInput {
  passwordActual: string;
  nuevaPassword: string;
}

@Injectable({ providedIn: "root" })
export class UserService {
  private http = inject(HttpClient);

  getProfile(): Observable<UserProfileData> {
    return this.http.get<UserProfileData>(`${environment.apiUrl}/user/profile`);
  }

  updateProfile(data: UpdateProfileInput): Observable<UserProfileData> {
    return this.http.put<UserProfileData>(`${environment.apiUrl}/user/profile`, data);
  }

  updatePassword(data: UpdatePasswordInput): Observable<{ success: boolean; message: string }> {
    return this.http.put<{ success: boolean; message: string }>(`${environment.apiUrl}/user/password`, data);
  }
}

