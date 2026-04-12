import * as functions from "firebase-functions";
import { logger } from "firebase-functions/v2";
import { admin } from "../utils/admin";

/**
 * Scheduled Cloud Function: Expire Boosts
 * Runs every hour to find listings whose boost has expired
 * and resets their boost flags.
 *
 * How it works:
 * 1. Queries listings where isBoosted=true AND boostExpiresAt < now
 * 2. Resets isBoosted/boostTier/boostExpiresAt on each listing
 * 3. Updates the corresponding listingBoosts record to 'expired'
 * 4. Logs each expiry for audit
 */
export const expireBoosts = functions.pubsub
  .schedule("every 1 hours")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = admin.firestore.Timestamp.now();

    try {
      // Find all listings with expired boosts
      const expiredSnap = await admin
        .firestore()
        .collection("listings")
        .where("isBoosted", "==", true)
        .where("boostExpiresAt", "<=", now)
        .get();

      if (expiredSnap.empty) {
        logger.info("No expired boosts found");
        return;
      }

      logger.info(`Found ${expiredSnap.size} expired boosts to clean up`);

      const batch = admin.firestore().batch();
      const expiredListingIds: string[] = [];

      for (const doc of expiredSnap.docs) {
        // Reset listing boost flags
        batch.update(doc.ref, {
          isBoosted: false,
          boostTier: admin.firestore.FieldValue.delete(),
          boostExpiresAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
        expiredListingIds.push(doc.id);
      }

      await batch.commit();

      // Update corresponding listingBoosts records
      for (const listingId of expiredListingIds) {
        const boostsSnap = await admin
          .firestore()
          .collection("listingBoosts")
          .where("listingId", "==", listingId)
          .where("status", "==", "paid")
          .get();

        for (const boostDoc of boostsSnap.docs) {
          const boost = boostDoc.data();
          if (
            boost.boostExpiresAt &&
            boost.boostExpiresAt.toMillis() <= now.toMillis()
          ) {
            await boostDoc.ref.update({
              status: "expired",
              updatedAt: admin.firestore.Timestamp.now(),
            });

            // Audit log
            await admin.firestore().collection("paymentAuditLog").add({
              type: "BOOST_EXPIRED",
              boostId: boostDoc.id,
              orderId: boost.orderId,
              listingId,
              userId: boost.userId,
              tier: boost.tier,
              source: "scheduled_cleanup",
              timestamp: admin.firestore.Timestamp.now(),
            });
          }
        }
      }

      logger.info(`Successfully expired ${expiredListingIds.length} boosts`, {
        listingIds: expiredListingIds,
      });
    } catch (error) {
      logger.error("expireBoosts scheduled function failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  });
