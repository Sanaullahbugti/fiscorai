import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().default(9292),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("2h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  STORAGE_ROOT: z.string().default("../../storage"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  PAYMENT_SUCCESS_URL: z.string().url().default("http://localhost:5173/billing?checkout=success"),
  PAYMENT_CANCEL_URL: z.string().url().default("http://localhost:5173/billing?checkout=cancel"),
  GEMINI_API_KEY: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().min(1).optional(),
  ),
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
});

export const env = schema.parse(process.env);
