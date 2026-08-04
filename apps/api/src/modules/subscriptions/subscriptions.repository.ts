import { prisma } from "../../shared/prisma.js";

export type UpsertSubscriptionInput = {
  plan: string;
  price: number;
  active: boolean;
  expiresAt?: Date | null;
  canceled?: boolean;
  lemonSubscriptionId?: string | null;
  lemonPortalUrl?: string | null;
};

export class SubscriptionRepository {
  findByUserId(userId: string) {
    return prisma.subscription.findUnique({ where: { userId } });
  }

  findByLemonSubscriptionId(lemonSubscriptionId: string) {
    return prisma.subscription.findUnique({ where: { lemonSubscriptionId } });
  }

  upsertForUser(userId: string, data: UpsertSubscriptionInput) {
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

  /** Marks "stop renewing" without touching plan/price/expiresAt — the seller keeps access until then. */
  cancelAtPeriodEnd(userId: string) {
    return prisma.subscription.update({
      where: { userId },
      data: { canceled: true },
    });
  }
}

export const subscriptionRepository = new SubscriptionRepository();
