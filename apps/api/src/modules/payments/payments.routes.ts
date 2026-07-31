import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { paymentsController } from "./payments.controller.js";
import { checkoutSessionSchema, confirmSessionSchema } from "./payments.dto.js";

const router = Router();

router.post(
  "/create-checkout-session",
  authMiddleware,
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
router.get("/cards", authMiddleware, paymentsController.listCards);
router.post("/cards/setup-intent", authMiddleware, paymentsController.createSetupIntent);
router.delete("/cards/:id", authMiddleware, paymentsController.deleteCard);

export default router;
