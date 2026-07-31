import type { Request, Response, NextFunction } from "express";
import { ok } from "../../shared/response.js";
import { authService } from "./auth.service.js";

export class AuthController {
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.login(req.body.email, req.body.password, {
        businessUser: req.body.businessUser,
      });
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = String(req.query.refreshToken || req.body.refreshToken || "");
      const data = authService.refresh(token);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(req.body.email, req.body.password || req.body.newPassword);
      res.json(ok("Password changed successfully"));
    } catch (e) {
      next(e);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.forgotPassword(String(req.query.email || req.body.email));
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.resetPassword(
        String(req.query.token || req.body.token),
        String(req.query.newPassword || req.body.newPassword),
      );
      res.json(ok("Password reset successfully"));
    } catch (e) {
      next(e);
    }
  };
}

export const authController = new AuthController();
