import { Router } from "express";
import * as emailController from "./email.controller";
import validateSendEmail from "./email.validation.middleware";
import { authMiddleware } from "../../common/middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.post("/", validateSendEmail, emailController.sendEmail); // POST /emails

export default router;
