import { z } from "zod";

export const checkoutSessionSchema = z.object({
  plan: z.string().min(1),
});

export const confirmSessionSchema = z.object({
  sessionId: z.string().min(1),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
export type ConfirmSessionInput = z.infer<typeof confirmSessionSchema>;
