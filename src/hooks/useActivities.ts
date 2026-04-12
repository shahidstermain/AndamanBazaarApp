import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { Activity, UserPreferences, ActivityFilterParams } from "../../types";

const ACTIVITIES_COLLECTION = "activities";

/**
 * Smart Hook for fetching and personalized ranking of activities.
 * Requires Firestore Composite Index: island ASC, type ASC, price ASC.
 */
export const useActivities = (
  filters: ActivityFilterParams,
  userPrefs: UserPreferences | null,
) => {
  const {
    data: rawActivities,
    isLoading,
    error,
  } = useQuery<Activity[]>({
    queryKey: ["activities", filters.islands, filters.types],
    queryFn: async () => {
      let q = query(collection(db, ACTIVITIES_COLLECTION));

      if (filters.islands && filters.islands.length > 0) {
        // Requires index on island
        q = query(q, where("island", "in", filters.islands));
      }

      if (filters.types && filters.types.length > 0) {
        // Requires index on type
        // Firestore limits 'in' operator arrays to 10 elements
        const limitedTypes = filters.types.slice(0, 10);
        q = query(q, where("type", "in", limitedTypes));
      }

      // Recommend composite index: collection('activities').where('island').where('type').orderBy('price')
      // Note: Ordering by price may conflict with multiple 'in' queries depending on Firestore limitations,
      // so we handle price sorting client-side for maximum flexibility with multi-dimensional arrays.
      q = query(q, limit(100));

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as Activity,
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes cache to prevent re-renders on filter changes
  });

  const processedActivities = useMemo(() => {
    if (!rawActivities) return [];

    const filtered = rawActivities.filter((activity: Activity) => {
      if (
        activity.price < filters.budgetRange[0] ||
        activity.price > filters.budgetRange[1]
      )
        return false;
      if (
        activity.durationMinutes < filters.durationRange[0] ||
        activity.durationMinutes > filters.durationRange[1]
      )
        return false;
      if (filters.familyFriendly && !activity.familyFriendly) return false;
      if (
        filters.requiresSwimming !== undefined &&
        activity.requiresSwimming !== filters.requiresSwimming
      )
        return false;
      if (activity.rating < filters.minRating) return false;
      return true;
    });

    const currentMonth = new Intl.DateTimeFormat("en-US", {
      month: "short",
    }).format(new Date());

    const scored = filtered.map((activity: Activity) => {
      let score = 0;
      const reasons: string[] = [];

      if (!userPrefs) {
        score = (activity.rating / 5) * 100;
        return { ...activity, matchScore: Math.round(score), matchReasons: [] };
      }

      if (activity.price <= userPrefs.budget) {
        score += 30;
        if (activity.price >= userPrefs.budget * 0.7)
          reasons.push("Perfectly fits your budget");
      } else {
        const budgetFactor = Math.max(
          0,
          1 - (activity.price - userPrefs.budget) / userPrefs.budget,
        );
        score += budgetFactor * 30;
      }

      if (userPrefs.interests.includes(activity.type)) {
        score += 25;
        reasons.push(`Top match for your interest in ${activity.type}`);
      }

      const personaMap: Record<string, string[]> = {
        Adventure: ["Scuba Diving", "Snorkeling", "Trekking", "Water Sports"],
        Relaxation: ["Leisure", "Beaches"],
        Culture: ["History", "Leisure"],
        Luxury: ["Leisure", "Scuba Diving"],
      };

      if (personaMap[userPrefs.persona]?.includes(activity.type)) {
        score += 15;
        reasons.push(`Highly recommended for ${userPrefs.persona} seekers`);
      }

      if (userPrefs.groupType === "family" && activity.familyFriendly) {
        score += 10;
        reasons.push("Excellent for family groups");
      } else if (
        userPrefs.groupType === "solo" &&
        activity.difficulty === "Hard"
      ) {
        score += 5;
      }

      if (activity.season.includes(currentMonth)) {
        score += 10;
        reasons.push("Optimal conditions this month");
      }

      score += (activity.rating / 5) * 10;

      return {
        ...activity,
        matchScore: Math.round(score),
        matchReasons: reasons.slice(0, 2),
      };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore);
  }, [rawActivities, filters, userPrefs]);

  return {
    activities: processedActivities,
    isLoading,
    error,
  };
};
