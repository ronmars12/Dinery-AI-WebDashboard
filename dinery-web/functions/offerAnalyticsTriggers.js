// functions/offerAnalyticsTriggers.js
//
// Firestore triggers that complete the offer funnel:
//   Offers sent → Offer link clicks → Reservations created via offer → Offers redeemed
//
// "Offers sent" is counted in sendThankYouEmails.js.
// "Offer link clicks" is counted in trackOfferClick.js.
// This file counts the last two steps, keyed off the `offerCode` / `offerCampaignId`
// metadata that your reservation creation form must attach when a guest books
// after landing via an offer link (see the snippet noted in the accompanying
// integration notes — this repo doesn't include that form, so it needs a
// small manual addition there).

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) initializeApp();

async function incrementStat(db, restaurantId, field, by = 1) {
  const statsRef = db.collection("crm_stats").doc(restaurantId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const current = snap.exists ? snap.data()[field] || 0 : 0;
    tx.set(statsRef, { [field]: current + by }, { merge: true });
  });
}

// Fires on every new reservation. If it carries `offerCode` metadata (attached
// by the booking form when the guest arrived via a tracked offer link),
// increments crm_stats.offerReservationsCreated for that restaurant.
const onReservationCreatedTrackOffer = onDocumentCreated(
  { document: "reservations/{reservationId}", region: "asia-southeast1" },
  async (event) => {
    const data = event.data?.data();
    if (!data?.offerCode) return; // not an offer-attributed booking

    const restaurantId = data.restaurant_id;
    if (!restaurantId) return;

    const db = getFirestore();
    try {
      await incrementStat(db, restaurantId, "offerReservationsCreated");
      console.log(`✅ Offer reservation counted: ${event.params.reservationId} (${data.offerCode})`);
    } catch (err) {
      console.error("❌ onReservationCreatedTrackOffer error:", err);
    }
  }
);

// Fires on every reservation update. If a reservation carrying an `offerCode`
// transitions to status "completed" for the first time, increments
// crm_stats.offersRedeemed and marks the reservation offerRedeemed=true so
// it's never double-counted (e.g. if status flips back and forth).
const onReservationUpdatedTrackRedemption = onDocumentUpdated(
  { document: "reservations/{reservationId}", region: "asia-southeast1" },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after?.offerCode) return;
    if (after.offerRedeemed === true) return; // already counted
    if (before?.status === "completed" || after.status !== "completed") return; // only on the transition into "completed"

    const restaurantId = after.restaurant_id;
    if (!restaurantId) return;

    const db = getFirestore();
    try {
      await incrementStat(db, restaurantId, "offersRedeemed");
      await event.data.after.ref.update({ offerRedeemed: true });
      console.log(`✅ Offer redemption counted: ${event.params.reservationId} (${after.offerCode})`);
    } catch (err) {
      console.error("❌ onReservationUpdatedTrackRedemption error:", err);
    }
  }
);

module.exports = { onReservationCreatedTrackOffer, onReservationUpdatedTrackRedemption };