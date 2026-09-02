import { Router } from "express";
import { DashboardController } from "./dashboard.controller";
import { verificarToken } from "../../middlewares/auth.middleware";

export const dashboardRouter = Router();

dashboardRouter.get("/chart", verificarToken, DashboardController.getYearChart);
dashboardRouter.get("/", verificarToken, DashboardController.getDashboard);

