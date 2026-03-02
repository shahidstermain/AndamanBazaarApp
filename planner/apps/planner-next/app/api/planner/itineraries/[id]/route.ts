import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getItinerary, deleteItinerary } from "@andaman-planner/supabase";

const API_VERSION = "v1";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const itinerary = await getItinerary(supabase, id, user.id);
    if (!itinerary) {
      return NextResponse.json(
        { apiVersion: API_VERSION, error: { code: "NOT_FOUND", message: "Itinerary not found." } },
        { status: 404 }
      );
    }
    return NextResponse.json({ apiVersion: API_VERSION, itinerary });
  } catch (err) {
    console.error("[GET /api/planner/itineraries/:id]", err);
    return NextResponse.json(
      { apiVersion: API_VERSION, error: { code: "FETCH_ERROR", message: "Failed to fetch itinerary." } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    await deleteItinerary(supabase, id, user.id);
    return NextResponse.json({ apiVersion: API_VERSION, deleted: true });
  } catch (err) {
    console.error("[DELETE /api/planner/itineraries/:id]", err);
    return NextResponse.json(
      { apiVersion: API_VERSION, error: { code: "DELETE_ERROR", message: "Failed to delete itinerary." } },
      { status: 500 }
    );
  }
}
