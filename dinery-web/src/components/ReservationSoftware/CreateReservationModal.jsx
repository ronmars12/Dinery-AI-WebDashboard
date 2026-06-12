// src/components/reservation-software/CreateReservationModal.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import { FiX, FiSave, FiUser, FiPhone, FiMail, FiChevronRight, FiUsers, FiClock, FiCheck, FiArrowLeft } from 'react-icons/fi';

const sortTables = (tables) => {
  return [...tables].sort((a, b) => {
    const nameA = a.name?.toString() || '';
    const nameB = b.name?.toString() || '';
    
    // Check if both are numbers
    const numA = parseFloat(nameA);
    const numB = parseFloat(nameB);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      // Both are numbers - sort numerically
      return numA - numB;
    } else {
      // Not both numbers - sort alphabetically
      return nameA.localeCompare(nameB);
    }
  });
};

const getMealStatusConfig = (mealStatus) => {
  const map = {
    'arrived':        { color: '#ef4444', label: 'Arrived',       icon: '🔴' },
    'food_delivered': { color: '#3b82f6', label: 'Food Delivered', icon: '🔵' },
    'dessert':        { color: '#8b5cf6', label: 'Dessert',        icon: '🟣' },
    'bill_delivered': { color: '#eab308', label: 'Bill Delivered', icon: '🟡' },
    'table_cleared':  { color: '#84cc16', label: 'Table Cleared',  icon: '🟢' },
    'no_show':        { color: '#6b7280', label: 'No Show',        icon: '⚫' },
    'clear_out':      { color: '#9ca3af', label: 'Clear Out',      icon: '⚪' },
  };
  return map[mealStatus?.toLowerCase()] || null;
};

const inputCls = "w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-800 focus:outline-none focus:border-[#fe8a24] focus:bg-white transition-all placeholder:text-gray-300";
const labelCls = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5";

// ── Step indicator — defined OUTSIDE so it never remounts ──
const StepPill = ({ step, current, label }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
      current > step ? 'bg-green-500 text-white' :
      current === step ? 'bg-[#fe8a24] text-white' :
      'bg-gray-200 text-gray-400'
    }`}>
      {current > step ? '✓' : step}
    </div>
    <span className={`text-xs font-semibold ${current === step ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
  </div>
);

// ── TimeSlotGrid — defined OUTSIDE ──
const TimeSlotGrid = ({ loadingSettings, timeSlots, selectedSlot, setSelectedSlot, openTime, closeTime, compact }) => (
  <div>
    <p className={labelCls}>
      <FiClock className="inline w-3 h-3 mr-1"/>Time Slot{' '}
      <span className="text-gray-300 normal-case font-normal">({openTime}–{closeTime})</span>
    </p>
    {loadingSettings ? (
      <div className="flex items-center justify-center py-8 bg-gray-50 rounded-xl">
        <div className="w-6 h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin"/>
      </div>
    ) : timeSlots.length === 0 ? (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-sm text-red-500 font-medium">No available slots</div>
    ) : (
      <>
        <div className={`grid grid-cols-4 gap-1.5 ${compact ? 'max-h-48' : 'max-h-64'} overflow-y-auto pr-1`}>
          {timeSlots.map((slot, i) => {
            const isSel = selectedSlot?.startTime === slot.startTime;
            const label = slot.startTime;
            return (
              <button key={i} type="button" onClick={() => setSelectedSlot(slot)}
                className={`py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  isSel
                    ? 'bg-[#fe8a24] text-white shadow-md scale-105'
                    : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#fe8a24] hover:text-[#fe8a24] hover:bg-orange-50'
                }`}>
                {label}
              </button>
            );
          })}
        </div>
        {selectedSlot && (
          <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiCheck className="w-4 h-4 text-green-600"/>
              <span className="text-sm font-bold text-green-700">{selectedSlot.label}</span>
            </div>
            <button type="button" onClick={() => setSelectedSlot(null)} className="text-green-500 hover:text-green-700">
              <FiX className="w-4 h-4"/>
            </button>
          </div>
        )}
      </>
    )}
  </div>
);

