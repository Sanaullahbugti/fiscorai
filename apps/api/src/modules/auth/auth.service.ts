import bcrypt from "bcryptjs";
import { AppError } from "../../shared/errors.js";
import { signAccess, signRefresh, verifyRefresh } from "../../shared/jwt.js";
import { subscriptionRepository } from "../subscriptions/subscriptions.repository.js";
import { userRepository as users } from "../users/users.repository.js";
import { passwordResetTokenRepository } from "./password-reset.repository.js";

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
    const hash = await bcrypt.hash(input.password, 10);
    const user = await users.create({
      email: input.email,
      username: input.username,
      password: hash,
      contact: input.contact,
      plan,
    });

    await subscriptionRepository.upsertForUser(user.id, {
      plan: "Free",
      price: 0,
      active: false,
      expiresAt: null,
    });

    // Best-effort Stripe customer; checkout will create one if this fails.
    try {
      const { paymentsService } = await import("../payments/payments.service.js");
      await paymentsService.ensureCustomer(user.id);
    } catch (err) {
      console.warn("[auth] Stripe customer create skipped:", (err as Error).message);
    }

    return { id: user.id, email: user.email };
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

    const sub = await subscriptionRepository.findByUserId(user.id);
    const payload = { sub: user.id, email: user.email };
    return {
      username: user.username,
      userId: user.id,
      jwtToken: signAccess(payload),
      refreshToken: signRefresh(payload),
      userStripeId: user.userStripeId,
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

  async changePassword(email: string, newPassword: string) {
    const user = await users.findByEmail(email);
    if (!user) throw new AppError("User not found", 404);
    const hash = await bcrypt.hash(newPassword, 10);
    await users.update(user.id, { password: hash });
  }

  async forgotPassword(email: string) {
    const user = await users.findByEmail(email);
    if (!user) return { sent: true };
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString("base64url");
    await passwordResetTokenRepository.create({
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    console.log(`[dev] password reset token for ${email}: ${token}`);
    return { sent: true, token };
  }

  async resetPassword(token: string, newPassword: string) {
    const row = await passwordResetTokenRepository.findByToken(token);
    if (!row || row.expiresAt < new Date()) throw new AppError("Invalid or expired token", 400);
    const hash = await bcrypt.hash(newPassword, 10);
    await users.update(row.userId, { password: hash });
    await passwordResetTokenRepository.deleteById(row.id);
  }
}

export const authService = new AuthService();
