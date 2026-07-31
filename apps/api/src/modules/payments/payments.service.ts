import Stripe from "stripe";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";
import { PLAN_AMOUNT_CENTS, PLAN_PRICES, normalizePlan, PAID_PLANS } from "../../shared/plans.js";
import { subscriptionRepository } from "../subscriptions/subscriptions.repository.js";
import { userRepository } from "../users/users.repository.js";
import { paymentsRepository } from "./payments.repository.js";

function stripeClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new AppError("Stripe is not configured (STRIPE_SECRET_KEY missing)", 503);
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
}

export class PaymentsService {
  private stripe() {
    return stripeClient();
  }

  async ensureCustomer(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError("User not found", 404);
    if (user.userStripeId) return user;

    const customer = await this.stripe().customers.create({
      email: user.email,
      name: user.username,
      metadata: { userId: user.id },
    });
    return userRepository.update(user.id, { userStripeId: customer.id });
  }

  async createCheckoutSession(userId: string, planRaw: string) {
    const plan = normalizePlan(planRaw);
    if (!(PAID_PLANS as readonly string[]).includes(plan)) {
      throw new AppError("Select a paid plan to checkout", 400);
    }
    const amount = PLAN_AMOUNT_CENTS[plan];
    if (!amount) throw new AppError("Invalid plan", 400);

    const user = await this.ensureCustomer(userId);
    const successUrl = env.PAYMENT_SUCCESS_URL.includes("?")
      ? `${env.PAYMENT_SUCCESS_URL}&session_id={CHECKOUT_SESSION_ID}`
      : `${env.PAYMENT_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`;

    const session = await this.stripe().checkout.sessions.create({
      mode: "payment",
      customer: user.userStripeId!,
      payment_method_types: ["card"],
      billing_address_collection: "required",
      customer_update: { address: "auto", name: "auto" },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: amount,
            product_data: {
              name: `FiscorAI ${plan} plan`,
              description: `1 month of FiscorAI ${plan}`,
            },
          },
        },
      ],
      payment_intent_data: {
        setup_future_usage: "off_session",
        metadata: { userId, plan },
      },
      invoice_creation: { enabled: true },
      success_url: successUrl,
      cancel_url: env.PAYMENT_CANCEL_URL,
      metadata: { userId, plan },
    });

    return {
      sessionId: session.id,
      url: session.url,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
    };
  }

  async confirmCheckoutSession(userId: string, sessionId: string) {
    const session = await this.stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["invoice"],
    });
    if (session.metadata?.userId && session.metadata.userId !== userId) {
      throw new AppError("Session does not belong to this user", 403);
    }
    if (session.payment_status !== "paid" && session.status !== "complete") {
      throw new AppError("Checkout not completed", 400);
    }
    return this.activateFromSession(session);
  }

  async handleWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      throw new AppError("STRIPE_WEBHOOK_SECRET is not configured", 503);
    }
    if (!signature) throw new AppError("Missing Stripe-Signature header", 400);

    const event = this.stripe().webhooks.constructEvent(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.activateFromSession(session);
    }

    return { received: true, type: event.type };
  }

  private async activateFromSession(session: Stripe.Checkout.Session) {
    const sessionId = session.id;
    const existing = await paymentsRepository.findByStripeSessionId(sessionId);
    if (existing) {
      return {
        plan: existing.plan || "Basic",
        alreadyProcessed: true,
      };
    }

    const userId = session.metadata?.userId;
    const plan = normalizePlan(session.metadata?.plan || "Basic");
    if (!userId) throw new AppError("Checkout session missing user metadata", 400);

    const amount =
      typeof session.amount_total === "number"
        ? session.amount_total
        : PLAN_AMOUNT_CENTS[plan] ?? 0;
    const currency = (session.currency || "eur").toLowerCase();

    let invoiceHostedURL: string | null = null;
    let invoiceId: string | null = null;
    const invoiceRef = session.invoice;
    if (typeof invoiceRef === "string") {
      invoiceId = invoiceRef;
      try {
        const invoice = await this.stripe().invoices.retrieve(invoiceRef);
        invoiceHostedURL = invoice.hosted_invoice_url ?? null;
      } catch {
        /* ignore */
      }
    } else if (invoiceRef && typeof invoiceRef === "object") {
      invoiceId = invoiceRef.id;
      invoiceHostedURL = invoiceRef.hosted_invoice_url ?? null;
    }

    await paymentsRepository.create({
      userId,
      amount,
      currency,
      status: "paid",
      plan,
      stripeSessionId: sessionId,
      invoiceId,
      invoiceHostedURL,
    });

    await userRepository.update(userId, {
      plan,
      userStripeId:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id || undefined,
    });

    await subscriptionRepository.upsertForUser(userId, {
      plan,
      price: PLAN_PRICES[plan] ?? amount / 100,
      active: true,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });

    return { plan, alreadyProcessed: false };
  }

  async listPayments(userId: string) {
    return paymentsRepository.listByUserId(userId);
  }

  async listCards(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user?.userStripeId) return [];

    const customer = await this.stripe().customers.retrieve(user.userStripeId);
    if (customer.deleted) return [];

    const defaultPm =
      typeof customer.invoice_settings?.default_payment_method === "string"
        ? customer.invoice_settings.default_payment_method
        : customer.invoice_settings?.default_payment_method?.id || "";

    const methods = await this.stripe().paymentMethods.list({
      customer: user.userStripeId,
      type: "card",
    });

    return methods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand || "card",
      last4: pm.card?.last4 || "****",
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPm,
    }));
  }

  async createSetupIntent(userId: string) {
    const user = await this.ensureCustomer(userId);
    const intent = await this.stripe().setupIntents.create({
      customer: user.userStripeId!,
      payment_method_types: ["card"],
      usage: "off_session",
    });
    return {
      clientSecret: intent.client_secret,
      publishableKey: env.STRIPE_PUBLISHABLE_KEY || null,
    };
  }

  async deleteCard(userId: string, paymentMethodId: string) {
    const user = await userRepository.findById(userId);
    if (!user?.userStripeId) throw new AppError("No Stripe customer", 400);
    const pm = await this.stripe().paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.userStripeId) {
      throw new AppError("Card does not belong to this user", 403);
    }
    await this.stripe().paymentMethods.detach(paymentMethodId);
    return { deleted: true };
  }
}

export const paymentsService = new PaymentsService();
