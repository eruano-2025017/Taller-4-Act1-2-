import { getSessionDurations, SESSION_CONFIG } from "../app/config/session.config";

export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api",
  sessionConfig: SESSION_CONFIG,
  session: getSessionDurations(),
};

