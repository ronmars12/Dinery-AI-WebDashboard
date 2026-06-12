// src/pages/ManageReservationPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, addDoc, collection,
  getDocs, query, where, onSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from '../../firebase';
import {
  FiCalendar, FiClock, FiUsers, FiMapPin,
  FiCheck, FiX, FiChevronLeft, FiChevronRight, FiEdit2,
  FiTrash2, FiArrowRight, FiHome, FiCheckCircle,
  FiAlertCircle, FiInfo, FiUser, FiMail, FiPhone, FiBookOpen,
} from 'react-icons/fi';

// ─── Helpers ────────────────────────────────────────────────────────────────
const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getOpenDayNames = (customHours) => {
  if (!customHours?.length) return new Set(ALL_DAYS);
  const open = new Set();
  for (const slot of customHours) {
    for (const d of (slot.days || [])) { if (d.name) open.add(d.name); }
  }
  return open.size > 0 ? open : new Set(ALL_DAYS);
};

const resolveHoursForDate = (customHours, date, settings) => {
  const def = { openTime: '10:00', closeTime: '22:00', maxGuests: 20, isOpen: true, interval: 30, startOffset: 0, endOffset: 0 };
  if (!customHours?.length || !date) return def;
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  for (const slot of customHours) {
    const entry = (slot.days || []).find(d => d.name === dayName);
    if (entry) {
      const ds = settings?.dayIntervals?.[dayName];
      return {
        openTime: slot.openTime || '10:00',
        closeTime: slot.closeTime || '22:00',
        maxGuests: entry.maxGuests > 0 ? entry.maxGuests : 20,
        isOpen: true,
        interval: ds?.interval || 30,
        startOffset: ds?.startOffset || 0,
        endOffset: ds?.endOffset || 0,
      };
    }
  }
  return { ...def, maxGuests: 0, isOpen: false };
};

const generateTimeSlots = (openTime, closeTime, interval = 30) => {
  const slots = [];
  if (!openTime || !closeTime) return slots;
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;
  if (cMin <= oMin) cMin += 24 * 60;
  const maxMin = oMin + 18 * 60;
  const endMin = Math.min(cMin, maxMin);
  for (let m = oMin; m < endMin; m += interval) {
    const a = m % (24 * 60);
    const h = Math.floor(a / 60), min = a % 60;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    slots.push({ value, label: `${h12}:${String(min).padStart(2, '0')} ${ampm}` });
  }
  return slots;
};

