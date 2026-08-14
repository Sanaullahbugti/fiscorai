import { z } from "zod";

export const periodSchema = z.object({
  fileType: z.enum(["monthly", "quarterly"]).default("monthly"),
  year: z.union([z.string(), z.number()]),
  month: z.union([z.string(), z.number()]).optional(),
  quarter: z.string().optional(),
  fileExtension: z.string().optional(),
});

export const uploadCsvSchema = z.object({
  fileType: z.enum(["monthly", "quarterly"]).optional(),
  year: z.union([z.string(), z.number()]).optional(),
  month: z.union([z.string(), z.number()]).optional(),
  quarter: z.string().optional(),
});

export type PeriodBody = z.infer<typeof periodSchema>;
