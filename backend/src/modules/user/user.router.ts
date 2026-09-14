import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { UserController } from "./user.controller";

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get("/profile", UserController.getProfile);
userRouter.put("/profile", UserController.updateProfile);
userRouter.put("/password", UserController.updatePassword);

