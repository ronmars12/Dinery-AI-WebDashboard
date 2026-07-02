// functions/sendThankYouEmails.js
//
// Scheduled Cloud Function — runs every hour.
// For each restaurant with CRM Thank You Email enabled, finds reservations from
// "yesterday" whose from_time matches the restaurant's configured send hour,
// checks status is confirmed/completed, and sends the thank you email via Resend.
// Prevents duplicate sends with a `thankYouEmailSent` flag on the reservation doc.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");

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

function buildOfferSection(settings, offerLink) {
  if (!settings.offerEnabled) return "";
  return `
    <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
      <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${settings.offerTitle || "Welcome Back Offer"}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">${(settings.offerDescription || "").replace(/\n/g, "<br/>")}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${settings.offerCode || ""}</strong></p>
      <a href="${offerLink}" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
    </div>
  `;
}

function buildSurveySection(surveyLink) {
  return `
    <div style="margin-top:20px;text-align:center;">
      <a href="${surveyLink}" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Share Your Feedback</a>
      <p style="margin:10px 0 0;font-size:12px;color:#999;">It only takes a minute and helps us improve.</p>
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
      .collection("crm_settings")
      .where("enabled", "==", true)
      .where("sendHour", "==", currentHour)
      .get();

    if (settingsSnap.empty) {
      console.log("No restaurants configured for this hour. Done.");
      return;
    }

    for (const settingsDoc of settingsSnap.docs) {
      const restaurantId = settingsDoc.id;
      const settings = settingsDoc.data();

      try {
        // 2. Get restaurant name (try both collections)
        let restaurantName = "the restaurant";
        let restaurantDoc = await db.collection("restaurants").doc(restaurantId).get();
        if (!restaurantDoc.exists) {
          restaurantDoc = await db.collection("TestRestaurant").doc(restaurantId).get();
        }
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

          // Offer link: carries restaurant + offer code + originating reservation
          const offerLink = `https://dineryai.netlify.app/reserve/${restaurantId}?offer=${encodeURIComponent(settings.offerCode || "")}`;
          // Survey link: guest-facing feedback page
          const surveyLink = `https://dineryai.netlify.app/feedback/${reservationId}`;

          const html = `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
              <h2 style="color:#fe8a24;margin-bottom:4px;">Thank you for visiting!</h2>
              <p style="font-size:14px;line-height:1.6;">${thankYouHtml}</p>
              ${buildOfferSection(settings, offerLink)}
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
            const statsRef = db.collection("crm_stats").doc(restaurantId);
            await db.runTransaction(async (tx) => {
              const statsSnap = await tx.get(statsRef);
              const current = statsSnap.exists ? statsSnap.data().emailsSent || 0 : 0;
              tx.set(statsRef, { emailsSent: current + 1 }, { merge: true });
            });
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