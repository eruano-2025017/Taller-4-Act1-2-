import { Router } from "express";
import { CategoryController } from "./category.controller";
import { verificarToken } from "../../middlewares/auth.middleware";

export const categoryRouter = Router();

categoryRouter.use(verificarToken);

categoryRouter.get("/", CategoryController.getCategories);
categoryRouter.post("/", CategoryController.createCategory);
categoryRouter.put("/:id", CategoryController.updateCategory);
categoryRouter.delete("/:id", CategoryController.deleteCategory);

