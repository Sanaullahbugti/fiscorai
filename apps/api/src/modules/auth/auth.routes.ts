import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { authLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";
import { authController } from "./auth.controller.js";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.dto.js";

const router = Router();

// Every route here is either unauthenticated (credential-guessing target) or
// touches password/account state, so all of them share the same IP limiter.
router.use(authLimiter);

router.post("/login", validateBody(loginSchema), authController.login);
// Body only — a GET+querystring variant used to exist, but a refresh token is
// a bearer credential and doesn't belong in a URL (access logs, proxies).
router.post("/refresh", authController.refresh);
// Requires the caller's own JWT and their current password — previously took
// a bare email + new password with no auth, letting anyone reset any account.
router.put(
  "/change-password",
  authMiddleware,
  validateBody(changePasswordSchema),
  authController.changePassword,
);
router.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  authController.forgotPassword,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  authController.resetPassword,
);
router.post("/verify-email", validateBody(verifyEmailSchema), authController.verifyEmail);
router.post(
  "/resend-verification",
  validateBody(resendVerificationSchema),
  authController.resendVerification,
);

export default router;
