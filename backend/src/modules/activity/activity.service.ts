import { ActivityModel, ActivityRecord, CreateActivityParams } from "./activity.model";

export interface FormattedActivity {
  id: number;
  tipo: string;
  titulo: string;
  descripcion: string;
  categoria: string;
  monto: number | null;
  icono: string;
  fechaRelativa: string;
  created_at: string;
}

const NOMBRES_MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const ActivityService = {
  /**
   * Método desacoplado para registrar cualquier evento en el sistema:
   * Ejemplo:
   * await ActivityService.registrar({
   *   userId: 1,
   *   tipo: 'INGRESO_CREADO',
   *   titulo: 'Ingreso registrado',
   *   descripcion: 'Salario quincenal',
   *   monto: 4500,
   *   categoria: 'Salario',
   *   icono: 'payments'
   * });
   */
  async registrar(params: CreateActivityParams): Promise<ActivityRecord> {
    try {
      const icono = params.icono || resolverIconoPorTipo(params.tipo, params.categoria);
      return await ActivityModel.create({
        ...params,
        icono,
      });
    } catch (error) {
      console.error("[ActivityService] Error al registrar actividad:", error);
      throw error;
    }
  },

  async obtenerRecientes(userId: number, limit: number = 5): Promise<FormattedActivity[]> {
    const raw = await ActivityModel.getRecentByUserId(userId, limit);
    return raw.map((act) => ({
      id: act.id,
      tipo: act.tipo,
      titulo: act.titulo,
      descripcion: act.descripcion || act.titulo,
      categoria: act.categoria || "General",
      monto: act.monto !== null ? Number(act.monto) : null,
      icono: act.icono || resolverIconoPorTipo(act.tipo, act.categoria),
      fechaRelativa: calcularFechaRelativa(new Date(act.created_at)),
      created_at: act.created_at,
    }));
  },
};

function resolverIconoPorTipo(tipo: string, categoria?: string | null): string {
  const t = (tipo || "").toUpperCase();
  const c = (categoria || "").toLowerCase();

  if (c.includes("alimento") || c.includes("comida") || c.includes("restaurante")) return "restaurant";
  if (c.includes("salario") || c.includes("sueldo") || c.includes("nomina") || c.includes("nómina")) return "payments";
  if (c.includes("transporte") || c.includes("gasolina") || c.includes("vehiculo") || c.includes("auto")) return "directions_car";
  if (c.includes("supermercado") || c.includes("despensa") || c.includes("compra")) return "shopping_bag";
  if (c.includes("ahorro") || c.includes("inversion") || c.includes("inversión")) return "swap_horiz";
  if (c.includes("vivienda") || c.includes("casa") || c.includes("renta")) return "home";

  if (t.includes("INGRESO")) return "payments";
  if (t.includes("EGRESO") || t.includes("GASTO")) return "shopping_cart";
  if (t.includes("CATEGORIA")) return "category";
  if (t.includes("LOGIN") || t.includes("AUTH")) return "verified_user";

  return "receipt_long";
}

function calcularFechaRelativa(fecha: Date): string {
  const ahora = new Date();
  const diffMs = ahora.getTime() - fecha.getTime();
  const diffSeg = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSeg / 60);
  const diffHoras = Math.floor(diffMin / 60);

  if (diffSeg < 60) {
    return "Hace unos segundos";
  }
  if (diffMin < 60) {
    return `Hace ${diffMin} ${diffMin === 1 ? "minuto" : "minutos"}`;
  }
  if (diffHoras < 24) {
    const horas = String(fecha.getHours()).padStart(2, "0");
    const minutos = String(fecha.getMinutes()).padStart(2, "0");
    return `Hoy, ${horas}:${minutos}`;
  }

  const ayer = new Date(ahora);
  ayer.setDate(ahora.getDate() - 1);
  const esAyer =
    fecha.getDate() === ayer.getDate() &&
    fecha.getMonth() === ayer.getMonth() &&
    fecha.getFullYear() === ayer.getFullYear();

  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");

  if (esAyer) {
    return `Ayer, ${horas}:${minutos}`;
  }

  const dia = fecha.getDate();
  const mes = NOMBRES_MESES[fecha.getMonth()];
  return `${dia} ${mes}, ${horas}:${minutos}`;
}

