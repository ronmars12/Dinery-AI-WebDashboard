// src/components/reservation-software/ReservationSoftware.jsx
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import CalendarView from './CalendarView';
import ListView from './ListView';
import ReservationModal from './ReservationModal';
import CreateReservationModal from './CreateReservationModal';
import ReservationTableView from './ReservationTableView';
import { FiPlus, FiCalendar, FiList, FiSettings } from 'react-icons/fi';
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

  return (
    <div className="h-full flex flex-col bg-gray-50" style={{ height: "100vh", maxHeight: "100%" }}>
      <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-6 shadow-sm flex-shrink-0">
        <div className="flex items-start justify-between mb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reservation Software</h1>
            <p className="text-gray-600 mt-1">Manage your restaurant reservations</p>
          </div>

          <div className="flex items-end gap-4">
          {restaurants.length > 0 && !isStaff && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Restaurant</label>
                <select
                  value={selectedRestaurant?.id || ''}
                  onChange={(e) => { const r = restaurants.find(r => r.id === e.target.value); setSelectedRestaurant(r); }}
                  className="px-4 py-2.5 border-2 border-orange-200 rounded-lg focus:outline-none focus:border-[#fe8a24] transition-colors min-w-[300px] h-[46px]"
                >
                  {restaurants.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select>
              </div>
            )}

            <button onClick={handleWalkIn}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all h-[46px] whitespace-nowrap">
              Walk-in
            </button>
            <button onClick={() => { setModalMode('quickbook'); setSelectedReservationDate(null); setShowCreateModal(true); }}
              className="flex items-center gap-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-6 py-3 rounded-lg font-semibold shadow-md transition-all h-[46px] whitespace-nowrap">
              <FiPlus className="w-5 h-5" /> Quick Book
            </button>
            <button onClick={() => { setModalMode('full'); setSelectedReservationDate(null); setShowCreateModal(true); }}
              className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg font-semibold shadow-md transition-all h-[46px] whitespace-nowrap">
              <FiPlus className="w-5 h-5" /> Create Booking
            </button>
           {(!isStaff || staffRole === 'admin' || staffRole === 'manager') && (
              <button onClick={() => setShowSettings(true)}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-all h-[46px] whitespace-nowrap">
                <FiSettings className="w-5 h-5" /> Settings
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {VIEW_TABS.map(({ key, label, icon }) => (
            <button key={key} onClick={() => setViewMode(key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                viewMode === key ? 'bg-[#fe8a24] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading reservations...</p>
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