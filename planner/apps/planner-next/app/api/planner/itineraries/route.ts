import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { listItineraries } from "@andaman-planner/supabase";

const API_VERSION = "v1";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { apiVersion: API_VERSION, error: { code: "UNAUTHENTICATED", message: "Session required." } },
      { status: 401 }
    );
  }

  try {
    const itineraries = await listItineraries(supabase, user.id);
    return NextResponse.json({ apiVersion: API_VERSION, itineraries });
  } catch (err) {
    console.error("[GET /api/planner/itineraries]", err);
    return NextResponse.json(
      {
        apiVersion: API_VERSION,
        error: { code: "FETCH_ERROR", message: "Failed to fetch itineraries." },
      },
      { status: 500 }
    );
  }
}