// ── TableSelector — defined OUTSIDE ──
const TableSelector = ({
  tables, combinations, selectedTableIds, selectedCombination,
  setSelectedTableIds, setSelectedCombination, setTableError,
  tableError, guests, combinedCapacity, capacityOk, preSelectedTableId,
}) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <p className={labelCls}>🪑 Assign Table</p>
      {selectedTableIds.length > 0 && (
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${capacityOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          Cap {combinedCapacity} {capacityOk ? '✓' : `— need ${guests}`}
        </span>
      )}
    </div>
    {tableError && <p className="text-xs text-red-500 font-semibold flex items-center gap-1">⚠ {tableError}</p>}

    {combinations.length > 0 && (
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Combinations</p>
        <div className="flex flex-wrap gap-2">
          {combinations.map(combo => {
            const isSel = selectedCombination?.id === combo.id;
            return (
              <button key={combo.id} type="button"
                onClick={() => {
                  setTableError('');
                  if (isSel) { setSelectedCombination(null); setSelectedTableIds([]); }
                  else { setSelectedCombination(combo); setSelectedTableIds(combo.tableIds); }
                }}
                className={`relative flex flex-col gap-0.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                  isSel ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-400'
                }`}>
                {isSel && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <FiCheck className="w-2.5 h-2.5 text-white"/>
                  </span>
                )}
                <span className="font-bold">{combo.name}</span>
                <span className="text-gray-400">{combo.minCapacity}–{combo.maxCapacity} pax</span>
              </button>
            );
          })}
        </div>
      </div>
    )}

      {tables.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No tables available yet.</p>
      ) : (
        <div>
          {combinations.length > 0 && (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Individual Tables</p>
          )}
          <div className="flex flex-wrap gap-2">
            {sortTables(tables).map(t => {  // ← CHANGE THIS LINE
              const isSel = selectedTableIds.includes(t.id);
              const isPreSel = t.id === preSelectedTableId;
              return (
              <button key={t.id} type="button"
                onClick={() => {
                  setTableError('');
                  setSelectedTableIds(prev => prev.includes(t.id) ? prev.filter(x => x !== t.id) : [...prev, t.id]);
                }}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
                  isSel     ? 'border-[#fe8a24] bg-orange-50 text-[#fe8a24]' :
                  isPreSel  ? 'border-orange-300 bg-orange-50/50 text-orange-400' :
                              'border-gray-200 text-gray-600 hover:border-[#fe8a24]'
                }`}>
                {isSel && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#fe8a24] rounded-full flex items-center justify-center">
                    <FiCheck className="w-2.5 h-2.5 text-white"/>
                  </span>
                )}
                <span>{t.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSel ? 'bg-[#fe8a24]/20' : 'bg-gray-100'}`}>
                  <FiUsers className="inline w-2.5 h-2.5 mr-0.5"/>{t.maxCapacity}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    )}

    {selectedCombination && (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex flex-wrap gap-1.5">
        <span className="text-xs font-bold text-blue-700 w-full">🔗 {selectedCombination.name}</span>
        {selectedCombination.tableNames.map((n, i) => (
          <span key={i} className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{n}</span>
        ))}
      </div>
    )}
      {!selectedCombination && selectedTableIds.length > 1 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs text-orange-700 font-medium">
          🔗 Combined: {sortTables(tables.filter(t => selectedTableIds.includes(t.id))).map(t => t.name).join(' + ')} · {combinedCapacity} guests total
        </div>
      )}
  </div>
);

