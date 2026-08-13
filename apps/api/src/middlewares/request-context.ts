import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export type RequestContext = {
  id: string;
  startedAt: number;
};

export type ContextRequest = Request & {
  requestContext?: RequestContext;
};

export function requestContextMiddleware(
  req: ContextRequest,
  res: Response,
  next: NextFunction,
) {
  const context = {
    id: randomUUID(),
    startedAt: Date.now(),
  };
  req.requestContext = context;
  res.setHeader("X-Request-Id", context.id);
  next();
}

export function requestId(req: Request): string {
  return (req as ContextRequest).requestContext?.id || "unknown";
}

export function requestDurationMs(req: Request): number {
  const startedAt = (req as ContextRequest).requestContext?.startedAt;
  return startedAt == null ? 0 : Math.max(0, Date.now() - startedAt);
}
