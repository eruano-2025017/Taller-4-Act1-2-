import { Component, inject, OnInit, signal, computed } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { InvoiceService, InvoiceRecord } from "../services/invoice.service";
import { AuthService } from "../services/auth.service";
import { UserService } from "../services/user.service";

export interface FormItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
}

@Component({
  selector: "app-invoices",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./invoices.component.html",
  styles: [
    `
      @media print {
        :host {
          display: block;
          width: 100%;
          margin: 0;
          padding: 0;
        }
      }
    `,
  ],
})
export class InvoicesComponent implements OnInit {
  invoiceService = inject(InvoiceService);
  auth = inject(AuthService);
  userService = inject(UserService);

  vistaActiva = signal<"crear" | "historial">("crear");
  modoVista = signal<"dividido" | "preview">("dividido");

  // Estado del formulario
  numeroFactura = signal<string>("FAC-2026-001");
  guardando = signal<boolean>(false);
  mensaje = signal<{ tipo: "exito" | "error"; texto: string } | null>(null);

  form = {
    emisor_nombre: "KINAL FINANCE",
    emisor_nit: "839210-4",
    emisor_direccion: "Ciudad de Guatemala, Guatemala",
    cliente_nombre: "",
    cliente_nit: "C/F",
    cliente_email: "",
    cliente_direccion: "",
    fecha_emision: new Date().toISOString().split("T")[0],
    fecha_vencimiento: new Date().toISOString().split("T")[0],
    metodo_pago: "Transferencia Bancaria",
    notas: "Documento Tributario Electrónico emitido conforme a las regulaciones de SAT Guatemala. Exento de timbres fiscales según Decreto 27-92.",
  };

  items = signal<FormItem[]>([
    {
      descripcion: "Servicios de Asesoría Financiera y Conciliación Contable",
      cantidad: 1,
      precio_unitario: 1500,
    },
  ]);

  // Cálculos automáticos reactivos en Quetzales
  subtotalCalculado = computed(() => {
    return this.items().reduce((acc, item) => {
      const cant = Number(item.cantidad) || 0;
      const precio = Number(item.precio_unitario) || 0;
      return acc + cant * precio;
    }, 0);
  });

  ivaCalculado = computed(() => {
    // 12% IVA Guatemala (Ley del Impuesto al Valor Agregado)
    return Math.round(this.subtotalCalculado() * 0.12 * 100) / 100;
  });

  totalCalculado = computed(() => {
    return Math.round((this.subtotalCalculado() + this.ivaCalculado()) * 100) / 100;
  });

  // Historial de facturas
  facturas = signal<InvoiceRecord[]>([]);
  cargandoFacturas = signal<boolean>(false);
  facturaSeleccionada = signal<InvoiceRecord | null>(null);

  ngOnInit() {
    this.obtenerSiguienteNumero();
    this.cargarDatosEmisor();
    this.cargarHistorial();
  }

  obtenerSiguienteNumero() {
    this.invoiceService.getNextNumber().subscribe({
      next: (res) => this.numeroFactura.set(res.nextNumber),
      error: () => {},
    });
  }

  cargarDatosEmisor() {
    this.userService.getProfile().subscribe({
      next: (prof) => {
        if (prof.nit) this.form.emisor_nit = prof.nit;
        if (prof.direccion) this.form.emisor_direccion = prof.direccion;
        const nombreUsuario = this.auth.usuarioActual()?.nombre;
        if (nombreUsuario) {
          this.form.emisor_nombre = `KINAL FINANCE - ${nombreUsuario}`;
        }
      },
      error: () => {},
    });
  }

  cargarHistorial() {
    this.cargandoFacturas.set(true);
    this.invoiceService.getAll().subscribe({
      next: (list) => {
        this.facturas.set(list);
        this.cargandoFacturas.set(false);
      },
      error: () => {
        this.cargandoFacturas.set(false);
      },
    });
  }

  // Atajos para clientes
  establecerConsumidorFinal() {
    this.form.cliente_nit = "C/F";
    if (!this.form.cliente_nombre.trim()) {
      this.form.cliente_nombre = "Consumidor Final";
    }
  }

  establecerPlazo(dias: number) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    this.form.fecha_vencimiento = d.toISOString().split("T")[0];
  }

  agregarItem() {
    this.items.update((list) => [
      ...list,
      { descripcion: "", cantidad: 1, precio_unitario: 0 },
    ]);
  }

  eliminarItem(index: number) {
    if (this.items().length <= 1) return;
    this.items.update((list) => list.filter((_, i) => i !== index));
  }

  limpiarFormulario() {
    this.form.cliente_nombre = "";
    this.form.cliente_nit = "C/F";
    this.form.cliente_email = "";
    this.form.cliente_direccion = "";
    this.form.fecha_emision = new Date().toISOString().split("T")[0];
    this.form.fecha_vencimiento = new Date().toISOString().split("T")[0];
    this.items.set([
      { descripcion: "", cantidad: 1, precio_unitario: 0 },
    ]);
    this.mensaje.set(null);
  }

  crearFactura() {
    if (!this.form.cliente_nombre.trim()) {
      this.mensaje.set({ tipo: "error", texto: "Por favor, ingresa el nombre o razón social del cliente." });
      return;
    }

    const itemsValidos = this.items().filter((i) => i.descripcion.trim().length > 0 && Number(i.cantidad) > 0);
    if (itemsValidos.length === 0) {
      this.mensaje.set({ tipo: "error", texto: "Debes agregar al menos una partida con descripción y precio válido." });
      return;
    }

    this.guardando.set(true);
    this.mensaje.set(null);

    this.invoiceService
      .create({
        cliente_nombre: this.form.cliente_nombre,
        cliente_nit: this.form.cliente_nit || "C/F",
        cliente_email: this.form.cliente_email,
        cliente_direccion: this.form.cliente_direccion,
        emisor_nombre: this.form.emisor_nombre,
        emisor_nit: this.form.emisor_nit,
        emisor_direccion: this.form.emisor_direccion,
        fecha_emision: this.form.fecha_emision,
        fecha_vencimiento: this.form.fecha_vencimiento,
        metodo_pago: this.form.metodo_pago,
        notas: this.form.notas,
        items: itemsValidos,
      })
      .subscribe({
        next: (facturaCreada) => {
          this.guardando.set(false);
          this.mensaje.set({
            tipo: "exito",
            texto: `Factura ${facturaCreada.numero_factura} emitida exitosamente por ${this.formatoMoneda(facturaCreada.total)}.`,
          });
          this.facturas.update((list) => [facturaCreada, ...list]);
          this.obtenerSiguienteNumero();
          // Reset cliente
          this.form.cliente_nombre = "";
          this.form.cliente_nit = "C/F";
          this.form.cliente_email = "";
          this.form.cliente_direccion = "";
        },
        error: (err) => {
          this.guardando.set(false);
          this.mensaje.set({
            tipo: "error",
            texto: err?.error?.message || "Ocurrió un error al emitir la factura.",
          });
        },
      });
  }

  imprimirFactura() {
    window.print();
  }

  verFacturaHistorial(factura: InvoiceRecord) {
    this.invoiceService.getById(factura.id).subscribe({
      next: (f) => this.facturaSeleccionada.set(f),
      error: () => this.facturaSeleccionada.set(factura),
    });
  }

  cerrarModalFactura() {
    this.facturaSeleccionada.set(null);
  }

  formatoMoneda(val: number | undefined | null): string {
    if (val === undefined || val === null) return "Q 0.00";
    return (
      "Q " +
      Number(val).toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
}
