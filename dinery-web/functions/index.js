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

// ── Staff account creation ────────────────────────────────────────────────────
const { createStaffAccount } = require("./createStaffAccount");
exports.createStaffAccount = createStaffAccount;

// ── Staff account deletion ────────────────────────────────────────────────────
const { deleteStaffAccount } = require("./deleteStaffAccount");
exports.deleteStaffAccount = deleteStaffAccount;