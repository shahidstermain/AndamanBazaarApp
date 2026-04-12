import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

interface ComputeScoreRequest {
  activityId: string;
  price: number;
  type: string;
  rating: number;
  difficulty: "Easy" | "Medium" | "Hard";
  familyFriendly: boolean;
  season: string[];
}

interface UserPreferences {
  budget: number;
  interests: string[];
  persona: string;
  groupType: "family" | "solo" | "couple";
}

/**
 * Feature 5/6: Server-side match score computation.
 * Use for authoritative ranking when generating recommended lists or exporting to partners.
 * Mirrors the optimized client-side scoring logic for consistency.
 */
export const computeMatchScore = onCall(
  async (request: CallableRequest<any>) => {
    // Input Validation
    if (!request.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to compute personalized scores.",
      );
    }

    if (!request.data.activityId || !request.data.price) {
      throw new HttpsError(
        "invalid-argument",
        "Activity ID and basic attributes are required.",
      );
    }

    try {
      const activity: ComputeScoreRequest = request.data;

      // In a real scenario, fetch UserPreferences from Firestore securely using request.auth.uid
      // For this demonstration, we assume userPrefs are passed or mocked per requirements.
      const userPrefs: UserPreferences = request.data.userPrefs;

      if (!userPrefs) {
        return {
          matchScore: Math.round((activity.rating / 5) * 100),
          matchReasons: [],
        };
      }

      let score = 0;
      const reasons: string[] = [];

      // 1. Budget Alignment (30%)
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

      // 2. Interest Match (25%)
      if (userPrefs.interests.includes(activity.type)) {
        score += 25;
        reasons.push(`Top match for your interest in ${activity.type}`);
      }

      // 3. User Persona Alignment (15%)
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

      // 4. Group Compatibility (10%)
      if (userPrefs.groupType === "family" && activity.familyFriendly) {
        score += 10;
        reasons.push("Excellent for family groups");
      } else if (
        userPrefs.groupType === "solo" &&
        activity.difficulty === "Hard"
      ) {
        score += 5;
      }

      // 5. Seasonal Relevance (10%)
      const currentMonth = new Intl.DateTimeFormat("en-US", {
        month: "short",
      }).format(new Date());
      if (activity.season.includes(currentMonth)) {
        score += 10;
        reasons.push("Optimal conditions this month");
      }

      // 6. Quality Base (10%)
      score += (activity.rating / 5) * 10;

      return {
        matchScore: Math.round(score),
        matchReasons: reasons.slice(0, 2),
      };
    } catch (error) {
      logger.error("Match Score Computation Error", error);
      throw new HttpsError("internal", "Failed to compute match score.");
    }
  },
);
