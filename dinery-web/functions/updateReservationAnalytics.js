// functions/updateReservationAnalytics.js
const { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

const db = admin.firestore();

// Set default options for all v2 functions in this file
setGlobalOptions({ maxInstances: 10 });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toDate = (v) => {
  if (!v) return null;
  if (v?.toDate) return v.toDate();
  if (v instanceof Date) return v;
  return new Date(v);
};

const pad2 = (n) => String(n).padStart(2, "0");

const getDateKey  = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const getMonthKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;
const getYearKey  = (d) => `${d.getFullYear()}`;

const getOrigin = (data) => {
  if (data.is_walkin)                     return "walkin";
  if (data.source === "mobile_app")       return "dineryApp";
  if (data.source === "reservation_link") return "online";
  return "internal";
};

const getLeadTimeBucket = (reservationDate, createdAt) => {
  if (!reservationDate || !createdAt) return null;
  const days = Math.round((reservationDate - createdAt) / (1000 * 60 * 60 * 24));
  if (days <= 0)  return "same_day";
  if (days === 1) return "1_day";
  if (days <= 3)  return "2_3_days";
  if (days <= 7)  return "4_7_days";
  if (days <= 14) return "1_2_weeks";
  return "2plus_weeks";
};

// ─── Build delta from a single reservation document ──────────────────────────

const buildDelta = (data, multiplier) => {
  const resDate    = toDate(data.reservation_date);
  const createdAt  = toDate(data.created_at);
  const status     = (data.status || "pending").toLowerCase();
  const mealStatus = (data.meal_status || "").toLowerCase();
  const guests     = Math.max(0, parseInt(data.number_of_guests) || 0);
  const duration   = Math.max(0, parseInt(data.duration_minutes) || 0);
  const origin     = getOrigin(data);
  const weekday    = resDate ? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][resDate.getDay()] : null;

  let arrivalKey = null;
  if (resDate) {
    const h = resDate.getHours();
    const m = resDate.getMinutes() < 30 ? 0 : 30;
    arrivalKey = `${pad2(h)}_${pad2(m)}`;
  }

  let createdHourKey = null;
  if (createdAt) {
    createdHourKey = pad2(createdAt.getHours());
  }

  const leadBucket  = getLeadTimeBucket(resDate, createdAt);
  const guestBucket = guests >= 12 ? "12plus" : String(guests);
  const m           = multiplier;

  return {
    totalBookings:   m * 1,
    confirmed:       status === "confirmed"  ? m * 1 : 0,
    cancelled:       status === "cancelled"  ? m * 1 : 0,
    pending:         status === "pending"    ? m * 1 : 0,
    completed:       status === "completed"  ? m * 1 : 0,
    totalGuests:     m * guests,
    noShows:         mealStatus === "no_show" ? m * 1 : 0,
    durationSum:     duration > 0 ? m * duration : 0,
    durationCount:   duration > 0 ? m * 1 : 0,
    _origin:         origin,
    _arrivalKey:     arrivalKey,
    _createdHourKey: createdHourKey,
    _leadBucket:     leadBucket,
    _guestBucket:    guestBucket,
    _weekday:        weekday,
    _guests:         guests,
    _m:              m,
  };
};

// ─── Apply delta to a Firestore document via transaction ─────────────────────

const applyDelta = (txn, docRef, delta, isNew) => {
  const inc = admin.firestore.FieldValue.increment;

  const update = {
    totalBookings: inc(delta.totalBookings),
    confirmed:     inc(delta.confirmed),
    cancelled:     inc(delta.cancelled),
    pending:       inc(delta.pending),
    completed:     inc(delta.completed),
    totalGuests:   inc(delta.totalGuests),
    noShows:       inc(delta.noShows),
    durationSum:   inc(delta.durationSum),
    durationCount: inc(delta.durationCount),
    lastUpdated:   admin.firestore.FieldValue.serverTimestamp(),
  };

  if (delta._origin) {
    update[`originCounts.${delta._origin}`] = inc(delta._m);
  }
  if (delta._arrivalKey) {
    update[`arrivalBySlot.${delta._arrivalKey}.guests`]   = inc(delta._m * delta._guests);
    update[`arrivalBySlot.${delta._arrivalKey}.bookings`] = inc(delta._m);
  }
  if (delta._createdHourKey) {
    update[`createdByHour.${delta._createdHourKey}`] = inc(delta._m);
  }
  if (delta._leadBucket) {
    update[`leadTimeDist.${delta._leadBucket}`] = inc(delta._m);
  }
  if (delta._guestBucket) {
    update[`guestCountDist.${delta._guestBucket}`] = inc(delta._m);
  }
  if (delta._weekday) {
    update[`weekdayDist.${delta._weekday}.bookings`]      = inc(delta._m);
    update[`weekdayDist.${delta._weekday}.guests`]        = inc(delta._m * delta._guests);
    if (delta.cancelled !== 0) {
      update[`weekdayDist.${delta._weekday}.cancellations`] = inc(delta.cancelled);
    }
  }

  if (isNew) {
    txn.set(docRef, update, { merge: true });
  } else {
    txn.update(docRef, update);
  }
};

// ─── Get analytics doc refs ───────────────────────────────────────────────────

