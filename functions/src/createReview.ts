import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Creates a Verified Review
 * 
 * Validates that the user actually completed the booking.
 */
export const createReview = onCall(async (request: CallableRequest) => {
  // Authentication check
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError('unauthenticated', 'You must be logged in to leave a review.');
  }

  const userId = request.auth.uid;
  const { activityId, bookingId, ratings, comment, mediaUrls } = request.data;

  // Validation
  if (!activityId || !bookingId || !ratings || typeof comment !== 'string') {
    throw new HttpsError('invalid-argument', 'Missing required review fields.');
  }

  const db = admin.firestore();

  try {
    // 1. Verify Escrow / Booking completion
    const bookingDoc = await db.collection('bookings').doc(bookingId).get();
    
    if (!bookingDoc.exists) {
      throw new HttpsError('not-found', 'Booking not found.');
    }

    const bookingData = bookingDoc.data()!;
    if (bookingData.user_id !== userId) {
      throw new HttpsError('permission-denied', 'You can only review your own bookings.');
    }

    if (bookingData.booking_status !== 'completed' && bookingData.booking_status !== 'paid') {
       throw new HttpsError('failed-precondition', 'You can only review completed or paid experiences.');
    }

    // Check if review already exists for this booking
    const existingReview = await db.collection('reviews').where('bookingId', '==', bookingId).get();
    if (!existingReview.empty) {
      throw new HttpsError('already-exists', 'A review for this booking already exists.');
    }

    // 2. Calculate average rating
    const vals = Object.values(ratings) as number[];
    const avgRating = vals.reduce((a, b) => a + b, 0) / vals.length;

    // 3. Batch Write: Create Review + Update Activity Stats
    const reviewRef = db.collection('reviews').doc();
    const activityRef = db.collection('activities').doc(activityId);

    await db.runTransaction(async (transaction: any) => {
      const activityDoc = await transaction.get(activityRef);
      if (!activityDoc.exists) {
        throw new HttpsError('not-found', 'Activity not found.');
      }

      const actData = activityDoc.data()!;
      const newReviewCount = (actData.reviewCount || 0) + 1;
      const newRating = (((actData.rating || 0) * (actData.reviewCount || 0)) + avgRating) / newReviewCount;

      transaction.set(reviewRef, {
        id: reviewRef.id,
        userId,
        activityId,
        bookingId,
        ratings,
        avgRating,
        comment,
        mediaUrls: mediaUrls || [],
        createdAt: new Date().toISOString()
      });

      transaction.update(activityRef, {
        rating: Math.round(newRating * 10) / 10,
        reviewCount: newReviewCount
      });
    });

    return { success: true, reviewId: reviewRef.id };

  } catch (error: any) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error("Error creating review:", error);
    throw new HttpsError('internal', 'Internal error while processing review.');
  }
});
