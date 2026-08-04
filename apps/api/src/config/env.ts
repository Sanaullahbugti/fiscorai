import "dotenv/config";
import { z } from "zod";

/** `.env` often sets `KEY=""`; treat blank as unset so optional secrets don't crash boot. */
const optionalNonEmpty = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().min(1).optional(),
);

const schema = z.object({
  PORT: z.coerce.number().default(9292),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(8),
  JWT_REFRESH_SECRET: z.string().min(8),
  JWT_EXPIRES_IN: z.string().default("2h"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  STORAGE_ROOT: z.string().default("../../storage"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  // Lemon Squeezy (Merchant of Record). Optional so Free-tier / local API can
  // boot without keys; paid checkout returns 503 until configured.
  LEMONSQUEEZY_API_KEY: optionalNonEmpty,
  LEMONSQUEEZY_STORE_ID: optionalNonEmpty,
  LEMONSQUEEZY_WEBHOOK_SECRET: optionalNonEmpty,
  LEMONSQUEEZY_VARIANT_BASIC: optionalNonEmpty,
  LEMONSQUEEZY_VARIANT_STANDARD: optionalNonEmpty,
  LEMONSQUEEZY_VARIANT_PRO: optionalNonEmpty,
  PAYMENT_SUCCESS_URL: z.string().url().default("http://localhost:5173/thankyou"),
  PAYMENT_CANCEL_URL: z.string().url().default("http://localhost:5173/payment-failed"),
  GEMINI_API_KEY: optionalNonEmpty,
  GEMINI_MODEL: z.string().default("gemini-3.5-flash-lite"),
  TAVILY_API_KEY: optionalNonEmpty,
});

export const env = schema.parse(process.env);
