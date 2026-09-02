import { Router } from "express";
import { AuthController } from "./auth.controller";
import { verificarToken } from "../../middlewares/auth.middleware";

export const authRouter = Router();

authRouter.post("/login", AuthController.login);
authRouter.post("/refresh", verificarToken, AuthController.renovarToken);
authRouter.post("/renew", verificarToken, AuthController.renovarToken);
