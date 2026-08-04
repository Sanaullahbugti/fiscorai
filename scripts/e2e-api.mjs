#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const e2eRoot = join(root, "tmp", "e2e");
const dbPath = join(e2eRoot, "test.db");
const storageRoot = join(e2eRoot, "storage");
const apiRoot = join(root, "apps", "api");

rmSync(e2eRoot, { recursive: true, force: true });
mkdirSync(storageRoot, { recursive: true });

const env = {
  ...process.env,
  PORT: "9292",
  DATABASE_URL: `file:${dbPath}`,
  JWT_SECRET: "e2e-jwt-secret-min-8-chars",
  JWT_REFRESH_SECRET: "e2e-refresh-secret-min-8",
  JWT_EXPIRES_IN: "2h",
  JWT_REFRESH_EXPIRES_IN: "7d",
  STORAGE_ROOT: storageRoot,
  CORS_ORIGIN: "http://localhost:5173",
  PAYMENT_SUCCESS_URL: "http://localhost:5173/thankyou",
  PAYMENT_CANCEL_URL: "http://localhost:5173/payment-failed",
};

execSync("pnpm exec prisma db push --skip-generate", {
  cwd: apiRoot,
  env,
  stdio: "inherit",
});

const child = spawn("pnpm", ["exec", "tsx", "src/server.ts"], {
  cwd: apiRoot,
  env,
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    child.kill(signal);
  });
}
