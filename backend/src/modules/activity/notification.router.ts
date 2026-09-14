import { Router, Request, Response } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { ActivityService } from "./activity.service";

export const notificationRouter = Router();

notificationRouter.use(authMiddleware);

notificationRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const onlyUnread = req.query.unread === "true";

    const [notificaciones, noLeidas] = await Promise.all([
      ActivityService.obtenerNotificaciones(userId, limit, onlyUnread),
      ActivityService.contarNoLeidas(userId),
    ]);

    res.json({
      notificaciones,
      noLeidas,
      total: notificaciones.length,
    });
  } catch (error) {
    console.error("[NotificationRouter] Error al obtener notificaciones:", error);
    res.status(500).json({ message: "Error interno al obtener notificaciones" });
  }
});

notificationRouter.patch("/read-all", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    await ActivityService.marcarTodasLeidas(userId);
    res.json({ success: true, message: "Todas las notificaciones han sido marcadas como leídas" });
  } catch (error) {
    console.error("[NotificationRouter] Error al marcar todas como leídas:", error);
    res.status(500).json({ message: "Error interno al actualizar notificaciones" });
  }
});

notificationRouter.patch("/:id/read", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: "No autorizado" });

    const id = Number(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "ID inválido" });

    const ok = await ActivityService.marcarLeida(userId, id);
    if (!ok) return res.status(404).json({ message: "Notificación no encontrada" });

    res.json({ success: true });
  } catch (error) {
    console.error("[NotificationRouter] Error al marcar como leída:", error);
    res.status(500).json({ message: "Error interno al actualizar notificación" });
  }
});

