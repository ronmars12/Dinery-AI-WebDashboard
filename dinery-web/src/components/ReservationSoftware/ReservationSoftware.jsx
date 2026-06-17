// src/components/reservation-software/ReservationSoftware.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import CalendarView from './CalendarView';
import ListView from './ListView';
import ReservationModal from './ReservationModal';
import CreateReservationModal from './CreateReservationModal';
import ReservationTableView from './ReservationTableView';
import { FiPlus, FiCalendar, FiList, FiSettings, FiChevronDown } from 'react-icons/fi';
import ReservationSettings from './ReservationSettings';

const ReservationSoftware = () => {
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
  const [viewMode, setViewMode] = useState('calendar');
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  const db = firestore;
  const [preSelectedTable, setPreSelectedTable] = useState(null);
  
  // Responsive: detect screen size
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    if (isStaff) {
      getDoc(doc(db, 'restaurants', staffRestaurantId)).then((snap) => {
        if (snap.exists()) {
          const restaurant = { id: snap.id, ...snap.data(), _collection: 'restaurants' };
          setRestaurants([restaurant]);
          setSelectedRestaurant(restaurant);
        }
      });
      return;
    }

    // ── Owner: load all owned restaurants ─────────────────────────────────
    const q1 = query(collection(db, 'restaurants'),    where('Owner_ID', '==', currentUser.uid));
    const q2 = query(collection(db, 'TestRestaurant'), where('Owner_ID', '==', currentUser.uid));

    const unsubscribe1 = onSnapshot(q1, (snapshot1) => {
      const data1 = snapshot1.docs.map(doc => ({ id: doc.id, ...doc.data(), _collection: 'restaurants' }));

      const unsubscribe2 = onSnapshot(q2, (snapshot2) => {
        const data2 = snapshot2.docs.map(doc => ({ id: doc.id, ...doc.data(), _collection: 'TestRestaurant' }));
        const restaurantsData = [...data1, ...data2];
        setRestaurants(restaurantsData);
        setSelectedRestaurant(prev => {
          if (!prev) return restaurantsData[0] || null;
          return restaurantsData.find(r => r.id === prev.id) || restaurantsData[0] || null;
        });
      }, (error) => { console.error('❌ Error fetching TestRestaurant:', error); });
    }, (error) => { console.error('❌ Error fetching restaurants:', error); });

    return () => { unsubscribe1(); };
 }, [isStaff, staffRestaurantId]);

  // Fetch reservations
  useEffect(() => {
    if (!selectedRestaurant) return;

    const start = getStartOfDay(startDate);
    const end   = getEndOfDay(endDate);
    const currentUser = auth.currentUser;

    // Staff use the restaurant's Owner_ID, not their own uid
    const ownerUid = isStaff
      ? (selectedRestaurant?.Owner_ID || currentUser.uid)
      : currentUser.uid;

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
    });

    return () => unsubscribe();
  }, [selectedDate, startDate, endDate, viewMode, selectedRestaurant, isStaff]);

  const getStartOfDay = (date) => { const s = new Date(date); s.setHours(0,0,0,0); return s; };
  const getEndOfDay   = (date) => { const e = new Date(date); e.setHours(23,59,59,999); return e; };

  const handleReservationClick = (reservation) => { setSelectedReservation(reservation); setShowEditModal(true); };
  const handleWalkIn = () => { setSelectedReservationDate(null); setModalMode('walkin'); setShowCreateModal(true); };
  const handleCreateReservationFromSlot = (dateTime) => { setSelectedReservationDate(dateTime); setModalMode('full'); setShowCreateModal(true); };
  const handleCloseEditModal   = () => { setShowEditModal(false);   setSelectedReservation(null); };
  const handleCloseCreateModal = () => { setShowCreateModal(false); setSelectedReservationDate(null); setModalMode('full'); };

  const VIEW_TABS = [
    { key: 'calendar',          label: 'Calendar',        icon: <FiCalendar className="w-4 h-4" /> },
    { key: 'reservation-table', label: 'Table/List',      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      )
    },
    { key: 'list',              label: 'List',            icon: <FiList className="w-4 h-4" /> },
  ];

  // Get responsive view tabs
  const getViewTabs = () => {
    if (isMobile) {
      return VIEW_TABS.map(({ key, label, icon }) => ({
        key,
        label: key === 'calendar' ? '' : key === 'reservation-table' ? '' : '',
        icon
      }));
    }
    return VIEW_TABS;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ height: "100vh", maxHeight: "100%" }}>
      {/* Header - Clean & Modern */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        
        {/* Top Row: Restaurant Name + Actions */}
        <div className="flex items-center justify-between px-4 md:px-6 py-2.5">
          {/* Left: Restaurant Name */}
          <div className="flex items-center gap-3 min-w-0">
            {restaurants.length > 0 && !isStaff && (
              <div className="relative">
                <select
                  value={selectedRestaurant?.id || ''}
                  onChange={(e) => { const r = restaurants.find(r => r.id === e.target.value); setSelectedRestaurant(r); }}
                  className="appearance-none bg-transparent border-0 focus:ring-0 text-base md:text-lg font-bold text-gray-900 pr-6 cursor-pointer hover:text-[#fe8a24] transition-colors"
                >
                  {restaurants.map(r => (
                    <option key={r.id} value={r.id} className="font-normal">
                      {r.name}
                    </option>
                  ))}
                </select>
                <FiChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            )}
            {restaurants.length === 1 && !isStaff && (
              <span className="text-base md:text-lg font-bold text-gray-900 truncate">
                {selectedRestaurant?.name}
              </span>
            )}
            {selectedRestaurant?.address && !isMobile && (
              <span className="text-sm text-gray-400 truncate hidden lg:inline">
                • {selectedRestaurant.address}
              </span>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Walk-in */}
            <button 
              onClick={handleWalkIn}
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all text-xs md:text-sm"
            >
              <span className="text-base">🚶</span>
              {!isMobile && 'Walk-in'}
            </button>

            {/* Quick Book */}
            <button 
              onClick={() => { setModalMode('quickbook'); setSelectedReservationDate(null); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all text-xs md:text-sm shadow-sm"
            >
              <FiPlus className="w-4 h-4" /> 
              {isMobile ? 'Quick' : 'Quick Book'}
            </button>

            {/* Create Booking - Desktop only */}
            {!isMobile && (
              <button 
                onClick={() => { setModalMode('full'); setSelectedReservationDate(null); setShowCreateModal(true); }}
                className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all text-xs md:text-sm"
              >
                <FiPlus className="w-4 h-4" /> Create
              </button>
            )}

            {/* Settings */}
            {(!isStaff || staffRole === 'admin' || staffRole === 'manager') && (
              <button 
                onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 md:px-3 py-1.5 md:py-2 rounded-lg font-medium transition-all text-xs md:text-sm"
              >
                <FiSettings className="w-4 h-4" /> 
                {isMobile ? '' : 'Settings'}
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: View Tabs + Stats */}
        <div className="flex items-center justify-between px-4 md:px-6 pb-2.5 pt-1 border-t border-gray-100">
          {/* View Tabs */}
          <div className="flex items-center gap-1">
            {getViewTabs().map(({ key, label, icon }) => (
              <button 
                key={key} 
                onClick={() => setViewMode(key)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-medium transition-all text-xs md:text-sm ${
                  viewMode === key 
                    ? 'bg-[#fe8a24] text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {icon} 
                {!isMobile && label}
                {isMobile && key === 'calendar' && '📅'}
                {isMobile && key === 'reservation-table' && '📋'}
                {isMobile && key === 'list' && '📄'}
              </button>
            ))}
          </div>

          {/* Stats */}
          {!isMobile && (
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="font-medium">
                <span className="text-gray-900 font-bold">
                  {reservations.filter(r => {
                    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
                    const today = new Date();
                    return rd.toDateString() === today.toDateString() && r.status !== 'cancelled';
                  }).length}
                </span> today
              </span>
              <span className="font-medium">
                <span className="text-gray-900 font-bold">
                  {reservations.filter(r => r.status === 'pending').length}
                </span> pending
              </span>
              <span className="font-medium text-green-600">
                <span className="text-green-700 font-bold">
                  {reservations.filter(r => r.status === 'confirmed').length}
                </span> confirmed
              </span>
            </div>
          )}

          {/* Mobile Stats - simplified */}
          {isMobile && (
            <div className="flex items-center gap-3 text-[10px] text-gray-500">
              <span className="font-medium">
                <span className="text-gray-900 font-bold">
                  {reservations.filter(r => {
                    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
                    const today = new Date();
                    return rd.toDateString() === today.toDateString() && r.status !== 'cancelled';
                  }).length}
                </span>
              </span>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-amber-600">
                {reservations.filter(r => r.status === 'pending').length}
              </span>
              <span className="text-gray-300">|</span>
              <span className="font-medium text-green-600">
                {reservations.filter(r => r.status === 'confirmed').length}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm sm:text-base text-gray-600">Loading reservations...</p>
            </div>
          </div>
        ) : viewMode === 'calendar' ? (
          <CalendarView
            reservations={reservations}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onReservationClick={handleReservationClick}
            onCreateReservation={handleCreateReservationFromSlot}
            selectedRestaurant={selectedRestaurant}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        ) : viewMode === 'reservation-table' ? (
          <ReservationTableView
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
            reservations={reservations}
            selectedDate={selectedDate}
            startDate={startDate}
            endDate={endDate}
            onDateChange={setSelectedDate}
            onStartDateChange={setStartDate}
            onEndDateChange={(date) => { if (date >= startDate) setEndDate(date); }}
            onReservationClick={handleReservationClick}
          />
        )}
      </div>

      {/* Modals */}
      {showEditModal && selectedReservation && (
        <ReservationModal reservation={selectedReservation} onClose={handleCloseEditModal} />
      )}
      {showCreateModal && (
        <CreateReservationModal
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
        <ReservationSettings selectedRestaurant={selectedRestaurant} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
};

export default ReservationSoftware;