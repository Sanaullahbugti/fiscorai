import { Router } from "express";
import { validateBody } from "../../middlewares/validate.js";
import { contactController } from "./contact.controller.js";
import { createContactSchema } from "./contact.dto.js";

const router = Router();

router.post("/", validateBody(createContactSchema), contactController.create);

export default router;
