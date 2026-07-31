import type { Response, NextFunction } from "express";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { usersService } from "./users.service.js";

export class UsersController {
  register = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await usersService.register(req.body);
      res.json(ok(undefined));
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
      const id = String(req.params.id);
      const data = await usersService.update(id, req.body);
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
