import { Router } from "express";
import { contactLimiter } from "../../middlewares/rate-limit.js";
import { validateBody } from "../../middlewares/validate.js";
import { contactController } from "./contact.controller.js";
import { createContactSchema } from "./contact.dto.js";

const router = Router();

router.post("/", contactLimiter, validateBody(createContactSchema), contactController.create);

export default router;
