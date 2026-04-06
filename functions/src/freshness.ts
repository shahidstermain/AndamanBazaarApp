import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Update listing freshness when seller is active (posts, replies, etc.)
export const updateListingFreshness = functions.https.onCall(async (data, context) => {
  if (!context.auth?.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }

  const userId = context.auth.uid;
  const now = new Date().toISOString();

  try {
    const db = admin.firestore();
    
    // Update all active listings for this seller
    const listingsSnap = await db.collection('listings')
      .where('user_id', '==', userId)
      .where('status', '==', 'active')
      .get();

    const batch = db.batch();
    
    listingsSnap.docs.forEach(doc => {
      batch.update(doc.ref, {
        last_active_at: now,
        availability_status: 'available',
        updated_at: now,
      });
    });

    await batch.commit();
    
    console.log(`Updated freshness for ${listingsSnap.size} listings for user ${userId}`);
    
    return { success: true, updatedCount: listingsSnap.size };
    
  } catch (error) {
    console.error('Error updating listing freshness:', error);
    throw new functions.https.HttpsError('internal', 'Failed to update listing freshness');
  }
});

// Mark listings as inactive if no activity for 30 days
export const markInactiveListings = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    try {
      const db = admin.firestore();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Find listings not updated in 30 days
      const staleListingsSnap = await db.collection('listings')
        .where('status', '==', 'active')
        .where('updated_at', '<', thirtyDaysAgo.toISOString())
        .get();

      const batch = db.batch();
      
      staleListingsSnap.docs.forEach(doc => {
        batch.update(doc.ref, {
          availability_status: 'inactive',
          updated_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();
      
      console.log(`Marked ${staleListingsSnap.size} listings as inactive`);
      
    } catch (error) {
      console.error('Error marking inactive listings:', error);
    }
  });

// Calculate seller response rates (runs daily)
export const calculateResponseRates = functions.pubsub
  .schedule('every 24 hours')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    try {
      const db = admin.firestore();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      // Get all sellers with active listings
      const sellersSnap = await db.collection('profiles')
        .where('total_listings', '>', 0)
        .get();

      for (const sellerDoc of sellersSnap.docs) {
        const sellerId = sellerDoc.id;
        
        // Get all chats where this seller is involved in last 7 days
        const chatsSnap = await db.collection('chats')
          .where('seller_id', '==', sellerId)
          .where('last_message_at', '>=', sevenDaysAgo.toISOString())
          .get();

        if (chatsSnap.empty) continue;

        let totalMessages = 0;
        let sellerResponses = 0;
        let totalResponseTime = 0;

        for (const chatDoc of chatsSnap.docs) {
          const messagesSnap = await db.collection('messages')
            .where('chat_id', '==', chatDoc.id)
            .orderBy('created_at', 'asc')
            .get();

          let lastMessageTime: Date | null = null;
          let lastSenderId: string | null = null;

          messagesSnap.forEach(msgDoc => {
            const msg = msgDoc.data() as any;
            const msgTime = new Date(msg.created_at);
            
            // Track response time when seller replies to buyer
            if (lastSenderId && lastSenderId !== msg.sender_id && msg.sender_id === sellerId) {
              sellerResponses++;
              if (lastMessageTime) {
                totalResponseTime += msgTime.getTime() - lastMessageTime.getTime();
              }
            }
            
            lastMessageTime = msgTime;
            lastSenderId = msg.sender_id;
            totalMessages++;
          });
        }

        const responseRate = totalMessages > 0 ? Math.round((sellerResponses / totalMessages) * 100) : 0;
        const avgResponseHours = sellerResponses > 0 ? Math.round(totalResponseTime / sellerResponses / (1000 * 60 * 60)) : 0;

        // Update seller profile
        await sellerDoc.ref.update({
          response_rate: responseRate,
          avg_response_hours: avgResponseHours,
        });

        // Update all their listings with response data
        const listingsSnap = await db.collection('listings')
          .where('user_id', '==', sellerId)
          .where('status', '==', 'active')
          .get();

        const listingBatch = db.batch();
        listingsSnap.forEach(listingDoc => {
          listingBatch.update(listingDoc.ref, {
            response_rate: responseRate,
            avg_response_hours: avgResponseHours,
          });
        });
        await listingBatch.commit();
      }

      console.log('Response rate calculation completed');
      
    } catch (error) {
      console.error('Error calculating response rates:', error);
    }
  });
