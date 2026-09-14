import { Injectable, inject, signal } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, tap } from "rxjs";
import { environment } from "../../environments/environment";
import { NotificationItem, NotificationResponse } from "../shared/models/notification.model";
import { DataSyncService } from "./data-sync.service";

@Injectable({ providedIn: "root" })
export class NotificationService {
  private http = inject(HttpClient);
  private dataSync = inject(DataSyncService);

  notificaciones = signal<NotificationItem[]>([]);
  noLeidas = signal<number>(0);
  cargando = signal<boolean>(false);

  constructor() {
    // Escuchar eventos de creación/modificación para refrescar notificaciones automáticamente
    this.dataSync.sync$.subscribe(() => {
      this.cargarNotificaciones().subscribe();
    });
  }

  cargarNotificaciones(unreadOnly: boolean = false): Observable<NotificationResponse> {
    this.cargando.set(true);
    const url = `${environment.apiUrl}/notifications${unreadOnly ? "?unread=true" : ""}`;
    return this.http.get<NotificationResponse>(url).pipe(
      tap({
        next: (res) => {
          this.notificaciones.set(res.notificaciones);
          this.noLeidas.set(res.noLeidas);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        },
      })
    );
  }

  marcarTodasComoLeidas(): Observable<{ success: boolean; message: string }> {
    return this.http
      .patch<{ success: boolean; message: string }>(`${environment.apiUrl}/notifications/read-all`, {})
      .pipe(
        tap(() => {
          this.noLeidas.set(0);
          this.notificaciones.update((list) =>
            list.map((n) => ({ ...n, leido: true }))
          );
        })
      );
  }

  marcarComoLeida(id: number): Observable<{ success: boolean }> {
    return this.http
      .patch<{ success: boolean }>(`${environment.apiUrl}/notifications/${id}/read`, {})
      .pipe(
        tap(() => {
          this.notificaciones.update((list) =>
            list.map((n) => (n.id === id ? { ...n, leido: true } : n))
          );
          this.noLeidas.update((count) => Math.max(0, count - 1));
        })
      );
  }
}

