import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./modules/auth/auth.router";
import { expenseRouter } from "./modules/expense/router/expense.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";
import { incomeRouter } from "./modules/income/income.router";

dotenv.config();

export const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:4200" }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/expenses", expenseRouter);
app.use("/api/incomes", incomeRouter);
app.use("/api/dashboard", dashboardRouter);

