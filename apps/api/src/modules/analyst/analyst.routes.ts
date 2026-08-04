import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { analystLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";
import {
  streamAnalystSchema,
  createConversationSchema,
  renameConversationSchema,
  addMessagesSchema,
} from "./analyst.dto.js";
import { analystController } from "./analyst.controller.js";

const router = Router();

router.get("/quota", authMiddleware, analystController.quota);
// Calls the paid Gemini model per request, on top of the daily free-tier
// counter — this caps request bursts regardless of plan.
router.post(
  "/stream",
  authMiddleware,
  analystLimiter,
  validateBody(streamAnalystSchema),
  analystController.stream,
);

// Conversation history. Ownership is enforced in the repository, which filters
// every query by the JWT subject rather than trusting the id in the path.
router.get("/conversations", authMiddleware, analystController.listConversations);
router.post(
  "/conversations",
  authMiddleware,
  validateBody(createConversationSchema),
  analystController.createConversation,
);
router.get("/conversations/:id", authMiddleware, analystController.getConversation);
router.patch(
  "/conversations/:id",
  authMiddleware,
  validateBody(renameConversationSchema),
  analystController.renameConversation,
);
router.delete("/conversations/:id", authMiddleware, analystController.deleteConversation);
router.post(
  "/conversations/:id/messages",
  authMiddleware,
  validateBody(addMessagesSchema),
  analystController.addMessages,
);

export default router;
