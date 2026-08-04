import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { PLAN_AMOUNT_CENTS, PLAN_PRICES, normalizePlan, PAID_PLANS } from "../../shared/plans.js";
import { subscriptionRepository } from "../subscriptions/subscriptions.repository.js";
import { userRepository } from "../users/users.repository.js";
import {
  cancelSubscription as lemonCancelSubscription,
  createCheckout,
  getSubscription,
  parseWebhookPayload,
  planFromVariantId,
  type LemonSubscription,
  type LemonWebhookPayload,
  variantIdForPlan,
  verifyWebhookSignature,
} from "./lemon.client.js";
import { paymentsRepository } from "./payments.repository.js";

type LemonInvoice = {
  type: string;
  id: string;
  attributes: {
    store_id: number;
    subscription_id: number;
    customer_id: number;
    user_email: string;
    billing_reason: string;
    currency: string;
    status: string;
    total: number;
    urls?: { invoice_url?: string | null };
  };
};

function isSubscriptionResource(data: LemonWebhookPayload["data"]): data is LemonSubscription {
  return !!data && typeof data === "object" && (data as LemonSubscription).type === "subscriptions";
}

function isInvoiceResource(data: LemonWebhookPayload["data"]): data is LemonInvoice {
  return !!data && typeof data === "object" && (data as LemonInvoice).type === "subscription-invoices";
}

function isPaidActiveStatus(status: string): boolean {
  return status === "active" || status === "on_trial" || status === "past_due";
}

export class PaymentsService {
  async createCheckoutSession(userId: string, planRaw: string) {
    const plan = normalizePlan(planRaw);
    if (!(PAID_PLANS as readonly string[]).includes(plan)) {
      throw new AppError("Select a paid plan to checkout", 400);
    }

    const current = await subscriptionRepository.findByUserId(userId);
    const now = new Date();
    const currentIsActive = !!current?.active && (!current.expiresAt || current.expiresAt > now);
    if (currentIsActive) {
      const currentPlan = normalizePlan(current!.plan);
      if (currentPlan === plan) {
        throw new AppError("You're already on this plan", 400);
      }
      if (PLAN_AMOUNT_CENTS[plan] < PLAN_AMOUNT_CENTS[currentPlan]) {
        throw new AppError(
          "Downgrades take effect at the start of your next billing period, not immediately. Cancel your plan instead if you want to stop now.",
          400,
        );
      }
    }

    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);

    const variantId = variantIdForPlan(plan);
    const checkout = await createCheckout({
      variantId,
      email: user.email,
      name: user.username,
      userId,
      redirectUrl: env.PAYMENT_SUCCESS_URL,
    });

