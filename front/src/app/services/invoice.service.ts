import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";

export interface InvoiceItem {
  id?: number;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface InvoiceRecord {
  id: number;
  user_id: number;
  numero_factura: string;
  cliente_nombre: string;
  cliente_nit: string;
  cliente_email?: string | null;
  cliente_direccion?: string | null;
  emisor_nombre: string;
  emisor_nit: string;
  emisor_direccion: string;
  fecha_emision: string;
  fecha_vencimiento: string;
  metodo_pago: string;
  subtotal: number;
  impuesto: number;
  total: number;
  estado: string;
  notas?: string | null;
  created_at: string;
  items?: InvoiceItem[];
}

export interface CreateInvoicePayload {
  cliente_nombre: string;
  cliente_nit?: string;
  cliente_email?: string;
  cliente_direccion?: string;
  emisor_nombre?: string;
  emisor_nit?: string;
  emisor_direccion?: string;
  fecha_emision?: string;
  fecha_vencimiento?: string;
  metodo_pago?: string;
  notas?: string;
  items: Array<{
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
  }>;
}

@Injectable({ providedIn: "root" })
export class InvoiceService {
  private http = inject(HttpClient);

  getNextNumber(): Observable<{ nextNumber: string }> {
    return this.http.get<{ nextNumber: string }>(`${environment.apiUrl}/invoices/next-number`);
  }

  getAll(): Observable<InvoiceRecord[]> {
    return this.http.get<InvoiceRecord[]>(`${environment.apiUrl}/invoices`);
  }

  getById(id: number): Observable<InvoiceRecord> {
    return this.http.get<InvoiceRecord>(`${environment.apiUrl}/invoices/${id}`);
  }

  create(data: CreateInvoicePayload): Observable<InvoiceRecord> {
    return this.http.post<InvoiceRecord>(`${environment.apiUrl}/invoices`, data);
  }
}

