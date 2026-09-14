import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { authRouter } from "./modules/auth/auth.router";
import { expenseRouter } from "./modules/expense/router/expense.router";
import { dashboardRouter } from "./modules/dashboard/dashboard.router";
import { incomeRouter } from "./modules/income/income.router";
import { categoryRouter } from "./modules/category/category.router";
import { notificationRouter } from "./modules/activity/notification.router";
import { userRouter } from "./modules/user/user.router";
import { analysisRouter } from "./modules/analysis/analysis.router";
import { invoiceRouter } from "./modules/invoice/invoice.router";

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
app.use("/api/categories", categoryRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/user", userRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/invoices", invoiceRouter);

