import type { Response, NextFunction } from "express";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import type { AuthRequest } from "../../middlewares/auth.js";
import { ok } from "../../shared/response.js";
import { analystService } from "./analyst.service.js";
import type { StreamAnalystInput } from "./analyst.dto.js";

export class AnalystController {
  ask = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const data = await analystService.ask(req.user!.id, req.user!.email, req.body);
      res.json(ok(data));
    } catch (e) {
      next(e);
    }
  };

  quota = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      res.json(ok(await analystService.quota(req.user!.id)));
    } catch (e) {
      next(e);
    }
  };

  stream = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { messages, language } = req.body as StreamAnalystInput;
    try {
      const { model, system } = await analystService.prepareStream(
        req.user!.id,
        req.user!.email,
        language,
      );

      const result = streamText({
        model,
        system,
        messages: await convertToModelMessages(messages as UIMessage[]),
        temperature: 0.4,
        maxOutputTokens: 768,
      });

      // Errors raised after headers are sent can't become a JSON error response,
      // so surface them as stream content the client can render inline.
      result.pipeUIMessageStreamToResponse(res, {
        onError: (error) => {
          console.error("[analyst] stream error:", error);
          return "The AI service dropped mid-answer. Please try again, or check the Review tab for exact figures.";
        },
      });
    } catch (e) {
      // Pre-stream failures (403 / 404 / 503) still have an untouched response.
      next(e);
    }
  };
}

export const analystController = new AnalystController();
