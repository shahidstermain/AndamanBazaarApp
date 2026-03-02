"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlannerForm } from "@andaman-planner/ui";
import { LoadingSpinner } from "@andaman-planner/ui";
import type { TripPreferences, Itinerary } from "@andaman-planner/shared";

export default function PlannerPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(preferences: TripPreferences) {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message ?? "Failed to generate itinerary.";
        setError(
          res.status === 429
            ? `Rate limit reached: ${msg}`
            : res.status === 503
            ? "AI service is not configured. Please add GOOGLE_AI_API_KEY to your environment."
            : msg
        );
        return;
      }

      const itinerary: Itinerary = data.itinerary;
      router.push(`/itinerary/${itinerary.id}`);
    } catch (err) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Plan Your Andaman Trip ✨
        </h1>
        <p className="text-gray-500 mt-2 text-base">
          Answer a few questions and get a personalised, AI-crafted day-by-day itinerary for the
          Andaman &amp; Nicobar Islands.
        </p>
      </div>

      <PlannerForm onSubmit={handleSubmit} isLoading={isLoading} error={error} />
    </div>
  );
}
