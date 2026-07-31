import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { subscriptionsService } from "./subscriptions.service.js";

export class SubscriptionsController {
  current = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await subscriptionsService.current(req.user!.id);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  unsubscribe = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const message = await subscriptionsService.unsubscribe(req.user!.id);
      res.json(ok(message));
    } catch (e) {
      next(e);
    }
  };

  activate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const sub = await subscriptionsService.activateFree(req.user!.id, req.body.plan);
      res.json(ok(sub));
    } catch (e) {
      next(e);
    }
  };
}

export const subscriptionsController = new SubscriptionsController();
