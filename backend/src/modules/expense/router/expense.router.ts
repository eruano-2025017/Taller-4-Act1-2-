import { Router } from "express";
import { ExpenseController } from "../expense.controller";
import { verificarToken } from "../../../middlewares/auth.middleware";

export const expenseRouter = Router();

expenseRouter.use(verificarToken);

expenseRouter.get("/", ExpenseController.getExpenses);
expenseRouter.post("/", ExpenseController.createExpense);
expenseRouter.put("/:id", ExpenseController.updateExpense);
expenseRouter.delete("/:id", ExpenseController.deleteExpense);

