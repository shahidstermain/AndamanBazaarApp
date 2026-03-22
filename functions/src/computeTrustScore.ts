import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Ensure Firebase is initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Computes a Trust Score for an operator and their activities.
 * 
 * Score out of 100 based on:
 * - 40% Average Rating
 * - 30% Review Volume
 * - 30% Operator Tier Validation
 */
export const computeTrustScore = onCall(async (request: CallableRequest) => {
  const { operatorId } = request.data;
  
  if (!operatorId || typeof operatorId !== 'string') {
    throw new HttpsError('invalid-argument', 'The function must be called with an operatorId.');
  }

  const db = admin.firestore();

  try {
    // 1. Fetch Operator Profile
    const operatorDoc = await db.collection('profiles').doc(operatorId).get();
    
    // Default fallback if not found
    let operatorTier = 'basic';

    if (operatorDoc.exists) {
      const data = operatorDoc.data();
      if (data?.is_operator) {
        // Map from operator_verification_status (types.ts legacy) or new verficationTier
        operatorTier = data.verificationTier || (data.operator_verification_status === 'verified' ? 'verified' : 'basic');
      }
    }

    // 2. Fetch all reviews for this operator's activities
    // NOTE: Requires composite index if querying across activities efficiently,
    // assuming here we fetch all activities, then their reviews.
    const activitiesSnapshot = await db.collection('activities').where('operatorId', '==', operatorId).get();
    let totalReviews = 0;
    let sumRatings = 0;

    for (const activityDoc of activitiesSnapshot.docs) {
      const data = activityDoc.data();
      totalReviews += data.reviewCount || 0;
      sumRatings += (data.rating || 0) * (data.reviewCount || 0);
    }

    let avgRating = totalReviews > 0 ? sumRatings / totalReviews : 0;

    // 3. Algorithm Calculation
    // Avg Rating: 5.0 -> 40 points
    const ratingScore = Math.min((avgRating / 5) * 40, 40);

    // Volume: Logarithmic growth up to 30 points (e.g., 50 reviews = max)
    const volumeScore = totalReviews === 0 ? 0 : Math.min((Math.log10(totalReviews + 1) / Math.log10(51)) * 30, 30);

    // Verification: Premium = 30, Verified = 20, Basic = 5
    let verificationScore = 5;
    if (operatorTier === 'premium') verificationScore = 30;
    if (operatorTier === 'verified') verificationScore = 20;

    // Penalty for no reviews if verified long ago could be added here
    let finalScore = Math.round(ratingScore + volumeScore + verificationScore);
    
    // Determine badge level
    let badge = 'Low';
    if (finalScore >= 85 && operatorTier === 'premium') badge = 'Premium';
    else if (finalScore >= 60 && operatorTier === 'verified') badge = 'Trusted';
    else if (finalScore >= 40) badge = 'Good';

    // Update Operator Doc
    await db.collection('operators').doc(operatorId).set({
      trustScore: finalScore,
      trustBadge: badge,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Update all their activities
    const batch = db.batch();
    activitiesSnapshot.docs.forEach((doc: any) => {
      batch.update(doc.ref, {
        trustScore: finalScore,
        trustBadge: badge
      });
    });

    if (activitiesSnapshot.size > 0) {
      await batch.commit();
    }

    return {
      success: true,
      operatorId,
      trustScore: finalScore,
      badge,
      metrics: {
        avgRating,
        totalReviews,
        operatorTier
      }
    };

  } catch (error) {
    console.error("Error computing trust score:", error);
    throw new HttpsError('internal', 'Unable to compute trust score.');
  }
});
