import { leadCreateSchema } from "../../src/schemas/leadSchema";

describe("leadCreateSchema", () => {
  it("accepts a valid payload", () => {
    const payload = {
      name: "Rahul Das",
      phone: "9876543210",
      email: "rahul@example.com",
      preferred_date: "2026-06-20",
      location: "North Bay",
      activities: ["Scuba Diving", "Jet Skiing"],
      adults: 2,
      children: 1,
      swimming_ability: "Beginner",
      budget: 9000,
      referral_source: "Instagram",
      special_requests: "Need underwater photography",
      consent: true,
    };

    const result = leadCreateSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects payload without consent", () => {
    const payload = {
      name: "Rahul Das",
      phone: "9876543210",
      preferred_date: "2026-06-20",
      location: "North Bay",
      activities: ["Scuba Diving"],
      adults: 2,
      swimming_ability: "Beginner",
      budget: 9000,
      consent: false,
    };

    const result = leadCreateSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("Consent");
    }
  });
});
