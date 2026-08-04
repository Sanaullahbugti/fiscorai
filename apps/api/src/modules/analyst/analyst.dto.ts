import { z } from "zod";

/**
 * Body sent by the AI SDK `useChat` transport. `messages` are UIMessages, whose
 * text lives in `parts` rather than a flat `content` string.
 */
const TITLE_MAX = 120;
const CONTENT_MAX = 20_000;

export const createConversationSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
  mode: z.enum(["vat-data", "ecommerce-strategy"]).optional().default("vat-data"),
});

export const renameConversationSchema = z.object({
  title: z.string().trim().min(1).max(TITLE_MAX),
});

export const addMessagesSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(CONTENT_MAX),
        metadataJson: z.string().max(CONTENT_MAX).nullish(),
      }),
    )
    .min(1)
    .max(20),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type RenameConversationInput = z.infer<typeof renameConversationSchema>;
export type AddMessagesInput = z.infer<typeof addMessagesSchema>;

export const analystModeSchema = z.enum(["vat-data", "ecommerce-strategy"]);
export type AnalystMode = z.infer<typeof analystModeSchema>;

/**
 * Which uploaded periods an answer may draw on. Comparison scopes arrive in a
 * later phase; "all" and a single period cover Phase 1.
 */
export const analystScopeSchema = z.object({
  type: z.enum(["all", "monthly", "quarterly"]).default("all"),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  month: z.string().trim().max(2).optional(),
  quarter: z.string().trim().max(4).optional(),
});
export type AnalystScope = z.infer<typeof analystScopeSchema>;

export const streamAnalystSchema = z.object({
  language: z.string().trim().min(2).max(16).optional().default("en"),
  mode: analystModeSchema.optional().default("vat-data"),
  scope: analystScopeSchema.optional().default({ type: "all" }),
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
