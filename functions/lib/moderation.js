"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      }
    : function (o, v) {
        o["default"] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null)
      for (var k in mod)
        if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.getModerationStats =
  exports.autoModerateListing =
  exports.getModerationHistory =
  exports.batchModerateContent =
  exports.moderateContent =
    void 0;
const functions = __importStar(require("firebase-functions"));
const generative_ai_1 = require("@google/generative-ai");
const admin_1 = require("./utils/admin");
const secrets_1 = require("./utils/secrets");
const moderationRuntime = functions.runWith({
  secrets: secrets_1.MODERATION_SECRET_BINDINGS,
});
let geminiClient = null;
// Content Moderation Categories
const MODERATION_CATEGORIES = {
  VIOLENCE: "violence",
  HATE_SPEECH: "hate_speech",
  SEXUAL_CONTENT: "sexual_content",
  SPAM: "spam",
  SCAM: "scam",
  INAPPROPRIATE_LANGUAGE: "inappropriate_language",
  PERSONAL_INFO: "personal_info",
  PROHIBITED_ITEMS: "prohibited_items",
};
const getGeminiClient = () => {
  if (!geminiClient) {
    geminiClient = new generative_ai_1.GoogleGenerativeAI(
      (0, secrets_1.getRequiredEnv)(secrets_1.SECRET_NAMES.GEMINI_API_KEY),
    );
  }
  return geminiClient;
};
const moderateContentInternal = async (data, callerUid) => {
  const { content, contentType, userId } = data;
  // Validate input
  if (!content || !contentType || !userId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required fields",
    );
  }
  // Check if user is authorized to moderate this content
  if (userId !== callerUid) {
    throw new functions.https.HttpsError("permission-denied", "Access denied");
  }
  // Get moderation prompt based on content type
  const prompt = getModerationPrompt(contentType);
  // Call Gemini AI for moderation
  const model = getGeminiClient().getGenerativeModel({
    model: "gemini-1.5-flash",
  });
  const result = await model.generateContent(
    `${prompt}\n\nContent to moderate:\n${content}`,
  );
  const response = await result.response;
  const text = response.text();
  // Parse AI response
  const moderationResult = parseModerationResponse(text);
  // Store moderation result
  await admin_1.admin
    .firestore()
    .collection("content_moderations")
    .add({
      userId,
      contentType,
      content: content.substring(0, 500),
      approved: moderationResult.approved,
      confidence: moderationResult.confidence,
      flaggedCategories: moderationResult.flaggedCategories,
      suggestions: moderationResult.suggestions,
      aiResponse: text,
      createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
    });
  // If content is not approved, create a moderation task for review
  if (!moderationResult.approved) {
    await admin_1.admin.firestore().collection("moderation_tasks").add({
      userId,
      contentType,
      content,
      flaggedCategories: moderationResult.flaggedCategories,
      confidence: moderationResult.confidence,
      status: "pending_review",
      createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  return moderationResult;
};
// Moderate Content
exports.moderateContent = moderationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }
    try {
      return await moderateContentInternal(data, context.auth.uid);
    } catch (error) {
      console.error("Error moderating content:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Content moderation failed",
      );
    }
  },
);
// Batch Moderate Content
exports.batchModerateContent = moderationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }
    const { requests } = data;
    try {
      // Validate input
      if (!Array.isArray(requests) || requests.length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Invalid requests array",
        );
      }
      // Check rate limiting
      if (requests.length > 10) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Too many requests (max 10)",
        );
      }
      // Process each request
      const results = await Promise.all(
        requests.map(async (request) => {
          try {
            return await moderateContentInternal(request, context.auth.uid);
          } catch (error) {
            return {
              approved: false,
              confidence: 0,
              flaggedCategories: ["error"],
              suggestions: [],
              error:
                error instanceof Error ? error.message : "Moderation failed",
            };
          }
        }),
      );
      return {
        success: true,
        results,
      };
    } catch (error) {
      console.error("Error in batch moderation:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Batch moderation failed",
      );
    }
  },
);
// Get Moderation History
exports.getModerationHistory = moderationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }
    const { limit = 20, startAfter } = data;
    try {
      let query = admin_1.admin
        .firestore()
        .collection("content_moderations")
        .where("userId", "==", context.auth.uid)
        .orderBy("createdAt", "desc")
        .limit(limit);
      if (startAfter) {
        query = query.startAfter(startAfter);
      }
      const snapshot = await query.get();
      const moderations = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      return {
        success: true,
        moderations,
        hasMore: moderations.length === limit,
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
      };
    } catch (error) {
      console.error("Error getting moderation history:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get moderation history",
      );
    }
  },
);
// Auto-moderate new listings
exports.autoModerateListing = moderationRuntime.firestore
  .document("listings/{listingId}")
  .onCreate(async (snap, context) => {
    const listing = snap.data();
    if (!listing || listing.status !== "draft") {
      return;
    }
    try {
      // Prepare content for moderation
      const content = `
        Title: ${listing.title}
        Description: ${listing.description}
        Category: ${listing.category}
        Price: ${listing.price}
        City: ${listing.city}
      `;
      // Call moderation function
      const moderationResult = await moderateContentInternal(
        {
          content,
          contentType: "listing",
          userId: listing.userId,
        },
        listing.userId,
      );
      // Update listing based on moderation result
      if (moderationResult.approved) {
        await snap.ref.update({
          status: "active",
          moderationApproved: true,
          moderationApprovedAt:
            admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await snap.ref.update({
          status: "flagged",
          moderationApproved: false,
          moderationFlaggedCategories: moderationResult.flaggedCategories,
          moderationSuggestions: moderationResult.suggestions,
          moderationFlaggedAt:
            admin_1.admin.firestore.FieldValue.serverTimestamp(),
        });
        // Notify user about flagged content
        await admin_1.admin
          .firestore()
          .collection("notifications")
          .add({
            userId: listing.userId,
            type: "content_flagged",
            title: "Listing Flagged for Review",
            message: `Your listing "${listing.title}" has been flagged for review. Please review the suggestions and update your listing.`,
            data: {
              listingId: context.params.listingId,
              flaggedCategories: moderationResult.flaggedCategories,
              suggestions: moderationResult.suggestions,
            },
            read: false,
            createdAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
          });
      }
    } catch (error) {
      console.error("Error auto-moderating listing:", error);
      // Don't block listing creation if moderation fails
      await snap.ref.update({
        status: "active",
        moderationError: true,
        moderationErrorAt: admin_1.admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });
// Helper function to get moderation prompt
function getModerationPrompt(contentType) {
  const basePrompt = `You are a content moderator for AndamanBazaar, a local marketplace in the Andaman Islands. 
  Your task is to review content and determine if it's appropriate for the platform.
  
  Please analyze the content and respond with a JSON object containing:
  {
    "approved": boolean,
    "confidence": number (0-1),
    "flaggedCategories": array of strings,
    "suggestions": array of strings
  }
  
  Categories to check for: ${Object.values(MODERATION_CATEGORIES).join(", ")}
  
  For the Andaman Islands context, also check for:
  - Prohibited items (weapons, endangered species, illegal substances)
  - Scams or fraudulent activities
  - Personal information sharing
  - Inappropriate language or hate speech
  - Spam or promotional content
  `;
  const contentTypePrompts = {
    listing: `${basePrompt}
    
    For listings, specifically check:
    - Title and description accuracy
    - Appropriate pricing
    - Prohibited items (weapons, drugs, endangered species)
    - False claims or misleading information
    - Contact information in description
    `,
    chat: `${basePrompt}
    
    For chat messages, specifically check:
    - Personal information sharing
    - Inappropriate language
    - Scam attempts
    - Off-topic promotional content
    - Harassment or threats
    `,
    profile: `${basePrompt}
    
    For user profiles, specifically check:
    - Inappropriate names or descriptions
    - Fake or misleading information
    - Contact information in public fields
    - Inappropriate profile images
    `,
  };
  return contentTypePrompts[contentType] || basePrompt;
}
// Helper function to parse AI moderation response
function parseModerationResponse(text) {
  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    const parsed = JSON.parse(jsonMatch[0]);
    // Validate response structure
    return {
      approved: Boolean(parsed.approved),
      confidence: Number(parsed.confidence) || 0,
      flaggedCategories: Array.isArray(parsed.flaggedCategories)
        ? parsed.flaggedCategories
        : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    console.error("Error parsing moderation response:", error);
    console.log("Raw response:", text);
    // Default to safe values if parsing fails
    return {
      approved: false,
      confidence: 0,
      flaggedCategories: ["parsing_error"],
      suggestions: [
        "Content could not be automatically moderated. Please review manually.",
      ],
    };
  }
}
// Get moderation statistics
exports.getModerationStats = moderationRuntime.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated",
      );
    }
    try {
      const stats = await admin_1.admin
        .firestore()
        .collection("content_moderations")
        .where("userId", "==", context.auth.uid)
        .get();
      const totalModerations = stats.size;
      const approvedCount = stats.docs.filter(
        (doc) => doc.data().approved,
      ).length;
      const flaggedCount = totalModerations - approvedCount;
      // Get category breakdown
      const categoryCounts = {};
      stats.docs.forEach((doc) => {
        const data = doc.data();
        data.flaggedCategories?.forEach((category) => {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });
      });
      return {
        success: true,
        stats: {
          totalModerations,
          approvedCount,
          flaggedCount,
          approvalRate:
            totalModerations > 0 ? approvedCount / totalModerations : 0,
          categoryBreakdown: categoryCounts,
        },
      };
    } catch (error) {
      console.error("Error getting moderation stats:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get moderation stats",
      );
    }
  },
);
//# sourceMappingURL=moderation.js.map
