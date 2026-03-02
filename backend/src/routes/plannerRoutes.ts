import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import rateLimit from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import {
  createItinerary,
  listItineraries,
  getItineraryById,
  createPlannerSupabaseClient,
} from "../services/plannerService";
import {
  generateRequestSchema,
  type TripPreferences,
  type ItineraryDay,
} from "../schemas/plannerSchema";
import { logger } from "../config/logger";
import { env } from "../config/env";

const plannerGenerateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: "Too many itinerary generations. Please try again in an hour.",
  },
});

const MODEL_VERSION = "gemini-2.0-flash-v1";

function getAuthToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim();
}

async function getUserId(req: Request): Promise<string | null> {
  const token = getAuthToken(req);
  if (!token) return null;
  const url = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  const supabase = createClient(url, key);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user.id;
}

function getPlannerClient(req: Request) {
  const url = process.env.SUPABASE_URL ?? env.SUPABASE_URL ?? "";
  const anonKey = process.env.SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY ?? "";
  const token = getAuthToken(req);
  return createPlannerSupabaseClient(
    { url: url.startsWith("http") ? url : `https://${url}`, anonKey },
    token || undefined
  );
}

const ANDAMAN_SYSTEM_PROMPT = `You are an expert Andaman & Nicobar Islands travel planner. Generate a detailed, realistic itinerary as JSON only.

RULES:
- Output ONLY valid JSON matching the exact schema below. No markdown, no code blocks.
- Islands must be real: Port Blair, Havelock, Neil Island, Baratang, Ross Island, North Bay, Jolly Buoy, Red Skin, Long Island, Diglipur, Rangat, Mayabunder.
- Ferry schedules are limited: Port Blair ↔ Havelock typically 2-3x/day. Plan accordingly.
- No impossible same-day island hops (e.g. Port Blair → Havelock → Neil in one day).
- Each day must have 1+ activities with title, description. Optional: time, location, island, estimatedDuration, estimatedCost.
- Budget levels: budget (₹15–25k/person for 5d), midrange (₹35–55k), premium (₹70k+).
- Generate a short trip "name" (e.g. "5-Day Havelock & Neil Island Explorer").

SCHEMA (output this structure):
{
  "name": "string",
  "startDate": "ISO date string from preferences",
  "endDate": "ISO date string from preferences",
  "preferences": <full TripPreferences object>,
  "days": [
    {
      "date": "ISO date",
      "island": "string",
      "theme": "optional string",
      "activities": [
        { "time": "HH:mm", "title": "string", "description": "string", "location": "optional", "island": "optional", "estimatedDuration": "optional", "estimatedCost": "optional" }
      ],
      "accommodation": "optional string",
      "travelNotes": "optional string"
    }
  ],
  "islandsCovered": ["string"],
  "estimatedBudgetRange": "e.g. ₹40,000 - ₹55,000 per person"
}`;

function buildUserPrompt(prefs: TripPreferences): string {
  return `Create an itinerary with these preferences:
- Dates: ${prefs.startDate} to ${prefs.endDate}
- Travelers: ${prefs.travelersCount}
- Budget: ${prefs.budgetLevel}
- Pace: ${prefs.pace}
- Interests: ${prefs.interests.join(", ") || "general exploration"}
- Preferred islands: ${prefs.preferredIslands.join(", ") || "any"}
${prefs.notes ? `- Notes: ${prefs.notes}` : ""}

Return ONLY the JSON object, no other text.`;
}

function extractJsonFromText(text: string): string {
  const s = text.trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return s;
  return s.slice(start, end + 1);
}

function normalizeGeneratedItinerary(
  raw: Record<string, unknown>,
  prefs: TripPreferences
): { name: string; days: ItineraryDay[]; islandsCovered: string[]; estimatedBudgetRange: string } {
  const name = (raw.name as string) || `Andaman Trip ${prefs.startDate}`;
  const days = Array.isArray(raw.days)
    ? (raw.days as ItineraryDay[]).filter(
        (d) => d && Array.isArray(d.activities) && d.activities.length > 0
      )
    : [];
  const islandsCovered = Array.isArray(raw.islandsCovered)
    ? raw.islandsCovered.filter((x): x is string => typeof x === "string")
    : [...new Set(days.map((d) => d.island).filter(Boolean))];
  const estimatedBudgetRange =
    (raw.estimatedBudgetRange as string) || "To be determined";
  return { name, days, islandsCovered, estimatedBudgetRange };
}

const router = Router();

router.post("/generate", plannerGenerateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized. Please sign in." });
      return;
    }

    const parsed = generateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten(),
      });
      return;
    }
    const { preferences } = parsed.data;

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      logger.error("GOOGLE_AI_API_KEY not configured");
      res.status(500).json({ error: "AI service not configured" });
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [
        { role: "user", parts: [{ text: ANDAMAN_SYSTEM_PROMPT }] },
        { role: "user", parts: [{ text: buildUserPrompt(preferences) }] },
      ],
    });
    const text = result.response.text();
    if (!text) {
      res.status(500).json({ error: "AI generated no response" });
      return;
    }

    const jsonStr = extractJsonFromText(text);
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(jsonStr);
    } catch {
      res.status(500).json({ error: "AI response was not valid JSON" });
      return;
    }

    const { name, days, islandsCovered, estimatedBudgetRange } =
      normalizeGeneratedItinerary(raw, preferences);

    if (days.length === 0) {
      res.status(500).json({ error: "AI generated an empty itinerary" });
      return;
    }

    const itinerary = await createItinerary(getPlannerClient(req), userId, {
      name,
      start_date: preferences.startDate,
      end_date: preferences.endDate,
      preferences,
      days,
      islands_covered: islandsCovered,
      estimated_budget_range: estimatedBudgetRange,
      model_version: MODEL_VERSION,
    });

    res.json({
      apiVersion: "v1",
      itinerary,
    });
  } catch (err) {
    logger.error(err, "Planner generate error");
    res.status(500).json({ error: "Failed to generate itinerary" });
  }
});

router.get("/itineraries", async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized. Please sign in." });
      return;
    }

    const itineraries = await listItineraries(getPlannerClient(req), userId);
    res.json({
      apiVersion: "v1",
      itineraries,
    });
  } catch (err) {
    logger.error(err, "Planner list itineraries error");
    res.status(500).json({ error: "Failed to list itineraries" });
  }
});

router.get("/itineraries/:id", async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      res.status(401).json({ error: "Unauthorized. Please sign in." });
      return;
    }

    const id = req.params.id;
    if (!id || Array.isArray(id)) {
      res.status(404).json({ error: "Itinerary not found" });
      return;
    }

    const itinerary = await getItineraryById(
      getPlannerClient(req),
      id,
      userId
    );
    if (!itinerary) {
      res.status(404).json({ error: "Itinerary not found" });
      return;
    }

    res.json({
      apiVersion: "v1",
      itinerary,
    });
  } catch (err) {
    logger.error(err, "Planner get itinerary error");
    res.status(500).json({ error: "Failed to get itinerary" });
  }
});

export { router as plannerRouter };
