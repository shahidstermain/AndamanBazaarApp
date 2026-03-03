import request from "supertest";
import { app } from "../../src/app";
import { prisma } from "../../src/db/prisma";

const describeIfDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDatabase("POST /api/leads", () => {
  let dbReady = true;

  beforeAll(async () => {
    try {
      await prisma.$connect();
    } catch (err) {
      dbReady = false;
      console.warn("Skipping lead integration tests; database unavailable:", err);
      throw err;
    }
  });

  beforeEach(async () => {
    if (!dbReady) return;
    await prisma.lead.deleteMany();
  });

  afterAll(async () => {
    if (!dbReady) return;
    await prisma.$disconnect();
  });

  it("creates a lead for a valid payload", async () => {
    const payload = {
      name: "Aarav Singh",
      phone: "9999988888",
      email: "aarav@example.com",
      preferred_date: "2026-07-12",
      location: "Havelock Elephant Beach",
      activities: ["Snorkeling", "Sea Walking"],
      adults: 2,
      children: 0,
      swimming_ability: "Intermediate",
      budget: 12000,
      referral_source: "Google Search",
      special_requests: "Need pickup from jetty",
      consent: true,
    };

    if (!dbReady) return;

    const response = await request(app).post("/api/leads").send(payload);
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ ok: true });

    const created = await prisma.lead.findFirst({
      where: {
        phone: payload.phone,
      },
    });

    expect(created).not.toBeNull();
    expect(created?.name).toBe(payload.name);
    expect(created?.activities).toContain("Snorkeling");
    expect(created?.status).toBe("new");
  });

  it("returns validation errors for invalid payload", async () => {
    const invalidPayload = {
      name: "",
      phone: "123",
      preferred_date: "invalid-date",
      location: "",
      activities: [],
      adults: 0,
      swimming_ability: "",
      budget: 0,
      consent: false,
    };

    if (!dbReady) return;

    const response = await request(app).post("/api/leads").send(invalidPayload);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
    expect(Array.isArray(response.body.errors)).toBe(true);

    const count = await prisma.lead.count();
    expect(count).toBe(0);
  });
});
