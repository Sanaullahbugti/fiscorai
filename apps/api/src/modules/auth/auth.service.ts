import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { signAccess, signRefresh, verifyRefresh } from "../../shared/jwt.js";
import { mailService } from "../mail/mail.service.js";
import { subscriptionRepository } from "../subscriptions/subscriptions.repository.js";
import { userRepository as users } from "../users/users.repository.js";
import { emailVerificationTokenRepository } from "./email-verification.repository.js";
import { passwordResetTokenRepository } from "./password-reset.repository.js";

function webUrl(path: string) {
  return `${env.WEB_APP_URL.replace(/\/$/, "")}${path}`;
}

export class AuthService {
  async register(input: {
    email: string;
    username: string;
    password: string;
    contact?: string;
    plan?: string;
  }) {
    if (input.email.toLowerCase().startsWith("biz@")) {
      throw new AppError("Business accounts must use the business portal", 403);
    }
    const existing = await users.findByEmail(input.email);
    if (existing) throw new AppError("Email already registered", 409);

    const plan = "Free";
    const [hash, token] = await Promise.all([
      bcrypt.hash(input.password, 10),
      Promise.resolve(randomBytes(32).toString("hex")),
    ]);

    // One write round-trip (user + free subscription + verify token) instead of 4.
    const user = await users.createWithSubscriptionAndVerification({
      email: input.email,
      username: input.username,
      password: hash,
      contact: input.contact,
      plan,
      verificationToken: token,
      verificationExpiresAt: new Date(Date.now() + 24 * 3600_000),
    });

    const verifyUrl = webUrl(`/verify-email?token=${token}`);
    mailService.enqueueVerificationEmail(user.email, user.username, verifyUrl);
    if (process.env.E2E_AUTO_VERIFY === "1") {
      await users.update(user.id, { emailVerifiedAt: new Date() });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] email verification token for ${user.email}: ${token}`);
    }

    return { id: user.id, email: user.email, emailSent: true };
  }

  async login(email: string, password: string, opts?: { businessUser?: boolean }) {
    if (opts?.businessUser || email.toLowerCase().startsWith("biz@")) {
      throw new AppError("Please use the business portal", 403, {
        businessUser: true,
        portalUrl: "https://bussiness.auralid.com/login",
      });
    }
    const user = await users.findByEmail(email);
    if (!user) throw new AppError("Invalid credentials", 401);
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new AppError("Invalid credentials", 401);

    if (!user.emailVerifiedAt) {
      throw new AppError("Please confirm your email before signing in", 403, {
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      });
    }

    const sub = await subscriptionRepository.findByUserId(user.id);
    const payload = { sub: user.id, email: user.email };
    return {
      username: user.username,
      userId: user.id,
      jwtToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      lemonCustomerId: user.lemonCustomerId,
      businessUser: false,
      userSubscription: {
        plan: sub?.plan || user.plan,
        price: sub?.price ?? 0,
        active: sub?.active ?? false,
      },
    };
  }

  refresh(refreshToken: string) {
    try {
      const payload = verifyRefresh(refreshToken);
      return {
        jwtToken: signAccess({ sub: payload.sub, email: payload.email }),
        refreshToken: signRefresh({ sub: payload.sub, email: payload.email }),
      };
    } catch {
      throw new AppError("Invalid refresh token", 401);
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await users.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) throw new AppError("Current password is incorrect", 401);
    const hash = await bcrypt.hash(newPassword, 10);
    await users.update(user.id, { password: hash });
    mailService.enqueuePasswordChangedEmail(user.email, user.username);
  }

  async forgotPassword(email: string) {
    const user = await users.findByEmail(email);
    // Same response whether or not the account exists, so this can't be used
    // to test which emails are registered.
    if (!user) return { sent: true };

    const token = randomBytes(32).toString("hex");
    await passwordResetTokenRepository.deleteAllForUser(user.id);
    await passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600_000),
    });

    const resetUrl = webUrl(`/reset-password?token=${token}`);
    mailService.enqueuePasswordResetEmail(user.email, user.username, resetUrl);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] password reset token for ${email}: ${token}`);
    }
    return { sent: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const row = await passwordResetTokenRepository.findByToken(token);
    if (!row || row.expiresAt < new Date()) throw new AppError("Invalid or expired token", 400);
    const hash = await bcrypt.hash(newPassword, 10);
    await users.update(row.userId, { password: hash });
    await passwordResetTokenRepository.deleteById(row.id);
    const user = await users.findById(row.userId);
    if (user) {
      mailService.enqueuePasswordChangedEmail(user.email, user.username);
    }
  }

  async verifyEmail(token: string) {
    const row = await emailVerificationTokenRepository.findByToken(token);
    if (!row || row.expiresAt < new Date()) {
      throw new AppError("Invalid or expired confirmation link", 400);
    }
    await users.update(row.userId, { emailVerifiedAt: new Date() });
    await emailVerificationTokenRepository.deleteAllForUser(row.userId);
    const user = await users.findById(row.userId);
    if (user) {
      mailService.enqueueWelcomeEmail(user.email, user.username);
    }
    return { verified: true };
  }

  async resendVerification(email: string) {
    const user = await users.findByEmail(email);
    // Same response either way — avoid email enumeration.
    if (!user) return { sent: true };
    if (user.emailVerifiedAt) return { sent: true };

    await this.issueVerificationEmail(user.id, user.email, user.username);
    return { sent: true };
  }

  private async issueVerificationEmail(userId: string, email: string, username: string) {
    await emailVerificationTokenRepository.deleteAllForUser(userId);
    const token = randomBytes(32).toString("hex");
    await emailVerificationTokenRepository.create({
      userId,
      token,
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    });
    const verifyUrl = webUrl(`/verify-email?token=${token}`);
    // Do not await SMTP — it was blocking signup/resend for many seconds.
    mailService.enqueueVerificationEmail(email, username, verifyUrl);
    if (process.env.NODE_ENV !== "production") {
      console.log(`[dev] email verification token for ${email}: ${token}`);
    }
  }
}

export const authService = new AuthService();
