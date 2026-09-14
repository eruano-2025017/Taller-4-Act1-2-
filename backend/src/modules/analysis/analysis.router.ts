import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { AnalysisController } from "./analysis.controller";

export const analysisRouter = Router();

analysisRouter.use(authMiddleware);

analysisRouter.get("/", AnalysisController.getAnalysis);