// ── GuestPicker — defined OUTSIDE ──
const GuestPicker = ({ guests, setGuests, maxGuests, showCustomGuests, setShowCustomGuests, customGuests, setCustomGuests }) => (
  <div>
    <p className={labelCls}><FiUsers className="inline w-3 h-3 mr-1"/>Guests</p>
    <div className="flex flex-wrap gap-2 mb-2">
      {[1,2,3,4,5,6,7,8,9,10].map(g => (
        <button key={g} type="button"
          onClick={() => { setGuests(g); setShowCustomGuests(false); }}
          className={`w-10 h-10 rounded-xl text-sm font-bold transition-all relative ${
            guests === g && !showCustomGuests
              ? 'bg-[#fe8a24] text-white shadow-md scale-105'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {g}
          {guests === g && !showCustomGuests && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white border-2 border-[#fe8a24]"/>
          )}
        </button>
      ))}
      <button type="button"
        onClick={() => setShowCustomGuests(s => !s)}
        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${
          showCustomGuests ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}>
        +
      </button>
    </div>
    {showCustomGuests && (
      <input type="number" min="1" max={maxGuests} value={customGuests} autoFocus
        onChange={e => { setCustomGuests(e.target.value); setGuests(parseInt(e.target.value) || 1); }}
        className={inputCls} placeholder="Custom guest count" />
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CreateReservationModal = ({
  onClose,
  selectedDate,
  selectedRestaurant,
  modalMode = 'full',
  preSelectedTableId = null,
  preSelectedTableName = null,
}) => {
  const isWalkIn    = modalMode === 'walkin';
  const isQuickBook = modalMode === 'quickbook';
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const isStaff           = !!staffRestaurantId;

  const [guests, setGuests]                     = useState(2);
  const [customGuests, setCustomGuests]         = useState('');
  const [showCustomGuests, setShowCustomGuests] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');
  const [toast, setToast]                       = useState(null);
  const [tableError, setTableError]             = useState('');
  const [settings, setSettings]                 = useState(null);
  const [loadingSettings, setLoadingSettings]   = useState(true);

  const [tables, setTables]                         = useState([]);
  const [selectedTableIds, setSelectedTableIds]     = useState(preSelectedTableId ? [preSelectedTableId] : []);
  const [combinations, setCombinations]             = useState([]);
  const [selectedCombination, setSelectedCombination] = useState(null);

  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [step, setStep]                   = useState(1);
  const [showTimeSlots, setShowTimeSlots] = useState(true);
  const [fromTime, setFromTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  });
  const [toTime, setToTime] = useState(() => {
    const now = new Date();
    const end = new Date(now.getTime() + 60 * 60000); // default 60 min
    return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
  });
  const [untilClose, setUntilClose]       = useState(false);
  const sittingTime                       = 60;

  const [formData, setFormData] = useState({
    customer_first_name:     '',
    customer_last_name:      '',
    customer_email:          '',
    customer_phone:          '',
    special_requests:        '',
    ServiceType_Reservation: 'dine-in',
    status:                  'confirmed',
    meal_status:             '',
    reservation_date:        selectedDate ? new Date(selectedDate) : new Date(),
  });

  const db = firestore;

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => { setToast(null); onClose(); }, 1800);
  };

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const fetchAll = async () => {
      try {
        const col = selectedRestaurant._collection || 'restaurants';
        const [tabSnap, comboSnap] = await Promise.all([
          getDocs(collection(db, col, selectedRestaurant.id, 'tables')),
          getDocs(collection(db, col, selectedRestaurant.id, 'tableCombinations')),
        ]);
        const loadedTables = tabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTables(sortTables(loadedTables)); // ← ADD sortTables() HERE
        setCombinations(comboSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (preSelectedTableId) setSelectedTableIds([preSelectedTableId]);
      } catch(e) { console.error(e); }
    };
    fetchAll();
  }, [selectedRestaurant?.id]);

  // Load settings
  useEffect(() => {
    const load = async () => {
      if (!selectedRestaurant?.id) { setLoadingSettings(false); return; }
      setLoadingSettings(true);
      try {
        const col = selectedRestaurant._collection || 'restaurants';
        const snap = await getDoc(doc(db, col, selectedRestaurant.id, 'reservationSettings', 'config'));
        setSettings(snap.exists() ? snap.data() : { requireTableAssignment: true });
      } catch(e) { setSettings({ requireTableAssignment: true }); }
      finally { setLoadingSettings(false); }
    };
    load();
  }, [selectedRestaurant?.id]);

  // Set default times
  useEffect(() => {
    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );
    const ch = matchingHours || selectedRestaurant?.customHours?.[0];
    if (!ch?.openTime || !ch?.closeTime) return;
    const [oH, oM] = ch.openTime.split(':').map(Number);
    const [cH, cM] = ch.closeTime.split(':').map(Number);
    const oMins = oH * 60 + oM, cMins = cH * 60 + cM;
    if (selectedDate) {
      const d = new Date(selectedDate);
      const slotMins = d.getHours() * 60 + d.getMinutes();
      if (slotMins >= oMins && slotMins < cMins) {
        const from = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const endMins = Math.min(slotMins + 60, cMins);
        setFromTime(from);
        setToTime(`${String(Math.floor(endMins/60)%24).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`);
        return;
      }
    }
    const endMins = Math.min(oMins + 60, cMins);
    setFromTime(ch.openTime);
    setToTime(`${String(Math.floor(endMins/60)%24).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`);
}, [selectedRestaurant?.id, selectedDate, formData.reservation_date]);

  const formatDisplayTime = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr || '';
    if (settings?.use24HourFormat === false) {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return timeStr;
  };
  const { openTime, closeTime, maxGuests } = (() => {
    const maxFromSettings = 999;

    // Prefer day-specific interval settings if available
    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings?.dayIntervals?.[dayName];

    // Fall back to restaurant customHours
    const ch = selectedRestaurant?.customHours?.[0];

    // Find the matching customHours slot for the current day
    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );

    const open  = matchingHours?.openTime  || ch?.openTime  || '10:00';
    const close = matchingHours?.closeTime || ch?.closeTime || '22:00';

    return { openTime: open, closeTime: close, maxGuests: maxFromSettings };
  })();

  const addMinutes = (t, mins) => {
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  };

  const timeSlots = useMemo(() => {
    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings?.dayIntervals?.[dayName];
    const interval = daySettings?.interval || settings?.timeSlotInterval || 30;
    const startOffset = daySettings?.startOffset || 0;
    const endOffset = daySettings?.endOffset || 0;

    // Get day-specific open/close times from restaurant customHours
    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );
    const ch = selectedRestaurant?.customHours?.[0];
    const dayOpenTime  = matchingHours?.openTime  || ch?.openTime  || openTime  || '10:00';
    const dayCloseTime = matchingHours?.closeTime || ch?.closeTime || closeTime || '22:00';

    if (!dayOpenTime || !dayCloseTime) return [];
  const getEffectiveDurationForSlot = (guestCount) => {
    const def = settings?.defaultReservationDuration || 120;
    if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
    const match = settings.guestDurationRules.find(
      r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
    );
    return match ? match.duration : def;
  };
  const duration = getEffectiveDurationForSlot(guests);

  const [oH, oM] = dayOpenTime.split(':').map(Number);
  const [cH, cM] = dayCloseTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;

  // Past-midnight: closeTime <= openTime → treat close as next day
  if (cMin <= oMin) cMin += 24 * 60;

  // Sanity cap: never generate more than 18 hours of slots
  const maxMin = oMin + 18 * 60;
  const effOpen  = oMin + startOffset;
  const effClose = Math.min(cMin - endOffset, maxMin);

  const slots = [];
  for (let m = effOpen; m < effClose; m += interval) {
    const actualMin = m % (24 * 60);
    const h = Math.floor(actualMin / 60);
    const min = actualMin % 60;
    const startTime = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;

    const endActual = (m + duration) % (24 * 60);
    const eH = Math.floor(endActual / 60);
    const eM = endActual % 60;
    const endTime = `${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`;

    slots.push({
      label: `${startTime} – ${endTime}`,
      startH: h,
      startMin: min,
      startTime,
    });
  }

  const blocked = settings?.blockedTimeSlots?.[dayName] || [];
  
  // Filter past slots for today
  const now = new Date();
  const resDate = formData.reservation_date || new Date();
  const isToday = resDate.toDateString() === now.toDateString();

  return slots.filter(s => {
    if (blocked.includes(s.startTime)) return false;
    if (isToday) {
      const slotDateTime = new Date(resDate);
      slotDateTime.setHours(s.startH, s.startMin, 0, 0);
      if (slotDateTime <= now) return false;
    }
    return true;
  });
}, [openTime, closeTime, formData.reservation_date, settings, guests]);

  const combinedCapacity = tables.filter(t => selectedTableIds.includes(t.id)).reduce((s,t) => s+(t.maxCapacity||0), 0);
  const capacityOk = selectedTableIds.length > 0 && combinedCapacity >= guests;

  const getReservationDate = () => {
    if (isWalkIn) {
      const now = new Date();
      const [h,m] = fromTime.split(':').map(Number);
      now.setHours(h,m,0,0);
      return now;
    }
    if (modalMode === 'full') {
      const base = new Date(formData.reservation_date || selectedDate || new Date());
      // If a slot was selected via "Select Slot" tab, use that time
      if (showTimeSlots && selectedSlot) {
        base.setHours(selectedSlot.startH, selectedSlot.startMin, 0, 0);
      } else {
        const [h,m] = fromTime.split(':').map(Number);
        base.setHours(h,m,0,0);
      }
      return base;
    }
    if (selectedSlot) {
      const base = selectedDate ? new Date(selectedDate) : new Date();
      base.setHours(selectedSlot.startH, selectedSlot.startMin, 0, 0);
      return base;
    }
    return selectedDate ? new Date(selectedDate) : new Date();
  };

  const handleSave = async () => {
    setError(''); setTableError('');
    const name = `${formData.customer_first_name?.trim() || ''} ${formData.customer_last_name?.trim() || ''}`.trim() || (isWalkIn ? 'Walk-in Guest' : '');
    if (!isWalkIn && !formData.customer_first_name?.trim()) { setError('First name is required'); return; }
    if (!isWalkIn && !formData.customer_email?.trim()) { setError('Email address is required'); return; }
    if (isQuickBook && !selectedSlot) { setError('Please select a time slot'); return; }
    if (settings?.requireTableAssignment && selectedTableIds.length===0) { setTableError('Please assign at least one table.'); return; }
    try {
      setSaving(true);
      // Load settings for email contact info
      let emailSettings = null;
      try {
        const col = selectedRestaurant?._collection || 'restaurants';
        const settingsSnap = await getDoc(doc(db, col, selectedRestaurant.id, 'reservationSettings', 'config'));
        if (settingsSnap.exists()) emailSettings = settingsSnap.data();
      } catch (e) { /* settings optional */ }
      if (settings?.requireTableAssignment) {
        const cap = selectedCombination ? selectedCombination.maxCapacity
          : tables.filter(t=>selectedTableIds.includes(t.id)).reduce((s,t)=>s+(t.maxCapacity||0),0);
        if (cap < guests) { setTableError(`Table capacity (${cap}) cannot fit ${guests} guests`); setSaving(false); return; }
      }
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Not authenticated');
      // For staff, use the restaurant's Owner_ID instead of their own uid
        let ownerUid = currentUser.uid;
        if (isStaff) {
          if (selectedRestaurant?.Owner_ID) {
            ownerUid = selectedRestaurant.Owner_ID;
          } else {
            // Owner_ID missing — abort with clear error
            setError('Restaurant owner info missing. Please contact your administrator.');
            setSaving(false);
            return;
          }
        }
      const reservationDate = getReservationDate();
      const primaryTableId  = selectedTableIds[0];
      const primaryTable    = tables.find(t=>t.id===primaryTableId);
      const getEffectiveDuration = (guestCount) => {
        const def = settings?.defaultReservationDuration || 75;
        if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
        const match = settings.guestDurationRules.find(
          r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
        );
        return match ? match.duration : def;
      };
        const duration = (() => {
          if (isQuickBook) return getEffectiveDuration(guests);
          if (isWalkIn) {
            const [fh, fm] = fromTime.split(':').map(Number);
            const [th, tm] = toTime.split(':').map(Number);
            const diff = (th * 60 + tm) - (fh * 60 + fm);
            return diff > 0 ? diff : sittingTime;
          }
          if (untilClose) {
            const [fh, fm] = fromTime.split(':').map(Number);
            const [th, tm] = closeTime.split(':').map(Number);
            return Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
          }
          // Full mode + Select Slot tab: use guest-based duration from settings
          if (modalMode === 'full' && showTimeSlots && selectedSlot) {
            return getEffectiveDuration(guests);
          }
          const [fh, fm] = fromTime.split(':').map(Number);
          const [th, tm] = toTime.split(':').map(Number);
          return Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
        })();
      const reservationData = {
        customer_name: name || 'Walk-in Guest',
        customer_email:    formData.customer_email.trim(),
        customer_phone:    formData.customer_phone.trim(),
        number_of_guests:  guests,
        reservation_date:  reservationDate,
        ServiceType_Reservation: formData.ServiceType_Reservation,
        status:            formData.status||'confirmed',
        special_requests:  formData.special_requests.trim(),
        restaurant_owner_id: ownerUid,
        created_by_uid: currentUser.uid,
        created_by_role: isStaff ? (sessionStorage.getItem("staffRole") || "staff") : "owner",
        restaurant_id:     selectedRestaurant?.id||null,
        restaurant_name:   selectedRestaurant?.name||'',
        created_at:        serverTimestamp(),
        updated_at:        serverTimestamp(),
        meal_status:       formData.meal_status||null,
        is_walkin:         isWalkIn,
        from_time: selectedSlot && (isQuickBook || (modalMode === 'full' && showTimeSlots))
          ? `${String(selectedSlot.startH).padStart(2,'0')}:${String(selectedSlot.startMin).padStart(2,'0')}`
          : fromTime,
        to_time: (() => {
            if (untilClose) return closeTime;
            if ((isQuickBook || (modalMode === 'full' && showTimeSlots)) && selectedSlot) {
              const slotDur = getEffectiveDuration(guests);
              const totalMins = selectedSlot.startH * 60 + selectedSlot.startMin + slotDur;
              const h = Math.floor(totalMins / 60) % 24;
              const m = totalMins % 60;
              return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
            }
            return toTime;
          })(),
        duration_minutes:  duration,
        ...(selectedCombination ? {
          combination_id: selectedCombination.id, combination_name: selectedCombination.name,
          table_ids: selectedCombination.tableIds, table_names: selectedCombination.tableNames,
          table_id: selectedCombination.tableIds[0], table_name: selectedCombination.tableNames[0],
        } : {
          table_id: primaryTableId, table_name: primaryTable?.name||'',
          table_ids: selectedTableIds, table_names: tables.filter(t=>selectedTableIds.includes(t.id)).map(t=>t.name),
        }),
        coupon_confirmed: false,
        reservation_completed_points_awarded: false,
        restaurant_collection: selectedRestaurant?._collection||'restaurants',
      };
      await addDoc(collection(db,'reservations'), reservationData);
      const colName = selectedRestaurant?._collection||'restaurants';
      await Promise.all(selectedTableIds.map(tid=>
        updateDoc(doc(db,colName,selectedRestaurant.id,'tables',tid),{
          current_status:'reserved', reserved_by:reservationData.customer_name,
          reserved_date:reservationDate, reserved_guests:guests,
          reserved_duration_minutes:duration, reserved_source:isWalkIn?'walkin':'dashboard',
          updated_at:serverTimestamp(),
        }).catch(e=>console.warn('Table update failed:',tid,e))
      ));
      // Send confirmation email
     if (!isWalkIn && formData.customer_email?.trim()) {
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const sendEmailFn = httpsCallable(getFunctions(undefined, 'asia-southeast1'), 'sendEmail');
          const resDateFormatted = reservationDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const resTimeFormatted = reservationDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const tableName = selectedCombination
            ? selectedCombination.name
            : tables.filter(t => selectedTableIds.includes(t.id)).map(t => t.name).join(' + ') || '—';
          const emailResult = await sendEmailFn({
            to: formData.customer_email.trim(),
            subject: `Reservation Confirmed – ${selectedRestaurant?.name || 'Restaurant'}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#fe8a24;">Your reservation is confirmed! 🎉</h2>
                <p>Hi ${formData.customer_first_name?.trim() || 'there'},</p>
                <p>Your booking at <strong>${selectedRestaurant?.name || 'Restaurant'}</strong> has been confirmed.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px 0;color:#888;">Date</td><td><strong>${resDateFormatted}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Time</td><td><strong>${resTimeFormatted}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Guests</td><td><strong>${guests}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">Table</td><td><strong>${tableName}</strong></td></tr>
                  ${formData.special_requests?.trim() ? `<tr><td style="padding:8px 0;color:#888;">Notes</td><td>${formData.special_requests}</td></tr>` : ''}
                </table>
                ${(settings?.contactEmail || settings?.contactPhone) ? `
                  <div style="margin-top:24px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:8px;">
                    <p style="margin:0 0 8px;font-weight:bold;color:#fe8a24;font-size:13px;">📞 Restaurant Contact</p>
                    ${settings?.contactEmail ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">✉️ <a href="mailto:${settings.contactEmail}" style="color:#fe8a24;">${settings.contactEmail}</a></p>` : ''}
                    ${settings?.contactPhone ? `<p style="margin:0;font-size:13px;color:#555;">📱 <a href="tel:${settings.contactPhone}" style="color:#fe8a24;">${settings.contactPhone}</a></p>` : ''}
                  </div>
                ` : ''}
                <p style="color:#888;font-size:12px;margin-top:24px;">
                  If you need to make changes, please contact us directly.
                </p>
              </div>
            `,
          });
          console.log('📧 Confirmation email sent! Resend ID:', emailResult?.data?.id);
        } catch (emailErr) {
          console.error('❌ Confirmation email failed:', emailErr?.message || emailErr);
        }
      }

      showToast('Reservation created successfully!');
    } catch(err) { setError('Failed: '+err.message); }
    finally { setSaving(false); }
  };

  const now = new Date();
  const walkInEnd = new Date(now.getTime() + sittingTime*60000);
  const walkInLabel = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} – ${String(walkInEnd.getHours()).padStart(2,'0')}:${String(walkInEnd.getMinutes()).padStart(2,'0')}`;

  const headerBg = isWalkIn ? 'from-gray-700 to-gray-800' : isQuickBook ? 'from-[#fe8a24] to-[#ff6b1a]' : 'from-[#1e293b] to-[#0f172a]';
  const modeLabel = isWalkIn ? ' Walk-in' : isQuickBook ? ' Quick Book' : ' Create Reservation';

  const ManualTimePicker = (
  <>
    <div className="grid grid-cols-2 gap-3">
      <div className="bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 focus-within:border-[#fe8a24] transition-colors">
        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">From</p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="HH:MM"
          maxLength={5}
          value={fromTime}
          onChange={e => {
            let val = e.target.value.replace(/[^0-9:]/g, '');
            if (val.length === 2 && !val.includes(':')) val = val + ':';
            setFromTime(val);
            if (/^\d{2}:\d{2}$/.test(val)) {
              if (!untilClose) setToTime(addMinutes(val, sittingTime));
              if (modalMode === 'full') {
                const [h, m] = val.split(':').map(Number);
                const nd = new Date(formData.reservation_date || new Date());
                nd.setHours(h, m);
                setFormData(p => ({ ...p, reservation_date: nd }));
              }
            }
          }}
          className="text-sm font-bold text-gray-800 focus:outline-none w-full bg-transparent"
        />
      </div>
      <div className={`bg-gray-50 border-2 rounded-xl px-4 py-3 transition-colors ${untilClose ? 'opacity-50 border-gray-100' : 'border-gray-100 focus-within:border-[#fe8a24]'}`}>
        <p className="text-[10px] text-gray-400 font-semibold uppercase mb-1">To</p>
        <input
          type="text"
          inputMode="numeric"
          placeholder="HH:MM"
          maxLength={5}
          value={untilClose ? closeTime : toTime}
          disabled={untilClose}
          onChange={e => {
            let val = e.target.value.replace(/[^0-9:]/g, '');
            if (val.length === 2 && !val.includes(':')) val = val + ':';
            setToTime(val);
          }}
          className="text-sm font-bold text-gray-800 focus:outline-none w-full bg-transparent disabled:text-gray-400"
        />
      </div>
    </div>
    <label className="flex items-center gap-2 mt-2 cursor-pointer">
      <input type="checkbox" checked={untilClose}
        onChange={e => { setUntilClose(e.target.checked); if (e.target.checked) setToTime(closeTime); }}
        className="w-4 h-4 accent-[#fe8a24]" />
      <span className="text-sm text-gray-500">Until close <span className="text-gray-300">({closeTime})</span></span>
    </label>
  </>
);

  const sessionButtons = (
    <div className="grid grid-cols-3 gap-2">
      {['dine-in','takeaway','delivery'].map(t => (
        <button key={t} type="button"
          onClick={() => setFormData(p=>({...p,ServiceType_Reservation:t}))}
          className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all capitalize ${
            formData.ServiceType_Reservation===t
              ? 'border-[#fe8a24] bg-orange-50 text-[#fe8a24]'
              : 'border-gray-200 text-gray-500 hover:border-[#fe8a24]'
          }`}>
          {t}
        </button>
      ))}
    </div>
  );

  // Shared props for TableSelector
  const tableSelectorProps = {
    tables, combinations, selectedTableIds, selectedCombination,
    setSelectedTableIds, setSelectedCombination, setTableError,
    tableError, guests, combinedCapacity, capacityOk, preSelectedTableId,
  };

  // Shared props for GuestPicker
  const guestPickerProps = {
    guests, setGuests, maxGuests, showCustomGuests, setShowCustomGuests, customGuests, setCustomGuests,
  };

  // Shared props for TimeSlotGrid
  const timeSlotProps = {
    loadingSettings, timeSlots, selectedSlot, setSelectedSlot, openTime, closeTime,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl bg-green-500 text-white font-semibold text-sm">
          ✅ {toast}
        </div>
      )}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col ${modalMode==='full' ? 'max-w-4xl' : 'max-w-lg'}`}>

        {/* Header */}
        <div className={`bg-gradient-to-r ${headerBg} px-6 py-4 flex items-center justify-between flex-shrink-0`}>
          <div>
            <p className="text-white font-bold text-base">{modeLabel}</p>
            {isWalkIn && <p className="text-white/60 text-xs mt-0.5">{walkInLabel}</p>}
            {preSelectedTableName && <p className="text-white/70 text-xs mt-0.5">🪑 Table {preSelectedTableName} pre-selected</p>}
            {selectedRestaurant?.customHours?.[0] && <p className="text-white/50 text-xs mt-0.5">Hours: {openTime} – {closeTime}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/15 rounded-full transition-colors text-white/70 hover:text-white">
            <FiX className="w-5 h-5"/>
          </button>
        </div>

        {/* Step indicator */}
        {isQuickBook && (
          <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <StepPill step={1} current={step} label="Time & Table"/>
            <div className="flex-1 h-px bg-gray-200"/>
            <StepPill step={2} current={step} label="Guest Details"/>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium">
              ⚠ {error}
            </div>
          )}

   {/* ══ WALK-IN ══ */}
          {isWalkIn && (
            <div className="p-6 space-y-6">

              {/* 1. Guests */}
              <div>
                <p className={labelCls}><FiUsers className="inline w-3 h-3 mr-1"/>Guests</p>
                <div className="flex flex-wrap gap-2">
                  {[1,2,3,4,5,6,7,8,9,10].map(g => (
                    <button key={g} type="button" onClick={() => setGuests(g)}
                      className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                        guests === g
                          ? 'bg-[#fe8a24] text-white shadow-md scale-105'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {g}
                    </button>
                  ))}
                  <button type="button"
                    onClick={() => setShowCustomGuests(s => !s)}
                    className={`w-11 h-11 rounded-xl text-sm font-bold transition-all ${
                      showCustomGuests ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    +
                  </button>
                </div>
                {showCustomGuests && (
                  <input type="number" min="1" max={maxGuests} value={customGuests} autoFocus
                    onChange={e => { setCustomGuests(e.target.value); setGuests(parseInt(e.target.value) || 1); }}
                    className={inputCls + ' mt-2'} placeholder="Custom guest count" />
                )}
              </div>

              {/* 2. Sitting Time */}
              <div>
                <p className={labelCls}><FiClock className="inline w-3 h-3 mr-1"/>Sitting Time</p>
                <div className="flex flex-wrap gap-2">
                  {[15, 30, 45, 60, 75, 90, 105, 120, 135, 150].map(mins => {
                    const [fh, fm] = fromTime.split(':').map(Number);
                    const endMins = fh * 60 + fm + mins;
                    const endH = Math.floor(endMins / 60) % 24;
                    const endM = endMins % 60;
                    const endStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
                    const currentDuration = (() => {
                      const [th, tm] = toTime.split(':').map(Number);
                      const [ffh, ffm] = fromTime.split(':').map(Number);
                      return (th * 60 + tm) - (ffh * 60 + ffm);
                    })();
                    const isSelected = currentDuration === mins;
                    return (
                      <button key={mins} type="button"
                        onClick={() => setToTime(endStr)}
                        className={`px-3 h-11 rounded-xl text-sm font-bold transition-all ${
                          isSelected
                            ? 'bg-[#fe8a24] text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {mins}
                      </button>
                    );
                  })}
                  <button type="button"
                    onClick={() => setUntilClose(u => !u)}
                    className={`px-3 h-11 rounded-xl text-sm font-bold transition-all ${
                      untilClose ? 'bg-[#fe8a24] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    +
                  </button>
                </div>
                {/* Current time display */}
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">{fromTime}</span>
                  <span>→</span>
                  <span className="font-mono font-semibold text-gray-700">{untilClose ? closeTime : toTime}</span>
                  {!untilClose && (() => {
                    const [th, tm] = toTime.split(':').map(Number);
                    const [ffh, ffm] = fromTime.split(':').map(Number);
                    const dur = (th * 60 + tm) - (ffh * 60 + ffm);
                    return dur > 0 ? <span className="text-xs text-gray-400">({dur} min)</span> : null;
                  })()}
                  {untilClose && <span className="text-xs text-[#fe8a24] font-semibold">Until close</span>}
                </div>
              </div>

              {/* 3. Session */}
              <div>
                <p className={labelCls}>Session</p>
                <div className="grid grid-cols-3 gap-2">
                  {['dine-in','takeaway','delivery'].map(t => (
                    <button key={t} type="button"
                      onClick={() => setFormData(p => ({...p, ServiceType_Reservation: t}))}
                      className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all capitalize ${
                        formData.ServiceType_Reservation === t
                          ? 'border-[#fe8a24] bg-orange-50 text-[#fe8a24]'
                          : 'border-gray-200 text-gray-500 hover:border-[#fe8a24]'
                      }`}>
                      {t === 'dine-in' ? '🍽 Dine-in' : t === 'takeaway' ? '🥡 Takeaway' : '🛵 Delivery'}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Table */}
              <TableSelector {...tableSelectorProps}/>

              {/* 5. Optional note */}
              <div>
                <label className={labelCls}>Note <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                <input type="text" value={formData.special_requests}
                  onChange={e => setFormData(p => ({...p, special_requests: e.target.value}))}
                  className={inputCls} placeholder="Special requests, dietary needs…"/>
              </div>

            </div>
          )}

          {/* ══ QUICK BOOK STEP 1 ══ */}
          {isQuickBook && step===1 && (
            <div className="p-6 space-y-5">
              <GuestPicker {...guestPickerProps}/>
              <TimeSlotGrid {...timeSlotProps}/>
              <TableSelector {...tableSelectorProps}/>
            </div>
          )}

          {/* ══ QUICK BOOK STEP 2 ══ */}
          {isQuickBook && step===2 && (
            <div className="p-6 space-y-5">
              {/* Summary chips */}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <FiUsers className="w-3 h-3"/> {guests} guests
                </span>
                {selectedSlot && (
                  <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    <FiClock className="w-3 h-3"/> {selectedSlot.label}
                  </span>
                )}
                {selectedTableIds.length > 0 && (
                  <span className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                    🪑 {tables.filter(t=>selectedTableIds.includes(t.id)).map(t=>t.name).join(' + ')}
                  </span>
                )}
              </div>

              {/* Customer fields inline */}
             <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}><FiUser className="inline w-3 h-3 mr-1"/>First Name *</label>
                <input type="text" value={formData.customer_first_name}
                  onChange={e=>setFormData(p=>({...p,customer_first_name:e.target.value}))}
                  className={inputCls} placeholder="John"/>
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" value={formData.customer_last_name}
                  onChange={e=>setFormData(p=>({...p,customer_last_name:e.target.value}))}
                  className={inputCls} placeholder="Doe"/>
              </div>
            </div>
              <div>
                <label className={labelCls}><FiPhone className="inline w-3 h-3 mr-1"/>Phone <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                <input type="tel" value={formData.customer_phone}
                  onChange={e=>setFormData(p=>({...p,customer_phone:e.target.value}))}
                  className={inputCls} placeholder="+1 234 567 8900"/>
              </div>
              <div>
               <label className={labelCls}><FiMail className="inline w-3 h-3 mr-1"/>Email *</label>
                <input type="email" value={formData.customer_email}
                  onChange={e=>setFormData(p=>({...p,customer_email:e.target.value}))}
                  className={inputCls} placeholder="email@example.com"/>
              </div>
              <div>
                <label className={labelCls}>Special Requests</label>
                <textarea value={formData.special_requests}
                  onChange={e=>setFormData(p=>({...p,special_requests:e.target.value}))}
                  rows="2" className={inputCls+' resize-none'} placeholder="Dietary needs, celebrations…"/>
              </div>

              <div>
                <p className={labelCls}>Service Type</p>
                {sessionButtons}
              </div>
            </div>
          )}

          {/* ══ FULL CREATE ══ */}
          {modalMode==='full' && (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Left: Customer */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider pb-2 border-b-2 border-[#fe8a24]/30">
                    👤 Customer Information
                  </h4>
                 <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}><FiUser className="inline w-3 h-3 mr-1"/>First Name *</label>
                    <input type="text" value={formData.customer_first_name}
                      onChange={e=>setFormData(p=>({...p,customer_first_name:e.target.value}))}
                      className={inputCls} placeholder="John"/>
                  </div>
                  <div>
                    <label className={labelCls}>Last Name</label>
                    <input type="text" value={formData.customer_last_name}
                      onChange={e=>setFormData(p=>({...p,customer_last_name:e.target.value}))}
                      className={inputCls} placeholder="Doe"/>
                  </div>
                </div>
                  <div>
                   <label className={labelCls}><FiPhone className="inline w-3 h-3 mr-1"/>Phone <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
                    <input type="tel" value={formData.customer_phone}
                      onChange={e=>setFormData(p=>({...p,customer_phone:e.target.value}))}
                      className={inputCls} placeholder="+1 234 567 8900"/>
                  </div>
                  <div>
                   <label className={labelCls}><FiMail className="inline w-3 h-3 mr-1"/>Email *</label>
                    <input type="email" value={formData.customer_email}
                      onChange={e=>setFormData(p=>({...p,customer_email:e.target.value}))}
                      className={inputCls} placeholder="email@example.com"/>
                  </div>
                  <div>
                    <label className={labelCls}>Special Requests</label>
                    <textarea value={formData.special_requests}
                      onChange={e=>setFormData(p=>({...p,special_requests:e.target.value}))}
                      rows="3" className={inputCls+' resize-none'} placeholder="Dietary needs, accessibility, celebrations…"/>
                  </div>
                </div>

                {/* Right: Reservation details */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider pb-2 border-b-2 border-[#fe8a24]/30">
                    📅 Reservation Details
                  </h4>

                  {/* Date */}
                  <div>
                    <label className={labelCls}>Date *</label>
                    <input type="date"
                      value={`${getReservationDate().getFullYear()}-${String(getReservationDate().getMonth()+1).padStart(2,'0')}-${String(getReservationDate().getDate()).padStart(2,'0')}`}
                      onChange={e=>{const [y,mo,d]=e.target.value.split('-');const nd=new Date(formData.reservation_date||new Date());nd.setFullYear(parseInt(y),parseInt(mo)-1,parseInt(d));setFormData(p=>({...p,reservation_date:nd}));}}
                      className={inputCls}/>
                  </div>

                  {/* Time */}
                  <div>
                    <label className={labelCls}><FiClock className="inline w-3 h-3 mr-1"/>Time *</label>
                    <div className="flex bg-gray-100 rounded-xl p-1 mb-3 gap-1">
                      {['Manual Entry','Select Slot'].map((lbl,i)=>(
                        <button key={lbl} type="button" onClick={()=>setShowTimeSlots(i===1)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${(showTimeSlots?i===1:i===0)?'bg-white text-[#fe8a24] shadow-sm':'text-gray-500'}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    {!showTimeSlots ? ManualTimePicker : <TimeSlotGrid {...timeSlotProps} compact/>}
                  </div>

                  {/* Guests */}
                  <div>
                    <label className={labelCls}><FiUsers className="inline w-3 h-3 mr-1"/>Guests *</label>
                    <input type="number" value={guests} onChange={e=>setGuests(parseInt(e.target.value)||1)}
                      min="1" max={maxGuests} className={inputCls}/>
                  </div>

                  {/* Status + Service */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>Status</label>
                      <select value={formData.status} onChange={e=>setFormData(p=>({...p,status:e.target.value}))} className={inputCls}>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>Service</label>
                      <select value={formData.ServiceType_Reservation} onChange={e=>setFormData(p=>({...p,ServiceType_Reservation:e.target.value}))} className={inputCls}>
                        <option value="dine-in">Dine-In</option>
                        <option value="takeaway">Takeaway</option>
                        <option value="delivery">Delivery</option>
                      </select>
                    </div>
                  </div>

                  {/* Meal status */}
                  <div>
                    <label className={labelCls}>Meal Status</label>
                    <select value={formData.meal_status||''} onChange={e=>setFormData(p=>({...p,meal_status:e.target.value}))} className={inputCls}>
                      <option value="">Not Set</option>
                      <option value="arrived">🔴 Arrived</option>
                      <option value="food_delivered">🔵 Food Delivered</option>
                      <option value="dessert">🟣 Dessert</option>
                      <option value="bill_delivered">🟡 Bill Delivered</option>
                      <option value="table_cleared">🟢 Table Cleared</option>
                      <option value="no_show">⚫ No Show</option>
                      <option value="clear_out">⚪ Clear Out</option>
                    </select>
                    {formData.meal_status && (() => { const mc=getMealStatusConfig(formData.meal_status); return mc ? (
                      <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium" style={{backgroundColor:mc.color+'18',color:mc.color}}>
                        {mc.icon} {mc.label}
                      </div>
                    ) : null; })()}
                  </div>

                  <TableSelector {...tableSelectorProps}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
          <div className="text-xs text-gray-400">
            {selectedTableIds.length > 0 && (
              <span className="text-[#fe8a24] font-semibold">
                🪑 {sortTables(tables.filter(t=>selectedTableIds.includes(t.id))).map(t=>t.name).join(' + ')}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isQuickBook && step===2 && (
              <button onClick={()=>setStep(1)}
                className="flex items-center gap-1.5 px-4 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white transition-colors">
                <FiArrowLeft className="w-4 h-4"/> Back
              </button>
            )}
            <button onClick={onClose}
              className="px-4 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-sm font-semibold hover:bg-white transition-colors">
              Cancel
            </button>
            {(isWalkIn || modalMode==='full') ? (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50">
                <FiSave className="w-4 h-4"/>
                {saving ? 'Saving…' : isWalkIn ? 'Save Walk-in' : 'Create Reservation'}
              </button>
            ) : isQuickBook && step===1 ? (
              <button
                onClick={()=>{
                  if(!selectedSlot){setError('Please select a time slot');return;}
                  if(selectedTableIds.length===0){setTableError('Please assign a table first.');return;}
                  setError('');setTableError('');setStep(2);
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
                style={{backgroundColor:selectedSlot&&selectedTableIds.length>0?'#fe8a24':'#e5e7eb',color:selectedSlot&&selectedTableIds.length>0?'white':'#9ca3af'}}>
                Next <FiChevronRight className="w-4 h-4"/>
              </button>
            ) : (
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-xl text-sm font-bold transition-all shadow-sm disabled:opacity-50">
                <FiCheck className="w-4 h-4"/>
                {saving ? 'Confirming…' : 'Confirm Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReservationModal;