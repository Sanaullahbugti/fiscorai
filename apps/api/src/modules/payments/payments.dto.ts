import { z } from "zod";

export const checkoutSessionSchema = z.object({
  plan: z.string().min(1),
});

/** sessionId optional — Lemon redirect may omit it; thank-you polls subscription. */
export const confirmSessionSchema = z.object({
  sessionId: z.string().min(1).optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;
