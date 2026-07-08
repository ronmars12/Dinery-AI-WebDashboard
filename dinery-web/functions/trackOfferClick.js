// functions/trackOfferClick.js
//
// Public HTTP endpoint that the "Book Your Next Visit" link in thank you
// emails points to. It logs the click (incrementing crm_stats.offerClicks
// and writing an offer_clicks event doc for per-campaign reporting), then
// 302-redirects the guest on to the real reservation page with the offer
// code and campaignId preserved in the query string.
//
// Example incoming URL:
//   https://asia-southeast1-dinery-9c261.cloudfunctions.net/trackOfferClick
//     ?restaurantId=abc123&offer=WELCOME10&campaignId=res_789&reservationId=res_789
//
// Redirects to:
//   https://dashboard.dinery.ai/reserve/abc123?offer=WELCOME10&campaignId=res_789

const { onRequest } = require("firebase-functions/v2/https");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) initializeApp();

// Where guests land after the click is logged. Keep in sync with BASE_URL
// in sendThankYouEmails.js.
const BASE_URL = "https://dashboard.dinery.ai";

const trackOfferClick = onRequest(
  { region: "asia-southeast1", cors: true },
  async (req, res) => {
    const { restaurantId, offer, campaignId, reservationId } = req.query;

    if (!restaurantId) {
      res.status(400).send("Missing restaurantId");
      return;
    }

    try {
      const db = getFirestore();

      // Aggregate counter used by the CRM overview dashboard
      const statsRef = db.collection("crm_stats").doc(String(restaurantId));
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(statsRef);
        const current = snap.exists ? snap.data().offerClicks || 0 : 0;
        tx.set(statsRef, { offerClicks: current + 1 }, { merge: true });
      });

      // Individual event log — useful later for per-campaign breakdowns,
      // click timing analysis, de-duping repeat clicks, etc.
      await db.collection("offer_clicks").add({
        restaurantId: String(restaurantId),
        campaignId: campaignId ? String(campaignId) : null,
        offerCode: offer ? String(offer) : null,
        reservationId: reservationId ? String(reservationId) : null,
        clickedAt: Timestamp.now(),
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (err) {
      // Never block the guest's redirect just because logging failed
      console.error("❌ trackOfferClick logging error:", err);
    }

    const params = new URLSearchParams();
    if (offer) params.set("offer", String(offer));
    if (campaignId) params.set("campaignId", String(campaignId));
    const query = params.toString();

    const redirectUrl = `${BASE_URL}/reserve/${encodeURIComponent(String(restaurantId))}${query ? `?${query}` : ""}`;

    res.redirect(302, redirectUrl);
  }
);

module.exports = { trackOfferClick };