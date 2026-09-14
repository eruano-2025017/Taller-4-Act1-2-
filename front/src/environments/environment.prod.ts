import { getSessionDurations, SESSION_CONFIG } from "../app/config/session.config";

export const environment = {
  production: true,
  apiUrl: "https://TU_DOMINIO_PRODUCCION/api",
  sessionConfig: SESSION_CONFIG,
  session: getSessionDurations(),
};

