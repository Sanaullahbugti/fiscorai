import type { Response, NextFunction } from "express";
import type { Request } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { paymentsService } from "./payments.service.js";

export class PaymentsController {
  createCheckoutSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await paymentsService.createCheckoutSession(req.user!.id, req.body.plan);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  confirmSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await paymentsService.confirmCheckoutSession(
        req.user!.id,
        typeof req.body.sessionId === "string" ? req.body.sessionId : undefined,
      );
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  list = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const rows = await paymentsService.listPayments(req.user!.id);
      res.json(ok(rows));
    } catch (e) {
      next(e);
    }
  };

  portal = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await paymentsService.getPortalUrl(req.user!.id);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  webhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const signature = req.headers["x-signature"];
      const data = await paymentsService.handleWebhook(
        req.body as Buffer,
        typeof signature === "string" ? signature : undefined,
      );
      res.json(data);
    } catch (e) {
      next(e);
    }
  };
}

export const paymentsController = new PaymentsController();
