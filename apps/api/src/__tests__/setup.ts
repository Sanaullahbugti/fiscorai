import { execSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const storageRoot = join(tmpdir(), `fiscorai-api-storage-${process.pid}`);
mkdirSync(storageRoot, { recursive: true });

const databaseUrl =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/fiscorai_test";

process.env.DATABASE_URL = databaseUrl;
process.env.JWT_SECRET = "test-jwt-secret-min-8";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-8";
process.env.JWT_EXPIRES_IN = "2h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.STORAGE_BACKEND = "local";
process.env.STORAGE_ROOT = storageRoot;
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.PORT = "9292";
process.env.LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY || "test_lemon_key";
process.env.LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID || "1";
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "test_webhook_secret";
process.env.LEMONSQUEEZY_VARIANT_BASIC = process.env.LEMONSQUEEZY_VARIANT_BASIC || "1";
process.env.LEMONSQUEEZY_VARIANT_STANDARD = process.env.LEMONSQUEEZY_VARIANT_STANDARD || "2";
process.env.LEMONSQUEEZY_VARIANT_PRO = process.env.LEMONSQUEEZY_VARIANT_PRO || "3";
process.env.PAYMENT_SUCCESS_URL = "http://localhost:5173/thankyou";
process.env.PAYMENT_CANCEL_URL = "http://localhost:5173/payment-failed";

execSync("pnpm exec prisma migrate deploy", {
  cwd: apiRoot,
  env: { ...process.env },
  stdio: "pipe",
});

afterAll(() => {
  try {
    rmSync(storageRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
