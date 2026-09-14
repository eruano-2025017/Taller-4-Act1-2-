/**
 * =========================================================================================
 * CONFIGURACIÓN CENTRALIZADA DE TIEMPOS DE SESIÓN E INACTIVIDAD (KINAL FINANCE)
 * =========================================================================================
 * 
 * Este es el ÚNICO archivo donde debes configurar los tiempos de inactividad y advertencia.
 * Cualquier cambio realizado aquí se propaga automáticamente por toda la aplicación.
 */

export const SESSION_CONFIG = {
  /**
   * 1. TIEMPO DE INACTIVIDAD ANTES DE EXPIRAR
   * ---------------------------------------------------------------------------------------
   * Unidad: MINUTOS (números enteros o decimales como 0.5 para 30 segundos de prueba).
   * 
   * Define cuántos minutos seguidos puede permanecer el usuario sin realizar ninguna acción
   * (mover el ratón, teclear, hacer clic, scroll o hacer peticiones HTTP a la API)
   * antes de que el sistema cierre su sesión automáticamente.
   * 
   * Valores sugeridos: 1, 2, 5, 10, 15, 30, 60
   */
  INACTIVITY_TIMEOUT_MINUTES: 15,

  /**
   * 2. TIEMPO DE ANTICIPACIÓN PARA MOSTRAR EL MENSAJE
   * ---------------------------------------------------------------------------------------
   * Unidad: MINUTOS (números enteros o decimales como 0.25 para 15 segundos de prueba).
   * 
   * Define cuántos minutos ANTES de que expire la sesión aparecerá la ventana modal de
   * advertencia ("¿Sigue ahí?") con la cuenta regresiva en pantalla.
   * 
   * REGLA ESTRICTA DE CONSISTENCIA:
   * Debe ser estrictamente MENOR que INACTIVITY_TIMEOUT_MINUTES.
   * 
   * Ejemplos de cálculo automático:
   * - Inactividad: 15 min | Advertencia: 2 min -> Modal aparece al min 13:00 (cuenta 2:00 a 0:00)
   * - Inactividad: 30 min | Advertencia: 5 min -> Modal aparece al min 25:00 (cuenta 5:00 a 0:00)
   * - Inactividad: 10 min | Advertencia: 2 min -> Modal aparece al min 08:00 (cuenta 2:00 a 0:00)
   * - Inactividad:  2 min | Advertencia: 1 min -> Modal aparece al min 01:00 (cuenta 1:00 a 0:00)
   */
  WARNING_TIME_MINUTES: 2,
};

/**
 * Estructura de duraciones procesadas y validadas matemáticamente en milisegundos.
 */
export interface SessionDurations {
  inactivityMinutes: number;
  warningMinutes: number;
  idleTimeoutMs: number;
  warningTimeMs: number;
  warningThresholdMs: number;
  renewThresholdMs: number;
  activityThrottleMs: number;
}

/**
 * Convierte automáticamente los minutos a milisegundos y valida que
 * WARNING_TIME_MINUTES sea menor que INACTIVITY_TIMEOUT_MINUTES.
 */
export function getSessionDurations(): SessionDurations {
  let inactivityMin = Number(SESSION_CONFIG.INACTIVITY_TIMEOUT_MINUTES);
  let warningMin = Number(SESSION_CONFIG.WARNING_TIME_MINUTES);

  // Fallback seguro contra entradas inválidas
  if (isNaN(inactivityMin) || inactivityMin <= 0) {
    console.warn(`[SessionConfig] INACTIVITY_TIMEOUT_MINUTES (${inactivityMin}) inválido. Aplicando fallback de 15 minutos.`);
    inactivityMin = 15;
  }
  if (isNaN(warningMin) || warningMin <= 0) {
    console.warn(`[SessionConfig] WARNING_TIME_MINUTES (${warningMin}) inválido. Aplicando fallback de 2 minutos.`);
    warningMin = 2;
  }

  // Validación de la regla obligatoria: la advertencia siempre debe ser menor que la inactividad total
  if (warningMin >= inactivityMin) {
    console.error(
      `[SessionConfig] ERROR DE CONFIGURACIÓN: WARNING_TIME_MINUTES (${warningMin} min) no puede ser mayor o igual a INACTIVITY_TIMEOUT_MINUTES (${inactivityMin} min). Ajustando advertencia al 30% del tiempo total.`
    );
    warningMin = Math.max(0.2, Math.round((inactivityMin * 0.3) * 100) / 100);
  }

  const idleTimeoutMs = Math.round(inactivityMin * 60 * 1000);
  const warningTimeMs = Math.round(warningMin * 60 * 1000);
  const warningThresholdMs = idleTimeoutMs - warningTimeMs;

  return {
    inactivityMinutes: inactivityMin,
    warningMinutes: warningMin,
    idleTimeoutMs,
    warningTimeMs,
    warningThresholdMs,
    // Renovar JWT con el backend si el token restante es menor al tiempo de advertencia
    renewThresholdMs: Math.min(warningTimeMs, 5 * 60 * 1000),
    // Throttling de eventos del navegador (15 segundos) para no saturar CPU con mousemove
    activityThrottleMs: 15 * 1000,
  };
}
