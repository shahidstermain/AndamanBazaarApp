import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  AiItineraryOutputSchema,
  type AiItineraryOutput,
  type TripPreferences,
} from "@andaman-planner/shared";

const PRIMARY_MODEL = "gemini-1.5-pro";
const REPAIR_MODEL = "gemini-1.5-flash";
const MAX_RETRIES = 3;

// ─── System prompt with deep Andaman knowledge ───────────────────────────────
function buildSystemPrompt(): string {
  return `You are an expert Andaman & Nicobar Islands travel planner. Create a detailed, realistic, day-by-day itinerary as STRICT JSON.

GEOGRAPHY & ROUTING RULES:
- All trips START and END in Port Blair (only air/sea gateway).
- Inter-island routes: Port Blair↔Havelock (2-2.5h speedboat or 3-4h govt ferry), Port Blair↔Neil (1.5h speedboat), Havelock↔Neil (45min speedboat), Port Blair→Baratang (3h road+ferry), Port Blair→Diglipur (12h govt ferry or 45min flight).
- Never schedule full-day island activities AND inter-island travel on the same day without accounting for 3-4h transit.
- Always keep Day 1 and last day in Port Blair for arrival/departure.

ISLANDS & HIGHLIGHTS:
- Port Blair: Cellular Jail (⚠️ book Sound & Light show ₹200 in advance, 6pm show), Ross Island (₹30, ruins+deer), North Bay Island (glass-bottom boat+snorkeling ₹500), Corbyn's Cove Beach, Chatham Saw Mill.
- Havelock (Swaraj Dweep): Radhanagar Beach (Asia's top beach, sunset, free), Elephant Beach (snorkeling ₹50+gear rental ₹400), Kalapathar Beach (sunrise). Best diving/snorkeling in India.
- Neil (Shaheed Dweep): Natural Bridge (auto-rickshaw ₹500 round trip), Bharatpur Beach (snorkeling ₹150), Laxmanpur Beach (sunset). Rent bicycle ₹100/day. Quieter & cheaper than Havelock.
- Baratang: Limestone Caves (govt boat ₹200, must book at Baratang Jetty), Mud Volcano (1.5h walk), Parrot Island (green parrots at dusk). Day-trip only, no good accommodation.
- Diglipur: Saddle Peak trekking (8km, permit required), Smith Island turtle nesting (seasonal Oct-Mar), pristine & remote.
- Jolly Buoy / Red Skin Island: Marine National Park, pristine corals. Only Oct-May. Entry ₹50 + boat ₹500.

MANDATORY ROUTING: Include Port Blair sightseeing on Day 1 (post-arrival) and last day (pre-departure). The AI cannot skip Port Blair.

PERMIT: Foreign nationals need Restricted Area Permit (RAP) — obtainable at Port Blair airport or Foreigners Registration Office. Indian nationals auto-cleared.

WEATHER: Best season Oct–May. Jun–Sep is monsoon (rough seas, limited ferries, not recommended for island-hopping). If dates fall in monsoon, warn in trip description.

BUDGET GUIDELINES (per person per day, excluding flights to Port Blair):
- budget: accommodation ₹800-1,500/night + ₹400-600 food + govt ferries. Total: ₹1,500-2,500/day.
- midrange: accommodation ₹2,000-5,000/night + ₹800-1,200 food + speedboats. Total: ₹3,500-6,000/day.
- premium: accommodation ₹7,000-20,000/night + ₹1,500+ food + private boats. Total: ₹8,000-15,000/day.

ACCOMMODATION NAMES (use real options):
- Port Blair budget: Hotel Sinclairs Bayview (budget-mid), Welcomhotel Bay Island, Hotel Peerless Sarovar.
- Havelock budget: Pristine Beach Resort, Eco Villa, Forest Villa. Mid: Barefoot Scuba, Emerald Gecko. Premium: Taj Exotica Resort & Spa (₹18,000+), Havelock Island Beach Resort.
- Neil budget: Sea Shell Neil, Aqua Breeze Resort. Mid: Coco de Mer.

OUTPUT FORMAT: Return ONLY a raw JSON object. No markdown, no code blocks, no explanation. The exact JSON schema to follow:`;
}

