import { notFound } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { getItinerary } from "@andaman-planner/supabase";
import { ItineraryView } from "@andaman-planner/ui";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ItineraryPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) notFound();

  const itinerary = await getItinerary(supabase, id, user.id).catch(() => null);
  if (!itinerary) notFound();

  return (
    <ItineraryView
      itinerary={itinerary}
      onBack={undefined}
    />
  );
}
