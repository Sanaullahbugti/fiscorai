import { z } from "zod";

export const activatePlanSchema = z.object({
  plan: z.string().optional(),
});

export type ActivatePlanInput = z.infer<typeof activatePlanSchema>;
