import React, { useState, useCallback, useMemo, useEffect } from 'react';

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += char; i++; continue;
    }
    if (char === '"') { inQuotes = true; i++; continue; }
    if (char === ',') { row.push(field); field = ''; i++; continue; }
    if (char === '\r') { i++; continue; }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; i++; continue; }
    field += char; i++;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));
}

const Papa = {
  parse(file, { header, skipEmptyLines, complete, error }) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        // Strip BOM if present
        const clean = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
        const rows = parseCSV(clean);
        if (!rows.length) { complete({ data: [], meta: { fields: [] } }); return; }
        const fields = rows[0].map((h) => h.trim());
        const data = rows.slice(1).map((r) => {
          const obj = {};
          fields.forEach((f, idx) => { obj[f] = (r[idx] ?? '').trim(); });
          return obj;
        });
        complete({ data, meta: { fields } });
      } catch (err) {
        error(err);
      }
    };
    reader.onerror = () => error(new Error('Failed to read file'));
    reader.readAsText(file);
  },
};
import {
  collection, doc, setDoc, deleteDoc, serverTimestamp, getDocs, query, where, writeBatch,
} from 'firebase/firestore';
import { firestore, auth } from '../../firebase';
import {
  FiX, FiUpload, FiCheck, FiAlertCircle, FiChevronRight, FiChevronLeft,
  FiFileText, FiLoader, FiTrash2, FiClock, FiRotateCcw, FiList, FiHome,
} from 'react-icons/fi';

// ─── System fields we can map CSV columns onto ────────────────────────────────
// ── Reservation-import mode fields ──────────────────────────────────────────
const RES_REQUIRED_FIELDS = [
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'reservation_date', label: 'Date' },
];
const RES_OPTIONAL_FIELDS = [
  { key: 'number_of_guests', label: 'Party Size' },
  { key: 'from_time', label: 'Time' },
  { key: 'to_time', label: 'End Time' },
  { key: 'table_name', label: 'Table' },
  { key: 'customer_email', label: 'Email' },
  { key: 'customer_phone', label: 'Phone' },
  { key: 'status', label: 'Status' },
  { key: 'special_requests', label: 'Notes' },
];

// ── Customer-list-import mode fields ────────────────────────────────────────
const GUEST_REQUIRED_FIELDS = [
  { key: 'customer_email', label: 'Email' },
];
const GUEST_OPTIONAL_FIELDS = [
  { key: 'customer_name', label: 'Customer Name' },
  { key: 'customer_phone', label: 'Phone' },
  { key: 'last_visit_date', label: 'Last Visit / Contact Date' },
];

function makeGuestId(email, phone) {
  const e = (email || '').trim().toLowerCase();
  if (e) return `email_${e.replace(/[^a-z0-9@._-]/g, '_')}`;
  const p = (phone || '').replace(/[^0-9+]/g, '');
  if (p) return `phone_${p}`;
  return null;
}

// Keywords used for auto-matching CSV headers → system fields (signal #1)
const FIELD_KEYWORDS = {
  customer_name: ['name', 'guest', 'customer', 'client', 'contact'],
  reservation_date: ['date', 'day', 'visit'],
  last_visit_date: ['last', 'visit', 'date', 'contact'],
  number_of_guests: ['guest', 'party', 'pax', 'cover', 'size', 'people', 'seat'],
  from_time: ['time', 'start'],
  to_time: ['end time', 'end', 'finish'],
  table_name: ['table'],
  customer_email: ['email', 'mail'],
  customer_phone: ['phone', 'mobile', 'tel', 'cell'],
  status: ['status'],
  special_requests: ['note', 'request', 'comment'],
};

// ── Content-based detectors (signal #2) — look at actual cell values ──────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d][\d\s().-]{5,}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}|^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/;
const TIME_RE = /^\d{1,2}:\d{2}(\s?(AM|PM|am|pm))?$|^\d{3,4}$/;

function sampleValues(rows, header, n = 15) {
  const vals = [];
  for (let i = 0; i < rows.length && vals.length < n; i++) {
    const v = String(rows[i][header] ?? '').trim();
    if (v) vals.push(v);
  }
  return vals;
}

function contentScore(values, key) {
  if (!values.length) return 0;
  let hits = 0;
  values.forEach((v) => {
    if (key === 'customer_email' && EMAIL_RE.test(v)) hits++;
    else if (key === 'customer_phone' && PHONE_RE.test(v) && /\d{5,}/.test(v.replace(/\D/g, '')) === false) hits++;
    else if (key === 'customer_phone' && PHONE_RE.test(v)) hits++;
    else if ((key === 'reservation_date' || key === 'last_visit_date') && DATE_RE.test(v)) hits++;
    else if ((key === 'from_time' || key === 'to_time') && TIME_RE.test(v)) hits++;
    else if (key === 'number_of_guests' && /^\d{1,2}$/.test(v) && +v > 0 && +v <= 30) hits++;
  });
  return hits / values.length; // 0..1 confidence
}

function autoDetectMapping(headers, rows) {
  const mapping = {};
  const used = new Set();
  const order = ['customer_email', 'customer_phone', 'reservation_date', 'last_visit_date', 'to_time', 'from_time',
    'number_of_guests', 'customer_name', 'table_name', 'status', 'special_requests'];

  order.forEach((key) => {
    const keywords = FIELD_KEYWORDS[key] || [];
    let best = null;
    let bestScore = 0;

    headers.forEach((h) => {
      if (used.has(h)) return;
      const lower = h.toLowerCase();
      const headerHit = keywords.some((kw) => lower.includes(kw)) ? 1 : 0;
      const cScore = contentScore(sampleValues(rows, h), key);
      // Combine both signals — header match is a strong hint, content confirms/overrides it
      const score = (headerHit * 0.5) + (cScore * 0.7);
      if (score > bestScore) { bestScore = score; best = h; }
    });

    // Require at least a weak signal before accepting a guess
    if (best && bestScore >= 0.35) { mapping[key] = best; used.add(best); }
  });

  return mapping;
}

