import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { askAnalystSchema, streamAnalystSchema } from "./analyst.dto.js";
import { analystController } from "./analyst.controller.js";

const router = Router();

router.get("/quota", authMiddleware, analystController.quota);
router.post("/ask", authMiddleware, validateBody(askAnalystSchema), analystController.ask);
router.post("/stream", authMiddleware, validateBody(streamAnalystSchema), analystController.stream);

export default router;
