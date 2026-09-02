import { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

export const DashboardController = {
  async getDashboard(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Usuario no autenticado" });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const data = await DashboardService.getDashboardData(userId, year);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[DashboardController] Error al obtener datos del dashboard:", error);
      return res.status(500).json({ message: "Error interno al procesar los datos financieros" });
    }
  },

  async getYearChart(req: Request, res: Response) {
    const userId = req.user?.sub;
    if (!userId) return res.status(401).json({ message: 'Usuario no autenticado' });
    const year = parseInt(req.query.year as string) || new Date().getFullYear();
    const data = await DashboardService.getYearChart(userId, year);
    return res.status(200).json(data);
  }
};

