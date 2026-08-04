import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { checkoutLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";
import { paymentsController } from "./payments.controller.js";
import { checkoutSessionSchema, confirmSessionSchema } from "./payments.dto.js";

const router = Router();

router.post(
  "/create-checkout-session",
  authMiddleware,
  checkoutLimiter,
  validateBody(checkoutSessionSchema),
  paymentsController.createCheckoutSession,
);
router.post(
  "/confirm-session",
  authMiddleware,
  validateBody(confirmSessionSchema),
  paymentsController.confirmSession,
);
router.get("/", authMiddleware, paymentsController.list);
router.get("/portal", authMiddleware, paymentsController.portal);

export default router;
