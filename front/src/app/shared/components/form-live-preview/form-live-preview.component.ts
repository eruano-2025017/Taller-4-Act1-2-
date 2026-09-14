import { Component, Input } from "@angular/core";
import { CommonModule } from "@angular/common";

export type FormPreviewType = "ingreso" | "egreso" | "categoria";

@Component({
  selector: "app-form-live-preview",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./form-live-preview.component.html",
})
export class FormLivePreviewComponent {
  @Input() tipo: FormPreviewType = "ingreso";
  @Input() titulo: string = "";
  @Input() monto: number | null | undefined = null;
  @Input() fecha: string = "";
  @Input() categoriaNombre: string = "";
  @Input() categoriaIcono?: string;
  @Input() categoriaColor?: string;
  @Input() metodo?: string;
  @Input() observacion?: string;
  @Input() subtipo?: "ingreso" | "egreso" = "egreso"; // Para tipo 'categoria'

  // Formato monetario en Quetzales
  montoFormateado(): string {
    const val = this.monto;
    const num = val !== null && val !== undefined && !isNaN(Number(val)) ? Number(val) : 0;
    const formatted = new Intl.NumberFormat("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `Q ${formatted}`;
  }

  // Título fallback predeterminado
  displayTitulo(): string {
    const t = this.titulo?.trim();
    if (t) return t;
    if (this.tipo === "ingreso") return "Nuevo Ingreso";
    if (this.tipo === "egreso") return "Nuevo Egreso";
    return "Nueva Categoría";
  }

  // Fecha legible
  displayFecha(): string {
    const f = this.fecha;
    if (!f) return "Hoy";
    try {
      const partes = f.split("-");
      if (partes.length === 3) {
        const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
        return new Intl.DateTimeFormat("es-GT", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }).format(d);
      }
      return f;
    } catch {
      return f;
    }
  }

  // Ícono resuelto
  displayIcono(): string {
    if (this.categoriaIcono) return this.categoriaIcono;
    if (this.tipo === "ingreso") return "payments";
    if (this.tipo === "egreso") return "shopping_cart";
    return "category";
  }

  // Color de acento resuelto
  displayColor(): string {
    if (this.categoriaColor) return this.categoriaColor;
    if (this.tipo === "ingreso") return "#10B981";
    if (this.tipo === "egreso") return "#EF4444";
    return this.subtipo === "ingreso" ? "#10B981" : "#FF7A00";
  }

  // Método de pago fallback
  displayMetodo(): string {
    return this.metodo?.trim() || "Transferencia";
  }

  // Ícono del método de pago
  metodoIcono(): string {
    const m = (this.metodo || "").toLowerCase();
    if (m.includes("tarjeta")) return "credit_card";
    if (m.includes("efectivo")) return "payments";
    if (m.includes("depósito") || m.includes("deposito")) return "account_balance";
    return "swap_horiz";
  }
}