// ─── Date / time parsing helpers ───────────────────────────────────────────────
function parseDateValue(raw, formatHint) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // ISO / YYYY-MM-DD (also handles YYYY-MM-DDTHH:mm:ss)
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);

  // DD-MM-YYYY or DD/MM/YYYY or MM/DD/YYYY etc.
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (m) {
    let [, a, b, year] = m;
    a = +a; b = +b; year = +year;
    if (formatHint === 'MDY') return new Date(year, a - 1, b);
    // Default DMY (most common outside the US) unless day part is impossible for DMY
    if (a > 12 && b <= 12) return new Date(year, b - 1, a); // must be MM/DD after all
    return new Date(year, b - 1, a); // DMY
  }

  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

function parseTimeValue(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  let m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/);
  if (m) {
    let h = +m[1];
    const min = m[2];
    const ampm = m[3]?.toLowerCase();
    if (ampm === 'pm' && h < 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${min}`;
  }
  // 4-digit military time e.g. "1830"
  m = s.match(/^(\d{2})(\d{2})$/);
  if (m) return `${m[1]}:${m[2]}`;

  return null;
}

function guessDateFormatFromSamples(values) {
  for (const v of values) {
    const s = String(v || '').trim();
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-]\d{4}/);
    if (m) {
      const a = +m[1], b = +m[2];
      if (a > 12) return 'DMY';
      if (b > 12) return 'MDY';
    }
  }
  return 'DMY'; // sensible default outside the US
}

// ─── Restaurant hours (mirrors CalendarView.jsx getRestaurantHours) ───────────
function getRestaurantHoursForDate(selectedRestaurant, date) {
  try {
    const hoursList = selectedRestaurant?.customHours;
    if (!Array.isArray(hoursList) || !hoursList.length) return { openHour: 8, closeHour: 23 };

    const dow = (date instanceof Date ? date : new Date(date)).getDay(); // 0=Sun..6=Sat
    // Prefer a rule whose `days` array covers this specific weekday
    const rule =
      hoursList.find((h) => Array.isArray(h.days) && h.days.includes(dow) && h.openTime && h.closeTime) ||
      hoursList.find((h) => h.openTime && h.closeTime);

    if (!rule) return { openHour: 8, closeHour: 23 };
    const [openHour] = rule.openTime.split(':').map(Number);
    const [closeHour] = rule.closeTime.split(':').map(Number);
    const finalClose = closeHour <= openHour ? 24 : Math.min(closeHour, 24);
    return { openHour: openHour || 8, closeHour: Math.min(finalClose, 24) || 23 };
  } catch (e) {
    return { openHour: 8, closeHour: 23 };
  }
}

// ─── Randomizer helpers ─────────────────────────────────────────────────────
function randomTimeWithinHours(openHour, closeHour, durationMinutes = 60) {
  const totalMinutes = Math.max(0, (closeHour - openHour) * 60);
  // leave enough room before close for the full reservation duration
  const latestStart = Math.max(0, totalMinutes - durationMinutes);
  const maxSlot = Math.floor(latestStart / 15);
  const slot = maxSlot > 0 ? Math.floor(Math.random() * (maxSlot + 1)) : 0;
  const startMinutes = slot * 15;
  const h = (openHour + Math.floor(startMinutes / 60)) % 24;
  const m = startMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ImportReservationsModal({ selectedRestaurant, onClose, onImported }) {
  const [importMode, setImportMode] = useState('reservations'); // 'reservations' | 'guests'
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [step, setStep] = useState('upload'); 
  const [ownerRestaurants, setOwnerRestaurants] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [targetRestaurantId, setTargetRestaurantId] = useState(selectedRestaurant?.id || '');
  const [randomizeTimes, setRandomizeTimes] = useState(false);
  const [randomizeTables, setRandomizeTables] = useState(false);
  const [lastBatchId, setLastBatchId] = useState(null);
  const [lastBatchCount, setLastBatchCount] = useState(0);
  const [lastReservationRefs, setLastReservationRefs] = useState([]);
  const [undoing, setUndoing] = useState(false);
  const [undone, setUndone] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingBatchId, setDeletingBatchId] = useState(null);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dateFormat, setDateFormat] = useState('DMY');
  const [defaultStatus, setDefaultStatus] = useState('completed');
  const [defaultDuration, setDefaultDuration] = useState(75);
  const [defaultGuests, setDefaultGuests] = useState(2);
  const [tables, setTables] = useState([]);
  const [parseError, setParseError] = useState('');
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const [importStartTime, setImportStartTime] = useState(null);
  const [etaTick, setEtaTick] = useState(0); // forces a re-render every second so ETA stays live
  const [importResult, setImportResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);

useEffect(() => {
    if (step !== 'importing') return;
    const interval = setInterval(() => setEtaTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Load every restaurant this owner has, so they can pick which one to import into
  useEffect(() => {
    const ownerId = selectedRestaurant?.Owner_ID || auth.currentUser?.uid;
    if (!ownerId) { setLoadingRestaurants(false); return; }
    const col = selectedRestaurant?._collection || 'restaurants';
    getDocs(query(collection(firestore, col), where('Owner_ID', '==', ownerId)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, _collection: col, ...d.data() }));
        setOwnerRestaurants(list);
        if (!list.find((r) => r.id === targetRestaurantId) && list.length) {
          setTargetRestaurantId(selectedRestaurant?.id && list.find((r) => r.id === selectedRestaurant.id)
            ? selectedRestaurant.id
            : list[0].id);
        }
      })
      .catch((e) => {
        console.error('Failed to load restaurants:', e);
        if (selectedRestaurant?.id) setOwnerRestaurants([selectedRestaurant]);
      })
      .finally(() => setLoadingRestaurants(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurant?.Owner_ID, selectedRestaurant?.id]);

  // The restaurant currently targeted for import — everything below uses this,
  // not the raw `selectedRestaurant` prop, so the picker actually takes effect.
  const restaurant = ownerRestaurants.find((r) => r.id === targetRestaurantId) || selectedRestaurant;

  // Load this restaurant's tables so table_name in the CSV can be matched to an id
  useEffect(() => {
    if (!restaurant?.id) return;
    const col = restaurant._collection || 'restaurants';
    getDocs(collection(firestore, col, restaurant.id, 'tables'))
      .then((snap) => setTables(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setTables([]));
  }, [restaurant?.id]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    setParseError('');
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data.length) {
          setParseError('No rows found in this file.');
          return;
        }
        const hdrs = results.meta.fields || [];
        setHeaders(hdrs);
        setRows(results.data);
        const autoMap = autoDetectMapping(hdrs, results.data);
        setMapping(autoMap);
        if (autoMap.reservation_date) {
          const samples = results.data.slice(0, 20).map((r) => r[autoMap.reservation_date]);
          setDateFormat(guessDateFormatFromSamples(samples));
        }
        setStep('mapping');
      },
      error: (err) => setParseError('Failed to read file: ' + err.message),
    });
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const REQUIRED_FIELDS = importMode === 'guests' ? GUEST_REQUIRED_FIELDS : RES_REQUIRED_FIELDS;
  const OPTIONAL_FIELDS = importMode === 'guests' ? GUEST_OPTIONAL_FIELDS : RES_OPTIONAL_FIELDS;
  const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];
  const missingRequired = REQUIRED_FIELDS.filter((f) => !mapping[f.key]);

// ── Build validated preview rows (guest-list mode) ──────────────────────────
  const guestPreview = useMemo(() => {
    if (importMode !== 'guests') return { valid: [], errors: [] };
    if (step !== 'preview' && step !== 'importing' && step !== 'done') return { valid: [], errors: [] };
    const valid = [];
    const errors = [];
    const seen = new Set();

    rows.forEach((row, idx) => {
      const rowErrors = [];
      const email = mapping.customer_email ? String(row[mapping.customer_email] || '').trim().toLowerCase() : '';
      const phone = mapping.customer_phone ? String(row[mapping.customer_phone] || '').trim() : '';
      const name = mapping.customer_name ? String(row[mapping.customer_name] || '').trim() : '';
      const visitRaw = mapping.last_visit_date ? row[mapping.last_visit_date] : '';
      const parsedVisit = parseDateValue(visitRaw, dateFormat);

      const guestId = makeGuestId(email, phone);
      if (!guestId) rowErrors.push('Missing email and phone — cannot identify guest');
      else if (seen.has(guestId)) rowErrors.push('Duplicate of an earlier row in this file');

      const record = {
        _rowIndex: idx,
        guestId,
        customerName: name || 'Guest',
        customerEmail: email,
        customerPhone: phone,
        lastCompletedVisit: parsedVisit,
      };

      if (!guestId || seen.has(guestId)) {
        errors.push({ row: idx, reasons: rowErrors, record });
      } else {
        seen.add(guestId);
        valid.push({ ...record, _warnings: rowErrors });
      }
    });

    return { valid, errors };
  }, [importMode, step, rows, mapping, dateFormat]);

  // ── Build validated preview rows (reservation mode) ─────────────────────────
  function makeTableRandomizer(allTables) {
    const usage = {};
    allTables.forEach((t) => { usage[t.id] = 0; });

    return (guestCount) => {
      if (!allTables.length) return null;
      let candidates = allTables.filter((t) => (t.maxCapacity || 0) >= guestCount);
      if (!candidates.length) candidates = allTables; // nothing big enough — fall back to any table
      const minUsage = Math.min(...candidates.map((t) => usage[t.id] || 0));
      const leastUsed = candidates.filter((t) => (usage[t.id] || 0) === minUsage);
      const chosen = leastUsed[Math.floor(Math.random() * leastUsed.length)];
      usage[chosen.id] = (usage[chosen.id] || 0) + 1;
      return chosen;
    };
  }

  // ── Build validated preview rows (reservation mode) ─────────────────────────
  const preview = useMemo(() => {
    if (importMode !== 'reservations') return { valid: [], errors: [] };
    if (!rows.length) return { valid: [], errors: [] };

    const valid = [];
    const errors = [];
    const pickRandomTable = randomizeTables ? makeTableRandomizer(tables) : null;

    rows.forEach((row, idx) => {
      const rowErrors = [];
      const name = mapping.customer_name ? String(row[mapping.customer_name] || '').trim() : '';
      let guests = mapping.number_of_guests ? parseInt(row[mapping.number_of_guests], 10) : NaN;
      if (isNaN(guests) || guests <= 0) {
        guests = defaultGuests;
        if (mapping.number_of_guests) rowErrors.push(`Missing party size (defaulted to ${defaultGuests})`);
      }

      const dateRaw = mapping.reservation_date ? row[mapping.reservation_date] : '';
      const parsedDate = parseDateValue(dateRaw, dateFormat);

      let duration = defaultDuration;
      let parsedTime, parsedToTime = null;

      if (randomizeTimes) {
        duration = 60; // fixed 1-hour slot, per request
        const { openHour, closeHour } = parsedDate
          ? getRestaurantHoursForDate(restaurant, parsedDate)
          : { openHour: 8, closeHour: 23 };
        parsedTime = randomTimeWithinHours(openHour, closeHour, duration);
      } else {
        const timeRaw = mapping.from_time ? row[mapping.from_time] : '';
        parsedTime = parseTimeValue(timeRaw) || '19:00';
        const toTimeRaw = mapping.to_time ? row[mapping.to_time] : '';
        parsedToTime = parseTimeValue(toTimeRaw);
        if (parsedTime && parsedToTime) {
          const [fh, fm] = parsedTime.split(':').map(Number);
          const [th, tm] = parsedToTime.split(':').map(Number);
          const diff = (th * 60 + tm) - (fh * 60 + fm);
          if (diff > 0) duration = diff;
        }
      }

      // Guarantee to_time is always populated — never leave it null, since the
      // reservation software expects a real end time on every reservation.
      if (!parsedToTime && parsedTime) {
        const [sh, sm] = parsedTime.split(':').map(Number);
        const endTotal = sh * 60 + sm + duration;
        parsedToTime = `${String(Math.floor(endTotal / 60) % 24).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;
      }

      const tableNameRaw = mapping.table_name ? String(row[mapping.table_name] || '').trim() : '';
      let matchedTable = tableNameRaw
        ? tables.find((t) => (t.name || '').toLowerCase() === tableNameRaw.toLowerCase())
        : null;

      let wasRandomTable = false;
      if (!matchedTable && pickRandomTable) {
        matchedTable = pickRandomTable(guests);
        wasRandomTable = !!matchedTable;
      }

      if (!name) rowErrors.push('Missing customer name');
      if (!parsedDate) rowErrors.push('Unreadable date');
      if (wasRandomTable) rowErrors.push(`Table auto-assigned (${matchedTable.name})`);

      const record = {
        _rowIndex: idx,
        customer_name: name || 'Guest',
        customer_email: mapping.customer_email ? String(row[mapping.customer_email] || '').trim() : '',
        customer_phone: mapping.customer_phone ? String(row[mapping.customer_phone] || '').trim() : '',
        number_of_guests: guests,
        reservation_date: parsedDate,
        from_time: parsedTime,
        to_time: parsedToTime,
        duration_minutes: duration,
        status: mapping.status && row[mapping.status] ? String(row[mapping.status]).trim().toLowerCase() : defaultStatus,
        special_requests: mapping.special_requests ? String(row[mapping.special_requests] || '').trim() : '',
        table_name: matchedTable ? matchedTable.name : tableNameRaw,
        table_id: matchedTable?.id || null,
        _randomized: randomizeTimes,
        _randomizedTable: wasRandomTable,
        _hardError: !name || !parsedDate,
      };

      if (record._hardError) errors.push({ row: idx, reasons: rowErrors, record });
      else valid.push({ ...record, _warnings: rowErrors });
    });

    return { valid, errors };
  }, [importMode, rows, mapping, dateFormat, defaultStatus, defaultDuration, defaultGuests, tables, randomizeTimes, randomizeTables, restaurant]);

