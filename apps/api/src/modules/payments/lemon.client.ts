import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors.js";

const API_BASE = "https://api.lemonsqueezy.com/v1";

export type LemonCheckout = {
  id: string;
  url: string;
};

export type LemonSubscriptionAttrs = {
  store_id: number;
  customer_id: number;
  order_id: number;
  order_item_id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  variant_name: string;
  user_name: string;
  user_email: string;
  status: string;
  cancelled: boolean;
  renews_at: string | null;
  ends_at: string | null;
  urls?: {
    update_payment_method?: string;
    customer_portal?: string;
    customer_portal_update_subscription?: string;
  };
};

export type LemonSubscription = {
  type: string;
  id: string;
  attributes: LemonSubscriptionAttrs;
};

export type LemonWebhookPayload = {
  meta: {
    event_name: string;
    custom_data?: Record<string, unknown> | null;
  };
  data: LemonSubscription | Record<string, unknown>;
};

function requireApiKey(): string {
  if (!env.LEMONSQUEEZY_API_KEY) {
    throw new AppError("Lemon Squeezy is not configured (LEMONSQUEEZY_API_KEY missing)", 503);
  }
  return env.LEMONSQUEEZY_API_KEY;
}

async function lemonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = requireApiKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new AppError(`Lemon Squeezy API error (${res.status}): ${body.slice(0, 300)}`, 502);
  }
  return res.json() as Promise<T>;
}

/** Map FiscorAI plan name → Lemon variant id from env. */
export function variantIdForPlan(plan: string): string {
  const map: Record<string, string | undefined> = {
    Basic: env.LEMONSQUEEZY_VARIANT_BASIC,
    Standard: env.LEMONSQUEEZY_VARIANT_STANDARD,
    Pro: env.LEMONSQUEEZY_VARIANT_PRO,
  };
  const id = map[plan];
  if (!id) {
    throw new AppError(`Lemon Squeezy variant is not configured for plan ${plan}`, 503);
  }
  return id;
}

export function planFromVariantId(variantId: string | number): string | null {
  const id = String(variantId);
  if (id && id === env.LEMONSQUEEZY_VARIANT_BASIC) return "Basic";
  if (id && id === env.LEMONSQUEEZY_VARIANT_STANDARD) return "Standard";
  if (id && id === env.LEMONSQUEEZY_VARIANT_PRO) return "Pro";
  return null;
}

export function requireStoreId(): string {
  if (!env.LEMONSQUEEZY_STORE_ID) {
    throw new AppError("Lemon Squeezy is not configured (LEMONSQUEEZY_STORE_ID missing)", 503);
  }
  return env.LEMONSQUEEZY_STORE_ID;
}

export async function createCheckout(opts: {
  variantId: string;
  email: string;
  name?: string;
  userId: string;
  redirectUrl: string;
}): Promise<LemonCheckout> {
  const storeId = requireStoreId();
  const payload = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: opts.email,
          name: opts.name || undefined,
          custom: { user_id: opts.userId },
        },
        product_options: {
          redirect_url: opts.redirectUrl,
          enabled_variants: [Number(opts.variantId)],
        },
        checkout_options: {
          embed: false,
          media: false,
          logo: true,
        },
      },
      relationships: {
        store: { data: { type: "stores", id: storeId } },
        variant: { data: { type: "variants", id: opts.variantId } },
      },
    },
  };

  const json = await lemonFetch<{ data: { id: string; attributes: { url: string } } }>(
    "/checkouts",
    { method: "POST", body: JSON.stringify(payload) },
  );

  return { id: json.data.id, url: json.data.attributes.url };
}

export async function cancelSubscription(lemonSubscriptionId: string): Promise<void> {
  await lemonFetch(`/subscriptions/${encodeURIComponent(lemonSubscriptionId)}`, {
    method: "DELETE",
  });
}

export async function getSubscription(lemonSubscriptionId: string): Promise<LemonSubscription> {
  const json = await lemonFetch<{ data: LemonSubscription }>(
    `/subscriptions/${encodeURIComponent(lemonSubscriptionId)}`,
  );
  return json.data;
}

/** Verify Lemon webhook HMAC (`X-Signature` = hex HMAC-SHA256 of raw body). */
export function verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): void {
  if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) {
    throw new AppError("LEMONSQUEEZY_WEBHOOK_SECRET is not configured", 503);
  }
  if (!signature) throw new AppError("Missing X-Signature header", 400);

  const digest = createHmac("sha256", env.LEMONSQUEEZY_WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(signature, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AppError("Invalid Lemon Squeezy webhook signature", 400);
  }
}

export function parseWebhookPayload(rawBody: Buffer): LemonWebhookPayload {
  return JSON.parse(rawBody.toString("utf8")) as LemonWebhookPayload;
}
