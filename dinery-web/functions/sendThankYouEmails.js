// functions/sendThankYouEmails.js
//
// Scheduled Cloud Function — runs every hour.
// For each restaurant with CRM Thank You Email enabled, finds reservations from
// "yesterday" whose from_time matches the restaurant's configured send hour,
// checks status is confirmed/completed, and sends the thank you email via Resend.
// Prevents duplicate sends with a `thankYouEmailSent` flag on the reservation doc.
//
// Offer links route through the `trackOfferClick` HTTP function (see
// functions/trackOfferClick.js) so clicks can be counted before redirecting
// the guest to the real reservation page. Each send carries a campaignId
// (the reservationId, since one offer email is sent per reservation) so the
// resulting booking — and its eventual "completed" status — can be
// attributed back to this campaign for ROI reporting.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");

// Base URL for guest-facing links in the email (offer / survey)
const BASE_URL = "https://dashboard.dinery.ai";
// HTTP endpoint that logs an offer-link click, then redirects to BASE_URL/reserve/...
// Update this if the trackOfferClick function is deployed under a different project/region.
const TRACK_CLICK_URL = "https://asia-southeast1-dinery-9c261.cloudfunctions.net/trackOfferClick";

// ── Helpers ────────────────────────────────────────────────────────────────

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

// Fills {{tags}} in the thank you message with reservation data
function fillTemplate(template, data) {
  return (template || "")
    .replace(/{{\s*restaurant_name\s*}}/g, data.restaurantName || "")
    .replace(/{{\s*customer_first_name\s*}}/g, data.firstName || "")
    .replace(/{{\s*customer_full_name\s*}}/g, data.fullName || "")
    .replace(/{{\s*reservation_date\s*}}/g, data.reservationDate || "")
    .replace(/{{\s*reservation_time\s*}}/g, data.reservationTime || "")
    .replace(/{{\s*party_size\s*}}/g, String(data.partySize || ""));
}

// Builds the offer HTML block from a real Offer document (from the Offers tab)
function buildOfferSection(offer, offerLink) {
  if (!offer) return "";
  return `
    <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
      <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${offer.offer_name || "Welcome Back Offer"}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">${(offer.description || "").replace(/\n/g, "<br/>")}</p>
      ${offer.discount_percent ? `<p style="margin:0 0 12px;font-size:13px;color:#555;">Discount: <strong>${offer.discount_percent}% off</strong></p>` : ""}
      <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${offer.offer_id}</strong></p>
      <a href="${offerLink}" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
    </div>
  `;
}
function buildSurveySection(surveyLink) {
  return `
    <div style="margin-top:24px;padding:20px;background:#fffbf5;border:1px solid #fde3c0;border-radius:12px;text-align:center;">
      <a href="${surveyLink}" style="text-decoration:none;display:block;">
        <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#1e293b;">⭐ Rate Your Experience</p>
        <p style="margin:0 0 10px;font-size:28px;letter-spacing:4px;line-height:1;">⭐⭐⭐⭐⭐</p>
        <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">It only takes 10 seconds, but it will help us a lot. ❤️</p>
        <p style="margin:6px 0 0;font-size:12px;color:#fe8a24;font-weight:bold;">Click the stars to rate your visit →</p>
      </a>
    </div>
  `;
}

async function sendViaResend(apiKey, { to, subject, html }) {
  if (!apiKey) {
    console.warn("⚠️ No RESEND_API_KEY — simulating send to", to);
    return { success: true, id: "simulated-" + Date.now() };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Dinery AI <no-reply@mail.dinery.ai>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err.message || "Resend request failed" };
  }
  const result = await response.json();
  return { success: true, id: result.id };
}

// Increments a numeric field on crm_stats/{restaurantId} inside a transaction
async function incrementStat(db, collectionName, restaurantId, field, by = 1) {
  const statsRef = db.collection(collectionName).doc(restaurantId).collection("crm_stats").doc("config");
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const current = snap.exists ? snap.data()[field] || 0 : 0;
    tx.set(statsRef, { [field]: current + by }, { merge: true });
  });
}

// ── Main scheduled function ───────────────────────────────────────────────

