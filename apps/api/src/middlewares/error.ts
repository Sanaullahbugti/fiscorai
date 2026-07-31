import type { NextFunction, Request, Response } from "express";
import { AppError } from "../shared/errors.js";
import { fail } from "../shared/response.js";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(fail(err.message, err.statusCode, err.data));
  }
  console.error(err);
  return res.status(500).json(fail("Internal server error", 500));
}
