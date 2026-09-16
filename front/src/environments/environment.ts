import { getSessionDurations, SESSION_CONFIG } from "../app/config/session.config";

export const environment = {
  production: false,
  apiUrl: "http://localhost:3000/api",
  googleClientId: "324470682502-tsiq9q0ofv5ioaisdasglimislu96ul6.apps.googleusercontent.com",
  sessionConfig: SESSION_CONFIG,
  session: getSessionDurations(),
};

