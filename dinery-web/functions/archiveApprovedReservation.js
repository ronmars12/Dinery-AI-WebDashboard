// functions/archiveApprovedReservation.js
const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

const db = admin.firestore();

// normalize status values
function normStatus(s) {
  return String(s || "").trim().toLowerCase();
}

module.exports = onDocumentWritten("reservations/{reservationId}", async (event) => {
  const reservationId = event.params.reservationId;
  const before = event.data?.before?.data() || null;
  const after = event.data?.after?.data() || null;

  // ignore deletes (after == null)
  if (!after) return;

  const beforeStatus = normStatus(before?.status);
  const afterStatus  = normStatus(after?.status);

  // only run when status changes into an approved/confirmed state
  const becameApproved =
    beforeStatus !== "approved" &&
    (afterStatus === "approved" || afterStatus === "confirmed" || afterStatus === "approve");

  if (!becameApproved) return;

  // best-effort to capture the user's UID from common fields
  const uid =
    after.customer_id ||
    after.uid ||
    after.user_id ||
    after.userId ||
    "";

  const archiveRef = db.collection("ArchiveReservation").doc(reservationId);
  const sourceRef  = db.collection("reservations").doc(reservationId);

  await db.runTransaction(async (tx) => {
    const alreadyArchived = await tx.get(archiveRef);
    if (!alreadyArchived.exists) {
      const payload = {
        ...after,
        uid,
        originalReservationId: reservationId,
        archived_at: admin.firestore.FieldValue.serverTimestamp(),
      };
      tx.set(archiveRef, payload);
    }
    // remove the original reservation
    tx.delete(sourceRef);
  });
});