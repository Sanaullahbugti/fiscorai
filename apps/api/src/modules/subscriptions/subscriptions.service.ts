import { AppError } from "../../shared/errors.js";
import { paymentsService } from "../payments/payments.service.js";
import { userRepository } from "../users/users.repository.js";
import { subscriptionRepository } from "./subscriptions.repository.js";

export class SubscriptionsService {
  async current(userId: string) {
    const sub = await subscriptionRepository.findByUserId(userId);
    const user = await userRepository.findById(userId);
    return {
      plan: sub?.plan || user?.plan || "Free",
      price: sub?.price ?? 0,
      active: sub?.active ?? false,
      canceled: sub?.canceled ?? false,
      expiresAt: sub?.expiresAt,
    };
  }

  /**
   * Cancel at period end via Lemon Squeezy. Local `canceled` flag is set
   * immediately; webhooks (`subscription_cancelled` / `subscription_expired`)
   * keep expiresAt and Free downgrade in sync.
   */
  async unsubscribe(userId: string) {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (!sub || !sub.active || sub.plan === "Free") {
      return "You're already on the Free plan";
    }
    await paymentsService.cancelLemonSubscription(userId);
    await subscriptionRepository.cancelAtPeriodEnd(userId);
    if (sub.expiresAt) {
      return `Canceled — you'll keep ${sub.plan} until ${sub.expiresAt.toISOString().slice(0, 10)}, then move to Free automatically`;
    }
    return "Canceled — you'll move to Free at the end of your current period";
  }

  async activateFree(userId: string, planRaw?: string) {
    const plan = planRaw || "Free";
    if (plan !== "Free") {
      throw new AppError("Paid plans require Lemon Squeezy checkout", 400);
    }
    await userRepository.update(userId, { plan: "Free" });
    return subscriptionRepository.upsertForUser(userId, {
      plan: "Free",
      price: 0,
      active: false,
      canceled: false,
      expiresAt: null,
      lemonSubscriptionId: null,
      lemonPortalUrl: null,
    });
  }
}

export const subscriptionsService = new SubscriptionsService();
