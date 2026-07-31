import { Router } from "express";
import { validateBody } from "../../middlewares/validate.js";
import { authController } from "./auth.controller.js";
import { changePasswordSchema, loginSchema } from "./auth.dto.js";

const router = Router();

router.post("/login", validateBody(loginSchema), authController.login);
router.get("/refresh", authController.refresh);
router.post("/refresh", authController.refresh);
router.put("/change-password", validateBody(changePasswordSchema), authController.changePassword);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

export default router;
