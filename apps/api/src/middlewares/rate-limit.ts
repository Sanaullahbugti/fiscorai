import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request } from "express";
import type { AuthRequest } from "./auth.js";

/** Authenticated routes key by user id so one seller can't exhaust another's quota; falls back to IP pre-auth. */
function keyByUser(req: Request) {
  const userId = (req as AuthRequest).user?.id;
  return userId || ipKeyGenerator(req.ip || "anon");
}

/** Unauthenticated auth endpoints (login, password reset) — only an IP to key on. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many attempts. Try again in a few minutes." },
});

/** Analyst chat calls a paid Gemini model per request. */
export const analystLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { success: false, message: "Too many questions at once. Wait a moment and try again." },
});

/** CSV upload triggers CPU-heavy processing of up to a 100MB file. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { success: false, message: "Too many uploads at once. Wait a moment and try again." },
});

/** Checkout-session creation (Lemon Squeezy). */
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUser,
  message: { success: false, message: "Too many checkout attempts. Wait a moment and try again." },
});

/** Public, unauthenticated contact form — an open spam/abuse target without one. */
export const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many messages sent. Please try again later." },
});