// ── Batched Firestore write — guest/CRM contact list ────────────────────────
  const runGuestImport = async () => {
    setStep('importing');
    const collectionName = restaurant?._collection || 'restaurants';
    const restaurantId = restaurant?.id;
    const items = guestPreview.valid;
    setImportProgress({ done: 0, total: items.length });
    setImportStartTime(Date.now());

    const batchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let successCount = 0;
    let failCount = 0;

    const CHUNK_SIZE = 450;
    const chunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) chunks.push(items.slice(i, i + CHUNK_SIZE));

    const CONCURRENCY = 4;
    let doneCount = 0;
    const reservationRefs = [];

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const group = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(group.map(async (chunk) => {
        const batch = writeBatch(firestore);
        chunk.forEach((item) => {
          const ref = doc(collection(firestore, 'reservations'));
          reservationRefs.push(ref);

          // Merge from_time into the date so imported rows carry the real
          // timestamp (TableView displays/sorts by this, not from_time)
          const resDate = new Date(item.reservation_date);
          if (item.from_time && /^\d{2}:\d{2}$/.test(item.from_time)) {
            const [h, m] = item.from_time.split(':').map(Number);
            resDate.setHours(h, m, 0, 0);
          }

          batch.set(ref, {
            customer_name: item.customer_name,
            customerEmail: item.customerEmail,
            customerPhone: item.customerPhone,
            lastCompletedVisit: item.lastCompletedVisit || null,
            marketingConsent: consentConfirmed,
            is_imported: true,
            import_batch_id: batchId,
            import_file_name: fileName,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        try {
          await batch.commit();
          return chunk.length;
        } catch (e) {
          console.error('Guest import batch failed:', e);
          return -chunk.length;
        }
      }));

      results.forEach((r) => {
        if (r >= 0) successCount += r; else failCount += -r;
        doneCount += Math.abs(r);
      });
      setImportProgress({ done: doneCount, total: items.length });
    }

    try {
      await setDoc(doc(firestore, collectionName, restaurantId, 'importBatches', batchId), {
        batchId, mode: 'guests', fileName, count: successCount, createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to write import summary:', e);
    }

    setImportResult({ successCount, failCount, skipped: guestPreview.errors.length });
    setLastBatchId(batchId);
    setLastBatchCount(successCount);
    setLastReservationRefs([]); // guest docs can be merged with prior imports — no safe ref-only undo
    setStep('done');
    onImported && onImported(null); // guest imports don't create calendar events
  };

  // ── Batched Firestore write — reservations ──────────────────────────────────
  const runImport = async () => {
    setStep('importing');
    const currentUser = auth.currentUser;
    const restaurantOwnerId = restaurant?.Owner_ID || currentUser?.uid;
    const collectionName = restaurant?._collection || 'restaurants';
    const items = preview.valid;

    // Dedupe guest writes: a repeat customer with many reservations in this file
    // should only cost ONE guestActivity write, not one per reservation.
    const guestMap = new Map();
    items.forEach((item) => {
      const guestId = makeGuestId(item.customer_email, item.customer_phone);
      if (!guestId) return;
      const existing = guestMap.get(guestId);
      const thisDate = item.reservation_date;
      const isNewer = !existing || (thisDate && (!existing.lastCompletedVisit || thisDate > existing.lastCompletedVisit));
      guestMap.set(guestId, {
        guestId,
        customerName: isNewer ? item.customer_name : existing.customerName,
        customerEmail: item.customer_email || existing?.customerEmail || '',
        customerPhone: item.customer_phone || existing?.customerPhone || '',
        lastCompletedVisit: isNewer ? (thisDate || existing?.lastCompletedVisit || null) : existing.lastCompletedVisit,
      });
    });
    const guestItems = Array.from(guestMap.values());

    const totalWrites = items.length + guestItems.length;
    setImportProgress({ done: 0, total: totalWrites });
    setImportStartTime(Date.now());

    const batchId = `imp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let successCount = 0;
    let failCount = 0;
    let doneCount = 0;
    const reservationRefs = []; // tracked so undo can skip a read later

    const CHUNK_SIZE = 450;
    const CONCURRENCY = 4;

    // ── 1) Write reservations ──────────────────────────────────────────────
    const resChunks = [];
    for (let i = 0; i < items.length; i += CHUNK_SIZE) resChunks.push(items.slice(i, i + CHUNK_SIZE));

    for (let ci = 0; ci < resChunks.length; ci += CONCURRENCY) {
      const group = resChunks.slice(ci, ci + CONCURRENCY);
      const results = await Promise.all(group.map(async (chunk) => {
        const batch = writeBatch(firestore);
        chunk.forEach((item) => {
          const ref = doc(collection(firestore, 'reservations'));
          reservationRefs.push(ref);

          // Merge from_time into the date so imported rows carry the real
          // timestamp (TableView displays/sorts by this, not from_time)
          const resDate = new Date(item.reservation_date);
          if (item.from_time && /^\d{2}:\d{2}$/.test(item.from_time)) {
            const [h, m] = item.from_time.split(':').map(Number);
            resDate.setHours(h, m, 0, 0);
          }

          batch.set(ref, {
            customer_name: item.customer_name,
            customer_email: item.customer_email,
            customer_phone: item.customer_phone,
            number_of_guests: item.number_of_guests,
            reservation_date: resDate,
            from_time: item.from_time,
            to_time: item.to_time,
            duration_minutes: item.duration_minutes,
            status: item.status,
            special_requests: item.special_requests,
            internal_notes: '',
            ServiceType_Reservation: 'dine-in',
            meal_status: null,
            is_walkin: false,
            is_imported: true,
            import_batch_id: batchId,
            import_file_name: fileName,
            table_id: item.table_id,
            table_name: item.table_id ? item.table_name : '',
            table_ids: item.table_id ? [item.table_id] : [],
            table_names: item.table_id ? [item.table_name] : [],
            combination_id: null,
            combination_name: null,
            selected_menu_items: [],
            coupon_confirmed: false,
            reservation_completed_points_awarded: false,
            restaurant_id: restaurant?.id || null,
            restaurant_name: restaurant?.name || '',
            restaurant_owner_id: restaurantOwnerId,
            restaurant_collection: collectionName,
            created_by_uid: currentUser?.uid || null,
            created_by_role: (() => { try { return sessionStorage.getItem('staffRole') || 'owner'; } catch (e) { return 'owner'; } })(),
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        });
        try {
          await batch.commit();
          return chunk.length;
        } catch (e) {
          console.error('Import batch failed:', e);
          return -chunk.length;
        }
      }));

      results.forEach((r) => {
        if (r >= 0) successCount += r; else failCount += -r;
        doneCount += Math.abs(r);
      });
      setImportProgress({ done: doneCount, total: totalWrites });
    }

    // ── 2) Write deduplicated guest records — one write per unique guest ──────
    const guestChunks = [];
    for (let i = 0; i < guestItems.length; i += CHUNK_SIZE) guestChunks.push(guestItems.slice(i, i + CHUNK_SIZE));

    for (let ci = 0; ci < guestChunks.length; ci += CONCURRENCY) {
      const group = guestChunks.slice(ci, ci + CONCURRENCY);
      await Promise.all(group.map(async (chunk) => {
        const batch = writeBatch(firestore);
        chunk.forEach((g) => {
          const guestRef = doc(firestore, collectionName, restaurant.id, 'guestActivity', g.guestId);
          batch.set(guestRef, {
            customerName: g.customerName,
            customerEmail: g.customerEmail,
            customerPhone: g.customerPhone,
            lastCompletedVisit: g.lastCompletedVisit,
            is_imported: true,
            import_batch_id: batchId,
            import_file_name: fileName,
            updatedAt: serverTimestamp(),
          }, { merge: true });
        });
        try {
          await batch.commit();
        } catch (e) {
          console.error('Guest upsert batch failed:', e);
        }
      }));
      doneCount += group.reduce((sum, c) => sum + c.length, 0);
      setImportProgress({ done: doneCount, total: totalWrites });
    }

    // One cheap summary write instead of re-scanning everything later for History
    try {
      await setDoc(doc(firestore, collectionName, restaurant.id, 'importBatches', batchId), {
        batchId, mode: 'reservations', fileName, count: successCount, createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.error('Failed to write import summary:', e);
    }

    setImportResult({ successCount, failCount, skipped: preview.errors.length });
    setLastBatchId(batchId);
    setLastBatchCount(successCount);
    setLastReservationRefs(reservationRefs);
    setStep('done');

    const earliestDate = items.reduce((earliest, item) => {
      if (!item.reservation_date) return earliest;
      return !earliest || item.reservation_date < earliest ? item.reservation_date : earliest;
    }, null);
    const latestDate = items.reduce((latest, item) => {
      if (!item.reservation_date) return latest;
      return !latest || item.reservation_date > latest ? item.reservation_date : latest;
    }, null);
    onImported && onImported(earliestDate, restaurant, latestDate);
  };

  // ── Delete every reservation belonging to one import batch ────────────────
// ── Delete every doc belonging to one import batch ─────────────────────────
  const deleteImportBatch = async (batchId, mode, onDone, opts = {}) => {
    try {
      const collectionName = restaurant?._collection || 'restaurants';

      if (!opts.skipReservations) {
        const colRef = mode === 'guests'
          ? collection(firestore, collectionName, restaurant.id, 'guestActivity')
          : collection(firestore, 'reservations');
        const snap = await getDocs(query(colRef, where('import_batch_id', '==', batchId)));
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 450) {
          const chunk = docs.slice(i, i + 450);
          const batch = writeBatch(firestore);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
        if (!opts.skipSummaryCleanup) {
          try { await deleteDoc(doc(firestore, collectionName, restaurant.id, 'importBatches', batchId)); }
          catch (e) { /* best-effort */ }
        }
        onDone && onDone(docs.length);
        return;
      }

      // Only the guest side needs the query-based cleanup (reservations already deleted via cached refs)
      const guestColRef = collection(firestore, collectionName, restaurant.id, 'guestActivity');
      const snap = await getDocs(query(guestColRef, where('import_batch_id', '==', batchId)));
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 450) {
        const chunk = docs.slice(i, i + 450);
        const batch = writeBatch(firestore);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    } catch (e) {
      console.error('Failed to undo import:', e);
      alert('Failed to remove imported reservations: ' + e.message);
    }
  };

  const handleUndoLastImport = async () => {
    if (!lastBatchId) return;
    const label = importMode === 'guests' ? 'guests' : 'reservations';
    if (!window.confirm(`Remove all ${lastBatchCount} ${label} from this import? This cannot be undone.`)) return;
    setUndoing(true);

    if (importMode === 'reservations' && lastReservationRefs.length) {
      // Read-free delete: we already have every doc's ref from when we just
      // created them, so this skips the getDocs() query entirely.
      try {
        for (let i = 0; i < lastReservationRefs.length; i += 450) {
          const chunk = lastReservationRefs.slice(i, i + 450);
          const batch = writeBatch(firestore);
          chunk.forEach((ref) => batch.delete(ref));
          await batch.commit();
        }
        // Guest docs may have been merged with earlier imports, so those still
        // need the safer query-based cleanup.
        await deleteImportBatch(lastBatchId, 'reservations', null, { skipReservations: true });
        try {
          await deleteDoc(doc(firestore, restaurant._collection || 'restaurants', restaurant.id, 'importBatches', lastBatchId));
        } catch (e) { /* summary doc cleanup is best-effort */ }
        setUndone(true);
        onImported && onImported();
      } catch (e) {
        console.error('Failed to undo import:', e);
        alert('Failed to remove imported reservations: ' + e.message);
      }
    } else {
      await deleteImportBatch(lastBatchId, importMode, () => {
        setUndone(true);
        onImported && onImported();
      });
    }
    setUndoing(false);
  };

  // ── Load past import batches for this restaurant (both reservations & guests) ──
  const loadImportHistory = async () => {
    if (!restaurant?.id) return;
    setLoadingHistory(true);
    try {
      const collectionName = restaurant._collection || 'restaurants';
      const snap = await getDocs(collection(firestore, collectionName, restaurant.id, 'importBatches'));
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            batchId: data.batchId || d.id,
            mode: data.mode || 'reservations',
            fileName: data.fileName || 'Unknown file',
            count: data.count || 0,
            createdAt: data.createdAt?.toDate?.() || null,
          };
        })
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setImportHistory(list);
    } catch (e) {
      console.error('Failed to load import history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

    const handleDeleteHistoryBatch = async (batchId, count, mode) => {
    if (!window.confirm(`Remove all ${count} records from this import? This cannot be undone.`)) return;
    setDeletingBatchId(batchId);
    await deleteImportBatch(batchId, mode, () => {
      setImportHistory((prev) => prev.filter((b) => b.batchId !== batchId));
      onImported && onImported();
    });
    setDeletingBatchId(null);
  };

  const inputCls = "w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#fe8a24]";
  const etaLabel = useMemo(() => {
        if (!importStartTime || !importProgress.done || !importProgress.total) return null;
        const elapsedMs = Date.now() - importStartTime;
        const rate = importProgress.done / (elapsedMs / 1000); // rows per second
        const remaining = importProgress.total - importProgress.done;
        if (rate <= 0 || remaining <= 0) return null;
        const secondsLeft = Math.ceil(remaining / rate);
        if (secondsLeft < 60) return `~${secondsLeft}s remaining`;
        const mins = Math.floor(secondsLeft / 60);
        const secs = secondsLeft % 60;
        return `~${mins}m ${secs}s remaining`;
   }, [importProgress, importStartTime, etaTick]);

  return (

    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => step !== 'importing' && onClose()} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] px-4 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="text-white font-bold text-sm sm:text-base flex items-center gap-2">
              <FiUpload className="w-4 h-4" /> {importMode === 'guests' ? 'Import Customer List' : 'Import Reservations'}
            </p>
            <p className="text-white/60 text-xs mt-0.5">
              {step === 'upload' && 'Upload any CSV export from another system'}
              {step === 'mapping' && 'Match your columns to the fields we need'}
              {step === 'preview' && 'Review before importing'}
              {step === 'importing' && 'Importing…'}
              {step === 'done' && 'Import complete'}
              {step === 'history' && 'Past imports — remove any of them anytime'}
            </p>
          </div>
          {step !== 'importing' && (
            <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-full text-white/70 hover:text-white">
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* Restaurant picker — always visible so imports never land in the wrong place */}
          {(step === 'upload' || step === 'mapping' || step === 'preview') && ownerRestaurants.length > 1 && (
            <div className="mb-4 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5">
              <FiHome className="w-4 h-4 text-[#fe8a24] flex-shrink-0" />
              <span className="text-xs font-semibold text-gray-600 flex-shrink-0">Importing into:</span>
              <select
                value={targetRestaurantId}
                onChange={(e) => setTargetRestaurantId(e.target.value)}
                disabled={step !== 'upload'}
                className="flex-1 bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#fe8a24] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {ownerRestaurants.map((r) => (
                  <option key={r.id} value={r.id}>{r.name || r.id}</option>
                ))}
              </select>
            </div>
          )}
          {loadingRestaurants && ownerRestaurants.length === 0 && step === 'upload' && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              <FiLoader className="w-3.5 h-3.5 animate-spin" /> Loading your restaurants…
            </div>
          )}
          {!loadingRestaurants && ownerRestaurants.length <= 1 && restaurant?.name && (
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
              <FiHome className="w-3.5 h-3.5" /> Importing into <span className="font-semibold text-gray-600">{restaurant.name}</span>
            </div>
          )}

          {/* ── STEP 1: Upload ── */}
          {step === 'upload' && (
            <div>
              <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl w-fit">
                {[
                  ['reservations', 'Import Reservations'],
                  ['guests', 'Import Customer List'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setImportMode(key); setMapping({}); }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      importMode === key ? 'bg-white text-[#fe8a24] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {importMode === 'guests' && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800">
                  Adds guests to your CRM contact list (name, email, phone, last visit) — this doesn't create bookings on the calendar. Used for win-back and birthday automations.
                </div>
              )}
              <div className="flex justify-end mb-3">
                <button
                  onClick={() => { setStep('history'); loadImportHistory(); }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors"
                >
                  <FiList className="w-3.5 h-3.5" /> View past imports
                </button>
              </div>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => document.getElementById('import-csv-input').click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-[#fe8a24] bg-orange-50' : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <FiFileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-700">Click to upload or drag and drop a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Works with exports from any reservation system</p>
                <input
                  id="import-csv-input" type="file" accept=".csv" className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
              </div>
              {parseError && (
                <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" /> {parseError}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Column Mapping ── */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                <span className="font-semibold text-gray-700">{fileName}</span> · {rows.length} rows found
              </div>

              <div className="space-y-2">
                {ALL_FIELDS.map((f) => {
                  const mappedHeader = mapping[f.key];
                  const samples = mappedHeader ? sampleValues(rows, mappedHeader, 3) : [];
                  return (
                    <div key={f.key} className="grid grid-cols-2 gap-3 items-start">
                      <label className="text-sm font-medium text-gray-700 pt-2.5">
                        {f.label} {REQUIRED_FIELDS.some((r) => r.key === f.key) && <span className="text-red-500">*</span>}
                      </label>
                      <div>
                        <select
                          value={mappedHeader || ''}
                          onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                          className={inputCls}
                        >
                          <option value="">— Not in file —</option>
                          {headers.map((h) => {
                            const preview = sampleValues(rows, h, 1)[0];
                            return (
                              <option key={h} value={h}>
                                {h}{preview ? ` (e.g. "${preview}")` : ''}
                              </option>
                            );
                          })}
                        </select>
                        {mappedHeader && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {samples.length > 0
                              ? <>e.g. <span className="text-gray-600">{samples.join(' · ')}</span></>
                              : <span className="italic">Column is empty</span>}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            <div className={`grid grid-cols-1 ${importMode === 'guests' ? 'sm:grid-cols-1' : 'sm:grid-cols-3'} gap-4 pt-2 border-t border-gray-100`}>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date format in file</label>
                  <select value={dateFormat} onChange={(e) => setDateFormat(e.target.value)} className={inputCls}>
                    <option value="DMY">Day / Month / Year</option>
                    <option value="MDY">Month / Day / Year</option>
                  </select>
               </div>
                {missingRequired.length > 0 && (
                <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeTables}
                      onChange={(e) => setRandomizeTables(e.target.checked)}
                      disabled={tables.length === 0}
                      className="mt-0.5 h-4 w-4 accent-[#fe8a24]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        Randomly assign tables {tables.length === 0 && <span className="text-xs font-normal text-gray-400">(no tables set up for this restaurant yet)</span>}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Only applies to rows without a matching table name in your file. Picks a table sized for the party where possible, and spreads reservations evenly across tables instead of piling them on one.
                      </p>
                    </div>
                  </label>
                </div>
              )}
              </div>

                {missingRequired.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
                  Map {missingRequired.map((f) => f.label).join(', ')} before continuing.
                </div>
              )}

              {importMode === 'reservations' && (
                <div className="border border-gray-200 rounded-xl p-3 sm:p-4 bg-gray-50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={randomizeTimes}
                      onChange={(e) => setRandomizeTimes(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#fe8a24]"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Randomize reservation time</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Keep the real dates from your file, but assign each one a random 1-hour time slot within the restaurant's opening hours for that day — useful when the file only has a visit date, no time.
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {importMode === 'guests' && (
                <label className="flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg px-3 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentConfirmed}
                    onChange={(e) => setConsentConfirmed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#fe8a24]"
                  />
                  <span className="text-xs text-gray-600">
                    I confirm these guests have consented to be contacted for marketing (e.g. win-back/birthday emails). Required to continue.
                  </span>
                </label>
              )}
            </div>
          )}

        {/* ── STEP 3: Preview ── */}
          {step === 'preview' && (
            <div className="space-y-4">
              {importMode === 'guests' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{guestPreview.valid.length}</p>
                      <p className="text-xs text-green-600 font-medium">Ready to import</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{guestPreview.errors.length}</p>
                      <p className="text-xs text-red-600 font-medium">Will be skipped</p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {['Name', 'Email', 'Phone', 'Last Visit', 'Note'].map((h) => (
                              <th key={h} className="text-left font-semibold text-gray-500 uppercase px-3 py-2">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {guestPreview.valid.slice(0, 100).map((r) => (
                            <tr key={r._rowIndex} className={r._warnings?.length ? 'bg-amber-50/50' : ''}>
                              <td className="px-3 py-1.5 font-medium text-gray-800">{r.customerName}</td>
                              <td className="px-3 py-1.5 text-gray-600">{r.customerEmail || '—'}</td>
                              <td className="px-3 py-1.5 text-gray-600">{r.customerPhone || '—'}</td>
                              <td className="px-3 py-1.5 text-gray-600">{r.lastCompletedVisit?.toLocaleDateString() || '—'}</td>
                              <td className="px-3 py-1.5 text-amber-600">{r._warnings?.join('; ')}</td>
                            </tr>
                          ))}
                          {guestPreview.errors.slice(0, 20).map((e) => (
                            <tr key={`err-${e.row}`} className="bg-red-50/50">
                              <td colSpan={5} className="px-3 py-1.5 text-red-600">
                                Row {e.row + 2}: {e.reasons.join('; ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {guestPreview.valid.length > 100 && (
                      <div className="text-center text-xs text-gray-400 py-2 bg-gray-50">
                        …and {guestPreview.valid.length - 100} more rows
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{preview.valid.length}</p>
                      <p className="text-xs text-green-600 font-medium">Ready to import</p>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{preview.valid.filter(v => v._warnings?.length).length}</p>
                      <p className="text-xs text-amber-600 font-medium">With warnings</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                      <p className="text-2xl font-bold text-red-700">{preview.errors.length}</p>
                      <p className="text-xs text-red-600 font-medium">Will be skipped</p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {['Name', 'Date', 'Time', 'Guests', 'Table', 'Status', 'Note'].map((h) => (
                              <th key={h} className="text-left font-semibold text-gray-500 uppercase px-3 py-2">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {preview.valid.slice(0, 100).map((r) => (
                            <tr key={r._rowIndex} className={r._warnings?.length ? 'bg-amber-50/50' : ''}>
                              <td className="px-3 py-1.5 font-medium text-gray-800">{r.customer_name}</td>
                               <td className="px-3 py-1.5 text-gray-600">
                                {r.reservation_date?.toLocaleDateString()}
                              </td>
                              <td className="px-3 py-1.5 text-gray-600 font-mono">
                                {r.from_time} {r._randomized && <span title="Time was randomized within business hours">🎲</span>}
                              </td>
                              <td className="px-3 py-1.5 text-gray-600">{r.number_of_guests}</td>
                              <td className="px-3 py-1.5 text-gray-600">{r.table_name || '—'}</td>
                              <td className="px-3 py-1.5 text-gray-600 capitalize">{r.status}</td>
                              <td className="px-3 py-1.5 text-amber-600">{r._warnings?.join('; ')}</td>
                            </tr>
                          ))}
                          {preview.errors.slice(0, 20).map((e) => (
                            <tr key={`err-${e.row}`} className="bg-red-50/50">
                              <td colSpan={7} className="px-3 py-1.5 text-red-600">
                                Row {e.row + 2}: {e.reasons.join('; ')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.valid.length > 100 && (
                      <div className="text-center text-xs text-gray-400 py-2 bg-gray-50">
                        …and {preview.valid.length - 100} more rows
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {/* ── STEP 4: Importing ── */}
          {step === 'importing' && (
            <div className="flex flex-col items-center justify-center py-16">
              <FiLoader className="w-10 h-10 text-[#fe8a24] animate-spin mb-4" />
              <p className="text-sm font-semibold text-gray-700">
                Importing {importProgress.done} / {importProgress.total}…
              </p>
              <div className="w-64 h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-[#fe8a24] transition-all"
                  style={{ width: `${importProgress.total ? (importProgress.done / importProgress.total) * 100 : 0}%` }}
                />
              </div>
              {etaLabel && (
                <p className="text-xs text-gray-400 mt-3">{etaLabel}</p>
              )}
            </div>
          )}
        {/* ── STEP 5: Done ── */}
          {step === 'done' && importResult && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {undone ? (
                <>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <FiRotateCcw className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Import undone</p>
                  <p className="text-sm text-gray-500 mt-1">{lastBatchCount} {importMode === 'guests' ? 'guests' : 'reservations'} were removed.</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <FiCheck className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-bold text-gray-900">Import complete</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {importResult.successCount} {importMode === 'guests' ? 'guests' : 'reservations'} imported
                    {importResult.failCount > 0 && `, ${importResult.failCount} failed`}
                    {importResult.skipped > 0 && `, ${importResult.skipped} skipped`}
                  </p>
                  {importResult.successCount > 0 && (
                    <button
                      onClick={handleUndoLastImport}
                      disabled={undoing}
                      className="mt-4 flex items-center gap-2 px-4 py-2 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                    >
                      {undoing ? <FiLoader className="w-4 h-4 animate-spin" /> : <FiRotateCcw className="w-4 h-4" />}
                      {undoing ? 'Removing…' : `Undo this import (${lastBatchCount})`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── History: past imports, deletable anytime ── */}
          {step === 'history' && (
            <div className="space-y-3">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <FiLoader className="w-6 h-6 text-[#fe8a24] animate-spin" />
                </div>
              ) : importHistory.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-400">
                  No imports found for this restaurant.
                </div>
              ) : (
                importHistory.map((batch) => (
                  <div key={batch.batchId} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                        {batch.fileName}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${batch.mode === 'guests' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                          {batch.mode === 'guests' ? 'Guests' : 'Reservations'}
                        </span>
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        <FiClock className="w-3 h-3" />
                        {batch.createdAt ? batch.createdAt.toLocaleString() : 'Unknown time'} · {batch.count} records
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteHistoryBatch(batch.batchId, batch.count, batch.mode)}
                      disabled={deletingBatchId === batch.batchId}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-600 border-2 border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 flex-shrink-0"
                    >
                      {deletingBatchId === batch.batchId ? (
                        <FiLoader className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FiTrash2 className="w-3.5 h-3.5" />
                      )}
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
            <div>
              {step === 'mapping' && (
                <button onClick={() => setStep('upload')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                  <FiChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {step === 'preview' && (
              <button onClick={() => setStep('mapping')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <FiChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
            {step === 'history' && (
              <button onClick={() => setStep('upload')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                <FiChevronLeft className="w-4 h-4" /> Back
              </button>
            )}
          </div>
            <div className="flex items-center gap-2">
            {step === 'done' || step === 'history' ? (
              <button onClick={onClose} className="px-5 py-2.5 bg-[#fe8a24] text-white rounded-xl text-sm font-bold hover:bg-[#ff9d47]">
                Close
              </button>
            ) : step !== 'importing' && (
              <>
                <button onClick={onClose} className="px-4 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white">
                  Cancel
                </button>
                {step === 'mapping' && (
                  <button
                    onClick={() => setStep('preview')}
                    disabled={missingRequired.length > 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe8a24] text-white rounded-xl text-sm font-bold hover:bg-[#ff9d47] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Preview <FiChevronRight className="w-4 h-4" />
                  </button>
                )}
                {step === 'preview' && importMode === 'reservations' && (
                  <button
                    onClick={runImport}
                    disabled={preview.valid.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe8a24] text-white rounded-xl text-sm font-bold hover:bg-[#ff9d47] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiUpload className="w-4 h-4" /> Import {preview.valid.length} Reservations
                  </button>
                )}
                {step === 'preview' && importMode === 'guests' && (
                  <button
                    onClick={runGuestImport}
                    disabled={guestPreview.valid.length === 0 || !consentConfirmed}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#fe8a24] text-white rounded-xl text-sm font-bold hover:bg-[#ff9d47] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FiUpload className="w-4 h-4" /> Import {guestPreview.valid.length} Guests
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}