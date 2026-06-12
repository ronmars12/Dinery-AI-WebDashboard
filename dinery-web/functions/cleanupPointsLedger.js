// functions/cleanupPointsLedger.js
// v2 Scheduler + Firestore cleanup with per-ledger countdown logs
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

const db = admin.firestore();

// Helpers
const THIRTY_D_MS = 30 * 24 * 60 * 60 * 1000;

function coerceToTimestamp(val) {
  // Accept Firestore Timestamp, JS Date, or ISO string
  if (!val) return null;
  if (val.toMillis) return val; // Firestore Timestamp
  if (val instanceof Date) return admin.firestore.Timestamp.fromDate(val);
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : admin.firestore.Timestamp.fromDate(parsed);
}

function fmtDuration(ms) {
  if (ms <= 0) return "0d 0h 0m 0s";
  const s = Math.floor(ms / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  return `${days}d ${hours}h ${mins}m ${secs}s`;
}

async function deleteSubcollection(docRef, subName, batchSize = 400) {
  while (true) {
    const snap = await docRef.collection(subName).limit(batchSize).get();
    if (snap.empty) break;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

async function purgeLedgerDoc(docSnap) {
  const docRef = docSnap.ref;
  const path = docRef.path; // pointsLedger/{uid}
  // 1) delete entries/*
  await deleteSubcollection(docRef, "entries", 400);
  // 2) delete the ledger doc itself
  await docRef.delete();
  console.log(`🗑️ Purged ledger: ${path}`);
}

module.exports = onSchedule(
  { schedule: "every 24 hours", timeZone: "Europe/Oslo" }, // Oslo timezone
  async () => {
    const nowMs = Date.now();
    let totalPurged = 0;
    let scanned = 0;

    // We paginate through ALL pointsLedger docs so we can log a timer for each one.
    let pageLast = null;

    while (true) {
      let q = db.collection("pointsLedger").orderBy("updated_at");
      if (pageLast) q = q.startAfter(pageLast);
      const snap = await q.limit(500).get();
      if (snap.empty) break;

      for (const doc of snap.docs) {
        scanned++;
        const data = doc.data() || {};
        const uid = data.uid || doc.id;

        // updated_at can be Firestore Timestamp or string; coerce safely
        const ts = coerceToTimestamp(data.updated_at);
        if (!ts) {
          console.warn(`⚠️ ${doc.ref.path} has no valid updated_at; skipping purge & timer.`);
          continue;
        }

        const updatedMs = ts.toMillis();
        const ageMs = nowMs - updatedMs;
        const remainingMs = THIRTY_D_MS - ageMs;
        const cutoffAt = new Date(updatedMs + THIRTY_D_MS).toISOString();

        if (remainingMs <= 0) {
          console.log(
            `⏳ EXPIRED → deleting pointsLedger for uid=${uid} (cutoffAt=${cutoffAt})`
          );
          await purgeLedgerDoc(doc);
          totalPurged++;
        } else {
          console.log(
            `⏲️ pointsLedger uid=${uid} will be purged in ${fmtDuration(
              remainingMs
            )} (cutoffAt=${cutoffAt})`
          );
        }
      }

      pageLast = snap.docs[snap.docs.length - 1];
    }

    console.log(
      `✅ cleanupPointsLedger finished. Scanned: ${scanned}, Purged: ${totalPurged}.`
    );
  }
);