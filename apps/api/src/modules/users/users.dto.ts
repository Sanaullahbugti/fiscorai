import { z } from "zod";

export { registerSchema } from "../auth/auth.dto.js";

export const updateUserSchema = z.object({
  username: z.string().optional(),
  alias: z.string().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