// ─── Output JSON schema description for the AI ───────────────────────────────
function buildSchemaDescription(): string {
  return `
{
  "name": "string (catchy, specific trip title, e.g. 'Havelock & Neil Island Explorer — 7 Nights')",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "islandsCovered": ["Port Blair", "..."],
  "estimatedBudgetRange": "₹X,XXX – ₹Y,YYY per person (total for the trip)",
  "days": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "island": "Port Blair",
      "title": "Arrival & Cellular Jail",
      "description": "2-3 sentence overview of the day",
      "activities": [
        {
          "time": "HH:MM",
          "name": "string",
          "description": "string",
          "duration": "X hours",
          "cost": number_in_inr_per_person,
          "bookingRequired": boolean,
          "category": "beach|diving|sightseeing|adventure|cultural|food|relaxation|nature"
        }
      ],
      "accommodation": {
        "name": "string",
        "type": "budget_hostel|guesthouse|mid_range_hotel|resort|luxury_resort",
        "estimatedCostPerNight": number_in_inr,
        "area": "string"
      },
      "meals": ["string"],
      "transport": [
        {
          "type": "ferry|speedboat|bus|auto_rickshaw|taxi|flight|walk",
          "from": "string",
          "to": "string",
          "duration": "string",
          "estimatedCost": number_in_inr_per_person,
          "notes": "string"
        }
      ],
      "estimatedCost": number_total_per_person_for_day,
      "tips": ["string"]
    }
  ]
}`;
}

// ─── User prompt builder ─────────────────────────────────────────────────────
function buildUserPrompt(prefs: TripPreferences): string {
  const duration = Math.round(
    (new Date(prefs.endDate).getTime() - new Date(prefs.startDate).getTime()) /
      86_400_000
  );
  const islandHint =
    prefs.preferredIslands.length > 0
      ? `Preferred islands: ${prefs.preferredIslands.join(", ")}.`
      : "Choose optimal islands based on duration and preferences.";

  return `Create a complete ${duration}-night Andaman itinerary with these requirements:
- Dates: ${prefs.startDate} to ${prefs.endDate} (${duration} nights)
- Travelers: ${prefs.travelersCount} person(s)
- Budget level: ${prefs.budgetLevel}
- Pace: ${prefs.pace}
- Interests: ${prefs.interests.join(", ")}
- ${islandHint}
${prefs.notes ? `- Special notes: ${prefs.notes}` : ""}

Rules:
1. Day 1 = arrival in Port Blair, local sightseeing.
2. Last day = morning activity + departure from Port Blair.
3. For ${prefs.pace} pace: ${
  prefs.pace === "relaxed" ? "2-3 activities/day max, include rest/beach time" :
  prefs.pace === "balanced" ? "3-4 activities/day, good mix of exploration and relaxation" :
  "4-5 activities/day, maximize sightseeing"
}.
4. Budget (${prefs.budgetLevel}): choose accommodation, transport and restaurants accordingly.
5. All costs in Indian Rupees (INR) per person.

Return ONLY the JSON object following the schema exactly.`;
}

// ─── JSON extraction helper ──────────────────────────────────────────────────
function extractJson(text: string): string {
  // Try to find JSON object boundaries
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

// ─── Repair prompt ───────────────────────────────────────────────────────────
function buildRepairPrompt(rawJson: string, validationErrors: string): string {
  return `The following JSON failed schema validation. Fix it to match the required schema exactly.

Validation errors:
${validationErrors}

Return ONLY the corrected JSON object, no markdown or explanation:

${rawJson.slice(0, 8000)}`; // truncate to avoid token limits
}

// ─── Main generate function ──────────────────────────────────────────────────
export async function generateItinerary(
  prefs: TripPreferences,
  apiKey: string
): Promise<{ output: AiItineraryOutput; modelVersion: string }> {
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured on the server");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  let lastError: Error | null = null;
  let rawJson = "";

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt === 1) {
        // Primary call: gemini-1.5-pro with full system prompt
        const model = genAI.getGenerativeModel({
          model: PRIMARY_MODEL,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.7,
            maxOutputTokens: 8192,
          },
        });

        const systemPrompt = buildSystemPrompt() + buildSchemaDescription();
        const userPrompt = buildUserPrompt(prefs);

        const result = await model.generateContent([
          { text: systemPrompt },
          { text: userPrompt },
        ]);
        rawJson = result.response.text();
      } else {
        // Repair call: gemini-1.5-flash — cheaper, faster, just fix JSON
        const flashModel = genAI.getGenerativeModel({
          model: REPAIR_MODEL,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        });

        const repairPrompt = buildRepairPrompt(rawJson, lastError?.message ?? "Unknown error");
        const result = await flashModel.generateContent(repairPrompt);
        rawJson = result.response.text();
      }

      // Extract and parse JSON
      const cleanJson = extractJson(rawJson);
      const parsed = JSON.parse(cleanJson);

      // Validate against Zod schema
      const validated = AiItineraryOutputSchema.safeParse(parsed);
      if (validated.success) {
        return {
          output: validated.data,
          modelVersion: attempt === 1 ? PRIMARY_MODEL : `${REPAIR_MODEL}@repair`,
        };
      }

      lastError = new Error(
        validated.error.issues
          .slice(0, 5)
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")
      );
      console.warn(`[AI Generator] Attempt ${attempt} validation failed:`, lastError.message);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[AI Generator] Attempt ${attempt} error:`, lastError.message);
    }
  }

  throw new Error(
    `Failed to generate valid itinerary after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
}
