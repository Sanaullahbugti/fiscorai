import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.js";

const fixtureCsv = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures/minimal.csv"),
);
const goldenCsv = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "fixtures/63260020335.csv"),
);

describe("API integration", () => {
  const app = createApp();
  const email = `test-${Date.now()}@fiscor.ai`;
  const password = "testpass123";
  const username = "testuser";
  let jwtToken = "";
  let refreshToken = "";

  beforeAll(async () => {
    const { prisma } = await import("../shared/prisma.js");
    const reg = await request(app).post("/api/v1/users").send({
      email,
      username,
      password,
      plan: "Free",
    });
    expect(reg.status).toBe(200);

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    expect(user).toBeTruthy();
    const verify = await prisma.emailVerificationToken.findFirst({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
    });
    expect(verify?.token).toBeTruthy();
    const confirmed = await request(app)
      .post("/api/v1/auth/verify-email")
      .send({ token: verify!.token });
    expect(confirmed.status).toBe(200);
  });

  it("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("logs in and rejects bad password", async () => {
    const bad = await request(app).post("/api/v1/auth/login").send({
      email,
      password: "wrong-password",
    });
    expect(bad.status).toBe(401);

    const ok = await request(app).post("/api/v1/auth/login").send({ email, password });
    expect(ok.status).toBe(200);
    expect(ok.body.data.jwtToken).toBeTruthy();
    expect(ok.body.data.refreshToken).toBeTruthy();
    jwtToken = ok.body.data.jwtToken;
    refreshToken = ok.body.data.refreshToken;
  });

  it("refreshes tokens", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.data.jwtToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    jwtToken = res.body.data.jwtToken;
  });

  it("uploads CSV and returns processed JSON", async () => {
    const upload = await request(app)
      .post("/api/v1/data/upload-csv")
      .set("Authorization", `Bearer ${jwtToken}`)
      .field("fileType", "monthly")
      .field("year", "2026")
      .field("month", "1")
      .attach("file", fixtureCsv, "minimal.csv");

    expect(upload.status).toBe(200);
    expect(upload.body.data.status).toBe("ready");
    expect(upload.body.data.meta.processedRows).toBeGreaterThan(0);

    const files = await request(app)
      .get("/api/v1/data/user-files")
      .set("Authorization", `Bearer ${jwtToken}`);
    expect(files.status).toBe(200);
    expect(files.body.monthly.length).toBeGreaterThan(0);

    const json = await request(app)
      .post("/api/v1/data/get-processed-json")
      .set("Authorization", `Bearer ${jwtToken}`)
      .send({ fileType: "monthly", year: "2026", month: "1" });

    expect(json.status).toBe(200);
    expect(json.body.data).toHaveProperty("countries");
    expect(Array.isArray(json.body.data.countries)).toBe(true);
    expect(json.body.data.countries.length).toBeGreaterThan(0);
    expect(json.body.data.countries[0]).toHaveProperty("country");
    expect(json.body.data).toHaveProperty("canonical");
  });

  it("rejects golden CSV when requested period mismatches ACTIVITY_PERIOD", async () => {
    const upload = await request(app)
      .post("/api/v1/data/upload-csv")
      .set("Authorization", `Bearer ${jwtToken}`)
      .field("fileType", "monthly")
      .field("year", "2026")
      .field("month", "1")
      .attach("file", goldenCsv, "63260020335.csv");

    expect(upload.status).toBe(422);
    expect(upload.body.error || upload.body.message).toBeTruthy();
  });
});
