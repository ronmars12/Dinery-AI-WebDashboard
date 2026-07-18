// functions/sendAutomationQueue.js
//
// Scheduled Cloud Function — runs every hour, same pattern as
// sendThankYouEmails.js. Reads ONLY the automationQueue subcollections
// (via a collectionGroup query) for items that are due, validates each one
// right before sending, then sends via the existing sendEmail infrastructure.
//
// This function never scans reservations or guest history directly — it
// operates purely from the small automationQueue + guestActivity records
// written by ReservationModal.jsx (Phases 1 & 2), keeping Firestore reads
// low regardless of how large the restaurant's reservation history grows.

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { initializeApp, getApps } = require("firebase-admin/app");

if (!getApps().length) initializeApp();

const resendApiKey = defineSecret("RESEND_API_KEY");
const BASE_URL = "https://dashboard.dinery.ai";
const TRACK_CLICK_URL = "https://asia-southeast1-dinery-9c261.cloudfunctions.net/trackOfferClick";

// ── Helpers ──────────────────────────────────────────────────────────────

function fillTemplate(template, data) {
  return (template || "")
    .replace(/{{\s*restaurant_name\s*}}/g, data.restaurantName || "")
    .replace(/{{\s*customer_first_name\s*}}/g, data.firstName || "")
    .replace(/{{\s*customer_full_name\s*}}/g, data.fullName || "");
}

