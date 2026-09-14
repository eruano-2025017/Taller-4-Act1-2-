import { Component, OnInit, inject, signal, computed, HostListener } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from "@angular/forms";
import { RouterLink } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { CategoryService } from "../services/category.service";
import { CategoryItem } from "../shared/models/category.model";
import { FormLivePreviewComponent } from "../shared/components/form-live-preview/form-live-preview.component";
import { AppSidebarComponent } from "../shared/components/app-sidebar/app-sidebar.component";
import { AppHeaderComponent } from "../shared/components/app-header/app-header.component";

@Component({
  selector: "app-categories",
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, FormLivePreviewComponent, AppSidebarComponent, AppHeaderComponent],
  templateUrl: "./categories.component.html",
})
export class CategoriesComponent implements OnInit {
  public auth = inject(AuthService);
  public categoryService = inject(CategoryService);
  private fb = inject(FormBuilder);

  // Estados reactivos con Signals
  drawerAbierto = signal<boolean>(false);
  editandoId = signal<number | null>(null);
  guardando = signal<boolean>(false);
  modalEliminarAbierto = signal<boolean>(false);
  categoriaAEliminar = signal<CategoryItem | null>(null);
  eliminando = signal<boolean>(false);

  filtroTipo = signal<"todas" | "ingreso" | "egreso">("todas");
  filtroBusqueda = signal<string>("");
  vistaModo = signal<"grid" | "tabla">("grid");

  // Conjunto inmutable de las 12 categorías predeterminadas oficiales (6 ingresos + 6 egresos)
  readonly categoriasPredeterminadasNombres = new Set([
    "salario",
    "freelance",
    "ventas",
    "inversiones",
    "bonificación",
    "otros ingresos",
    "alimentación",
    "transporte",
    "vivienda",
    "servicios básicos",
    "salud y bienestar",
    "entretenimiento",
  ]);

  esPredeterminada(nombre: string): boolean {
    return this.categoriasPredeterminadasNombres.has((nombre || "").toLowerCase().trim());
  }

  cambiarVista(modo: "grid" | "tabla"): void {
    this.vistaModo.set(modo);
  }

  mostrarToast = signal<boolean>(false);
  mensajeToast = signal<string>("");
  tipoToast = signal<"success" | "error">("success");

  // Paleta de íconos seleccionables
  readonly listaIconos: { icono: string; label: string }[] = [
    { icono: "restaurant", label: "Comida" },
    { icono: "directions_car", label: "Transporte" },
    { icono: "home", label: "Vivienda" },
    { icono: "payments", label: "Sueldo" },
    { icono: "shopping_cart", label: "Compras" },
    { icono: "medical_services", label: "Salud" },
    { icono: "flight", label: "Viajes" },
    { icono: "work", label: "Trabajo" },
    { icono: "laptop_chromebook", label: "Freelance" },
    { icono: "storefront", label: "Comercio" },
    { icono: "trending_up", label: "Inversión" },
    { icono: "card_giftcard", label: "Regalos" },
    { icono: "savings", label: "Ahorro" },
    { icono: "bolt", label: "Servicios" },
    { icono: "school", label: "Educación" },
    { icono: "sports_esports", label: "Ocio" },
    { icono: "fitness_center", label: "Deporte" },
    { icono: "local_cafe", label: "Cafetería" },
    { icono: "subscriptions", label: "Streaming" },
    { icono: "receipt_long", label: "Facturas" },
    { icono: "paid", label: "Efectivo" },
    { icono: "category", label: "General" },
  ];

  // Paleta de colores de acento
  readonly paletaColores: string[] = [
    "#10B981", // Esmeralda (Ingreso estándar)
    "#3B82F6", // Azul profesional
    "#8B5CF6", // Púrpura financiero
    "#FF7A00", // Naranja Kinal
    "#EF4444", // Rojo gasto
    "#F59E0B", // Ámbar cálido
    "#EC4899", // Rosa vibrante
    "#06B6D4", // Cian fresco
    "#6366F1", // Índigo profundo
    "#0C1628", // Navy corporativo
  ];

  // Formulario reactivo
  form = this.fb.group({
    nombre: ["", [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    tipo: ["egreso" as "ingreso" | "egreso", [Validators.required]],
    icono: ["category", [Validators.required]],
    color: ["#FF7A00", [Validators.required]],
    descripcion: ["", [Validators.maxLength(255)]],
  });

  // Signal reactivo para sincronización instantánea de cada pulsación de tecla
  formValue = signal(this.form.getRawValue());

  // Usuario y Fecha
  inicialUsuario = computed(() => {
    const nombre = this.auth.usuarioActual()?.nombre ?? "U";
    return nombre.charAt(0).toUpperCase();
  });

  mesActual = computed(() => {
    const d = new Date();
    const str = new Intl.DateTimeFormat("es-GT", { month: "long", year: "numeric" }).format(d);
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Previsualización reactiva del Drawer
  previewNombre = computed(() => {
    return this.formValue().nombre?.trim() || "";
  });

  previewTipo = computed(() => {
    return (this.formValue().tipo as "ingreso" | "egreso") || "egreso";
  });

  previewIcono = computed(() => {
    return this.formValue().icono || "category";
  });

  previewColor = computed(() => {
    return this.formValue().color || "#FF7A00";
  });

  previewDescripcion = computed(() => {
    return this.formValue().descripcion?.trim() || "";
  });

  @HostListener("document:keydown.escape")
  onEscapePress(): void {
    if (this.drawerAbierto()) {
      this.cerrarDrawer();
    }
  }

  // Lista filtrada de categorías
  categoriasFiltradas = computed(() => {
    const data = this.categoryService.data();
    if (!data?.categories) return [];
    let items = data.categories;

    const tipo = this.filtroTipo();
    if (tipo !== "todas") {
      items = items.filter((c) => c.tipo === tipo);
    }

    const q = this.filtroBusqueda().toLowerCase().trim();
    if (q) {
      items = items.filter(
        (c) =>
          c.nombre.toLowerCase().includes(q) ||
          (c.descripcion || "").toLowerCase().includes(q)
      );
    }

    return items;
  });

  // Métricas reactivas para las tarjetas de resumen
  metricas = computed(() => {
    const data = this.categoryService.data();
    const categories = data?.categories ?? [];
    const total = data?.summary?.totalCategorias ?? categories.length ?? 0;
    const ingresos =
      data?.summary?.categoriasIngreso ??
      categories.filter((c) => c.tipo === "ingreso").length;
    const egresos =
      data?.summary?.categoriasEgreso ??
      categories.filter((c) => c.tipo === "egreso").length;
    const porcentajeIngresos = total > 0 ? Math.round((ingresos / total) * 100) : 0;
    const porcentajeEgresos = total > 0 ? Math.round((egresos / total) * 100) : 0;

    const predeterminadas = categories.filter((c) => this.esPredeterminada(c.nombre)).length;
    const personalizadas = categories.filter((c) => !this.esPredeterminada(c.nombre)).length;

    return {
      total,
      ingresos,
      egresos,
      porcentajeIngresos,
      porcentajeEgresos,
      predeterminadas,
      personalizadas,
    };
  });

  ngOnInit(): void {
    this.cargarDatos();
    this.form.valueChanges.subscribe(() => {
      this.formValue.set(this.form.getRawValue());
    });
  }

  cargarDatos(): void {
    this.categoryService.getCategoryData().subscribe();
  }

  onFiltrarTipo(tipo: "todas" | "ingreso" | "egreso"): void {
    this.filtroTipo.set(tipo);
  }

  onBuscar(termino: string): void {
    this.filtroBusqueda.set(termino);
  }

  // Drawer de Creación / Edición
  abrirDrawerNuevo(): void {
    this.editandoId.set(null);
    this.form.reset({
      nombre: "",
      tipo: "egreso",
      icono: "restaurant",
      color: "#EF4444",
      descripcion: "",
    });
    this.formValue.set(this.form.getRawValue());
    this.drawerAbierto.set(true);
  }

  abrirDrawerEditar(item: CategoryItem): void {
    this.editandoId.set(item.id);
    this.form.patchValue({
      nombre: item.nombre,
      tipo: item.tipo,
      icono: item.icono || "category",
      color: item.color || "#FF7A00",
      descripcion: item.descripcion || "",
    });
    this.formValue.set(this.form.getRawValue());
    this.drawerAbierto.set(true);
  }

  cerrarDrawer(): void {
    this.drawerAbierto.set(false);
    this.editandoId.set(null);
  }

  onSeleccionarIcono(icono: string): void {
    this.form.patchValue({ icono });
    this.formValue.set(this.form.getRawValue());
  }

  onSeleccionarColor(color: string): void {
    this.form.patchValue({ color });
    this.formValue.set(this.form.getRawValue());
  }

  onSeleccionarTipo(tipo: "ingreso" | "egreso"): void {
    this.form.patchValue({ tipo });
    // Si no ha cambiado el color manualmente, asignar un color por defecto según el tipo seleccionado
    if (tipo === "ingreso" && this.form.value.color === "#EF4444") {
      this.form.patchValue({ color: "#10B981" });
    } else if (tipo === "egreso" && this.form.value.color === "#10B981") {
      this.form.patchValue({ color: "#EF4444" });
    }
    this.formValue.set(this.form.getRawValue());
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const val = this.form.getRawValue();

    const payload = {
      nombre: val.nombre!.trim(),
      tipo: val.tipo!,
      icono: val.icono || "category",
      color: val.color || "#FF7A00",
      descripcion: val.descripcion?.trim() || undefined,
    };

    const id = this.editandoId();

    if (id) {
      this.categoryService.updateCategory(id, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Categoría actualizada con éxito", "success");
        },
        error: (err) => {
          console.error("[CategoriesComponent] Error al actualizar categoría:", err);
          this.guardando.set(false);
          const msg = err?.error?.message || "No se pudo actualizar la categoría";
          this.lanzarToast(msg, "error");
        },
      });
    } else {
      this.categoryService.createCategory(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.cerrarDrawer();
          this.cargarDatos();
          this.lanzarToast("Categoría creada exitosamente", "success");
        },
        error: (err) => {
          console.error("[CategoriesComponent] Error al crear categoría:", err);
          this.guardando.set(false);
          const msg = err?.error?.message || "No se pudo registrar la categoría";
          this.lanzarToast(msg, "error");
        },
      });
    }
  }

