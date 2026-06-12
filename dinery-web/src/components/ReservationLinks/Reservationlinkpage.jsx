import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, addDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firestore, auth, storage } from '../../firebase';
import {
  FiUsers, FiCalendar, FiClock, FiMapPin,
  FiChevronLeft, FiChevronRight, FiCheck, FiEdit2,
  FiCopy, FiExternalLink, FiUpload, FiX, FiImage,
  FiSearch, FiChevronDown,
} from 'react-icons/fi';

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+61', flag: '🇦🇺', label: 'AU' },
  { code: '+64', flag: '🇳🇿', label: 'NZ' },
  { code: '+63', flag: '🇵🇭', label: 'PH' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+33', flag: '🇫🇷', label: 'FR' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+358', flag: '🇫🇮', label: 'FI' },
  { code: '+47', flag: '🇳🇴', label: 'NO' },
  { code: '+46', flag: '🇸🇪', label: 'SE' },
  { code: '+81', flag: '🇯🇵', label: 'JP' },
  { code: '+86', flag: '🇨🇳', label: 'CN' },
  { code: '+91', flag: '🇮🇳', label: 'IN' },
];

const generateTimeSlots = (openTime = '10:00', closeTime = '22:00', interval = 30, use24Hour = false) => {
  const slots = [];
  if (!openTime || !closeTime) return slots;
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;
  // Past-midnight support
  if (cMin <= oMin) cMin += 24 * 60;
  // Sanity cap: max 18h of slots
  const endMin = Math.min(cMin, oMin + 18 * 60);
  for (let m = oMin; m < endMin; m += interval) {
    const actualMin = m % (24 * 60);
    const h = Math.floor(actualMin / 60);
    const min = actualMin % 60;
    const value = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    
    // Format label based on time format preference
    let label;
    if (use24Hour) {
      label = value; // 24-hour format: "14:30"
    } else {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      label = `${h12}:${String(min).padStart(2,'0')} ${ampm}`;
    }
    
    slots.push({ value, label });
  }
  return slots;
};

