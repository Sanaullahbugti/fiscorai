import { AppError } from "../../shared/errors.js";
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
      expiresAt: sub?.expiresAt,
    };
  }

  async unsubscribe(userId: string) {
    await subscriptionRepository.deactivate(userId);
    await userRepository.update(userId, { plan: "Free" });
    await subscriptionRepository.upsertForUser(userId, {
      plan: "Free",
      price: 0,
      active: false,
    });
    return "Unsubscribed";
  }

  async activateFree(userId: string, planRaw?: string) {
    const plan = planRaw || "Free";
    if (plan !== "Free") {
      throw new AppError("Paid plans require Stripe checkout", 400);
    }
    await userRepository.update(userId, { plan: "Free" });
    return subscriptionRepository.upsertForUser(userId, {
      plan: "Free",
      price: 0,
      active: false,
      expiresAt: null,
    });
  }
}

export const subscriptionsService = new SubscriptionsService();
