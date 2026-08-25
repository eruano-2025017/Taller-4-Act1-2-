import { Request, Response } from "express";
import { z } from "zod";
import { AuthService, CredencialesInvalidasError } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const AuthController = {
  async login(req: Request, res: Response) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Datos invalidos", errors: parsed.error.flatten() });
    }

    try {
      const { email, password } = parsed.data;
      const resultado = await AuthService.login(email, password);
      return res.status(200).json(resultado);
    } catch (err) {
      if (err instanceof CredencialesInvalidasError) {
        return res.status(401).json({ message: "Correo o contrasena incorrectos" });
      }
      console.error(err);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  },
};
