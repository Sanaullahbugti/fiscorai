import { prisma } from "../../shared/prisma.js";

export class SubscriptionRepository {
  findByUserId(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  }

  upsertForUser(userId: string, data: { plan: string; price: number; active: boolean; expiresAt?: Date | null }) {
    return prisma.subscription.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  deactivate(userId: string) {
    return prisma.subscription.update({
      where: { userId },
      data: { active: false },
    });
  }
}

export const subscriptionRepository = new SubscriptionRepository();
