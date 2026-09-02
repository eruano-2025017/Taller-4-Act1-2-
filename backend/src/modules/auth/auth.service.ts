import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthModel } from "./auth.model";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "10m";

export class CredencialesInvalidasError extends Error {}

export const AuthService = {
  async login(email: string, password: string) {
    const user = await AuthModel.findByEmail(email);
    if (!user) throw new CredencialesInvalidasError("Credenciales invalidas");

    const passwordValida = await bcrypt.compare(password, user.password_hash);
    if (!passwordValida) throw new CredencialesInvalidasError("Credenciales invalidas");

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    };
  },

  async renovarToken(userId: number) {
    const user = await AuthModel.findById(userId);
    if (!user) {
      throw new CredencialesInvalidasError("Usuario no encontrado o inactivo");
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    };
  },
};
