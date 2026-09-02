import { Router } from "express";
import { IncomeController } from "./income.controller";
import { verificarToken } from "../../middlewares/auth.middleware";

export const incomeRouter = Router();

incomeRouter.use(verificarToken);

incomeRouter.get("/", IncomeController.getIncomes);
incomeRouter.post("/", IncomeController.createIncome);
incomeRouter.put("/:id", IncomeController.updateIncome);
incomeRouter.delete("/:id", IncomeController.deleteIncome);

