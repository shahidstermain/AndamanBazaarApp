import { z } from "zod";

export const activitiesFilterSchema = z.object({
  location: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  featured: z
    .preprocess((value) => {
      if (value === undefined) return undefined;
      if (value === "true" || value === true) return true;
      if (value === "false" || value === false) return false;
      return value;
    }, z.boolean().optional())
    .default(false),
});

export type ActivitiesFilterInput = z.infer<typeof activitiesFilterSchema>;
