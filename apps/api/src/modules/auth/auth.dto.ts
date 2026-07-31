import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  businessUser: z.boolean().optional(),
  influencer: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(2),
  password: z.string().min(6),
  contact: z.string().optional(),
  plan: z.string().optional(),
});

export const changePasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
