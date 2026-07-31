import { prisma } from "../../shared/prisma.js";

export type CreatePaymentInput = {
  userId: string;
  amount: number;
  currency: string;
  status: string;
  plan?: string | null;
  stripeSessionId?: string | null;
  invoiceId?: string | null;
  invoiceHostedURL?: string | null;
};

export class PaymentsRepository {
  findByStripeSessionId(stripeSessionId: string) {
    return prisma.payment.findUnique({ where: { stripeSessionId } });
  }

  create(data: CreatePaymentInput) {
    return prisma.payment.create({ data });
  }

  listByUserId(userId: string) {
    return prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const paymentsRepository = new PaymentsRepository();
