import { Router } from "express";
import { paymentsController } from "./payments.controller.js";

const router = Router();

router.post("/", paymentsController.webhook);

export default router;