    return {
      sessionId: checkout.id,
      url: checkout.url,
    };
  }

  /**
   * Thank-you race helper: webhook usually activates first. If the local sub
   * is already paid/active, return it; otherwise signal pending so the client
   * can keep polling GET /subscriptions.
   */
  async confirmCheckoutSession(userId: string, _sessionId?: string) {
    const sub = await subscriptionRepository.findByUserId(userId);
    const user = await userRepository.findById(userId);
    const plan = normalizePlan(sub?.plan || user?.plan || "Free");
    const activePaid =
      !!sub?.active &&
      (PAID_PLANS as readonly string[]).includes(plan) &&
      (!sub.expiresAt || sub.expiresAt > new Date());

    if (activePaid) {
      return { plan, alreadyProcessed: true, pending: false };
    }

    return { plan: plan === "Free" ? "" : plan, alreadyProcessed: false, pending: true };
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    verifyWebhookSignature(rawBody, signature);
    const payload = parseWebhookPayload(rawBody);
    const event = payload.meta.event_name;

    switch (event) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed":
        await this.syncSubscriptionFromWebhook(payload, {
          recordPayment: event === "subscription_created",
        });
        break;
      case "subscription_payment_success":
        await this.handleInvoicePayment(payload, "paid");
        break;
      case "subscription_payment_failed":
        await this.handleInvoicePayment(payload, "failed");
        break;
      case "subscription_cancelled":
        await this.markCanceled(payload);
        break;
      case "subscription_expired":
        await this.downgradeFromWebhook(payload);
        break;
      default:
        break;
    }

    return { received: true, type: event };
  }

  private customUserId(payload: LemonWebhookPayload): string | null {
    const raw = payload.meta.custom_data?.user_id;
    if (raw == null) return null;
    return String(raw);
  }

  private async resolveUserIdFromEmailOrCustom(
    payload: LemonWebhookPayload,
    email: string | undefined,
    lemonSubscriptionId?: string,
  ): Promise<string> {
    const fromCustom = this.customUserId(payload);
    if (fromCustom) return fromCustom;

    if (lemonSubscriptionId) {
      const byLemonSub = await subscriptionRepository.findByLemonSubscriptionId(lemonSubscriptionId);
      if (byLemonSub) return byLemonSub.userId;
    }

    if (email) {
      const user = await userRepository.findByEmail(email);
      if (user) return user.id;
    }

    throw new AppError("Webhook missing user_id custom data and no matching user", 400);
  }

  private async resolveUserId(payload: LemonWebhookPayload, sub: LemonSubscription): Promise<string> {
    return this.resolveUserIdFromEmailOrCustom(payload, sub.attributes.user_email, sub.id);
  }

  private async handleInvoicePayment(payload: LemonWebhookPayload, status: "paid" | "failed") {
    if (isInvoiceResource(payload.data)) {
      const inv = payload.data;
      const lemonSubId = String(inv.attributes.subscription_id);
      const userId = await this.resolveUserIdFromEmailOrCustom(
        payload,
        inv.attributes.user_email,
        lemonSubId,
      );

      const orderKey = `subinv:${inv.id}`;
      const existing = await paymentsRepository.findByLemonOrderId(orderKey);
      if (!existing) {
        const localSub = await subscriptionRepository.findByUserId(userId);
        const plan = normalizePlan(localSub?.plan || "Basic");
        await paymentsRepository.create({
          userId,
          amount: inv.attributes.total ?? PLAN_AMOUNT_CENTS[plan] ?? 0,
          currency: (inv.attributes.currency || "eur").toLowerCase(),
          status,
          plan,
          lemonOrderId: orderKey,
          invoiceId: inv.id,
          invoiceHostedURL: inv.attributes.urls?.invoice_url ?? null,
        });
      }

      try {
        const remote = await getSubscription(lemonSubId);
        await this.applySubscriptionState(userId, remote);
      } catch (err) {
        console.warn(
          "[payments] could not refresh subscription after invoice:",
          err instanceof Error ? err.message : err,
        );
      }
      return;
    }

    if (isSubscriptionResource(payload.data)) {
      await this.syncSubscriptionFromWebhook(payload, {
        recordPayment: status === "paid",
        paymentStatus: status,
      });
    }
  }

  private async applySubscriptionState(userId: string, sub: LemonSubscription) {
    const attrs = sub.attributes;
    const plan =
      planFromVariantId(attrs.variant_id) || normalizePlan(attrs.variant_name) || "Basic";
    const status = attrs.status;
    const active = isPaidActiveStatus(status) && status !== "expired" && status !== "unpaid";
    const canceled = !!attrs.cancelled || status === "cancelled";
    const expiresAt = attrs.ends_at
      ? new Date(attrs.ends_at)
      : attrs.renews_at
        ? new Date(attrs.renews_at)
        : null;
    const portalUrl = attrs.urls?.customer_portal || null;
    const customerId = String(attrs.customer_id);

    if (status === "expired" || status === "unpaid") {
      await this.downgradeUser(userId);
      return;
    }

    await userRepository.update(userId, {
      plan: active ? plan : "Free",
      lemonCustomerId: customerId,
    });

    await subscriptionRepository.upsertForUser(userId, {
      plan: active ? plan : "Free",
      price: active ? (PLAN_PRICES[plan] ?? 0) : 0,
      active,
      canceled,
      expiresAt,
      lemonSubscriptionId: sub.id,
      lemonPortalUrl: portalUrl,
    });
  }

  private async syncSubscriptionFromWebhook(
    payload: LemonWebhookPayload,
    opts: { recordPayment: boolean; paymentStatus?: string },
  ) {
    if (!isSubscriptionResource(payload.data)) return;
    const sub = payload.data;
    const userId = await this.resolveUserId(payload, sub);
    await this.applySubscriptionState(userId, sub);

    const attrs = sub.attributes;
    const plan =
      planFromVariantId(attrs.variant_id) || normalizePlan(attrs.variant_name) || "Basic";
    const status = attrs.status;
    const active = isPaidActiveStatus(status);

    if (opts.recordPayment && active) {
      const orderKey = `order:${attrs.order_id}`;
      const existing = await paymentsRepository.findByLemonOrderId(orderKey);
      if (!existing) {
        await paymentsRepository.create({
          userId,
          amount: PLAN_AMOUNT_CENTS[plan] ?? 0,
          currency: "eur",
          status: opts.paymentStatus || "paid",
          plan,
          lemonOrderId: orderKey,
          invoiceId: String(attrs.order_id),
          invoiceHostedURL: null,
        });
      }
    }
  }

  private async markCanceled(payload: LemonWebhookPayload) {
    if (!isSubscriptionResource(payload.data)) return;
    const sub = payload.data;
    const userId = await this.resolveUserId(payload, sub);
    const plan =
      planFromVariantId(sub.attributes.variant_id) ||
      normalizePlan(sub.attributes.variant_name) ||
      "Basic";
    const expiresAt = sub.attributes.ends_at
      ? new Date(sub.attributes.ends_at)
      : sub.attributes.renews_at
        ? new Date(sub.attributes.renews_at)
        : null;
    await subscriptionRepository.upsertForUser(userId, {
      plan,
      price: PLAN_PRICES[plan] ?? 0,
      active: true,
      canceled: true,
      expiresAt,
      lemonSubscriptionId: sub.id,
      lemonPortalUrl: sub.attributes.urls?.customer_portal || null,
    });
  }

  private async downgradeFromWebhook(payload: LemonWebhookPayload) {
    if (!isSubscriptionResource(payload.data)) return;
    const sub = payload.data;
    const userId = await this.resolveUserId(payload, sub);
    await this.downgradeUser(userId);
  }

  async downgradeUser(userId: string) {
    await userRepository.update(userId, { plan: "Free" });
    await subscriptionRepository.upsertForUser(userId, {
      plan: "Free",
      price: 0,
      active: false,
      canceled: false,
      expiresAt: null,
      lemonSubscriptionId: null,
      lemonPortalUrl: null,
    });
  }

  async listPayments(userId: string) {
    return paymentsRepository.listByUserId(userId);
  }

  async getPortalUrl(userId: string) {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (sub?.lemonPortalUrl) {
      return { url: sub.lemonPortalUrl };
    }
    if (!sub?.lemonSubscriptionId) {
      throw new AppError("No Lemon Squeezy subscription to manage", 404);
    }
    const remote = await getSubscription(sub.lemonSubscriptionId);
    const url = remote.attributes.urls?.customer_portal;
    if (!url) throw new AppError("Customer portal is not available yet", 404);
    await subscriptionRepository.upsertForUser(userId, {
      plan: sub.plan,
      price: sub.price,
      active: sub.active,
      canceled: sub.canceled,
      expiresAt: sub.expiresAt,
      lemonSubscriptionId: sub.lemonSubscriptionId,
      lemonPortalUrl: url,
    });
    return { url };
  }

  async cancelLemonSubscription(userId: string) {
    const sub = await subscriptionRepository.findByUserId(userId);
    if (sub?.lemonSubscriptionId) {
      try {
        await lemonCancelSubscription(sub.lemonSubscriptionId);
      } catch (err) {
        console.warn(
          "[payments] Lemon cancel failed:",
          err instanceof Error ? err.message : err,
        );
      }
    }
  }
}

export const paymentsService = new PaymentsService();
