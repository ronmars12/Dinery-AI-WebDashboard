// functions/trackOfferClick.js
//
// Public HTTP endpoint that the "Book Your Next Visit" link in thank you
// emails points to. It logs the click (incrementing crm_stats.offerClicks
// and writing an offer_clicks event doc for per-campaign reporting), then
// 302-redirects the guest on to the real reservation page with the offer
// code and campaignId preserved in the query string.
//
// crm_stats now lives nested under each restaurant document:
//   {restaurantCollection}/{restaurantId}/crm_stats/config
// restaurantCollection is passed through the URL (defaults to "restaurants"
// if missing, for backward compatibility with older email links).
//
// Example incoming URL:
//   https://asia-southeast1-dinery-9c261.cloudfunctions.net/trackOfferClick
//     ?restaurantId=abc123&restaurantCollection=restaurants&offer=WELCOME10
//     &offerId=xyz&campaignId=res_789&reservationId=res_789&source=crm_email
//
// Redirects to:
//   https://dashboard.dinery.ai/reserve/abc123?offer=WELCOME10&offerId=xyz&campaignId=res_789&source=crm_email

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
    const {
      restaurantId,
      restaurantCollection,
      offer,
      offerId,
      campaignId,
      reservationId,
      source,
    } = req.query;

    if (!restaurantId) {
      res.status(400).send("Missing restaurantId");
      return;
    }

    const col = restaurantCollection ? String(restaurantCollection) : "restaurants";

    try {
      const db = getFirestore();

      // Aggregate counter used by the CRM overview dashboard — now nested
      // under the restaurant doc instead of a top-level collection.
      const statsRef = db
        .collection(col)
        .doc(String(restaurantId))
        .collection("crm_stats")
        .doc("config");

      await db.runTransaction(async (tx) => {
        const snap = await tx.get(statsRef);
        const current = snap.exists ? snap.data().offerClicks || 0 : 0;
        tx.set(statsRef, { offerClicks: current + 1 }, { merge: true });
      });

      // Individual event log — useful later for per-campaign breakdowns,
      // click timing analysis, de-duping repeat clicks, etc.
      await db.collection("offer_clicks").add({
        restaurantId: String(restaurantId),
        restaurantCollection: col,
        campaignId: campaignId ? String(campaignId) : null,
        offerCode: offer ? String(offer) : null,
        offerId: offerId ? String(offerId) : null,
        reservationId: reservationId ? String(reservationId) : null,
        source: source ? String(source) : null,
        clickedAt: Timestamp.now(),
        userAgent: req.headers["user-agent"] || null,
      });
    } catch (err) {
      // Never block the guest's redirect just because logging failed
      console.error("❌ trackOfferClick logging error:", err);
    }

    const params = new URLSearchParams();
    if (offer) params.set("offer", String(offer));
    if (offerId) params.set("offerId", String(offerId));
    if (campaignId) params.set("campaignId", String(campaignId));
    if (source) params.set("source", String(source));
    const query = params.toString();

    const redirectUrl = `${BASE_URL}/reserve/${encodeURIComponent(String(restaurantId))}${query ? `?${query}` : ""}`;

    res.redirect(302, redirectUrl);
  }
);

module.exports = { trackOfferClick };