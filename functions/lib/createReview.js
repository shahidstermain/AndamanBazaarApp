"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createReview = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
if (!admin.apps.length) {
    admin.initializeApp();
}
/**
 * Creates a Verified Review
 *
 * Validates that the user actually completed the booking.
 */
exports.createReview = (0, https_1.onCall)(async (request) => {
    // Authentication check
    if (!request.auth || !request.auth.uid) {
        throw new https_1.HttpsError('unauthenticated', 'You must be logged in to leave a review.');
    }
    const userId = request.auth.uid;
    const { activityId, bookingId, ratings, comment, mediaUrls } = request.data;
    // Validation
    if (!activityId || !bookingId || !ratings || typeof comment !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'Missing required review fields.');
    }
    const db = admin.firestore();
    try {
        // 1. Verify Escrow / Booking completion
        const bookingDoc = await db.collection('bookings').doc(bookingId).get();
        if (!bookingDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Booking not found.');
        }
        const bookingData = bookingDoc.data();
        if (bookingData.user_id !== userId) {
            throw new https_1.HttpsError('permission-denied', 'You can only review your own bookings.');
        }
        if (bookingData.booking_status !== 'completed' && bookingData.booking_status !== 'paid') {
            throw new https_1.HttpsError('failed-precondition', 'You can only review completed or paid experiences.');
        }
        // 2. Calculate average rating
        const vals = Object.values(ratings);
        const avgRating = vals.reduce((a, b) => a + b, 0) / vals.length;
        // 3. Batch Write: Create Review + Update Activity Stats (with duplicate check inside transaction)
        const reviewRef = db.collection('reviews').doc();
        const activityRef = db.collection('activities').doc(activityId);
        await db.runTransaction(async (transaction) => {
            // Check for duplicate review inside the transaction to prevent TOCTOU race condition
            const existingReviewQuery = await db.collection('reviews').where('bookingId', '==', bookingId).limit(1).get();
            if (!existingReviewQuery.empty) {
                throw new https_1.HttpsError('already-exists', 'A review for this booking already exists.');
            }
            const activityDoc = await transaction.get(activityRef);
            if (!activityDoc.exists) {
                throw new https_1.HttpsError('not-found', 'Activity not found.');
            }
            const actData = activityDoc.data();
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
    }
    catch (error) {
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        console.error("Error creating review:", error);
        throw new https_1.HttpsError('internal', 'Internal error while processing review.');
    }
});
//# sourceMappingURL=createReview.js.map