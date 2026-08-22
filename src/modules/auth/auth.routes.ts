import { Router } from "express";
import * as authController from "./auth.controller";
import { authLimiter } from "../../common/middlewares/rateLimit.middleware";

const router = Router();
router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);

export default router;
