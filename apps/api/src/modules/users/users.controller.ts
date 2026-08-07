import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { usersService } from "./users.service.js";

export class UsersController {
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.register(req.body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  profile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await usersService.profile(req.user!.id);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  update = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      // The path param is ignored on purpose — the id to update always comes
      // from the verified JWT, never from the client, or any caller could
      // edit another user's profile by passing a different id in the URL.
      const data = await usersService.update(req.user!.id, req.body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  updateAmazon = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const amazonId = String(req.params.amazonId);
      const data = await usersService.updateAmazon(req.user!.id, amazonId);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };
}

export const usersController = new UsersController();
