import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { AuthModel } from "./auth.model";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";

export class CredencialesInvalidasError extends Error {}

function decodeGoogleJwt(credential: string): { email: string; name: string; picture?: string; sub: string } {
  const parts = credential.split(".");
  if (parts.length !== 3) {
    throw new Error("Token de Google malformado");
  }
  const payloadBase64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const jsonPayload = Buffer.from(payloadBase64, "base64").toString("utf-8");
  return JSON.parse(jsonPayload);
}

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
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol, provider: "local" },
    };
  },

  async loginGoogle(credential: string) {
    let payloadGoogle: any;
    try {
      payloadGoogle = decodeGoogleJwt(credential);
    } catch {
      throw new CredencialesInvalidasError("Token de Google inválido");
    }

    if (!payloadGoogle?.email) {
      throw new CredencialesInvalidasError("El token de Google no contiene correo electrónico");
    }

    const email = payloadGoogle.email.toLowerCase().trim();
    const nombre = payloadGoogle.name || email.split("@")[0];
    const picture = payloadGoogle.picture || null;

    let user = await AuthModel.findByEmail(email);
    if (!user) {
      user = await AuthModel.createGoogleUser(nombre, email);
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };
    const token = jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    } as SignOptions);

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        avatarUrl: picture,
        picture: picture,
        provider: "google" as const,
      },
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
