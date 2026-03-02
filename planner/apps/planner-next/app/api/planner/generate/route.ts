import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@andaman-planner/shared";
import { generateItinerary } from "../../../../lib/ai/generator";
import { createClient, createAdminClient } from "../../../../lib/supabase/server";
import { saveItinerary } from "@andaman-planner/supabase";
import { checkAndIncrementRateLimit } from "@andaman-planner/supabase";

const API_VERSION = "v1";
const MAX_GENERATIONS_PER_HOUR = parseInt(
  process.env.PLANNER_MAX_GENERATIONS_PER_HOUR ?? "5"
);

function errorResponse(code: string, message: string, status: number, details?: unknown) {
  return NextResponse.json(
    { apiVersion: API_VERSION, error: { code, message, details } },
    { status }
  );
}

export async function POST(request: NextRequest) {
  // 1. Parse + validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON.", 400);
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid trip preferences.",
      400,
      parsed.error.flatten()
    );
  }

  // 2. Verify authenticated user (middleware handles this, but double-check)
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return errorResponse("UNAUTHENTICATED", "Valid Supabase session required.", 401);
  }

  // 3. Rate limiting (per user, per hour)
  const adminClient = createAdminClient();
  const rateLimit = await checkAndIncrementRateLimit(
    adminClient,
    user.id,
    MAX_GENERATIONS_PER_HOUR
  );

  if (!rateLimit.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      `You can generate up to ${rateLimit.limit} itineraries per hour. Try again later.`,
      429,
      { count: rateLimit.count, limit: rateLimit.limit, windowKey: rateLimit.windowKey }
    );
  }

  // 4. Generate itinerary via Gemini AI
  const apiKey = process.env.GOOGLE_AI_API_KEY ?? "";
  if (!apiKey) {
    return errorResponse(
      "AI_NOT_CONFIGURED",
      "AI service is not configured on this server.",
      503
    );
  }

  let aiOutput: Awaited<ReturnType<typeof generateItinerary>>;
  try {
    aiOutput = await generateItinerary(parsed.data.preferences, apiKey);
  } catch (err) {
    console.error("[/api/planner/generate] AI error:", err);
    return errorResponse(
      "AI_GENERATION_FAILED",
      err instanceof Error ? err.message : "Itinerary generation failed.",
      500
    );
  }

  // 5. Persist to Supabase planner.itineraries
  let saved;
  try {
    saved = await saveItinerary(supabase, {
      userId: user.id,
      name: aiOutput.output.name,
      startDate: aiOutput.output.startDate,
      endDate: aiOutput.output.endDate,
      preferences: parsed.data.preferences,
      days: aiOutput.output.days,
      islandsCovered: aiOutput.output.islandsCovered,
      estimatedBudgetRange: aiOutput.output.estimatedBudgetRange,
      modelVersion: aiOutput.modelVersion,
    });
  } catch (err) {
    console.error("[/api/planner/generate] Save error:", err);
    // Return the generated itinerary even if save fails (degrade gracefully)
    const unsaved = {
      id: "temp-" + Date.now(),
      userId: user.id,
      ...aiOutput.output,
      modelVersion: aiOutput.modelVersion,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return NextResponse.json(
      { apiVersion: API_VERSION, itinerary: unsaved, saved: false },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { apiVersion: API_VERSION, itinerary: saved },
    { status: 200 }
  );
}
