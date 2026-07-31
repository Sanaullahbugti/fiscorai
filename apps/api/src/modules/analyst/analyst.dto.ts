import { z } from "zod";

export const askAnalystSchema = z.object({
  question: z.string().trim().min(1).max(2000),
  language: z.string().trim().min(2).max(16).optional().default("en"),
});

export type AskAnalystInput = z.infer<typeof askAnalystSchema>;

/**
 * Body sent by the AI SDK `useChat` transport. `messages` are UIMessages, whose
 * text lives in `parts` rather than a flat `content` string.
 */
export const streamAnalystSchema = z.object({
  language: z.string().trim().min(2).max(16).optional().default("en"),
  messages: z
    .array(
      z.object({
        id: z.string().optional(),
        role: z.enum(["system", "user", "assistant"]),
        parts: z.array(z.object({ type: z.string() }).passthrough()).optional(),
      }).passthrough(),
    )
    .min(1)
    .max(60),
});

export type StreamAnalystInput = z.infer<typeof streamAnalystSchema>;