  // Modal de Eliminación Segura
  solicitarEliminar(item: CategoryItem, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.categoriaAEliminar.set(item);
    this.modalEliminarAbierto.set(true);
  }

  cancelarEliminar(): void {
    this.modalEliminarAbierto.set(false);
    this.categoriaAEliminar.set(null);
  }

  confirmarEliminar(): void {
    const cat = this.categoriaAEliminar();
    if (!cat) return;

    this.eliminando.set(true);
    this.categoryService.deleteCategory(cat.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.modalEliminarAbierto.set(false);
        this.categoriaAEliminar.set(null);
        this.cargarDatos();
        this.lanzarToast(`Categoría "${cat.nombre}" eliminada`, "success");
      },
      error: (err) => {
        console.error("[CategoriesComponent] Error al eliminar categoría:", err);
        this.eliminando.set(false);
        this.modalEliminarAbierto.set(false);
        this.categoriaAEliminar.set(null);
        const msg = err?.error?.message || "No se pudo eliminar la categoría";
        this.lanzarToast(msg, "error");
      },
    });
  }

  lanzarToast(mensaje: string, tipo: "success" | "error" = "success"): void {
    this.mensajeToast.set(mensaje);
    this.tipoToast.set(tipo);
    this.mostrarToast.set(true);
    setTimeout(() => {
      this.mostrarToast.set(false);
    }, 3500);
  }

  formatoMoneda(val: number | null | undefined): string {
    const num = val ?? 0;
    const formatted = new Intl.NumberFormat("es-GT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
    return `Q ${formatted}`;
  }
}

