import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll } from "vitest";

const apiRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const root = mkdtempSync(join(tmpdir(), "fiscorai-api-"));
const dbPath = join(root, "test.db");
const storageRoot = join(root, "storage");
mkdirSync(storageRoot, { recursive: true });

process.env.DATABASE_URL = `file:${dbPath}`;
process.env.JWT_SECRET = "test-jwt-secret-min-8";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-min-8";
process.env.JWT_EXPIRES_IN = "2h";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
process.env.STORAGE_ROOT = storageRoot;
process.env.CORS_ORIGIN = "http://localhost:5173";
process.env.PORT = "9292";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_dummy_for_unit_tests";
process.env.PAYMENT_SUCCESS_URL = "http://localhost:5173/billing?checkout=success";
process.env.PAYMENT_CANCEL_URL = "http://localhost:5173/billing?checkout=cancel";

execSync("pnpm exec prisma db push --skip-generate", {
  cwd: apiRoot,
  env: { ...process.env },
  stdio: "pipe",
});

afterAll(() => {
  try {
    rmSync(root, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
