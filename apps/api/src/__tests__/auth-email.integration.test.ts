import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import { prisma } from "../shared/prisma.js";

/**
 * End-to-end auth + email-gated flows.
 * SMTP is fire-and-forget — HTTP must stay fast even when mail is slow.
 */
describe("auth email flows", () => {
  const app = createApp();
  const stamp = Date.now();
  const email = `auth-e2e-${stamp}@fiscor.ai`;
  const username = `authe2e${stamp}`;
  const password = "TestPass123!";
  const newPassword = "NewPass456!";

  it(
    "signup → block login → resend → verify → login → forgot → reset → login",
    async () => {
      const regStarted = Date.now();
      const reg = await request(app).post("/api/v1/users").send({
        email,
        username,
        password,
        plan: "Free",
      });
      const regMs = Date.now() - regStarted;
      expect(reg.status).toBe(200);
      expect(reg.body.data.email).toBe(email.toLowerCase());
      expect(regMs).toBeLessThan(12_000);

      const blocked = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });
      expect(blocked.status).toBe(403);
      expect(blocked.body.data?.code).toBe("EMAIL_NOT_VERIFIED");

      const resendStarted = Date.now();
      const resend = await request(app)
        .post("/api/v1/auth/resend-verification")
        .send({ email });
      expect(resend.status).toBe(200);
      expect(Date.now() - resendStarted).toBeLessThan(12_000);

      const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      expect(user).toBeTruthy();
      const verifyRow = await prisma.emailVerificationToken.findFirst({
        where: { userId: user!.id },
        orderBy: { createdAt: "desc" },
      });
      expect(verifyRow?.token).toBeTruthy();

      const verifyStarted = Date.now();
      const verified = await request(app)
        .post("/api/v1/auth/verify-email")
        .send({ token: verifyRow!.token });
      expect(verified.status).toBe(200);
      expect(verified.body.data.verified).toBe(true);
      expect(Date.now() - verifyStarted).toBeLessThan(12_000);

      const login = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });
      expect(login.status).toBe(200);
      expect(login.body.data.jwtToken).toBeTruthy();

      const forgotStarted = Date.now();
      const forgot = await request(app)
        .post("/api/v1/auth/forgot-password")
        .send({ email });
      expect(forgot.status).toBe(200);
      expect(Date.now() - forgotStarted).toBeLessThan(12_000);

      const resetRow = await prisma.passwordResetToken.findFirst({
        where: { userId: user!.id },
        orderBy: { createdAt: "desc" },
      });
      expect(resetRow?.token).toBeTruthy();

      const reset = await request(app).post("/api/v1/auth/reset-password").send({
        token: resetRow!.token,
        newPassword,
      });
      expect(reset.status).toBe(200);

      const oldDenied = await request(app).post("/api/v1/auth/login").send({
        email,
        password,
      });
      expect(oldDenied.status).toBe(401);

      const relogin = await request(app).post("/api/v1/auth/login").send({
        email,
        password: newPassword,
      });
      expect(relogin.status).toBe(200);
      expect(relogin.body.data.jwtToken).toBeTruthy();
    },
    60_000,
  );
});
