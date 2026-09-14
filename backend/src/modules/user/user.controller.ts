import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "./user.model";
import { ActivityService } from "../activity/activity.service";

const updateProfileSchema = z.object({
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(100),
  telefono: z.string().max(30).optional().nullable(),
  nit: z.string().max(20).optional().nullable(),
  direccion: z.string().max(255).optional().nullable(),
});

const updatePasswordSchema = z.object({
  passwordActual: z.string().min(1, "La contraseña actual es requerida"),
  nuevaPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

export const UserController = {
  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const profile = await UserModel.getProfileById(userId);
      if (!profile) return res.status(404).json({ message: "Usuario no encontrado" });

      res.json(profile);
    } catch (error) {
      console.error("[UserController] Error al obtener perfil:", error);
      res.status(500).json({ message: "Error interno al obtener perfil" });
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para actualizar perfil",
          errors: parsed.error.flatten(),
        });
      }

      const updated = await UserModel.updateProfile(userId, parsed.data);
      if (!updated) return res.status(404).json({ message: "Usuario no encontrado" });

      await ActivityService.registrar({
        userId,
        tipo: "PERFIL_ACTUALIZADO",
        titulo: "Perfil de usuario actualizado",
        descripcion: `Datos de ${updated.nombre} actualizados con éxito`,
        icono: "manage_accounts",
      });

      res.json(updated);
    } catch (error) {
      console.error("[UserController] Error al actualizar perfil:", error);
      res.status(500).json({ message: "Error interno al actualizar perfil" });
    }
  },

  async updatePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const parsed = updatePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Datos inválidos para cambio de contraseña",
          errors: parsed.error.flatten(),
        });
      }

      const currentHash = await UserModel.getPasswordHash(userId);
      if (!currentHash) return res.status(404).json({ message: "Usuario no encontrado" });

      const matches = await bcrypt.compare(parsed.data.passwordActual, currentHash);
      if (!matches) {
        return res.status(400).json({ message: "La contraseña actual es incorrecta" });
      }

      const newHash = await bcrypt.hash(parsed.data.nuevaPassword, 10);
      await UserModel.updatePassword(userId, newHash);

      await ActivityService.registrar({
        userId,
        tipo: "PASSWORD_CAMBIADO",
        titulo: "Contraseña modificada",
        descripcion: "Se actualizó la contraseña de seguridad de la cuenta",
        icono: "lock_reset",
      });

      res.json({ success: true, message: "Contraseña actualizada exitosamente" });
    } catch (error) {
      console.error("[UserController] Error al cambiar contraseña:", error);
      res.status(500).json({ message: "Error interno al cambiar contraseña" });
    }
  },
};

