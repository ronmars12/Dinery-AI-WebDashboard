// functions/index.js
const admin = require("firebase-admin");

// Initialize Firebase Admin ONLY ONCE
if (!admin.apps.length) {
  admin.initializeApp();
}

// ── Existing functions ────────────────────────────────────────────────────────
exports.sendToUser             = require("./sendToUser");
exports.sendEmailToUser        = require("./sendEmailToUser");
exports.cleanupPointsLedger    = require("./cleanupPointsLedger");
exports.createReservation      = require("./createReservation").createReservation;

const { provisionRestaurantAccount } = require("./Auth");
exports.provisionRestaurantAccount   = provisionRestaurantAccount;

// ── Analytics functions ───────────────────────────────────────────────────────
const analytics = require("./updateReservationAnalytics");
exports.onReservationCreated = analytics.onReservationCreated;
exports.onReservationUpdated = analytics.onReservationUpdated;
exports.onReservationDeleted = analytics.onReservationDeleted;
exports.backfillAnalytics    = analytics.backfillAnalytics;

// ── Email ─────────────────────────────────────────────────────────────────────
const { sendEmail } = require("./sendEmail");
exports.sendEmail = sendEmail;

 // ── CRM: Thank You Email Automation (scheduled) ─────────────────────────────
 const { sendThankYouEmails } = require("./sendThankYouEmails");
 exports.sendThankYouEmails = sendThankYouEmails;

// ── CRM: Offer link click tracking (HTTP redirect) ────────────────────────────
const { trackOfferClick } = require("./trackOfferClick");
exports.trackOfferClick = trackOfferClick;

// ── CRM: Automation queue processor (birthday + win-back, scheduled) ──────────
const { sendAutomationQueue } = require("./sendAutomationQueue");
exports.sendAutomationQueue = sendAutomationQueue;

// ── Staff account creation ────────────────────────────────────────────────────
const { createStaffAccount } = require("./createStaffAccount");
exports.createStaffAccount = createStaffAccount;

// ── Staff account deletion ────────────────────────────────────────────────────
const { deleteStaffAccount } = require("./deleteStaffAccount");
exports.deleteStaffAccount = deleteStaffAccount;