// ─── Mini Calendar (Professional) ───────────────────────────────────────────
function MiniCalendar({ selectedDate, onDateSelect, accentColor, openDayNames }) {
  const [view, setView] = useState(new Date());
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const cells = [];
  const firstDayMon = (firstDay + 6) % 7;
  for (let i = 0; i < firstDayMon; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const mName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white tracking-wide">{mName}</span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-3">
        {days.map((d, i) => {
          const fullDay = ALL_DAYS[(i + 1) % 7];
          const isClosed = openDayNames && !openDayNames.has(fullDay);
          return (
            <div key={d} className="text-center">
              <span className={`text-xs font-medium ${isClosed ? 'text-white/15' : 'text-white/40'}`}>
                {d}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const td = new Date(yr, mo, day); td.setHours(0, 0, 0, 0);
          const isPast = td < today;
          const dayName = ALL_DAYS[td.getDay()];
          const isClosed = openDayNames && !openDayNames.has(dayName);
          const isDisabled = isPast || isClosed;
          const isSel = selectedDate && td.toDateString() === selectedDate.toDateString();
          const isToday = td.toDateString() === today.toDateString();

          let buttonClass = "aspect-square rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center ";
          if (isDisabled) {
            buttonClass += "cursor-not-allowed text-white/15 bg-transparent";
          } else if (isSel) {
            buttonClass += ` text-white shadow-md transform scale-105`;
          } else if (isToday) {
            buttonClass += ` text-white/90 bg-white/10 hover:bg-white/20 border border-white/20`;
          } else {
            buttonClass += ` text-white/70 hover:text-white hover:bg-white/10 bg-transparent`;
          }

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onDateSelect(td)}
              className={buttonClass}
              style={isSel ? { backgroundColor: accentColor, boxShadow: `0 4px 12px ${accentColor}40` } : {}}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const config = {
    confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: FiCheckCircle, label: 'Confirmed' },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: FiAlertCircle, label: 'Pending' },
    cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', icon: FiX, label: 'Cancelled' },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: FiCheck, label: 'Completed' },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

// ─── Info Row ───────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, subValue }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-200">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#fe8a2422' }}>
        <Icon className="w-4 h-4" style={{ color: '#fe8a24' }} />
      </div>
      <div className="flex-1">
        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white/90 text-sm font-semibold">{value}</p>
        {subValue && <p className="text-white/30 text-xs">{subValue}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ManageReservationPage() {
  const { reservationId } = useParams();
  const db = firestore;
  const [reservation, setReservation] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [pageConfig, setPageConfig] = useState(null);
  const [allReservations, setAllReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState('view');

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [slotAvail, setSlotAvail] = useState(null);
  const [modStep, setModStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [request, setRequest] = useState('');

  const getTableCapacityInfo = (guestCount) => {
    const matchingCombo = combinations.find(c =>
      guestCount >= (c.minCapacity || 1) && guestCount <= (c.maxCapacity || 999)
    );
    if (matchingCombo) {
      return {
        fits: true,
        type: 'combo',
        name: matchingCombo.name,
        capacity: matchingCombo.maxCapacity,
        tableNames: matchingCombo.tableNames,
      };
    }
    const eligible = restaurantTables.filter(t => {
      const maxCap = t.maxCapacity || t.capacity || 0;
      return guestCount >= (t.minCapacity || 1) && (maxCap === 0 || guestCount <= maxCap) && t.online !== false;
    });
    if (eligible.length > 0) {
      const best = eligible.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0];
      return { fits: true, type: 'table', name: best.name, capacity: best.maxCapacity || best.capacity };
    }
    const allTables = restaurantTables.filter(t => t.online !== false);
    const sorted = allTables.sort((a, b) => (b.maxCapacity || 0) - (a.maxCapacity || 0));
    let combined = 0, combinedNames = [];
    for (const t of sorted) {
      combined += (t.maxCapacity || t.capacity || 0);
      combinedNames.push(t.name);
      if (combined >= guestCount) {
        return { fits: true, type: 'multi', name: combinedNames.join(' + '), capacity: combined };
      }
    }
    return { fits: false, maxAvailable: combined };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'reservations', reservationId));
        if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
        const res = { id: snap.id, ...snap.data() };
        setReservation(res);
        setGuests(res.number_of_guests || 2);

        const col = res.restaurant_collection || 'restaurants';
        const rSnap = await getDoc(doc(db, col, res.restaurant_id));
        if (rSnap.exists()) setRestaurantData({ id: rSnap.id, _collection: col, ...rSnap.data() });

        const tabSnap = await getDocs(collection(db, col, res.restaurant_id, 'tables'));
        setRestaurantTables(tabSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        try {
          const comboSnap = await getDocs(collection(db, col, res.restaurant_id, 'tableCombinations'));
          setCombinations(comboSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { }

        try {
          const sSnap = await getDoc(doc(db, col, res.restaurant_id, 'reservationSettings', 'config'));
          if (sSnap.exists()) setSettings(sSnap.data());
        } catch (e) { }

        try {
          const cfgSnap = await getDoc(doc(db, col, res.restaurant_id, 'reservationConfig', 'config'));
          if (cfgSnap.exists()) setPageConfig(cfgSnap.data());
        } catch (e) { }

      } catch (e) {
        console.error(e); setNotFound(true);
      } finally { setLoading(false); }
    };
    load();
  }, [reservationId]);

  useEffect(() => {
    if (!reservation?.restaurant_id) return;
    const q = query(
      collection(db, 'reservations'),
      where('restaurant_id', '==', reservation.restaurant_id),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const unsub = onSnapshot(q, snap => {
      setAllReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [reservation?.restaurant_id]);

  const customHours = restaurantData?.customHours || [];
  const openDayNames = getOpenDayNames(customHours);
  const resolvedHours = resolveHoursForDate(customHours, selectedDate, settings);
  const { openTime, closeTime, isOpen, interval, startOffset, endOffset } = resolvedHours;

  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const effOpenMin = oH * 60 + oM + (startOffset || 0);
  const effCloseMin = cH * 60 + cM - (endOffset || 0);
  const effOpen = `${String(Math.floor(effOpenMin / 60)).padStart(2, '0')}:${String(effOpenMin % 60).padStart(2, '0')}`;
  const effClose = `${String(Math.floor(effCloseMin / 60)).padStart(2, '0')}:${String(effCloseMin % 60).padStart(2, '0')}`;
  const allTimeSlots = generateTimeSlots(effOpen, effClose, interval);
  const dayName = selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : null;
  const blockedSlots = settings?.blockedTimeSlots?.[dayName] || [];
  const timeSlots = allTimeSlots.filter(s => {
    if (blockedSlots.includes(s.value)) return false;
    if (!selectedDate) return true;
    const dt = new Date(selectedDate);
    const [h, m] = s.value.split(':').map(Number);
    dt.setHours(h, m, 0, 0);
    return dt > new Date();
  });

  useEffect(() => {
    if (!selectedDate || !timeSlots.length || !restaurantTables.length) return;
    setSlotAvail(null);
    const timer = setTimeout(() => {
     const getEffectiveDuration = (guestCount) => {
        const def = settings?.defaultReservationDuration || 120;
        if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
        const match = settings.guestDurationRules.find(
          r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
        );
        return match ? match.duration : def;
      };
      const diningDur = getEffectiveDuration(guests);
      const cleanupDur = settings?.tableCleanupTime || 0;
      const totalDur = diningDur + cleanupDur;
      const avail = {};
      for (const slot of timeSlots) {
        const slotDt = new Date(selectedDate);
        const [sh, sm] = slot.value.split(':').map(Number);
        slotDt.setHours(sh, sm, 0, 0);
        const slotEnd = new Date(slotDt.getTime() + totalDur * 60000);
        const bookedIds = new Set();
        allReservations.forEach(res => {
          if (res.id === reservationId) return;
          const rDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
          const rEnd = new Date(rDate.getTime() + ((res.duration_minutes || diningDur) + cleanupDur) * 60000);
          if (rDate < slotEnd && rEnd > slotDt) {
            (Array.isArray(res.table_ids) ? res.table_ids : [res.table_id]).forEach(tid => tid && bookedIds.add(tid));
          }
        });
        const suitableTables = restaurantTables.filter(t => {
          const maxCap = t.maxCapacity || t.capacity || 0;
          return guests >= (t.minCapacity || 1) && (maxCap === 0 || guests <= maxCap) && t.online !== false;
        });
        const suitableCombos = combinations.filter(c => guests >= (c.minCapacity || 1) && guests <= (c.maxCapacity || 999));
        let free = suitableTables.some(t => !bookedIds.has(t.id))
          || suitableCombos.some(c => (c.tableIds || []).every(tid => !bookedIds.has(tid)));
        if (bookedIds.size === 0 && (suitableTables.length || suitableCombos.length)) free = true;
        avail[slot.value] = free;
      }
      setSlotAvail({ ...avail });
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedDate, guests, allReservations, restaurantTables, combinations, settings]);

  const autoAssignTable = (guestCount, bookedIds = new Set()) => {
    const combo = combinations.find(c =>
      guestCount >= (c.minCapacity || 1) && guestCount <= (c.maxCapacity || 999) &&
      (c.tableIds || []).every(tid => !bookedIds.has(tid))
    );
    if (combo) return { isCombination: true, combination: combo, tableIds: combo.tableIds, tableNames: combo.tableNames };
    const eligible = restaurantTables
      .filter(t => {
        const maxCap = t.maxCapacity || t.capacity || 0;
        return guestCount >= (t.minCapacity || 1) && (maxCap === 0 || guestCount <= maxCap) && t.online !== false && !bookedIds.has(t.id);
      })
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    if (!eligible.length) return null;
    const t = eligible[0];
    return { isCombination: false, table: t, tableIds: [t.id], tableNames: [t.name] };
  };

  const handleConfirmModification = async () => {
    if (!selectedDate || !selectedTime) return;

    const capInfo = getTableCapacityInfo(guests);
    if (!capInfo.fits) {
      alert(`No table can accommodate ${guests} guests. Please reduce the guest count.`);
      setModStep(1);
      return;
    }

    setSaving(true);
    try {
      const resDate = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      resDate.setHours(h, m, 0, 0);

      const getEffectiveDuration = (guestCount) => {
        const def = settings?.defaultReservationDuration || 120;
        if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
        const match = settings.guestDurationRules.find(
          r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
        );
        return match ? match.duration : def;
      };
      const diningDur = getEffectiveDuration(guests);
      const cleanupDur = settings?.tableCleanupTime || 0;
      const totalDur = diningDur + cleanupDur;
      const resEnd = new Date(resDate.getTime() + totalDur * 60000);

      const liveSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('restaurant_id', '==', reservation.restaurant_id),
        where('status', 'in', ['pending', 'confirmed'])
      ));
      const bookedIds = new Set();
      liveSnap.docs.forEach(d => {
        if (d.id === reservationId) return;
        const r = d.data();
        const rDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
        const rEnd = new Date(rDate.getTime() + ((r.duration_minutes || diningDur) + cleanupDur) * 60000);
        if (rDate < resEnd && rEnd > resDate) {
          (Array.isArray(r.table_ids) ? r.table_ids : [r.table_id]).forEach(tid => tid && bookedIds.add(tid));
        }
      });

      const assignment = autoAssignTable(guests, bookedIds);
      if (!assignment) {
        alert('No tables available for this slot. Please choose another time.');
        setSaving(false); return;
      }

      const col = reservation.restaurant_collection || 'restaurants';

      const tableUpdate = assignment.isCombination
        ? {
          combination_id: assignment.combination.id,
          combination_name: assignment.combination.name,
          table_ids: assignment.tableIds,
          table_names: assignment.tableNames,
          table_id: assignment.tableIds[0],
          table_name: assignment.tableNames[0],
        }
        : {
          table_id: assignment.table.id,
          table_name: assignment.table.name || '',
          table_ids: assignment.tableIds,
          table_names: assignment.tableNames,
          combination_id: null,
          combination_name: null,
        };

        const prevDate = resDate;
        const modSummary = [
          resDate.toDateString() !== (reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date)).toDateString()
            ? `Date: ${(reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} → ${resDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : null,
          resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) !== formattedTime
            ? `Time: ${formattedTime} → ${resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            : null,
          guests !== reservation.number_of_guests
            ? `Guests: ${reservation.number_of_guests} → ${guests}`
            : null,
        ].filter(Boolean).join(' · ');

        await updateDoc(doc(db, 'reservations', reservationId), {
          reservation_date: resDate,
          time: resDate.toISOString(),
          number_of_guests: guests,
          duration_minutes: diningDur,
          status: 'confirmed',
          change_request: null,
          cancel_reason: null,
          requested_date: null,
          requested_time: null,
          modification_summary: modSummary || null,
          modified_at: new Date(),
          ...tableUpdate,
          updated_at: new Date(),
        });

      if (reservation.customer_email) {
        try {
          const fn = httpsCallable(getFunctions(), 'sendEmail');
          const firstName = reservation.customer_name?.split(' ')[0] || 'there';
          const tableName = assignment.isCombination ? assignment.combination.name : assignment.table.name;
          await fn({
            to: reservation.customer_email,
            subject: `Reservation Confirmed – ${reservation.restaurant_name}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#fe8a24;">Reservation Updated ✅</h2>
                <p>Hi ${firstName},</p>
                <p>Your reservation at <strong>${reservation.restaurant_name}</strong> has been successfully updated.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px 0;color:#888;">Date</td><td style="font-weight:bold;">${resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Time</td><td style="font-weight:bold;">${resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Guests</td><td style="font-weight:bold;">${guests}</td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Table</td><td style="font-weight:bold;">${tableName}</td></tr>
                </table>
                <p style="color:#888;font-size:12px;">Your reservation has been confirmed with the new details above.</p>
                <p style="color:#888;font-size:12px;margin-top:24px;">— ${reservation.restaurant_name}</p>
              </div>
            `,
          }).catch(e => console.warn('Email failed:', e));
        } catch (e) { }
      }

      setSuccessMsg('Your reservation has been successfully updated and confirmed!');
      setMode('success');
    } catch (e) {
      console.error(e);
      alert('Failed to update reservation. Please try again.');
    } finally { setSaving(false); }
  };

const handleCancelRequest = async () => {
  setSaving(true);
  try {
    const col = reservation?.restaurant_collection || 'restaurants';

    // 1. Cancel the reservation immediately
    await updateDoc(doc(db, 'reservations', reservationId), {
      status: 'cancelled',
      cancel_reason: request || 'Cancelled by customer',
      change_request: null,
      updated_at: new Date(),
    });

    // 2. Free up the assigned table(s)
    const tableIds = Array.isArray(reservation?.table_ids) && reservation.table_ids.length
      ? reservation.table_ids
      : reservation?.table_id ? [reservation.table_id] : [];

    if (tableIds.length && reservation?.restaurant_id) {
      await Promise.all(
        tableIds.map(tid =>
          updateDoc(
            doc(db, col, reservation.restaurant_id, 'tables', tid),
            {
              current_status: null,
              reserved_by: null,
              reserved_date: null,
              reserved_guests: null,
              reserved_duration_minutes: null,
              reserved_source: null,
              updated_at: new Date(),
            }
          ).catch(e => console.warn('Could not clear table:', tid, e))
        )
      );
    }

    // 3. Send cancellation confirmation email
    if (reservation?.customer_email) {
      try {
        const fn = httpsCallable(getFunctions(), 'sendEmail');
        const firstName = reservation.customer_name?.split(' ')[0] || 'there';
        const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
        await fn({
          to: reservation.customer_email,
          subject: `Reservation Cancelled – ${reservation.restaurant_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#ef4444;">Reservation Cancelled</h2>
              <p>Hi ${firstName},</p>
              <p>Your reservation at <strong>${reservation.restaurant_name}</strong> has been cancelled.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 0;color:#888;">Date</td><td><strong>${resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Time</td><td><strong>${resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Guests</td><td><strong>${reservation.number_of_guests}</strong></td></tr>
              </table>
              ${request ? `<p style="color:#888;">Reason: ${request}</p>` : ''}
              <p style="color:#888;font-size:12px;">We hope to see you again soon.</p>
              <p style="color:#888;font-size:12px;margin-top:16px;">— ${reservation.restaurant_name}</p>
            </div>
          `,
        }).catch(e => console.warn('Cancellation email failed:', e));
      } catch (e) { console.warn('Email error:', e); }
    }

    setSuccessMsg('Your reservation has been cancelled. A confirmation email has been sent.');
    setMode('success');
  } catch (e) {
    console.error(e);
    alert('Failed to cancel reservation. Please try again.');
  } finally {
    setSaving(false);
  }
};

  const resDate = reservation?.reservation_date?.toDate?.() || (reservation ? new Date(reservation.reservation_date) : null);
  const formattedDate = resDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) || '';
  const formattedTime = resDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '';
  const getTimeLabel = val => timeSlots.find(t => t.value === val)?.label || val;
  const effectiveMax = settings?.maxGuestsPerReservation || 20;

  // ── Page visual config from reservationConfig ──
  const accent = pageConfig?.accentColor || '#fe8a24';
  const pageAccent = accent;
  const logoUrl    = pageConfig?.logoUrl || '';
  const logoShape  = pageConfig?.logoShape || 'circle';
  const logoSize   = pageConfig?.logoSize || 'md';
  const logoSizePx = logoSize === 'sm' ? 52 : logoSize === 'lg' ? 96 : 72;
  const logoRadius = logoShape === 'circle' ? '50%' : logoShape === 'rounded' ? '18px' : '6px';

  const bgClass = pageConfig?.backgroundImageUrl
    ? ''
    : pageConfig?.backgroundMode === 'color'
    ? ''
    : `bg-gradient-to-br ${pageConfig?.backgroundGradient || 'from-[#0f0c29] via-[#302b63] to-[#24243e]'}`;

  const bgStyle = pageConfig?.backgroundImageUrl
    ? {
        backgroundImage: `url("${pageConfig.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : pageConfig?.backgroundMode === 'color'
    ? { backgroundColor: pageConfig.backgroundColor || '#1a1a2e' }
    : {};

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass || 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]'}`} style={bgStyle}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent }}></div>
      </div>
    </div>
  );

  if (notFound) return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bgClass || 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]'}`} style={bgStyle}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🍽️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">Reservation Not Found</h1>
        <p className="text-white/50 text-base">This link may be invalid, expired, or the reservation has been removed.</p>
      </div>
    </div>
  );

    return (
      <div className={`min-h-screen relative overflow-hidden ${bgClass}`} style={bgStyle}>
        {pageConfig?.backgroundImageUrl && (
          <div className="fixed inset-0 z-0 pointer-events-none"
            style={{ backgroundColor: `rgba(0,0,0,${pageConfig.overlayOpacity ?? 0.25})` }}/>
        )}
        <div className="fixed inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.03) 0%, transparent 50%)' }}/>
      <div className="relative z-10 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Logo */}
        {logoUrl && (
          <div className="flex justify-center mb-6">
            <div className="overflow-hidden shadow-2xl"
              style={{
                width: logoSizePx,
                height: logoSizePx,
                borderRadius: logoRadius,
                border: '2px solid rgba(255,255,255,0.18)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backgroundColor: 'transparent',
              }}>
              <img src={logoUrl} alt={reservation.restaurant_name}
                className="w-full h-full object-contain"
                style={{ backgroundColor: 'transparent' }}/>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <FiBookOpen className="w-3 h-3 text-white/50" />
            <span className="text-white/40 text-[11px] font-mono tracking-wider">MANAGE</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Manage Your<br />Reservation</h1>
          <p className="text-white/40 text-sm">Modify or cancel your booking</p>
        </div>

        {/* Booking Summary Card */}
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#fe8a24] to-[#fe8a24]/40" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Reservation ID</p>
                  <p className="text-white/60 text-xs font-mono">{reservation.id?.slice(0, 12)}...</p>
                </div>
                <StatusBadge status={reservation.status} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoRow icon={FiCalendar} label="Date" value={formattedDate} />
                <InfoRow icon={FiClock} label="Time" value={formattedTime} />
                <InfoRow icon={FiUsers} label="Guests" value={`${reservation.number_of_guests} guest${reservation.number_of_guests > 1 ? 's' : ''}`} />
                <InfoRow icon={FiMapPin} label="Restaurant" value={reservation.restaurant_name} />
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <FiUser className="w-3.5 h-3.5 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/40 text-xs">Customer</p>
                    <p className="text-white/80 text-sm font-medium">{reservation.customer_name}</p>
                  </div>
                  {reservation.customer_email && (
                    <div className="text-right">
                      <p className="text-white/30 text-xs">{reservation.customer_email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {mode === 'view' && !['cancelled', 'completed'].includes(reservation.status) && (
          <div className="grid gap-3">
            <button
              onClick={() => { setMode('modify_booking'); setModStep(1); setSelectedDate(null); setSelectedTime(''); setSlotAvail(null); }}
              className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#fe8a24]/0 to-[#fe8a24]/0 group-hover:from-[#fe8a24]/10 group-hover:to-transparent transition-all duration-500" />
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#fe8a24]/20 flex items-center justify-center">
                    <FiEdit2 className="w-4 h-4 text-[#fe8a24]" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">Modify Reservation</p>
                    <p className="text-white/40 text-xs">Change date, time, or party size</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </button>

            {false ? null : (
                <button
                  onClick={() => setMode('cancel_confirm')}
                  className="group relative overflow-hidden rounded-xl bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-all duration-300"
                >
                  <div className="relative flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <FiTrash2 className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-rose-400 font-semibold">Cancel Reservation</p>
                        <p className="text-rose-400/50 text-xs">Cancel your booking</p>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-rose-400/30 group-hover:text-rose-400/60 transition-colors" />
                  </div>
                </button>
              )}
          </div>
        )}

        {['cancelled', 'completed'].includes(reservation.status) && mode === 'view' && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FiInfo className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/40 text-base">This reservation is {reservation.status}</p>
            <p className="text-white/25 text-sm mt-1">It can no longer be modified online</p>
          </div>
        )}

        {/* Modify Booking Flow */}
        {mode === 'modify_booking' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            {modStep === 1 ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setMode('view')}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  >
                    <FiChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <h3 className="text-white font-bold text-lg">Modify Details</h3>
                </div>

                {/* Guest Count Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Party Size</p>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
                      <button
                        onClick={() => { const next = Math.max(1, guests - 1); setGuests(next); setSlotAvail(null); }}
                        disabled={guests <= 1}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold disabled:opacity-30 transition-all"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-lg w-10 text-center">{guests}</span>
                      <button
                        onClick={() => { const next = Math.min(effectiveMax, guests + 1); setGuests(next); setSlotAvail(null); }}
                        disabled={guests >= effectiveMax}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: accent }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {Array.from({ length: Math.min(effectiveMax, 8) }, (_, i) => i + 1).map(g => (
                      <button
                        key={g}
                        onClick={() => { setGuests(g); setSlotAvail(null); }}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${guests === g ? 'text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        style={guests === g ? { backgroundColor: accent } : {}}
                      >
                        {g}
                      </button>
                    ))}
                    {effectiveMax > 8 && (
                      <button
                        onClick={() => {
                          const v = parseInt(window.prompt(`Enter number of guests (max ${effectiveMax}):`)) || guests;
                          if (v > 0 && v <= effectiveMax) { setGuests(v); setSlotAvail(null); }
                        }}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${guests > 8 ? 'text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        style={guests > 8 ? { backgroundColor: accent } : {}}
                      >
                        {guests > 8 ? guests : '···'}
                      </button>
                    )}
                  </div>

                  {(() => {
                    const capInfo = getTableCapacityInfo(guests);
                    return capInfo.fits ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-300 font-medium">
                          {capInfo.type === 'combo'
                            ? `${capInfo.name} fits ${guests} guests`
                            : capInfo.type === 'multi'
                              ? `Combined tables accommodate ${guests} guests`
                              : `"${capInfo.name}" table fits ${guests} guests`}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <FiX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <p className="text-xs text-rose-300 font-medium">
                          No table for {guests} guests {capInfo.maxAvailable > 0 ? `(max: ${capInfo.maxAvailable})` : ''}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Calendar */}
                <div className="mb-6">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">Select Date</p>
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); setSlotAvail(null); }}
                    accentColor={accent}
                    openDayNames={openDayNames}
                  />
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="mb-6">
                    {!isOpen ? (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                        <p className="text-rose-300 text-sm font-medium">Restaurant Closed on {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}</p>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                        <p className="text-white/50 text-sm">No time slots available</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Select Time</p>
                          <p className="text-white/25 text-xs">{effOpen} – {effClose}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map(slot => {
                            const checked = slotAvail !== null;
                            const isFull = checked && slotAvail[slot.value] === false;
                            return (
                              <button
                                key={slot.value}
                                onClick={() => !isFull && setSelectedTime(slot.value)}
                                disabled={isFull || slotAvail === null}
                                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${slotAvail === null ? 'bg-white/5 text-white/30 cursor-wait'
                                  : isFull ? 'bg-rose-500/10 text-rose-400 cursor-not-allowed border border-rose-500/20'
                                    : selectedTime === slot.value ? 'text-white shadow-md transform scale-105'
                                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                                  }`}
                                style={!isFull && slotAvail !== null && selectedTime === slot.value ? { backgroundColor: accent } : {}}
                              >
                                {slotAvail === null ? '...' : isFull ? 'Full' : slot.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedDate && selectedTime && getTableCapacityInfo(guests).fits && (
                  <button
                    onClick={() => setModStep(2)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    Review Changes →
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setModStep(1)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                    <FiChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <h3 className="text-white font-bold text-lg">Confirm Changes</h3>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Current booking */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">Current Booking</p>
                    <div className="space-y-2 text-white/70 text-sm">
                      <div className="flex items-center gap-2"><FiCalendar className="w-3.5 h-3.5" /> {formattedDate}</div>
                      <div className="flex items-center gap-2"><FiClock className="w-3.5 h-3.5" /> {formattedTime}</div>
                      <div className="flex items-center gap-2"><FiUsers className="w-3.5 h-3.5" /> {reservation.number_of_guests} guests</div>
                      {(reservation.combination_name || reservation.table_name) && (
                        <div className="flex items-center gap-2">
                          🪑 {reservation.combination_name || (Array.isArray(reservation.table_names) && reservation.table_names.length > 1 ? reservation.table_names.join(' + ') : reservation.table_name)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-white/20 text-xs flex items-center gap-2">
                      <div className="w-8 h-px bg-white/20" /> Changes To <div className="w-8 h-px bg-white/20" />
                    </div>
                  </div>

                  {/* New booking */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}30` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: accent }}>New Booking</p>
                    <div className="space-y-2 text-white/90 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-3.5 h-3.5" style={{ color: accent }} />
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-3.5 h-3.5" style={{ color: accent }} />
                        {getTimeLabel(selectedTime)}
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-3.5 h-3.5" style={{ color: accent }} />
                        {guests} guests
                        {guests !== reservation.number_of_guests && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-1"
                            style={{ backgroundColor: accent + '30', color: accent }}>
                            {guests > reservation.number_of_guests ? `+${guests - reservation.number_of_guests}` : guests - reservation.number_of_guests}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const capInfo = getTableCapacityInfo(guests);
                        if (!capInfo.fits) return null;
                        const slotOk = slotAvail === null ? null : slotAvail[selectedTime] !== false;
                        return (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">🪑 {capInfo.name}
                              <span className="text-[10px] text-white/35 font-normal">(auto-assigned)</span>
                            </div>
                            {/* Live availability status — same engine as PublicReservationPage */}
                            {slotOk === null ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"/>
                                <p className="text-xs text-white/40">Checking availability...</p>
                              </div>
                            ) : slotOk ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"/>
                                <p className="text-xs text-emerald-300 font-medium">
                                  ✓ Table available — {getTimeLabel(selectedTime)} on {selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <FiX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0"/>
                                <p className="text-xs text-rose-300 font-medium">
                                  Slot just became unavailable — go back and pick another time.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Conflicting reservations at this slot — same logic as PublicReservationPage availability engine */}
                  {(() => {
                    if (!selectedDate || !selectedTime || !slotAvail) return null;
                    const diningDur  = settings?.defaultReservationDuration || 120;
                    const cleanupDur = settings?.tableCleanupTime || 0;
                    const slotDt = new Date(selectedDate);
                    const [sh, sm] = selectedTime.split(':').map(Number);
                    slotDt.setHours(sh, sm, 0, 0);
                    const slotEnd = new Date(slotDt.getTime() + (diningDur + cleanupDur) * 60000);
                    const conflicts = allReservations.filter(res => {
                      if (res.id === reservationId) return false;
                      const rDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
                      const rEnd  = new Date(rDate.getTime() + ((res.duration_minutes || diningDur) + cleanupDur) * 60000);
                      return rDate < slotEnd && rEnd > slotDt;
                    });
                    if (!conflicts.length) return null;
                    return (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-white/35 text-[10px] font-bold uppercase tracking-wider mb-2">
                          Other bookings at this time ({conflicts.length})
                        </p>
                        <div className="space-y-1.5">
                          {conflicts.map(res => {
                            const bookedTables = Array.isArray(res.table_names) && res.table_names.length
                              ? res.table_names.join(' + ')
                              : res.table_name || '—';
                            const rDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
                            return (
                              <div key={res.id} className="flex items-center justify-between text-xs text-white/40">
                                <span>🪑 {bookedTables}</span>
                                <span>{rDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {res.number_of_guests} guests</span>
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-white/20 text-[10px] mt-2">
                          Your table will be assigned from available tables only.
                        </p>
                      </div>
                    );
                  })()}

                  {guests !== reservation.number_of_guests && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                      <p className="text-blue-300 text-xs font-semibold">
                        ℹ️ Guest count changed — a new table will be assigned automatically based on availability.
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-white/30 text-xs text-center mb-5">
                  Your reservation will be updated immediately. A confirmation email will be sent to you.
                </p>

                  <button
                    onClick={handleConfirmModification}
                    disabled={saving || slotAvail?.[selectedTime] === false}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: slotAvail?.[selectedTime] === false ? '#6b7280' : accent }}
                  >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      Confirm Modification
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Cancel Confirmation */}
        {mode === 'cancel_confirm' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-rose-500/20 p-6">
            <h3 className="text-white font-bold text-lg mb-2">Cancel Reservation</h3>
            <p className="text-white/50 text-sm mb-5">Your cancellation request will be sent to the restaurant for confirmation.</p>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation (optional)"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMode('view')}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/10 hover:bg-white/15 transition-all"
              >
                Keep Reservation
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {saving ? 'Sending...' : 'Request Cancel'}
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {mode === 'success' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
              style={{ backgroundColor: successMsg.includes('cancel') ? '#ef4444' : accent }}>
              <FiCheck className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">
              {successMsg.includes('cancel') ? 'Request Sent!' : 'Reservation Updated!'}
            </h3>
            <p className="text-white/50 text-base">{successMsg}</p>
          </div>
        )}
        </div>
      </div>
      </div>
  );
}