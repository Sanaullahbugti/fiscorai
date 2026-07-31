import type { NextFunction, Request, Response } from "express";
import { verifyAccess } from "../shared/jwt.js";
import { AppError } from "../shared/errors.js";

export type AuthRequest = Request & { user?: { id: string; email: string } };

export function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new AppError("Unauthorized", 401));
  }
  try {
    const payload = verifyAccess(header.slice(7));
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new AppError("Unauthorized", 401));
  }
}
