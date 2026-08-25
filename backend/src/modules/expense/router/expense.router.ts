import { Router } from "express";
import { verificarToken } from "../../../middlewares/auth.middleware";

// Modulo de gastos: se implementara en el siguiente paso del SDLC.
// Por ahora solo queda protegido con JWT para validar la integracion.
export const expenseRouter = Router();

expenseRouter.get("/", verificarToken, (req, res) => {
  res.json({ message: "Modulo de gastos listo para implementar", user: req.user });
});
