import * as functions from 'firebase-functions';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { admin } from './utils/admin';
import { getRequiredEnv, MODERATION_SECRET_BINDINGS, SECRET_NAMES } from './utils/secrets';

const moderationRuntime = functions.runWith({ secrets: MODERATION_SECRET_BINDINGS });
let geminiClient: GoogleGenerativeAI | null = null;

// Content Moderation Categories
const MODERATION_CATEGORIES = {
  VIOLENCE: 'violence',
  HATE_SPEECH: 'hate_speech',
  SEXUAL_CONTENT: 'sexual_content',
  SPAM: 'spam',
  SCAM: 'scam',
  INAPPROPRIATE_LANGUAGE: 'inappropriate_language',
  PERSONAL_INFO: 'personal_info',
  PROHIBITED_ITEMS: 'prohibited_items',
};

interface ModerateContentData {
  content: string;
  contentType: string;
  userId: string;
}

const getGeminiClient = (): GoogleGenerativeAI => {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(getRequiredEnv(SECRET_NAMES.GEMINI_API_KEY));
  }

  return geminiClient;
};

const moderateContentInternal = async (data: ModerateContentData, callerUid: string): Promise<any> => {
  const { content, contentType, userId } = data;

  // Validate input
  if (!content || !contentType || !userId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  // Check if user is authorized to moderate this content
  if (userId !== callerUid) {
    throw new functions.https.HttpsError('permission-denied', 'Access denied');
  }

  // Get moderation prompt based on content type
  const prompt = getModerationPrompt(contentType);

  // Call Gemini AI for moderation
  const model = getGeminiClient().getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(`${prompt}\n\nContent to moderate:\n${content}`);
  const response = await result.response;
  const text = response.text();

  // Parse AI response
  const moderationResult = parseModerationResponse(text);

  // Store moderation result
  await admin.firestore().collection('content_moderations').add({
    userId,
    contentType,
    content: content.substring(0, 500), // Store first 500 chars
    approved: moderationResult.approved,
    confidence: moderationResult.confidence,
    flaggedCategories: moderationResult.flaggedCategories,
    suggestions: moderationResult.suggestions,
    aiResponse: text,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // If content is not approved, create a moderation task for review
  if (!moderationResult.approved) {
    await admin.firestore().collection('moderation_tasks').add({
      userId,
      contentType,
      content,
      flaggedCategories: moderationResult.flaggedCategories,
      confidence: moderationResult.confidence,
      status: 'pending_review',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return moderationResult;
};

// Moderate Content
export const moderateContent = moderationRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    return await moderateContentInternal(data as ModerateContentData, context.auth.uid);
  } catch (error) {
    console.error('Error moderating content:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Content moderation failed');
  }
});

// Batch Moderate Content
export const batchModerateContent = moderationRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { requests } = data;

  try {
    // Validate input
    if (!Array.isArray(requests) || requests.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Invalid requests array');
    }

    // Check rate limiting
    if (requests.length > 10) {
      throw new functions.https.HttpsError('invalid-argument', 'Too many requests (max 10)');
    }

    // Process each request
    const results = await Promise.all(
      requests.map(async (request) => {
        try {
          return await moderateContentInternal(request as ModerateContentData, context.auth!.uid);
        } catch (error) {
          return {
            approved: false,
            confidence: 0,
            flaggedCategories: ['error'],
            suggestions: [],
            error: error instanceof Error ? error.message : 'Moderation failed',
          };
        }
      })
    );

    return {
      success: true,
      results,
    };
  } catch (error) {
    console.error('Error in batch moderation:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Batch moderation failed');
  }
});

// Get Moderation History
export const getModerationHistory = moderationRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { limit = 20, startAfter } = data;

  try {
    let query = admin.firestore()
      .collection('content_moderations')
      .where('userId', '==', context.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();
    const moderations = snapshot.docs.map(doc => ({
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
    console.error('Error getting moderation history:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to get moderation history');
  }
});

// Auto-moderate new listings
export const autoModerateListing = moderationRuntime.firestore
  .document('listings/{listingId}')
  .onCreate(async (snap, context) => {
    const listing = snap.data();
    
    if (!listing || listing.status !== 'draft') {
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
      const moderationResult = await moderateContentInternal({
        content,
        contentType: 'listing',
        userId: listing.userId,
      }, listing.userId);

      // Update listing based on moderation result
      if (moderationResult.approved) {
        await snap.ref.update({
          status: 'active',
          moderationApproved: true,
          moderationApprovedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await snap.ref.update({
          status: 'flagged',
          moderationApproved: false,
          moderationFlaggedCategories: moderationResult.flaggedCategories,
          moderationSuggestions: moderationResult.suggestions,
          moderationFlaggedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Notify user about flagged content
        await admin.firestore().collection('notifications').add({
          userId: listing.userId,
          type: 'content_flagged',
          title: 'Listing Flagged for Review',
          message: `Your listing "${listing.title}" has been flagged for review. Please review the suggestions and update your listing.`,
          data: {
            listingId: context.params.listingId,
            flaggedCategories: moderationResult.flaggedCategories,
            suggestions: moderationResult.suggestions,
          },
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error auto-moderating listing:', error);
      // Don't block listing creation if moderation fails
      await snap.ref.update({
        status: 'active',
        moderationError: true,
        moderationErrorAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

// Helper function to get moderation prompt
function getModerationPrompt(contentType: string): string {
  const basePrompt = `You are a content moderator for AndamanBazaar, a local marketplace in the Andaman Islands. 
  Your task is to review content and determine if it's appropriate for the platform.
  
  Please analyze the content and respond with a JSON object containing:
  {
    "approved": boolean,
    "confidence": number (0-1),
    "flaggedCategories": array of strings,
    "suggestions": array of strings
  }
  
  Categories to check for: ${Object.values(MODERATION_CATEGORIES).join(', ')}
  
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

  return contentTypePrompts[contentType as keyof typeof contentTypePrompts] || basePrompt;
}

// Helper function to parse AI moderation response
function parseModerationResponse(text: string): any {
  try {
    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate response structure
    return {
      approved: Boolean(parsed.approved),
      confidence: Number(parsed.confidence) || 0,
      flaggedCategories: Array.isArray(parsed.flaggedCategories) ? parsed.flaggedCategories : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch (error) {
    console.error('Error parsing moderation response:', error);
    console.log('Raw response:', text);
    
    // Default to safe values if parsing fails
    return {
      approved: false,
      confidence: 0,
      flaggedCategories: ['parsing_error'],
      suggestions: ['Content could not be automatically moderated. Please review manually.'],
    };
  }
}

// Get moderation statistics
export const getModerationStats = moderationRuntime.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const stats = await admin.firestore()
      .collection('content_moderations')
      .where('userId', '==', context.auth.uid)
      .get();

    const totalModerations = stats.size;
    const approvedCount = stats.docs.filter(doc => doc.data().approved).length;
    const flaggedCount = totalModerations - approvedCount;

    // Get category breakdown
    const categoryCounts: Record<string, number> = {};
    stats.docs.forEach(doc => {
      const data = doc.data();
      data.flaggedCategories?.forEach((category: string) => {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      });
    });

    return {
      success: true,
      stats: {
        totalModerations,
        approvedCount,
        flaggedCount,
        approvalRate: totalModerations > 0 ? approvedCount / totalModerations : 0,
        categoryBreakdown: categoryCounts,
      },
    };
  } catch (error) {
    console.error('Error getting moderation stats:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to get moderation stats');
  }
});
