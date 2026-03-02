import { z } from "zod";

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().max(max).optional(),
  );

export const leadCreateSchema = z.object({
  name: z.string().min(2, "Name is required").max(120),
  phone: z.string().min(7, "Phone is required").max(30),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().email("Email must be valid").optional(),
  ),
  preferred_date: z
    .string()
    .min(1, "Preferred date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Preferred date must be valid"),
  location: z.string().min(2, "Location is required").max(120),
  activities: z.array(z.string().min(1)).min(1, "Select at least one activity"),
  adults: z.coerce.number().int().min(1, "At least one adult is required").max(20),
  children: z.coerce.number().int().min(0).max(20).default(0),
  swimming_ability: z.string().min(2, "Swimming ability is required").max(50),
  budget: z.coerce.number().int().min(500, "Budget is required").max(500_000),
  referral_source: optionalString(120),
  special_requests: optionalString(2000),
  consent: z.boolean().refine((value) => value === true, "Consent is required"),
});

export type LeadCreateInput = z.infer<typeof leadCreateSchema>;
