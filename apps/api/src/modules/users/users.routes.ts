import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.js";
import { validateBody } from "../../middlewares/validate.js";
import { usersController } from "./users.controller.js";
import { registerSchema, updateUserSchema } from "./users.dto.js";

const router = Router();

router.post("/", validateBody(registerSchema), usersController.register);
router.get("/profile", authMiddleware, usersController.profile);
router.put("/:id", authMiddleware, validateBody(updateUserSchema), usersController.update);
router.put("/update/amazon/:amazonId", authMiddleware, usersController.updateAmazon);

export default router;
