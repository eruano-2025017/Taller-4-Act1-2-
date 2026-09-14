import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { InvoiceController } from "./invoice.controller";

export const invoiceRouter = Router();

invoiceRouter.use(authMiddleware);

invoiceRouter.get("/next-number", InvoiceController.getNextNumber);
invoiceRouter.get("/", InvoiceController.getAll);
invoiceRouter.get("/:id", InvoiceController.getById);
invoiceRouter.post("/", InvoiceController.create);