const sendThankYouEmails = onSchedule(
  {
    schedule: "every 60 minutes",
    region: "asia-southeast1",
    secrets: [resendApiKey],
    timeoutSeconds: 300,
  },
  async () => {
    const db = getFirestore();
    const apiKey = resendApiKey.value();

    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, "0");

    // "Yesterday" relative to now — email is sent the day after the visit
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const dayStart = startOfDay(yesterday);
    const dayEnd = endOfDay(yesterday);

    console.log(`🔵 sendThankYouEmails running. Hour=${currentHour}, target day=${dayStart.toDateString()}`);

    // 1. Find all restaurants with CRM enabled for this send hour
    const settingsSnap = await db
      .collectionGroup("crm_settings")
      .where("enabled", "==", true)
      .where("sendHour", "==", currentHour)
      .get();

    if (settingsSnap.empty) {
      console.log("No restaurants configured for this hour. Done.");
      return;
    }

    for (const settingsDoc of settingsSnap.docs) {
      // Doc path is {collection}/{restaurantId}/crm_settings/config
      const restaurantId = settingsDoc.ref.parent.parent.id;
      const restaurantCollection = settingsDoc.ref.parent.parent.parent.id;
      const settings = settingsDoc.data();

      try {
        // 2. Get restaurant name
        let restaurantName = "the restaurant";
        const restaurantDoc = await db.collection(restaurantCollection).doc(restaurantId).get();
        if (restaurantDoc.exists) {
          restaurantName = restaurantDoc.data().name || restaurantName;
        }
        // 3. Find yesterday's reservations for this restaurant
        const resSnap = await db
          .collection("reservations")
          .where("restaurant_id", "==", restaurantId)
          .where("reservation_date", ">=", Timestamp.fromDate(dayStart))
          .where("reservation_date", "<=", Timestamp.fromDate(dayEnd))
          .get();

        if (resSnap.empty) continue;

        for (const resDoc of resSnap.docs) {
          const reservation = resDoc.data();
          const reservationId = resDoc.id;

          // 4. Status check — only confirmed or completed
          if (!["confirmed", "completed"].includes(reservation.status)) continue;

          // 5. Duplicate prevention
          if (reservation.thankYouEmailSent === true) continue;

          // 6. Must have an email to send to
          const email = reservation.customer_email?.trim();
          if (!email) continue;

          const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
          const firstName = (reservation.customer_name || "").split(" ")[0] || "there";
          const fullName = reservation.customer_name || "Guest";

          const templateData = {
            restaurantName,
            firstName,
            fullName,
            reservationDate: resDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
            reservationTime: reservation.from_time || resDate.toTimeString().slice(0, 5),
            partySize: reservation.number_of_guests,
          };

          const thankYouHtml = fillTemplate(settings.thankYouMessage, templateData).replace(/\n/g, "<br/>");
          const campaignId = reservationId;

          let selectedOffer = null;
          if (settings.offerEnabled && settings.selectedOfferId) {
            const offerDoc = await db
              .collection(restaurantCollection)
              .doc(restaurantId)
              .collection("offer")
              .doc(settings.selectedOfferId)
              .get();
            if (offerDoc.exists) {
              const offerData = { id: offerDoc.id, ...offerDoc.data() };
              const nowDate = new Date();
              const todayOnly = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
              const startOk = !offerData.start_date || new Date(offerData.start_date) <= todayOnly;
              const endOk = !offerData.end_date || new Date(offerData.end_date) >= todayOnly;
              if (offerData.is_active !== false && startOk && endOk) {
                selectedOffer = offerData;
              } else {
                console.log(`⚠️ Selected offer ${settings.selectedOfferId} for restaurant ${restaurantId} is no longer active — skipping offer section.`);
              }
            }
          }

          // Offer link routes through the click-tracking redirect function
          const offerLink = selectedOffer
            ? `${TRACK_CLICK_URL}?restaurantId=${encodeURIComponent(restaurantId)}` +
              `&restaurantCollection=${encodeURIComponent(restaurantCollection)}` +
              `&offer=${encodeURIComponent(selectedOffer.offer_id)}` +
              `&offerId=${encodeURIComponent(selectedOffer.id)}` +
              `&campaignId=${encodeURIComponent(campaignId)}` +
              `&reservationId=${encodeURIComponent(reservationId)}` +
              `&source=${encodeURIComponent("crm_email")}`
            : "";

          // Survey link: guest-facing feedback page
          const surveyLink = `${BASE_URL}/feedback/${reservationId}`;

          const html = `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
              <h2 style="color:#fe8a24;margin-bottom:4px;">Thank you for visiting!</h2>
              <p style="font-size:14px;line-height:1.6;">${thankYouHtml}</p>
              ${buildOfferSection(selectedOffer, offerLink)}
              ${settings.surveyEnabled ? buildSurveySection(surveyLink) : ""}
              <p style="color:#aaa;font-size:11px;margin-top:28px;">You're receiving this because you recently dined with us.</p>
            </div>
          `;

          const result = await sendViaResend(apiKey, {
            to: email,
            subject: `Thank you for visiting ${restaurantName}!`,
            html,
          });

          if (result.success) {
            console.log(`✅ Thank you email sent to ${email} (reservation ${reservationId})`);
            await resDoc.ref.update({ thankYouEmailSent: true, thankYouEmailSentAt: Timestamp.now() });

            // Increment crm_stats.emailsSent counter
            await incrementStat(db, restaurantCollection, restaurantId, "emailsSent");
            if (selectedOffer) {
              await incrementStat(db, restaurantCollection, restaurantId, "offersSent");
            }
          } else {
            console.error(`❌ Failed to send to ${email}:`, result.error);
          }
        }
      } catch (err) {
        console.error(`❌ Error processing restaurant ${restaurantId}:`, err);
      }
    }

    console.log("🔵 sendThankYouEmails finished.");
  }
);

module.exports = { sendThankYouEmails };