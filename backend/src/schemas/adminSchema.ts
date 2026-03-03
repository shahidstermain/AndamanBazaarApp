import { z } from "zod";

export const leadStatusSchema = z.object({
  status: z.enum(["new", "contacted", "confirmed"]),
});

export const adminLeadQuerySchema = z.object({
  status: z.enum(["new", "contacted", "confirmed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export type AdminLeadQuery = z.infer<typeof adminLeadQuerySchema>;
