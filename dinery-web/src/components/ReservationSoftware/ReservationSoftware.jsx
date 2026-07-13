// src/components/reservation-software/ReservationSoftware.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import CalendarView from './CalendarView';
import ListView from './ListView';
import ReservationModal from './ReservationModal';
import CreateReservationModal from './CreateReservationModal';
import ReservationTableView from './ReservationTableView';
import { 
  FiPlus, FiCalendar, FiList, FiSettings, FiChevronDown, 
  FiChevronLeft, FiChevronRight, FiClock, FiUsers, 
  FiSearch, FiFilter, FiGrid, FiMenu, FiX, FiSun, FiMoon, FiRefreshCw
} from 'react-icons/fi';
import { useTheme } from '../../ThemeContext';
import ReservationSettings from './ReservationSettings';

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    restaurant: 'Restaurant',
    walkIn: 'Walk-in',
    quick: 'Quick',
    quickBook: 'Quick Book',
    settings: 'Settings',
    today: 'Today',
    reservations: 'res',
    guests: 'guests',
    calendar: 'Calendar',
    list: 'List',
    newBooking: 'New Booking',
    loading: 'Loading reservations...',
    refreshing: 'Refreshing...',
    refreshData: 'Refresh data',
    selectRestaurant: 'Select Restaurant',
    address: 'Address',
    dayStats: 'Stats',
    time: 'Time',
    tableList: 'Table/List',
  },
  fi: {
    restaurant: 'Ravintola',
    walkIn: 'Kävelylle',
    quick: 'Pika',
    quickBook: 'Pikavaraus',
    settings: 'Asetukset',
    today: 'Tänään',
    reservations: 'varausta',
    guests: 'vierasta',
    calendar: 'Kalenteri',
    list: 'Lista',
    newBooking: 'Uusi varaus',
    loading: 'Ladataan varauksia...',
    refreshing: 'Päivitetään...',
    refreshData: 'Päivitä tiedot',
    selectRestaurant: 'Valitse ravintola',
    address: 'Osoite',
    dayStats: 'Tilastot',
    time: 'Aika',
    tableList: 'Pöytä/Lista',
  },
  no: {
    restaurant: 'Restaurant',
    walkIn: 'Drop-in',
    quick: 'Hurtig',
    quickBook: 'Hurtigbestilling',
    settings: 'Innstillinger',
    today: 'I dag',
    reservations: 'res',
    guests: 'gjester',
    calendar: 'Kalender',
    list: 'Liste',
    newBooking: 'Ny bestilling',
    loading: 'Laster reservasjoner...',
    refreshing: 'Oppdaterer...',
    refreshData: 'Oppdater data',
    selectRestaurant: 'Velg restaurant',
    address: 'Adresse',
    dayStats: 'Statistikk',
    time: 'Tid',
    tableList: 'Bord/Liste',
  },
  sv: {
    restaurant: 'Restaurang',
    walkIn: 'Drop-in',
    quick: 'Snabbt',
    quickBook: 'Snabbbokning',
    settings: 'Inställningar',
    today: 'Idag',
    reservations: 'bok',
    guests: 'gäster',
    calendar: 'Kalender',
    list: 'Lista',
    newBooking: 'Ny bokning',
    loading: 'Laddar bokningar...',
    refreshing: 'Uppdaterar...',
    refreshData: 'Uppdatera data',
    selectRestaurant: 'Välj restaurang',
    address: 'Adress',
    dayStats: 'Statistik',
    time: 'Tid',
    tableList: 'Bord/Lista',
  },
  de: {
    restaurant: 'Restaurant',
    walkIn: 'Laufkundschaft',
    quick: 'Schnell',
    quickBook: 'Schnellbuchung',
    settings: 'Einstellungen',
    today: 'Heute',
    reservations: 'Res.',
    guests: 'Gäste',
    calendar: 'Kalender',
    list: 'Liste',
    newBooking: 'Neue Buchung',
    loading: 'Lade Reservierungen...',
    refreshing: 'Aktualisiere...',
    refreshData: 'Daten aktualisieren',
    selectRestaurant: 'Restaurant auswählen',
    address: 'Adresse',
    dayStats: 'Statistik',
    time: 'Zeit',
    tableList: 'Tisch/Liste',
  },
};

