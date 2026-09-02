export const environment = {
  production: true,
  apiUrl: "https://TU_DOMINIO_PRODUCCION/api",
  session: {
    idleTimeoutMs: 15 * 60 * 1000,    // 15 minutos de inactividad máxima
    warningTimeMs: 2 * 60 * 1000,     // 2 minutos antes para mostrar modal de advertencia
    renewThresholdMs: 5 * 60 * 1000,  // Renovar token si faltan 5 minutos o menos para expirar
    activityThrottleMs: 15 * 1000,    // Throttling de eventos de usuario (15 segundos)
  },
};
