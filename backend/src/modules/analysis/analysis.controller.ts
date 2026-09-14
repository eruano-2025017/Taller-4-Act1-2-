import { Request, Response } from "express";
import { AnalysisService } from "./analysis.service";

export const AnalysisController = {
  async getAnalysis(req: Request, res: Response) {
    try {
      const userId = req.user?.sub;
      if (!userId) return res.status(401).json({ message: "No autorizado" });

      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string, 10) : undefined;
      const tipo = req.query.tipo as "ingreso" | "egreso" | "todos" | undefined;
      const categoria = req.query.categoria as string | undefined;

      const data = await AnalysisService.getAnalysis(userId, {
        year: year && !isNaN(year) ? year : undefined,
        month: month && !isNaN(month) ? month : undefined,
        tipo,
        categoria,
      });

      res.json(data);
    } catch (error) {
      console.error("[AnalysisController] Error al obtener análisis:", error);
      res.status(500).json({ message: "Error interno al calcular análisis financiero" });
    }
  },
};

