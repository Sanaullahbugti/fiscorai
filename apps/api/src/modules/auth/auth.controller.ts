import type { Request, Response, NextFunction } from "express";
import { ok } from "../../shared/response.js";
import { authService } from "./auth.service.js";
import type { AuthRequest } from "../../middlewares/auth.js";

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
      const token = String(req.body.refreshToken || "");
      const data = authService.refresh(token);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      res.json(ok("Password changed successfully"));
    } catch (e) {
      next(e);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.forgotPassword(req.body.email);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Body only — the reset token is a bearer credential and previously
      // could travel as a query string, landing in access logs.
      await authService.resetPassword(req.body.token, req.body.newPassword);
      res.json(ok("Password reset successfully"));
    } catch (e) {
      next(e);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.verifyEmail(req.body.token);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = await authService.resendVerification(req.body.email);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };
}

export const authController = new AuthController();
