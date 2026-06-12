const functions = require("firebase-functions");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

exports.createReservation = functions.https.onCall(async (data, context) => {
  const db = admin.firestore();

  const {
    restaurantId,
    restaurantCollection = "restaurants",
    reservationDateISO,
    guests,
    durationMinutes = 120,
    customerName,
    customerEmail = "",
    customerPhone = "",
    specialRequests = "",
    restaurantName = "",
    restaurantOwnerId = null,
    restaurantOwnerEmail = "",
    restaurantLat = null,
    restaurantLng = null,
    restaurantLocation = "",
    source = "reservation_link",
  } = data;

  // ── Validation ────────────────────────────────────────────────────────
  if (!restaurantId)
    throw new functions.https.HttpsError("invalid-argument", "restaurantId is required.");
  if (!reservationDateISO)
    throw new functions.https.HttpsError("invalid-argument", "reservationDateISO is required.");
  if (!guests || guests < 1)
    throw new functions.https.HttpsError("invalid-argument", "guests must be >= 1.");
  if (!customerName)
    throw new functions.https.HttpsError("invalid-argument", "customerName is required.");

  const resDate = new Date(reservationDateISO);
  if (isNaN(resDate.getTime()))
    throw new functions.https.HttpsError("invalid-argument", "Invalid reservationDateISO.");

  const resEndTime = new Date(resDate.getTime() + durationMinutes * 60 * 1000);

  try {
    // ── Step 1: Fetch tables OUTSIDE transaction (queries not allowed inside) ──
    const tablesSnap = await db
      .collection(restaurantCollection)
      .doc(restaurantId)
      .collection("tables")
      .get();

    const allTables = tablesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const eligibleTables = allTables.filter((t) =>
      t.online === true &&
      (t.sessions === "Reservation" || t.sessions === "Both") &&
      guests >= (t.minCapacity || 0) &&
      guests <= (t.maxCapacity || 999)
    );

    if (eligibleTables.length === 0) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "No tables available for this party size."
      );
    }

    // ── Step 2: Fetch overlapping reservations OUTSIDE transaction ──────
    const windowStart = new Date(resDate.getTime() - durationMinutes * 60 * 1000);

    const existingSnap = await db
      .collection("reservations")
      .where("restaurant_id", "==", restaurantId)
      .where("status", "in", ["pending", "confirmed"])
      .where("reservation_date", ">=", admin.firestore.Timestamp.fromDate(windowStart))
      .where("reservation_date", "<=", admin.firestore.Timestamp.fromDate(resEndTime))
      .get();

    // ── Step 3: Find booked table IDs ────────────────────────────────────
    const bookedTableIds = new Set();
    for (const rdoc of existingSnap.docs) {
      const r = rdoc.data();
      const rStart = r.reservation_date?.toDate?.() ?? new Date(r.reservation_date);
      const rDur = r.duration_minutes || durationMinutes;
      const rEnd = new Date(rStart.getTime() + rDur * 60 * 1000);

      if (rStart < resEndTime && rEnd > resDate) {
        if (Array.isArray(r.table_ids)) {
          r.table_ids.forEach((id) => bookedTableIds.add(id));
        } else if (r.table_id) {
          bookedTableIds.add(r.table_id);
        }
      }
    }

    // ── Step 4: Pick best free table ─────────────────────────────────────
    const freeTables = eligibleTables
      .filter((t) => !bookedTableIds.has(t.id))
      .sort((a, b) => {
        const pa = a.priority ?? 999, pb = b.priority ?? 999;
        if (pa !== pb) return pa - pb;
        return (a.maxCapacity || 999) - (b.maxCapacity || 999);
      });

    if (freeTables.length === 0) {
      throw new functions.https.HttpsError(
        "resource-exhausted",
        "No tables available for this time slot. Please choose a different time."
      );
    }

    const assignedTable = freeTables[0];
    const now = admin.firestore.Timestamp.now();
    const resTimestamp = admin.firestore.Timestamp.fromDate(resDate);

    // ── Step 5: Atomic write — only document reads/writes inside transaction ──
    const result = await db.runTransaction(async (tx) => {
      // Read the specific table doc to lock it
      const tableRef = db
        .collection(restaurantCollection)
        .doc(restaurantId)
        .collection("tables")
        .doc(assignedTable.id);

      const tableSnap = await tx.get(tableRef);
      if (!tableSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Assigned table no longer exists.");
      }

      // Write reservation
      const newResRef = db.collection("reservations").doc();
      tx.set(newResRef, {
        Booking_request:                      true,
        ServiceType_Reservation:              "dine-in",
        claimed_offer:                        "",
        claimed_offer_discount_percent:       0,
        claimed_offer_id:                     "",
        coupon_id:                            "",
        coupon_confirmed:                     false,
        created_at:                           now,
        updated_at:                           now,
        customer_name:                        customerName,
        customer_email:                       customerEmail,
        customer_phone:                       customerPhone,
        customer_id:                          null,
        number_of_guests:                     guests,
        reservation_date:                     resTimestamp,
        time:                                 reservationDateISO,
        duration_minutes:                     durationMinutes,
        special_requests:                     specialRequests,
        status:                               "confirmed",
        table_id:                             assignedTable.id,
        table_name:                           assignedTable.name || "",
        table_ids:                            [assignedTable.id],
        table_names:                          [assignedTable.name || ""],
        restaurant_id:                        restaurantId,
        restaurant_name:                      restaurantName,
        restaurant_owner_id:                  restaurantOwnerId,
        restaurant_owner_email:               restaurantOwnerEmail,
        restaurant_lat:                       restaurantLat,
        restaurant_lng:                       restaurantLng,
        restaurant_location:                  restaurantLocation,
        source,
        reservation_completed_points_awarded: false,
      });

      // Update table status
      tx.update(tableRef, {
        current_status:  "reserved",
        reserved_by:     customerName,
        reserved_date:   resTimestamp,
        reserved_guests: guests,
        reserved_source: source,
      });

      return {
        reservationId: newResRef.id,
        tableId:       assignedTable.id,
        tableName:     assignedTable.name || "",
        status:        "confirmed",
      };
    });

    console.log("✅ Reservation created:", result.reservationId, "Table:", result.tableName);
    return result;

  } catch (err) {
    if (err instanceof functions.https.HttpsError) throw err;
    console.error("createReservation error:", err);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create reservation. Please try again."
    );
  }
});