const getAnalyticsRefs = (restaurantId, resDate) => {
  if (!restaurantId || !resDate) return null;
  const base = db.collection("restaurants").doc(restaurantId);
  return {
    daily:   base.collection("analyticsDaily").doc(getDateKey(resDate)),
    monthly: base.collection("analyticsMonthly").doc(getMonthKey(resDate)),
    yearly:  base.collection("analyticsYearly").doc(getYearKey(resDate)),
  };
};

// ─── Core update logic ────────────────────────────────────────────────────────

const updateAnalytics = async (before, after) => {
  const restaurantId =
    after?.restaurant_id || before?.restaurant_id ||
    after?.restaurantId  || before?.restaurantId  || null;

  if (!restaurantId) {
    console.warn("updateReservationAnalytics: no restaurant_id found, skipping");
    return;
  }

  const beforeDate = toDate(before?.reservation_date);
  const afterDate  = toDate(after?.reservation_date);
  const ops = [];

  if (before && beforeDate) {
    const refs = getAnalyticsRefs(restaurantId, beforeDate);
    if (refs) ops.push({ refs, delta: buildDelta(before, -1) });
  }
  if (after && afterDate) {
    const refs = getAnalyticsRefs(restaurantId, afterDate);
    if (refs) ops.push({ refs, delta: buildDelta(after, +1) });
  }

  if (ops.length === 0) return;

  await db.runTransaction(async (txn) => {
    const allRefs    = ops.flatMap(op => [op.refs.daily, op.refs.monthly, op.refs.yearly]);
    const uniqueRefs = [...new Map(allRefs.map(r => [r.path, r])).values()];
    const snaps      = await Promise.all(uniqueRefs.map(r => txn.get(r)));
    const existsMap  = {};
    snaps.forEach((snap, i) => { existsMap[uniqueRefs[i].path] = snap.exists; });

    for (const { refs, delta } of ops) {
      applyDelta(txn, refs.daily,   delta, !existsMap[refs.daily.path]);
      applyDelta(txn, refs.monthly, delta, !existsMap[refs.monthly.path]);
      applyDelta(txn, refs.yearly,  delta, !existsMap[refs.yearly.path]);
    }
  });
};

// ─── Exported Cloud Functions (v2 syntax) ────────────────────────────────────

exports.onReservationCreated = onDocumentCreated(
  { document: "reservations/{reservationId}", timeoutSeconds: 60, memory: "256MiB" },
  async (event) => {
    try {
      await updateAnalytics(null, event.data.data());
      console.log(`✅ Analytics created for reservation ${event.params.reservationId}`);
    } catch (err) {
      console.error("onReservationCreated error:", err);
    }
  }
);

exports.onReservationUpdated = onDocumentUpdated(
  { document: "reservations/{reservationId}", timeoutSeconds: 60, memory: "256MiB" },
  async (event) => {
    try {
      const before = event.data.before.data();
      const after  = event.data.after.data();

      const relevantFields = [
        "status", "meal_status", "reservation_date", "number_of_guests",
        "duration_minutes", "source", "is_walkin", "created_at",
      ];
      const changed = relevantFields.some(f => {
        const bv = before[f], av = after[f];
        if (bv?.toDate && av?.toDate) return bv.toDate().getTime() !== av.toDate().getTime();
        return JSON.stringify(bv) !== JSON.stringify(av);
      });

      if (!changed) {
        console.log(`⏭ No analytics-relevant change for ${event.params.reservationId}, skipping`);
        return;
      }

      await updateAnalytics(before, after);
      console.log(`✅ Analytics updated for reservation ${event.params.reservationId}`);
    } catch (err) {
      console.error("onReservationUpdated error:", err);
    }
  }
);

exports.onReservationDeleted = onDocumentDeleted(
  { document: "reservations/{reservationId}", timeoutSeconds: 60, memory: "256MiB" },
  async (event) => {
    try {
      await updateAnalytics(event.data.data(), null);
      console.log(`✅ Analytics removed for reservation ${event.params.reservationId}`);
    } catch (err) {
      console.error("onReservationDeleted error:", err);
    }
  }
);

// ─── One-time backfill ────────────────────────────────────────────────────────
// Run once after deploying to populate analytics from existing reservations:
// https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/backfillAnalytics?secret=dinery-backfill-2024

exports.backfillAnalytics = onRequest(
  { timeoutSeconds: 540, memory: "1GiB" },
  async (req, res) => {
    const SECRET = process.env.BACKFILL_SECRET || "dinery-backfill-2024";
    if (req.query.secret !== SECRET) {
      res.status(401).send("Unauthorized");
      return;
    }

    try {
      console.log("🔄 Starting analytics backfill...");
      const snap = await db.collection("reservations").get();
      console.log(`📊 Processing ${snap.docs.length} reservations...`);

      let processed = 0, errors = 0;
      const BATCH_SIZE = 50;

      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = snap.docs.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (docSnap) => {
            try {
              await updateAnalytics(null, docSnap.data());
              processed++;
            } catch (err) {
              console.error(`Error processing ${docSnap.id}:`, err.message);
              errors++;
            }
          })
        );
        console.log(`Progress: ${Math.min(i + BATCH_SIZE, snap.docs.length)}/${snap.docs.length}`);
      }

      const msg = `✅ Backfill complete: ${processed} processed, ${errors} errors`;
      console.log(msg);
      res.status(200).send(msg);
    } catch (err) {
      console.error("Backfill failed:", err);
      res.status(500).send(`Backfill failed: ${err.message}`);
    }
  }
);