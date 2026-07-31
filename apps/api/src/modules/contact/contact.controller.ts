import type { Request, Response, NextFunction } from "express";
import { ok } from "../../shared/response.js";
import { contactService } from "./contact.service.js";

export class ContactController {
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const message = await contactService.create(req.body);
      res.json(ok(message));
    } catch (e) {
      next(e);
    }
  };
}

export const contactController = new ContactController();
