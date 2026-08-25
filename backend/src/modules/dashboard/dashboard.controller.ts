import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

export const DashboardController = {
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const data = await DashboardService.getDashboardData(userId);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[DashboardController] Error al obtener datos del dashboard:", error);
      return res.status(500).json({ message: "Error interno al procesar los datos financieros" });
    }
  },
};

