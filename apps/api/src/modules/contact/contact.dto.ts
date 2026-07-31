import { z } from "zod";

export const createContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
