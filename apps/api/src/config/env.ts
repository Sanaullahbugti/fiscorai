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
  /** `local` = filesystem under STORAGE_ROOT; `r2` = Cloudflare R2 (production). */
  STORAGE_BACKEND: z.enum(["local", "r2"]).default("local"),
  STORAGE_ROOT: z.string().default("../../storage"),
  R2_ACCOUNT_ID: optionalNonEmpty,
  R2_ACCESS_KEY_ID: optionalNonEmpty,
  R2_SECRET_ACCESS_KEY: optionalNonEmpty,
  R2_BUCKET: optionalNonEmpty,
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
  /** Public web origin used in email links (verify / reset password). */
  WEB_APP_URL: z.string().url().default("http://localhost:5173"),
  /** From header, e.g. `FiscorAI <support@fiscorai.com>`. */
  EMAIL_FROM: z.string().default("FiscorAI <support@fiscorai.com>"),
  /** Inbox for contact-form copies (optional). */
  EMAIL_NOTIFY_TO: optionalNonEmpty,
  /** GoDaddy Titan / Professional Email: smtpout.secureserver.net:465 (SSL). */
  SMTP_HOST: optionalNonEmpty,
  SMTP_PORT: z.coerce.number().default(465),
  SMTP_SECURE: z
    .preprocess((v) => {
      if (v === undefined || v === null || v === "") return true;
      if (typeof v === "boolean") return v;
      return String(v).toLowerCase() === "true" || String(v) === "1";
    }, z.boolean())
    .default(true),
  SMTP_USER: optionalNonEmpty,
  SMTP_PASS: optionalNonEmpty,
});

const parsed = schema.parse(process.env);

if (parsed.STORAGE_BACKEND === "r2") {
  const missing = (
    ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const
  ).filter((k) => !parsed[k]);
  if (missing.length) {
    throw new Error(`STORAGE_BACKEND=r2 requires: ${missing.join(", ")}`);
  }
}

export const env = parsed;
