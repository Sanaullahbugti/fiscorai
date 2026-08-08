import { Router } from "express";
import { prisma } from "../../shared/prisma.js";
import { AppError } from "../../shared/errors.js";
import { ok } from "../../shared/response.js";

const router = Router();

/** E2E-only helper — never mount in production. */
router.get("/verification-token", async (req, res, next) => {
  try {
    const email = String(req.query.email || "").toLowerCase();
    if (!email) throw new AppError("email query required", 400);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError("User not found", 404);
    const token = await prisma.emailVerificationToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!token?.token) throw new AppError("Verification token not found", 404);
    res.json(ok({ token: token.token }));
  } catch (e) {
    next(e);
  }
});

export default router;