function buildOfferSection(offer, offerLink) {
  if (!offer) return "";
  return `
    <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
      <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${offer.offer_name || "Special Offer"}</p>
      <p style="margin:0 0 12px;font-size:13px;color:#555;">${(offer.description || "").replace(/\n/g, "<br/>")}</p>
      ${offer.discount_percent ? `<p style="margin:0 0 12px;font-size:13px;color:#555;">Discount: <strong>${offer.discount_percent}% off</strong></p>` : ""}
      <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${offer.offer_id}</strong></p>
      <a href="${offerLink}" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
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
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: "Dinery AI <no-reply@mail.dinery.ai>", to: [to], subject, html }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    return { success: false, error: err.message || "Resend request failed" };
  }
  const result = await response.json();
  return { success: true, id: result.id };
}

async function incrementStat(db, collectionName, restaurantId, field, by = 1) {
  const statsRef = db.collection(collectionName).doc(restaurantId).collection("crm_stats").doc("config");
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(statsRef);
    const current = snap.exists ? snap.data()[field] || 0 : 0;
    tx.set(statsRef, { [field]: current + by }, { merge: true });
  });
}

// ── Main scheduled function ─────────────────────────────────────────────

const sendAutomationQueue = onSchedule(
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

    console.log(`🔵 sendAutomationQueue running at ${now.toISOString()}`);

    // 1. Find due queue items across ALL restaurants — this is the only
    //    query that touches more than one guest's data, and it only reads
    //    the small queue docs, not reservations.
    const dueSnap = await db
      .collectionGroup("automationQueue")
      .where("status", "==", "pending")
      .where("executionDate", "<=", Timestamp.fromDate(now))
      .get();

    if (dueSnap.empty) {
      console.log("No automations due. Done.");
      return;
    }

    console.log(`Found ${dueSnap.docs.length} due automation(s).`);

    for (const queueDoc of dueSnap.docs) {
      const item = queueDoc.data();
      const restaurantId = queueDoc.ref.parent.parent.id;
      const restaurantCollection = queueDoc.ref.parent.parent.parent.id;

      try {
        // ── 2. Final lightweight validation — right before sending ───────
        const guestActivitySnap = await db
          .collection(restaurantCollection)
          .doc(restaurantId)
          .collection("guestActivity")
          .doc(item.guestId)
          .get();

        if (!guestActivitySnap.exists) {
          await queueDoc.ref.update({ status: "cancelled", cancelledReason: "guest_activity_missing" });
          continue;
        }
        const guestActivity = guestActivitySnap.data();

        // a) Guest already has a future reservation → skip
        if (guestActivity.nextUpcomingReservation) {
          await queueDoc.ref.update({ status: "cancelled", cancelledReason: "has_upcoming_reservation" });
          continue;
        }

        // b) Guest returned since this was scheduled (latestReservationId changed) → skip
        //    Only relevant for win-back; birthday isn't tied to a visit cycle.
        if (item.automationType === "winback" && guestActivity.latestReservationId !== item.triggerReservationId) {
          await queueDoc.ref.update({ status: "cancelled", cancelledReason: "guest_returned_since_scheduled" });
          continue;
        }

        // b2) Recovery-specific: skip if a reservation already exists AFTER
        if (item.automationType === "recovery") {
          try {
            const rebookSnap = await db
              .collection("reservations")
              .where("restaurant_id", "==", restaurantId)
              .where("customer_email", "==", item.customerEmail)
              .where("status", "in", ["pending", "confirmed", "completed"])
              .get();
            const hasNewerBooking = rebookSnap.docs.some((d) => d.id !== item.triggerReservationId);
            if (hasNewerBooking) {
              await queueDoc.ref.update({ status: "cancelled", cancelledReason: "guest_already_rebooked" });
              continue;
            }
          } catch (e) {
            console.warn("Recovery rebooking check failed:", e);
          }
        }

        // c) Marketing consent revoked → skip
        if (guestActivity.marketingConsent === false) {
          await queueDoc.ref.update({ status: "cancelled", cancelledReason: "consent_revoked" });
          continue;
        }

        // d) Already executed (safety net against double-processing) → skip
        if (item.status !== "pending") continue;

        // ── 3. Load the relevant automation settings (birthday or winback) ─
        const settingsDocId =
          item.automationType === "birthday" ? "birthday" :
          item.automationType === "recovery" ? "recovery" : "winback";
        const settingsSnap = await db
          .collection(restaurantCollection)
          .doc(restaurantId)
          .collection("crm_settings")
          .doc(settingsDocId)
          .get();
        if (!settingsSnap.exists) {
          await queueDoc.ref.update({ status: "cancelled", cancelledReason: "settings_missing" });
          continue;
        }
        const settings = settingsSnap.data();

        let emailConfig = null;
        if (item.automationType === "birthday") {
          if (!settings.enabled) {
            await queueDoc.ref.update({ status: "cancelled", cancelledReason: "automation_disabled" });
            continue;
          }
          emailConfig = {
            subject: settings.subject || "Happy Birthday from {{restaurant_name}}!",
            body: settings.body || "Happy Birthday, {{customer_first_name}}! We'd love to celebrate with you.",
            selectedOfferId: settings.selectedOfferId || null,
          };
        } else if (item.automationType === "recovery") {
          if (!settings.enabled) {
            await queueDoc.ref.update({ status: "cancelled", cancelledReason: "automation_disabled" });
            continue;
          }
          const triggerStillEnabled =
            (item.triggerStatus === "cancelled" && settings.triggerCancelled) ||
            (item.triggerStatus === "no_show" && settings.triggerNoShow);
          if (!triggerStillEnabled) {
            await queueDoc.ref.update({ status: "cancelled", cancelledReason: "trigger_disabled" });
            continue;
          }
          emailConfig = {
            subject: settings.subject || "We'd love to have you back at {{restaurant_name}}",
            body: settings.body || "We noticed your recent reservation didn't go through — we'd love to welcome you back.",
            selectedOfferId: settings.selectedOfferId || null,
          };
        } else {
          const rule = (settings.rules || []).find((r) => r.id === item.ruleId);
          if (!rule || !rule.enabled) {
            await queueDoc.ref.update({ status: "cancelled", cancelledReason: "rule_disabled_or_missing" });
            continue;
          }
          emailConfig = {
            subject: rule.subject || "We miss you at {{restaurant_name}}!",
            body: rule.body || "It's been a while, {{customer_first_name}}. Come back and see us!",
            selectedOfferId: rule.selectedOfferId || null,
          };
        }

        // ── 4. Get restaurant name ────────────────────────────────────────
        const restaurantDoc = await db.collection(restaurantCollection).doc(restaurantId).get();
        const restaurantName = restaurantDoc.exists ? restaurantDoc.data().name || "the restaurant" : "the restaurant";

        // ── 5. Resolve offer (if configured), same pattern as Thank You ───
        let selectedOffer = null;
        if (emailConfig.selectedOfferId) {
          const offerDoc = await db
            .collection(restaurantCollection)
            .doc(restaurantId)
            .collection("offer")
            .doc(emailConfig.selectedOfferId)
            .get();
          if (offerDoc.exists) {
            const offerData = { id: offerDoc.id, ...offerDoc.data() };
            const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOk = !offerData.start_date || new Date(offerData.start_date) <= todayOnly;
            const endOk = !offerData.end_date || new Date(offerData.end_date) >= todayOnly;
            if (offerData.is_active !== false && startOk && endOk) selectedOffer = offerData;
          }
        }

        const firstName = (item.customerName || "").split(" ")[0] || "there";
        const templateData = { restaurantName, firstName, fullName: item.customerName || "Guest" };

        const bodyHtml = fillTemplate(emailConfig.body, templateData).replace(/\n/g, "<br/>");
        const subjectFilled = fillTemplate(emailConfig.subject, templateData);

        const campaignId = queueDoc.id; // deterministic queue ID doubles as campaign ID
        const offerLink = selectedOffer
          ? `${TRACK_CLICK_URL}?restaurantId=${encodeURIComponent(restaurantId)}` +
            `&restaurantCollection=${encodeURIComponent(restaurantCollection)}` +
            `&offer=${encodeURIComponent(selectedOffer.offer_id)}` +
            `&offerId=${encodeURIComponent(selectedOffer.id)}` +
            `&campaignId=${encodeURIComponent(campaignId)}` +
            `&reservationId=${encodeURIComponent(item.triggerReservationId || "")}` +
           `&source=${encodeURIComponent(
              item.automationType === "birthday" ? "crm_birthday" :
              item.automationType === "recovery" ? "crm_recovery" : "crm_winback"
            )}`
          : "";

        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
            <h2 style="color:#fe8a24;margin-bottom:4px;">${item.automationType === "birthday" ? "🎂 " : ""}${subjectFilled}</h2>
            <p style="font-size:14px;line-height:1.6;">${bodyHtml}</p>
            ${buildOfferSection(selectedOffer, offerLink)}
            <p style="color:#aaa;font-size:11px;margin-top:28px;">You're receiving this because you're a valued guest of ${restaurantName}.</p>
          </div>
        `;

        // ── 6. Send ─────────────────────────────────────────────────────
        const result = await sendViaResend(apiKey, {
          to: item.customerEmail,
          subject: subjectFilled,
          html,
        });

        if (result.success) {
          console.log(`✅ ${item.automationType} email sent to ${item.customerEmail} (queue ${queueDoc.id})`);
          await queueDoc.ref.update({
            status: "sent",
            sentAt: Timestamp.now(),
            offerCodeUsed: selectedOffer ? selectedOffer.offer_id : null,
          });

          const sentField =
            item.automationType === "birthday" ? "birthdayEmailsSent" :
            item.automationType === "recovery" ? "recoveryEmailsSent" : "winbackEmailsSent";
          await incrementStat(db, restaurantCollection, restaurantId, sentField);
          if (selectedOffer) {
            await incrementStat(db, restaurantCollection, restaurantId, "offersSent");
          }
        } else {
          console.error(`❌ Failed to send ${item.automationType} to ${item.customerEmail}:`, result.error);
          // Leave as pending — will retry next hour. Consider adding a
          // retry-count cap here later to avoid infinite retries on a
          // permanently-broken email address.
        }
      } catch (err) {
        console.error(`❌ Error processing queue item ${queueDoc.id}:`, err);
      }
    }

    console.log("🔵 sendAutomationQueue finished.");
  }
);

module.exports = { sendAutomationQueue };