const ReservationSoftware = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  // ── Translation helper ────────────────────────────────────────────────────────
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  // ── Listen for language changes ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [reservations, setReservations] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d;
  });
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [selectedReservationDate, setSelectedReservationDate] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modalMode, setModalMode] = useState('full');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('calendar');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  
  // Safely get sessionStorage values - wrap in try/catch
  let staffRestaurantId = null;
  let staffRole = null;
  try {
    staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
    staffRole = sessionStorage.getItem("staffRole");
  } catch (e) {
    // sessionStorage not available
    console.log('sessionStorage not available, using default values');
  }
  
  const isStaff = !!staffRestaurantId;
  const db = firestore;
  const [preSelectedTable, setPreSelectedTable] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Current time state
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Responsive: detect screen size
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Force re-render for tablet
  const [forceRender, setForceRender] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const isTabletDevice = (width >= 768 && width <= 1024) || 
        (/iPad|Macintosh/.test(navigator.userAgent) && width >= 768 && width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
      
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024 || isTabletDevice);
      setIsDesktop(width >= 1024 && !isTabletDevice);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

   if (isStaff) {
      const staffCollection = sessionStorage.getItem("staffCollection") || "restaurants";
      getDoc(doc(db, staffCollection, staffRestaurantId)).then((snap) => {
        if (snap.exists()) {
          const restaurant = { id: snap.id, ...snap.data(), _collection: staffCollection };
          console.log("✅ Staff restaurant loaded:", restaurant); 
          console.log("✅ Owner_ID:", restaurant.Owner_ID);     
          setRestaurants([restaurant]);
          setSelectedRestaurant(restaurant);
        }
      });
      return;
    }

  const q1 = query(collection(db, 'restaurants'),    where('Owner_ID', '==', currentUser.uid));
  const q2 = query(collection(db, 'TestRestaurant'), where('Owner_ID', '==', currentUser.uid));

  let unsub2 = null;

  const unsub1 = onSnapshot(q1, (snap1) => {
    const data1 = snap1.docs.map(d => ({ id: d.id, ...d.data(), _collection: 'restaurants' }));

    if (unsub2) unsub2();
    unsub2 = onSnapshot(q2, (snap2) => {
      const data2 = snap2.docs.map(d => ({ id: d.id, ...d.data(), _collection: 'TestRestaurant' }));
      const all = [...data1, ...data2];
      setRestaurants(all);
      setSelectedRestaurant(prev =>
        prev ? (all.find(r => r.id === prev.id) || all[0] || null) : (all[0] || null)
      );
    }, (error) => { console.error('❌ Error fetching TestRestaurant:', error); });
  }, (error) => { console.error('❌ Error fetching restaurants:', error); });

  return () => { unsub1(); if (unsub2) unsub2(); };

 }, [isStaff, staffRestaurantId]);

  // Fetch reservations
  useEffect(() => {
    if (!selectedRestaurant) return;

    const start = getStartOfDay(startDate);
    const end   = getEndOfDay(endDate);
    const currentUser = auth.currentUser;

    const ownerUid = isStaff
      ? selectedRestaurant?.Owner_ID
      : currentUser?.uid;

    // Debug logs — remove these once reservations are loading correctly
    console.log("🔍 selectedRestaurant:", selectedRestaurant);
    console.log("🔍 Owner_ID:", selectedRestaurant?.Owner_ID);
    console.log("🔍 isStaff:", isStaff);
    console.log("🔍 ownerUid resolved to:", ownerUid);

    if (!ownerUid) {
      console.warn("⚠️ ownerUid is missing — reservations won't load. Check Owner_ID field in Firestore.");
      return;
    }

    const q = query(
      collection(db, 'reservations'),
      where('restaurant_owner_id', '==', ownerUid),
      where('reservation_date', '>=', start),
      where('reservation_date', '<=', end),
      orderBy('reservation_date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let reservationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      reservationsData = reservationsData.filter(r => r.restaurant_id === selectedRestaurant.id);
      setReservations(reservationsData);
      setLoading(false);
      setRefreshing(false);
    });

    return () => unsubscribe();
  }, [selectedDate, startDate, endDate, viewMode, selectedRestaurant, isStaff]);

  const getStartOfDay = (date) => { const s = new Date(date); s.setHours(0,0,0,0); return s; };
  const getEndOfDay   = (date) => { const e = new Date(date); e.setHours(23,59,59,999); return e; };

  const handleReservationClick = (reservation) => { setSelectedReservation(reservation); setShowEditModal(true); };
  const handleWalkIn = () => { setSelectedReservationDate(null); setModalMode('walkin'); setShowCreateModal(true); };
  const handleCreateReservationFromSlot = (dateTime) => { setSelectedReservationDate(dateTime); setModalMode('full'); setShowCreateModal(true); };
  const handleCloseEditModal   = () => { setShowEditModal(false);   setSelectedReservation(null); };
  const handleCloseCreateModal = () => { setShowCreateModal(false); setSelectedReservationDate(null); setModalMode('full'); setPreSelectedTable(null); };

  // ─── Helper Functions ──────────────────────────────────────────────────────────
  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // ─── Date Navigation Functions ──────────────────────────────────────────────
  const navigateDate = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  // ─── Reload Function ─────────────────────────────────────────────────────────
  const handleReload = async () => {
    setRefreshing(true);
    // Force a re-render for tablets
    setForceRender(prev => prev + 1);
    
    // Force a refresh by re-fetching data
    if (selectedRestaurant) {
      const start = getStartOfDay(startDate);
      const end   = getEndOfDay(endDate);
      const currentUser = auth.currentUser;
      const ownerUid = isStaff
        ? (selectedRestaurant?.Owner_ID || currentUser?.uid)
        : currentUser?.uid;

      if (!ownerUid) {
        setRefreshing(false);
        return;
      }

      const q = query(
        collection(db, 'reservations'),
        where('restaurant_owner_id', '==', ownerUid),
        where('reservation_date', '>=', start),
        where('reservation_date', '<=', end),
        orderBy('reservation_date', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        let reservationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reservationsData = reservationsData.filter(r => r.restaurant_id === selectedRestaurant.id);
        setReservations(reservationsData);
        setRefreshing(false);
      });

      // Clean up after a short delay
      setTimeout(() => {
        unsubscribe();
        setRefreshing(false);
      }, 2000);
    } else {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const VIEW_TABS = [
    { key: 'calendar', label: t('calendar'), icon: <FiCalendar className="w-4 h-4" /> },
    { key: 'reservation-table', label: t('tableList'), icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    { key: 'list', label: t('list'), icon: <FiList className="w-4 h-4" /> },
  ];

  // Get current day stats
  const getDayStats = () => {
    const dayRes = reservations.filter(r => {
      const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      const d = new Date(selectedDate);
      d.setHours(0, 0, 0, 0);
      const rdDate = new Date(rd);
      rdDate.setHours(0, 0, 0, 0);
      return rdDate.getTime() === d.getTime() && r.status !== 'cancelled';
    });
    const totalGuests = dayRes.reduce((sum, r) => sum + (r.number_of_guests || 0), 0);
    return { count: dayRes.length, guests: totalGuests };
  };

  // Get responsive text for stats
  const getStatsText = () => {
    const stats = getDayStats();
    if (isMobile) {
      return `${stats.count} ${t('reservations')} · ${stats.guests}`;
    }
    return `${stats.count} ${t('reservations')} · ${stats.guests} ${t('guests')}`;
  };

  return (
    <div className={`h-full flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`} style={{ height: "100vh", maxHeight: "100%" }}>
      
      {/* ─── HEADER ────────────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        
        {/* Top Bar: Restaurant + Actions */}
        <div className="flex items-center justify-between px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 gap-1 sm:gap-2">
          {/* Left: Restaurant */}
          <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
            {restaurants.length > 1 && !isStaff ? (
              <div className="relative">
                <select
                  value={selectedRestaurant?.id || ''}
                  onChange={(e) => { const r = restaurants.find(r => r.id === e.target.value); setSelectedRestaurant(r); }}
                  className={`appearance-none bg-transparent border-0 focus:ring-0 text-xs sm:text-sm md:text-base font-bold pr-4 sm:pr-6 cursor-pointer transition-colors truncate max-w-[80px] sm:max-w-[120px] md:max-w-[200px] ${
                    isDarkMode ? 'text-gray-100 hover:text-primary' : 'text-gray-900 hover:text-[#fe8a24]'
                  }`}
                  aria-label={t('selectRestaurant')}
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id} className="font-normal">
                      {r.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className={`absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 pointer-events-none ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              </div>
            ) : (
              <span className={`text-xs sm:text-sm md:text-base font-bold truncate ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                {selectedRestaurant?.name || t('restaurant')}
              </span>
            )}
            {/* Address - hide on mobile */}
            {selectedRestaurant?.address && !isMobile && (
              <span className={`text-[10px] sm:text-xs hidden sm:inline truncate max-w-[100px] md:max-w-[200px] ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedRestaurant.address}
              </span>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
            {/* Reload Button */}
            <button 
              onClick={handleReload}
              disabled={refreshing}
              className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'} ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={t('refreshData')}
            >
              <FiRefreshCw className={`w-3.5 h-3.5 md:w-4 md:h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Mobile Menu Toggle */}
            {isMobile && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                {isMobileMenuOpen ? <FiX className="w-4 h-4" /> : <FiMenu className="w-4 h-4" />}
              </button>
            )}

            {/* Walk-in - show on larger screens */}
            {!isMobile && (
              <button 
                onClick={handleWalkIn}
                className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 rounded-lg font-medium transition-all text-[10px] sm:text-xs md:text-sm ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <span className="text-sm sm:text-base">🚶</span>
                <span className="hidden sm:inline">{t('walkIn')}</span>
              </button>
            )}

            {/* Quick Book */}
            <button 
              onClick={() => { setModalMode('quickbook'); setSelectedReservationDate(null); setShowCreateModal(true); }}
              className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 md:px-3.5 py-1 sm:py-1.5 rounded-lg font-medium transition-all text-[10px] sm:text-xs md:text-sm shadow-sm ${
                isDarkMode ? 'bg-primary hover:bg-primary/80 text-white' : 'bg-[#fe8a24] hover:bg-[#ff9d47] text-white'
              }`}
            >
              <FiPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" /> 
              <span className="hidden sm:inline">{t('quick')}</span>
            </button>

            {/* Settings */}
            {(!isStaff || staffRole === 'admin' || staffRole === 'manager') && !isMobile && (
              <button 
                onClick={() => setShowSettings(true)}
                className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
                title={t('settings')}
              >
                <FiSettings className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            )}

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className={`p-1.5 md:p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              {isDarkMode ? <FiSun className="w-3.5 h-3.5 md:w-4 md:h-4" /> : <FiMoon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Action Buttons */}
        {isMobile && isMobileMenuOpen && (
          <div className={`px-3 py-2 border-t flex flex-wrap gap-1.5 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <button 
              onClick={handleWalkIn}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <span className="text-base">🚶</span> {t('walkIn')}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center ${
                isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
              }`}
            >
              <FiSettings className="w-3.5 h-3.5" /> {t('settings')}
            </button>
          </div>
        )}

        {/* Middle Bar: Date Navigation + Stats */}
        <div className={`flex items-center justify-center px-1 sm:px-2 md:px-5 py-1 sm:py-1.5 border-t flex-wrap gap-0.5 sm:gap-1 md:gap-2 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          
          {/* Date Navigation */}
          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
            <button 
              onClick={() => navigateDate(-1)}
              className={`p-0.5 sm:p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <FiChevronLeft className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </button>
            
            <button 
              onClick={goToToday}
              className={`px-1.5 sm:px-2 md:px-3 py-0.5 rounded-lg text-[8px] sm:text-[10px] md:text-xs font-medium transition-colors shadow-sm ${
                isDarkMode ? 'bg-primary text-white hover:bg-primary/80' : 'bg-[#fe8a24] text-white hover:bg-[#ff9d47]'
              }`}
            >
              {t('today')}
            </button>
            
            <button 
              onClick={() => navigateDate(1)}
              className={`p-0.5 sm:p-1 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}
            >
              <FiChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
            </button>
          </div>

          {/* Date Picker */}
          <div className="relative flex items-center gap-0.5 sm:gap-1 md:gap-2">
            <FiCalendar className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-primary' : 'text-[#fe8a24]'}`} />
            <input 
              type="date" 
              value={formatDateForInput(selectedDate)}
              onChange={(e) => {
                if (e.target.value) {
                  const parts = e.target.value.split('-');
                  const newDate = new Date(
                    parseInt(parts[0]),
                    parseInt(parts[1]) - 1,
                    parseInt(parts[2])
                  );
                  if (!isNaN(newDate.getTime())) {
                    setSelectedDate(newDate);
                  }
                }
              }}
              className={`text-[9px] sm:text-xs md:text-sm font-semibold bg-transparent border-0 focus:ring-0 focus:outline-none cursor-pointer transition-colors ${
                isDarkMode ? 'text-gray-200 hover:text-primary' : 'text-gray-800 hover:text-[#fe8a24]'
              }`}
              style={{ 
                width: isMobile ? '70px' : isTablet ? '100px' : '140px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                paddingRight: '12px'
              }}
            />
          </div>

          {/* Stats + Time */}
          <div className={`flex items-center gap-0.5 sm:gap-1 md:gap-3 px-1.5 sm:px-2 md:px-3 py-0.5 rounded-lg ${
            isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
          }`}>
            <div className="flex items-center gap-0.5 sm:gap-1">
              <FiUsers className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-medium whitespace-nowrap ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {getStatsText()}
              </span>
            </div>
            <div className={`w-px h-2 sm:h-3 md:h-4 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`} />
            <div className="flex items-center gap-0.5 sm:gap-1">
              <FiClock className={`w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-3.5 md:h-3.5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-mono font-semibold tabular-nums min-w-[35px] sm:min-w-[45px] md:min-w-[65px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatTime(currentTime)}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar: View Tabs */}
        <div className={`flex items-center px-2 sm:px-3 md:px-5 py-1 sm:py-1.5 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-0.5 sm:gap-1 w-full overflow-x-auto scrollbar-hide">
            {VIEW_TABS.map(({ key, label, icon }) => (
              <button 
                key={key} 
                onClick={() => setViewMode(key)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 md:px-4 py-1 sm:py-1.5 rounded-lg font-medium transition-all text-[8px] sm:text-[10px] md:text-sm whitespace-nowrap ${
                  viewMode === key 
                    ? (isDarkMode ? 'bg-primary text-white shadow-sm' : 'bg-[#fe8a24] text-white shadow-sm')
                    : (isDarkMode ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100')
                }`}
              >
                {icon} 
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">
                  {key === 'calendar' && '📅'}
                  {key === 'reservation-table' && '📋'}
                  {key === 'list' && '📄'}
                </span>
              </button>
            ))}
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Quick action on tablet/desktop */}
            {!isMobile && (
              <button 
                onClick={() => { setModalMode('full'); setSelectedReservationDate(null); setShowCreateModal(true); }}
                className={`flex items-center gap-0.5 sm:gap-1 px-2 sm:px-2.5 md:px-3 py-1 sm:py-1.5 rounded-lg text-[9px] sm:text-xs font-medium transition-colors ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <FiPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 
                <span className="hidden sm:inline">{t('newBooking')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading || refreshing ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-2 sm:mb-3 ${isDarkMode ? '' : ''}`} />
              <p className={`text-[10px] sm:text-xs md:text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {refreshing ? t('refreshing') : t('loading')}
              </p>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView
            key={selectedDate.toISOString() + forceRender}
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onReservationClick={handleReservationClick}
            onCreateReservation={handleCreateReservationFromSlot}
            selectedRestaurant={selectedRestaurant}
          />
        ) : viewMode === 'reservation-table' ? (
          <ReservationTableView
            key={forceRender}
            selectedRestaurant={selectedRestaurant}
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onReservationClick={handleReservationClick}
            onNewBookingFromTable={(tableId, tableName, dateTime) => {
              setPreSelectedTable({ id: tableId, name: tableName });
              setModalMode('full');
              if (dateTime) setSelectedReservationDate(dateTime);
              setShowCreateModal(true);
            }}
            onWalkInFromTable={(tableId, tableName, dateTime) => {
              setPreSelectedTable({ id: tableId, name: tableName });
              setModalMode('walkin');
              if (dateTime) setSelectedReservationDate(dateTime);
              setShowCreateModal(true);
            }}
          />
        ) : (
          <ListView
            key={viewMode + selectedDate.toISOString() + forceRender}
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            startDate={selectedDate}
            endDate={selectedDate}
            onStartDateChange={setSelectedDate}
            onEndDateChange={setSelectedDate}
            onReservationClick={handleReservationClick}
          />
        )}
      </div>

      {/* ─── MODALS ────────────────────────────────────────────────────────────── */}
      {showEditModal && selectedReservation && (
        <ReservationModal 
          key={selectedReservation.id + forceRender}
          reservation={selectedReservation} 
          onClose={handleCloseEditModal} 
        />
      )}
      {showCreateModal && (
        <CreateReservationModal
          key={forceRender}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedReservationDate(null);
            setModalMode('full');
            setPreSelectedTable(null);
          }}
          selectedDate={selectedReservationDate || selectedDate}
          selectedRestaurant={selectedRestaurant}
          modalMode={modalMode}
          preSelectedTableId={preSelectedTable?.id || null}
          preSelectedTableName={preSelectedTable?.name || null}
        />
      )}
      {showSettings && (!isStaff || staffRole === 'admin' || staffRole === 'manager') && (
        <ReservationSettings 
          key={forceRender}
          selectedRestaurant={selectedRestaurant} 
          onClose={() => setShowSettings(false)} 
        />
      )}
    </div>
  );
};

export default ReservationSoftware;