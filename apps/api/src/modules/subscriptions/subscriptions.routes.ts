import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { subscriptionsController } from "./subscriptions.controller.js";
import { activatePlanSchema } from "./subscriptions.dto.js";

const router = Router();

router.get("/userSubscription", authMiddleware, subscriptionsController.current);
router.delete("/unSubscribe", authMiddleware, subscriptionsController.unsubscribe);
router.post(
  "/activate",
  authMiddleware,
  validateBody(activatePlanSchema),
  subscriptionsController.activate,
);

export default router;