function useImageUpload(restaurantId, folder) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = async (file) => {
    if (!file || !restaurantId) return null;
    setUploading(true); setProgress(0);
    try {
      const ext = file.name.split('.').pop();
      const path = `reservation_pages/${restaurantId}/${folder}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      return await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on('state_changed',
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
    } finally { setUploading(false); }
  };
  return { upload, uploading, progress };
}

const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const getOpenDayNames = (customHours) => {
  if (!customHours || !Array.isArray(customHours) || customHours.length === 0) {
    return new Set(ALL_DAYS);
  }
  const open = new Set();
  for (const slot of customHours) {
    if (!slot.days || !Array.isArray(slot.days)) continue;
    for (const d of slot.days) { if (d.name) open.add(d.name); }
  }
  return open.size > 0 ? open : new Set(ALL_DAYS);
};

const MiniCalendar = ({ selectedDate, onDateSelect, accentColor = '#fe8a24', openDayNames }) => {
  const [view, setView] = useState(new Date());
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const mName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasClosed = openDayNames && openDayNames.size < 7;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(yr, mo - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronLeft className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-sm font-bold text-white">{mName}</span>
        <button onClick={() => setView(new Date(yr, mo + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronRight className="w-4 h-4 text-white/70" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {days.map((d, i) => {
          const fullDay = ALL_DAYS[i];
          const isClosed = openDayNames && !openDayNames.has(fullDay);
          return (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${isClosed ? 'text-white/20' : 'text-white/40'}`}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const td = new Date(yr, mo, day); td.setHours(0, 0, 0, 0);
          const isPast = td < today;
          const dayFullName = ALL_DAYS[td.getDay()];
          const isClosed = openDayNames && !openDayNames.has(dayFullName);
          const isDisabled = isPast || isClosed;
          const isSel = selectedDate && td.toDateString() === selectedDate.toDateString();
          const isToday = td.toDateString() === today.toDateString();
          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onDateSelect(td)}
              title={isClosed && !isPast ? 'Closed' : undefined}
              className={[
                'aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-all relative',
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white/10',
                isClosed && !isPast ? 'text-white/20' : '',
                isPast ? 'text-white/15' : '',
                !isSel && !isDisabled ? 'text-white/80' : '',
              ].join(' ')}
              style={
                isSel
                  ? { backgroundColor: accentColor, color: 'white', fontWeight: 'bold' }
                  : isToday && !isDisabled
                  ? { outline: '1px solid ' + accentColor + '80', color: accentColor }
                  : {}
              }
            >
              {day}
              {isClosed && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
              )}
            </button>
          );
        })}
      </div>
      {hasClosed && (
        <p className="text-white/25 text-[10px] text-center mt-3">Dimmed dates are unavailable</p>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
//  RESTAURANT SELECTOR SCREEN
// ════════════════════════════════════════════════════════════════════
const RestaurantSelector = ({ onSelect }) => {
  const db = firestore;
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
      const load = async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) { setLoading(false); return; }

          const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
          const isStaff = !!staffRestaurantId;

          // ── Staff: load only their assigned restaurant ────────────────
          if (isStaff) {
            const snap = await getDoc(doc(db, 'restaurants', staffRestaurantId));
          if (snap.exists()) {
            const restaurant = { docId: snap.id, ...snap.data(), _collection: 'restaurants' };
            setRestaurants([restaurant]);
            onSelect(restaurant); // auto-select for staff, skip the selector screen
          }
          setLoading(false);
          return;
          }

          // ── Owner: load all owned restaurants ─────────────────────────
          const q1 = query(
            collection(db, 'restaurants'),
            where('Owner_ID', '==', currentUser.uid)
          );
          const q2 = query(
            collection(db, 'TestRestaurant'),
            where('Owner_ID', '==', currentUser.uid)
          );
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

          const list = [
            ...snap1.docs.map(d => ({ docId: d.id, ...d.data(), _collection: 'restaurants' })),
            ...snap2.docs.map(d => ({ docId: d.id, ...d.data(), _collection: 'TestRestaurant' })),
          ];
          setRestaurants(list);
        } catch (err) {
          console.error('Failed to load restaurants:', err);
        } finally {
          setLoading(false);
        }
      };
    load();
  }, []);

  const filtered = restaurants.filter(r =>
    (r.name || r.docId || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-5 shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Reservation Link</h1>
        <p className="text-gray-500 text-sm mt-0.5">Select a restaurant to set up its booking page</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">

          {/* Search */}
          <div className="relative mb-5">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search restaurants..."
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#fe8a24] bg-white"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-10 h-10 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">Loading your restaurants...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-base font-semibold text-gray-500">No restaurants found</p>
              <p className="text-sm mt-1">
                {search ? 'Try a different search term' : 'No restaurants are linked to your account yet'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(restaurant => (
                <button
                  key={restaurant.docId}
                  onClick={() => onSelect(restaurant)}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-[#fe8a24] hover:shadow-md transition-all p-4 flex items-center gap-4 text-left group"
                >
                  {/* Restaurant image or placeholder */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                    {restaurant.Image ? (
                      <img src={restaurant.Image} alt={restaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 text-base truncate">{restaurant.name || restaurant.docId}</p>
                      {restaurant.restaurant_activation && (
                        <span className="flex-shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    {restaurant.Type && (
                      <p className="text-xs text-[#fe8a24] font-semibold mb-1">{restaurant.Type}</p>
                    )}
                    {restaurant.Location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FiMapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{restaurant.Location}</span>
                      </div>
                    )}
                    {restaurant.Reservation_email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{restaurant.Reservation_email}</p>
                    )}
                  </div>

                  {/* Arrow */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#fe8a24] flex items-center justify-center transition-colors">
                    <FiChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white -rotate-90 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const ReservationLinkPage = ({ selectedRestaurant: propRestaurant }) => {
  const db = firestore;
  const staffRole = sessionStorage.getItem("staffRole");
  const isStaff   = !!sessionStorage.getItem("staffRestaurantId");
  const canAccess = !isStaff || staffRole === 'admin' || staffRole === 'manager';
  // Restaurant selection state
  const [activeRestaurant, setActiveRestaurant] = useState(propRestaurant || null);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [allReservations, setAllReservations] = useState([]);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [slotAvailability, setSlotAvailability] = useState({});

  // When prop changes (e.g. parent re-selects), sync it
  useEffect(() => {
    if (propRestaurant) setActiveRestaurant(propRestaurant);
  }, [propRestaurant]);

  // Page mode: 'config' | 'preview' | 'link'
  const [pageMode, setPageMode] = useState('config');

const [config, setConfig] = useState({
    restaurantName:     '',
    use24HourFormat:    false,
    backgroundType:     'gradient',
    backgroundColor:    '#1a1a2e',
    backgroundGradient: 'from-[#0f0c29] via-[#302b63] to-[#24243e]',
    backgroundMode:     'gradient',
    backgroundImageUrl: '',
    overlayOpacity:     0.5,
    logoUrl:            '',
    logoShape:          'circle',
    logoSize:           'md',
    accentColor:        '#fe8a24',
    welcomeMessage:     'Reserve your table',
    subMessage:         'Book your perfect dining experience',
    showNotes:          true,
    showCompany:        false,
    requireEmail:       true,
    requirePhone:       true,
  });

  // Booking form state
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [phoneCode, setPhoneCode] = useState('+63');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', notes: '' });
  const [agreeNewsletter, setAgreeNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [reservationSettings, setReservationSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);


  // Resolved restaurant document ID — docId is the Firestore document ID
  const restaurantId = activeRestaurant?.docId || activeRestaurant?.id || activeRestaurant?.name || null;

  const logoUpload = useImageUpload(restaurantId, 'logo');
  const bgUpload   = useImageUpload(restaurantId, 'background');
  const logoInputRef = useRef();
  const bgInputRef   = useRef();

  // When a restaurant is selected, pre-fill config from its data
  useEffect(() => {
    if (!activeRestaurant) return;
    setConfig(prev => ({
      ...prev,
      restaurantName: activeRestaurant.name || activeRestaurant.docId || '',
    }));
  }, [activeRestaurant]);

  // Load saved reservationConfig from Firestore when restaurant is selected
  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      console.log('[ReservationLink] Loading config for:', restaurantId);
      try {
        // Try both collections
        let snap = await getDoc(doc(db, 'restaurants', restaurantId, 'reservationConfig', 'config'));
        if (!snap.exists()) {
          snap = await getDoc(doc(db, 'TestRestaurant', restaurantId, 'reservationConfig', 'config'));
        }
        if (snap.exists()) {
          console.log('[ReservationLink] Found saved config:', snap.data());
          setConfig(prev => ({ ...prev, ...snap.data() }));
        } else {
          console.log('[ReservationLink] No saved config yet for:', restaurantId);
        }
      } catch (err) {
        console.error('[ReservationLink] Load config error:', err);
      }
    };
    load();
  }, [restaurantId]);

  // Load tables and reservations for availability checking
  useEffect(() => {
    const loadTablesAndReservations = async () => {
      if (!restaurantId || !activeRestaurant) return;
      
      const collectionName = activeRestaurant._collection || 'restaurants';
      
      try {
        // Load tables
        const tablesSnap = await getDocs(collection(db, collectionName, restaurantId, 'tables'));
        const tablesData = tablesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRestaurantTables(tablesData);
        setTablesLoaded(true);
        
        // Load existing reservations for this restaurant
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('restaurant_id', '==', restaurantId),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const reservationsSnap = await getDocs(reservationsQuery);
        const reservationsData = reservationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReservations(reservationsData);
        
        console.log(`📊 Loaded ${tablesData.length} tables and ${reservationsData.length} reservations`);
      } catch (err) {
        console.error('Error loading tables/reservations:', err);
      }
    };
    
    loadTablesAndReservations();
  }, [restaurantId, activeRestaurant]);

  useEffect(() => {
    const loadReservationSettings = async () => {
      if (!restaurantId || !activeRestaurant) {
        setLoadingSettings(false);
        return;
      }
      
      setLoadingSettings(true);
      
      try {
        const collectionName = activeRestaurant._collection || 'restaurants';
        const docRef = doc(db, collectionName, restaurantId, 'reservationSettings', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setReservationSettings(docSnap.data());
          console.log('✅ Loaded reservation settings:', docSnap.data());
        } else {
          console.log('ℹ️ No reservation settings found, using defaults');
          setReservationSettings({});
        }
      } catch (err) {
        console.error('❌ Error loading reservation settings:', err);
        setReservationSettings({});
      } finally {
        setLoadingSettings(false);
      }
    };
    
    loadReservationSettings();
  }, [restaurantId, activeRestaurant]);

  // Calculate slot availability based on tables and reservations
  useEffect(() => {
    if (!selectedDate || !restaurantId || !tablesLoaded || restaurantTables.length === 0) {
      return;
    }
    
    const availability = {};
    const defaultDuration = 120; // Default 2 hours
    
    // Get open/close times for selected date from restaurant data
    const customHours = activeRestaurant?.customHours || [];
    let previewOpenTime = '10:00';
    let previewCloseTime = '22:00';
    
    if (customHours.length > 0 && selectedDate) {
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      for (const slot of customHours) {
        if (!slot.days) continue;
        const found = slot.days.find(d => d.name === dayName);
        if (found) {
          previewOpenTime = slot.openTime || '10:00';
          previewCloseTime = slot.closeTime || '22:00';
          break;
        }
      }
    }
    
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const daySettings = reservationSettings?.dayIntervals?.[dayName];
      const dayInterval = daySettings?.interval || 30;
      
      // ✅ Apply start/end offsets
      const startOffset = daySettings?.startOffset || 0;
      const endOffset = daySettings?.endOffset || 0;
      
      // Calculate effective open/close times with offsets
      const [openHour, openMin] = previewOpenTime.split(':').map(Number);
      const [closeHour, closeMin] = previewCloseTime.split(':').map(Number);
      const effectiveOpenMin = openHour * 60 + openMin + startOffset;
      const effectiveCloseMin = closeHour * 60 + closeMin - endOffset;
      const effectiveOpenTime = `${String(Math.floor(effectiveOpenMin / 60)).padStart(2, '0')}:${String(effectiveOpenMin % 60).padStart(2, '0')}`;
      const effectiveCloseTime = `${String(Math.floor(effectiveCloseMin / 60)).padStart(2, '0')}:${String(effectiveCloseMin % 60).padStart(2, '0')}`;
      
      const allSlots = generateTimeSlots(effectiveOpenTime, effectiveCloseTime, dayInterval, config.use24HourFormat);
      
      for (const slot of allSlots) {
      const slotDateTime = new Date(selectedDate);
      const [hours, minutes] = slot.value.split(':');
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const slotEndTime = new Date(slotDateTime.getTime() + defaultDuration * 60000);
      
      // Find suitable tables for this party size
      const suitableTables = restaurantTables.filter(t => 
        t.online === true &&
        (t.sessions === 'Reservation' || t.sessions === 'Both') &&
        guests >= (t.minCapacity || 0) &&
        guests <= (t.maxCapacity || 999)
      );
      
      if (suitableTables.length === 0) {
        availability[slot.value] = false;
        continue;
      }
      
      // Find booked tables
      const bookedTableIds = new Set();
      
      allReservations.forEach(res => {
        const resDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
        const resDuration = res.duration_minutes || 120;
        const resEndTime = new Date(resDate.getTime() + resDuration * 60000);
        
        if (resDate < slotEndTime && resEndTime > slotDateTime) {
          if (res.table_ids && Array.isArray(res.table_ids)) {
            res.table_ids.forEach(tid => bookedTableIds.add(tid));
          } else if (res.table_id) {
            bookedTableIds.add(res.table_id);
          }
        }
      });
      
      const hasAvailableTable = suitableTables.some(t => !bookedTableIds.has(t.id));
      availability[slot.value] = hasAvailableTable;
    }
    
    setSlotAvailability(availability);
  }, [selectedDate, guests, restaurantId, restaurantTables, allReservations, config.timeInterval, config.use24HourFormat, activeRestaurant, tablesLoaded]);

  // Resolve preview hours from customHours (same logic as PublicReservationPage)
  const previewCustomHours = activeRestaurant?.customHours || [];
  const previewOpenDayNames = getOpenDayNames(previewCustomHours);
  const previewDayName = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
    : null;
  let previewOpenTime  = '10:00';
  let previewCloseTime = '22:00';
  let previewIsOpen    = true;
  if (previewCustomHours.length > 0 && previewDayName) {
    let foundDay = false;
    for (const slot of previewCustomHours) {
      if (!slot.days) continue;
      const found = slot.days.find(d => d.name === previewDayName);
      if (found) {
        previewOpenTime  = slot.openTime  || '10:00';
        previewCloseTime = slot.closeTime || '22:00';
        foundDay = true;
        break;
      }
    }
    if (!foundDay) previewIsOpen = false;
  }
  
const generateTimeSlotsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = reservationSettings?.dayIntervals?.[dayName];
    const dayInterval = daySettings?.interval || 30;
    const startOffset = daySettings?.startOffset || 0;
    const endOffset = daySettings?.endOffset || 0;
    
    // Calculate effective times
    const [openHour, openMin] = previewOpenTime.split(':').map(Number);
    const [closeHour, closeMin] = previewCloseTime.split(':').map(Number);
    const effectiveOpenMin = openHour * 60 + openMin + startOffset;
    const effectiveCloseMin = closeHour * 60 + closeMin - endOffset;
    const effectiveOpenTime = `${String(Math.floor(effectiveOpenMin / 60)).padStart(2, '0')}:${String(effectiveOpenMin % 60).padStart(2, '0')}`;
    const effectiveCloseTime = `${String(Math.floor(effectiveCloseMin / 60)).padStart(2, '0')}:${String(effectiveCloseMin % 60).padStart(2, '0')}`;
    
    const allSlots = generateTimeSlots(effectiveOpenTime, effectiveCloseTime, dayInterval, config.use24HourFormat);
    
    // ✅ Filter out blocked time slots
    const blockedSlots = reservationSettings?.blockedTimeSlots?.[dayName] || [];
    const availableSlots = allSlots.filter(slot => !blockedSlots.includes(slot.value));
    
    console.log(`🕐 Preview time slots for ${dayName}:`, {
      total: allSlots.length,
      blocked: blockedSlots.length,
      available: availableSlots.length,
      blockedTimes: blockedSlots
    });
    
    return availableSlots;
  };
  
  const allTimeSlots = generateTimeSlotsForSelectedDate();
  
  // Filter time slots based on availability
  const timeSlots = allTimeSlots.filter(slot => {
    // Only show slots that have table availability
    if (slotAvailability[slot.value] === false) {
      return false;
    }
    return true;
  });
  
  const maxGuests = reservationSettings?.maxGuestsOnline || reservationSettings?.maxGuestsPerReservation || 20;
  const guestOptions = Array.from({ length: Math.min(maxGuests, 10) }, (_, i) => i + 1);
  
  // Use restaurant NAME in URL (more user-friendly), PublicReservationPage will query by name
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5173';
    }
    return 'https://dinery-ai.netlify.app';
  };

  const reservationUrl = `${getBaseUrl()}/reserve/${encodeURIComponent(restaurantId || 'demo')}`;

  const saveConfig = async (updates) => {
    if (!restaurantId) {
      console.warn('[ReservationLink] saveConfig: no restaurantId', activeRestaurant);
      alert('No restaurant selected or restaurant ID not found.');
      return;
    }
    
    // Determine collection from activeRestaurant
    const collectionName = activeRestaurant?._collection || 'restaurants';
    const path = `${collectionName}/${restaurantId}/reservationConfig/config`;
    console.log('[ReservationLink] Saving to:', path, updates);
    try {
      await setDoc(
        doc(db, collectionName, restaurantId, 'reservationConfig', 'config'),
        {
          ...updates,
          restaurantId,
          restaurantName: activeRestaurant?.name || config.restaurantName,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      console.log('[ReservationLink] Saved successfully');
    } catch (err) {
      console.error('[ReservationLink] Save error:', err);
      alert('Failed to save: ' + err.message);
    }
  };

  // Save entire config with visual feedback
  const handleSaveAll = async () => {
    setConfigSaving(true);
    await saveConfig(config);
    setConfigSaving(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  // ── Upload handlers ──────────────────────────────────────────────────
  const handleLogoFile = async (file) => {
    if (!file) return;
    const url = await logoUpload.upload(file);
    if (url) {
      setConfig(p => ({ ...p, logoUrl: url }));
      await saveConfig({ logoUrl: url });
    }
  };

  const handleBgFile = async (file) => {
    if (!file) return;
    const url = await bgUpload.upload(file);
    if (url) {
      setConfig(p => ({ ...p, backgroundImageUrl: url, backgroundMode: 'image' }));
      await saveConfig({ backgroundImageUrl: url, backgroundMode: 'image' });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(reservationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveReservation = async () => {
    if (!form.firstName || !form.lastName) { setToast('Please enter your name'); return; }
    if (config.requirePhone && !form.phone)  { setToast('Phone number is required'); return; }
    if (config.requireEmail && !form.email)  { setToast('Email address is required'); return; }

    try {
      setSaving(true);

      const currentUser  = auth.currentUser;
      const collectionName = activeRestaurant?._collection || 'restaurants';

      // Build reservation datetime
      const resDate = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      resDate.setHours(h, m, 0, 0);

      const diningDuration  = reservationSettings?.defaultReservationDuration || 90;
      const cleanupDuration = reservationSettings?.tableCleanupTime || 0;
      const totalDuration   = diningDuration + cleanupDuration;
      const resEndTime      = new Date(resDate.getTime() + totalDuration * 60000);

      // ── 1. Live conflict check ────────────────────────────────────────────────
      const liveSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('restaurant_id', '==', restaurantId),
        where('status', 'in', ['pending', 'confirmed'])
      ));

      const bookedTableIds = new Set();
      liveSnap.docs.forEach(d => {
        const res    = d.data();
        const rStart = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
        const rEnd   = new Date(rStart.getTime() + ((res.duration_minutes || diningDuration) + cleanupDuration) * 60000);
        if (rStart < resEndTime && rEnd > resDate) {
          if (Array.isArray(res.table_ids)) res.table_ids.forEach(tid => bookedTableIds.add(tid));
          else if (res.table_id) bookedTableIds.add(res.table_id);
        }
      });

      // ── 2. Auto-assign best free table ───────────────────────────────────────
      const eligible = restaurantTables
        .filter(t =>
          t.online === true &&
          (t.sessions === 'Reservation' || t.sessions === 'Both') &&
          guests >= (t.minCapacity || 0) &&
          guests <= (t.maxCapacity || 999) &&
          !bookedTableIds.has(t.id)
        )
        .sort((a, b) => {
          const pa = a.priority ?? 999, pb = b.priority ?? 999;
          if (pa !== pb) return pa - pb;
          return (a.maxCapacity || 999) - (b.maxCapacity || 999);
        });

      if (restaurantTables.length > 0 && eligible.length === 0) {
        setToast('This time slot is fully booked. Please choose a different time.');
        setSaving(false);
        return;
      }

      const assignedTable = eligible[0] || null;

      // ── 3. Save reservation ───────────────────────────────────────────────────
      await addDoc(collection(db, 'reservations'), {
        customer_name:    `${form.firstName} ${form.lastName}`.trim(),
        customer_email:   form.email,
        customer_phone:   `${phoneCode}${form.phone}`,
        number_of_guests: guests,
        reservation_date: resDate,
        from_time:        selectedTime,
        to_time:          '',
        duration_minutes: diningDuration,
        ServiceType_Reservation: 'dine-in',
        status:           'confirmed',
        special_requests: form.notes,
        company:          form.company,
        restaurant_id:    restaurantId || null,
        restaurant_name:  activeRestaurant?.name || config.restaurantName,
        restaurant_collection: collectionName,           // ✅ FIX 3 — was missing
        restaurant_owner_id: currentUser?.uid || null,
        is_walkin:        false,
        table_id:         assignedTable?.id   || null,   // ✅ FIX 1 — was hardcoded null
        table_name:       assignedTable?.name || '',     // ✅ FIX 1
        table_ids:        assignedTable ? [assignedTable.id]   : [],
        table_names:      assignedTable ? [assignedTable.name] : [],
        agree_newsletter: agreeNewsletter,
        source:           'reservation_link',
        created_at:       new Date(),
        updated_at:       new Date(),
        coupon_confirmed: false,
        reservation_completed_points_awarded: false,
      });

      // ── 4. Mark table as reserved ─────────────────────────────────────────────
      if (assignedTable) {                                // ✅ FIX 2 — was not done at all
        await updateDoc(
          doc(db, collectionName, restaurantId, 'tables', assignedTable.id),
          {
            current_status:            'reserved',
            reserved_by:               `${form.firstName} ${form.lastName}`.trim(),
            reserved_date:             resDate,
            reserved_guests:           guests,
            reserved_source:           'reservation_link',
            reserved_duration_minutes: totalDuration,
          }
        ).catch(e => console.warn('Could not update table status:', e));
      }

      setSaved(true);
    } catch (err) {
      setToast('Failed to save reservation: ' + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const gradientOptions = [
    { label: 'Night',    value: 'from-[#0f0c29] via-[#302b63] to-[#24243e]' },
    { label: 'Ember',    value: 'from-[#1a0000] via-[#3d0000] to-[#1a0a00]' },
    { label: 'Forest',   value: 'from-[#0a1628] via-[#0d2137] to-[#0a1628]' },
    { label: 'Dusk',     value: 'from-[#1c1c2e] via-[#2d1b69] to-[#11998e]' },
    { label: 'Midnight', value: 'from-[#000000] via-[#130f40] to-[#000000]' },
    { label: 'Wine',     value: 'from-[#2c0036] via-[#4a0050] to-[#1a0020]' },
  ];

  const previewBgClass = config.backgroundImageUrl
    ? ''
    : `bg-gradient-to-br ${config.backgroundGradient}`;

  const previewBgStyle = config.backgroundImageUrl
    ? {
        backgroundImage: `url("${config.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};
  const logoSizePx     = config.logoSize === 'sm' ? 52 : config.logoSize === 'lg' ? 96 : 72;
  const logoRadius     = config.logoShape === 'circle' ? '50%' : config.logoShape === 'rounded' ? '18px' : '6px';
  const previewLogoSz  = config.logoSize === 'sm' ? 36 : config.logoSize === 'lg' ? 56 : 44;

  if (!canAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          Only Admin and Manager roles can access the Reservation Link page. 
          Contact your manager for access.
        </p>
      </div>
    );
  }

  if (!activeRestaurant) {
    return <RestaurantSelector onSelect={(r) => setActiveRestaurant(r)} />;
  }

  // ════════════════════════════════════════════════════════════════════
  //  CONFIG PAGE
  // ════════════════════════════════════════════════════════════════════
  if (pageMode === 'config') {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Change restaurant button */}
            <button
              onClick={() => setActiveRestaurant(null)}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title="Change restaurant"
            >
              <FiChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            {/* Restaurant pill */}
            <button
              onClick={() => setActiveRestaurant(null)}
              className="flex items-center gap-2.5 bg-gray-100 hover:bg-[#fe8a24]/10 border-2 border-transparent hover:border-[#fe8a24]/30 rounded-xl px-3 py-2 transition-all group min-w-0"
            >
              {activeRestaurant.Image ? (
                <img src={activeRestaurant.Image} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#fe8a24]/20 flex items-center justify-center text-base flex-shrink-0">🍽️</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate leading-tight">{activeRestaurant.name}</p>
                {activeRestaurant.Type && <p className="text-[10px] text-gray-400 truncate leading-tight">{activeRestaurant.Type}</p>}
              </div>
              <span className="text-[10px] font-semibold text-[#fe8a24] flex-shrink-0 group-hover:underline">Change</span>
            </button>

            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">Reservation Link</h1>
              <p className="text-gray-400 text-xs">Customize your public booking page</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Save all button */}
            <button
              onClick={handleSaveAll}
              disabled={configSaving}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                configSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {configSaving ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : configSaved ? (
                <FiCheck className="w-4 h-4" />
              ) : null}
              {configSaving ? 'Saving...' : configSaved ? 'Saved!' : 'Save'}
            </button>
            <button onClick={() => setPageMode('preview')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors">
              <FiExternalLink className="w-4 h-4" /> Preview
            </button>
            <button onClick={() => setPageMode('link')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-xl text-sm font-semibold transition-colors">
              <FiCopy className="w-4 h-4" /> Get Link
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">

              {/* ── IMAGES ── */}
              <div className="bg-white rounded-2xl border-2 border-[#fe8a24]/30 shadow-sm overflow-hidden">
                <div className="bg-[#fe8a24]/5 px-5 py-4 border-b border-[#fe8a24]/20 flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-[#fe8a24]" />
                  <h3 className="font-bold text-gray-800 text-sm">Images</h3>
                  <span className="text-xs text-gray-400 ml-1">Logo and background photo</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">

                  {/* LOGO */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">Restaurant Logo</span>
                      {config.logoUrl && (
                        <button onClick={() => { setConfig(p => ({ ...p, logoUrl: '' })); saveConfig({ logoUrl: '' }); }}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                          <FiX className="w-2.5 h-2.5" /> Remove
                        </button>
                      )}
                    </div>
                    {config.logoUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => logoInputRef.current.click()}>
                        <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border-2 border-gray-200">
                          <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-3" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 shadow">
                            <FiUpload className="w-3 h-3" /> Change
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-[#fe8a24] bg-gray-50 hover:bg-[#fe8a24]/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                        {logoUpload.uploading ? (
                          <>
                            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-[#fe8a24]">{logoUpload.progress}%</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-gray-200 group-hover:bg-[#fe8a24]/20 rounded-full flex items-center justify-center transition-colors">
                              <FiUpload className="w-5 h-5 text-gray-400 group-hover:text-[#fe8a24]" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-500 group-hover:text-[#fe8a24]">Upload logo</p>
                              <p className="text-[10px] text-gray-400">PNG, JPG · Max 5MB</p>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { handleLogoFile(e.target.files[0]); e.target.value = ''; }} />
                    {config.logoUrl && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Shape</p>
                          <div className="flex gap-1">
                            {[{v:'circle',l:'Circle'},{v:'rounded',l:'Round'},{v:'square',l:'Square'}].map(o => (
                              <button key={o.v} onClick={() => setConfig(p => ({ ...p, logoShape: o.v }))}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${config.logoShape === o.v ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">Size</p>
                          <div className="flex gap-1">
                            {[{v:'sm',l:'S'},{v:'md',l:'M'},{v:'lg',l:'L'}].map(o => (
                              <button key={o.v} onClick={() => setConfig(p => ({ ...p, logoSize: o.v }))}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${config.logoSize === o.v ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BACKGROUND IMAGE */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">Background Image</span>
                      {config.backgroundImageUrl && (
                        <button onClick={() => { setConfig(p => ({ ...p, backgroundImageUrl: '', backgroundMode: 'gradient' })); saveConfig({ backgroundImageUrl: '', backgroundMode: 'gradient' }); }}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                          <FiX className="w-2.5 h-2.5" /> Remove
                        </button>
                      )}
                    </div>
                    {config.backgroundImageUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => bgInputRef.current.click()}>
                        <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-gray-200">
                          <img src={config.backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 shadow">
                            <FiUpload className="w-3 h-3" /> Change
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => bgInputRef.current.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-[#fe8a24] bg-gray-50 hover:bg-[#fe8a24]/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                        {bgUpload.uploading ? (
                          <>
                            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-[#fe8a24]">{bgUpload.progress}%</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-gray-200 group-hover:bg-[#fe8a24]/20 rounded-full flex items-center justify-center transition-colors">
                              <FiImage className="w-5 h-5 text-gray-400 group-hover:text-[#fe8a24]" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-500 group-hover:text-[#fe8a24]">Upload background</p>
                              <p className="text-[10px] text-gray-400">PNG, JPG · Max 10MB</p>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                    <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { handleBgFile(e.target.files[0]); e.target.value = ''; }} />
                    {config.backgroundImageUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">
                          Dark overlay: {Math.round((config.overlayOpacity ?? 0) * 100)}%
                        </p>
                        <input type="range" min={0} max={1} step={0.05} value={config.overlayOpacity}
                          onChange={e => {
                            const value = parseFloat(e.target.value);
                            setConfig(p => ({ ...p, overlayOpacity: value }));
                            saveConfig({ overlayOpacity: value });
                          }}
                          className="w-full accent-[#fe8a24]" />
                        <div className="flex justify-between text-[9px] text-gray-400">
                          <span>Light</span><span>Dark</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── BRANDING ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Branding</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Welcome Heading</label>
                    <input value={config.welcomeMessage} onChange={e => setConfig(p => ({ ...p, welcomeMessage: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#fe8a24]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Sub-heading</label>
                    <input value={config.subMessage} onChange={e => setConfig(p => ({ ...p, subMessage: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#fe8a24]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Accent Color</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={config.accentColor} onChange={e => setConfig(p => ({ ...p, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer" />
                      <span className="text-sm text-gray-600 font-mono">{config.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BACKGROUND GRADIENT ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-1 text-sm uppercase tracking-wider">Background</h3>
                {config.backgroundImageUrl ? (
                  <p className="text-xs text-gray-400 mt-2">Using uploaded photo. Remove it above to switch to a gradient.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {gradientOptions.map(g => (
                      <button key={g.label}
                        onClick={() => setConfig(p => ({ ...p, backgroundGradient: g.value, backgroundMode: 'gradient' }))}
                        className={`h-14 rounded-xl bg-gradient-to-br ${g.value} text-white text-xs font-bold flex items-end p-2 transition-all ${
                          config.backgroundGradient === g.value && config.backgroundMode !== 'image' ? 'ring-2 ring-[#fe8a24] scale-105' : 'opacity-70 hover:opacity-100'
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">ℹ️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1 text-sm">Booking Options Moved</h3>
                    <p className="text-xs text-blue-700 leading-relaxed mb-2">
                      Time intervals, start/end buffers, and other booking settings are now configured in 
                      <strong> Reservation Settings</strong> (accessed from the calendar page).
                    </p>
                    <p className="text-xs text-blue-600">
                      This allows you to set different booking intervals for each day of the week with custom start and end buffers.
                    </p>
                  </div>
                </div>
              </div>               
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Form Fields</h3>
                <div className="space-y-3">
                  {[
                    { key: 'requireEmail', label: 'Require Email' },
                    { key: 'requirePhone', label: 'Require Phone' },
                    { key: 'showCompany',  label: 'Show Company Field' },
                    { key: 'showNotes',    label: 'Show Notes Field' },
                    { key: 'use24HourFormat', label: 'Use 24-Hour Time Format' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700">{label}</span>
                      <div onClick={() => setConfig(p => ({ ...p, [key]: !p[key] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${config[key] ? 'bg-[#fe8a24]' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div className="lg:sticky lg:top-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Live Preview</p>
                <div className={`rounded-xl overflow-hidden relative ${previewBgClass}`} style={{ ...previewBgStyle, minHeight: 480 }}>
                  {config.backgroundImageUrl && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        backgroundColor: `rgba(0,0,0,${config.overlayOpacity ?? 0.25})`,
                      }}
                    />
                  )}
                  <div className="relative z-10 p-4 flex flex-col items-center">
                    {config.logoUrl && (
                      <div className="mb-3 overflow-hidden shadow-lg flex-shrink-0"
                        style={{ width: previewLogoSz, height: previewLogoSz, borderRadius: logoRadius, border: '2px solid rgba(255,255,255,0.2)' }}>
                        <img src={config.logoUrl} alt="logo" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">{config.restaurantName}</p>
                      <h2 className="text-xl font-bold text-white">{config.welcomeMessage}</h2>
                      <p className="text-white/60 text-xs mt-1">{config.subMessage}</p>
                    </div>
                    {/* Calendar — same as PublicReservationPage */}
                    <div className="bg-white/10 backdrop-blur rounded-xl p-3 w-full">
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); }}
                        accentColor={config.accentColor}
                        openDayNames={previewOpenDayNames}
                      />
                    </div>
                    {/* Time slots — filtered by availability */}
                    {selectedDate && (
                      <div className="mt-3 w-full">
                        {!previewIsOpen ? (
                          <div className="bg-red-500/15 border border-red-500/25 rounded-xl p-3 text-center">
                            <p className="text-red-300 text-xs font-bold">Closed on this day</p>
                          </div>
                        ) : !tablesLoaded ? (
                          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-white/60 text-sm">Loading availability...</p>
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <p className="text-white/60 text-xs font-bold">No time slots available</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wider mb-2">
                              Select Time
                              <span className="text-white/25 normal-case font-normal ml-1">({previewOpenTime} – {previewCloseTime})</span>
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {timeSlots.slice(0, 9).map(slot => (
                                <button key={slot.value} onClick={() => setSelectedTime(slot.value)}
                                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedTime === slot.value ? 'text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                                  style={selectedTime === slot.value ? { backgroundColor: config.accentColor } : {}}>
                                  {slot.label}
                                </button>
                              ))}
                            </div>
                            {timeSlots.length > 9 && (
                              <p className="text-white/30 text-[10px] text-center mt-1.5">+{timeSlots.length - 9} more slots on full page</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  GET LINK PAGE
  // ════════════════════════════════════════════════════════════════════
  if (pageMode === 'link') {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setPageMode('config')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <FiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your Reservation Link</h1>
              <p className="text-gray-500 text-sm">Share this link with your customers</p>
            </div>
          </div>
          <button onClick={() => setPageMode('preview')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors">
            <FiExternalLink className="w-4 h-4" /> Preview Page
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-4">
            {/* Restaurant context */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              {activeRestaurant.Image
                ? <img src={activeRestaurant.Image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-[#fe8a24]/10 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              }
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{activeRestaurant.name}</p>
                <p className="text-xs text-gray-400 truncate">{activeRestaurant.Reservation_email || activeRestaurant.Type}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-[#fe8a24]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiCopy className="w-8 h-8 text-[#fe8a24]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Public Booking Page</h2>
              <p className="text-gray-500 text-sm mb-5">Share this link so guests can book directly from any device.</p>
              <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3">
                <span className="flex-1 text-sm text-gray-700 font-mono truncate">{reservationUrl}</span>
                <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-[#fe8a24] text-white hover:bg-[#ff9d47]'}`}>
                  {copied ? <><FiCheck className="w-3 h-3" /> Copied!</> : <><FiCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📱', title: 'Mobile Ready',    desc: 'Works on all devices' },
                { icon: '⚡', title: 'Instant Booking', desc: 'Saved to your dashboard' },
                { icon: '🎨', title: 'Fully Branded',   desc: 'Your colors and name' },
                { icon: '📊', title: 'All Tracked',     desc: 'Appears in your calendar' },
              ].map(item => (
                <div key={item.title} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  PREVIEW / PUBLIC BOOKING PAGE
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen relative overflow-hidden ${previewBgClass}`} style={previewBgStyle}>
      {config.backgroundMode === 'image' && config.backgroundImageUrl && (
        <div className="fixed inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${config.overlayOpacity ?? 0.5})` }} />
      )}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)' }} />
      <button onClick={() => setPageMode('config')} className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm rounded-xl text-white/70 hover:text-white text-xs font-semibold transition-colors">
        <FiChevronLeft className="w-3.5 h-3.5" /> Back to Editor
      </button>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold shadow-2xl">{toast}</div>
      )}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-5xl">
          {config.logoUrl && (
            <div className="flex justify-center mb-6">
              <div className="overflow-hidden shadow-2xl" style={{ width: logoSizePx, height: logoSizePx, borderRadius: logoRadius, border: '2px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <img src={config.logoUrl} alt={config.restaurantName} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: config.accentColor }}>{config.restaurantName}</p>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">{config.welcomeMessage}</h1>
            <p className="text-white/50 text-base">{config.subMessage}</p>
          </div>

          {saved ? (
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/20">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl" style={{ backgroundColor: config.accentColor }}>
                  <FiCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">You're booked!</h2>
                <p className="text-white/60 text-sm mb-6">
                  {form.firstName}, your reservation for {guests} guests on{' '}
                  {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at{' '}
                  {allTimeSlots.find(t => t.value === selectedTime)?.label} has been confirmed.
                </p>
                <div className="space-y-2 text-left bg-white/5 rounded-2xl p-4 text-sm">
                  <div className="flex items-center gap-3 text-white/70"><FiUsers className="w-4 h-4" style={{ color: config.accentColor }} /><span>{guests} guests</span></div>
                  <div className="flex items-center gap-3 text-white/70"><FiCalendar className="w-4 h-4" style={{ color: config.accentColor }} /><span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                  <div className="flex items-center gap-3 text-white/70"><FiClock className="w-4 h-4" style={{ color: config.accentColor }} /><span>{allTimeSlots.find(t => t.value === selectedTime)?.label}</span></div>
                </div>
                <button onClick={() => { setSaved(false); setStep(1); setSelectedDate(null); setSelectedTime(''); setForm({ firstName:'', lastName:'', phone:'', email:'', company:'', notes:'' }); }}
                  className="mt-6 w-full py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: config.accentColor }}>
                  Make Another Reservation
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 sticky top-6">
                  <h3 className="text-white font-black text-lg mb-5">Summary</h3>
                  <div className="mb-4">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Guests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {guestOptions.map(g => (
                        <button key={g} onClick={() => setGuests(g)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${guests === g ? 'text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                          style={guests === g ? { backgroundColor: config.accentColor } : {}}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: FiUsers,    label: `${guests} guests`,    editable: false },
                      { icon: FiCalendar, label: selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date', editable: !!selectedDate },
                      { icon: FiMapPin,   label: config.restaurantName, editable: false },
                      { icon: FiClock,    label: selectedTime ? allTimeSlots.find(t => t.value === selectedTime)?.label || selectedTime : 'Select a time', editable: !!selectedTime },
                    ].map(({ icon: Icon, label, editable }) => (
                      <div key={label} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" style={{ color: config.accentColor }} />
                          <span className="text-sm text-white/80">{label}</span>
                        </div>
                        {editable && <button onClick={() => setStep(1)} className="text-white/40 hover:text-white/70"><FiEdit2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  {step === 1 ? (
                    <>
                      <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-5">Select Date</p>
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); }}
                        accentColor={config.accentColor}
                        openDayNames={previewOpenDayNames}
                      />
                      {selectedDate && (
                        <div className="mt-6">
                          {!previewIsOpen ? (
                            <div className="bg-red-500/15 border border-red-500/25 rounded-2xl p-5 text-center">
                              <p className="text-red-300 text-sm font-bold mb-1">Closed on this day</p>
                              <p className="text-red-300/60 text-xs">Please choose a different date</p>
                            </div>
                          ) : !tablesLoaded ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-white/60 text-sm">Loading availability...</p>
                            </div>
                          ) : timeSlots.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                              <p className="text-white/60 text-sm font-bold mb-1">No time slots available</p>
                              <p className="text-white/30 text-xs">Please contact us directly to book.</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-3">
                                Select Time
                                <span className="text-white/25 normal-case font-normal ml-1">({previewOpenTime} – {previewCloseTime})</span>
                              </p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {timeSlots.map(slot => (
                                  <button key={slot.value} onClick={() => setSelectedTime(slot.value)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedTime === slot.value ? 'text-white shadow-lg scale-105' : 'bg-white/10 text-white/65 hover:bg-white/15'}`}
                                    style={selectedTime === slot.value ? { backgroundColor: config.accentColor } : {}}>
                                    {slot.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {selectedDate && selectedTime && previewIsOpen && (
                        <button onClick={() => setStep(2)} className="mt-7 w-full py-4 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] shadow-xl" style={{ backgroundColor: config.accentColor }}>
                          Continue →
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setStep(1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                          <FiChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <h3 className="text-white font-black text-lg">Enter your contact details</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">First name</label>
                            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="Juan" />
                          </div>
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Last name</label>
                            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="dela Cruz" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            Phone {config.requirePhone && <span style={{ color: config.accentColor }}>*</span>}
                          </label>
                          <div className="flex gap-2">
                            <select value={phoneCode} onChange={e => setPhoneCode(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-white/50 w-24">
                              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="bg-gray-800 text-white">{c.flag} {c.code}</option>)}
                            </select>
                            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} type="tel" className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="9XX XXX XXXX" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            Email {config.requireEmail && <span style={{ color: config.accentColor }}>*</span>}
                          </label>
                          <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="juan@email.com" />
                        </div>
                        {config.showCompany && (
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Company</label>
                            <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="Company name" />
                          </div>
                        )}
                        {config.showNotes && (
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Notes</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} maxLength={360} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all resize-none" placeholder="Dietary requirements, special occasions..." />
                            <p className="text-white/30 text-xs text-right mt-1">({form.notes.length}/360)</p>
                          </div>
                        )}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={agreeNewsletter} onChange={e => setAgreeNewsletter(e.target.checked)} className="mt-0.5 w-4 h-4 rounded" style={{ accentColor: config.accentColor }} />
                          <span className="text-white/50 text-xs leading-relaxed">
                            I agree to receive newsletters in accordance with the <span className="underline cursor-pointer" style={{ color: config.accentColor }}>declaration of consent</span>.
                          </span>
                        </label>
                        <p className="text-white/30 text-xs">By completing this booking you agree to our <span className="underline cursor-pointer" style={{ color: config.accentColor }}>Terms</span></p>
                        <button onClick={handleSaveReservation} disabled={saving} className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] shadow-xl disabled:opacity-50" style={{ backgroundColor: config.accentColor }}>
                          {saving ? 'Saving...' : 'Make reservation'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationLinkPage;