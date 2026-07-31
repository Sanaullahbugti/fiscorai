import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../shared/errors.js";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message || "Invalid body", 400));
    }
    req.body = parsed.data;
    next();
  };
}
