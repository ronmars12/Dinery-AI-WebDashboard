// src/components/reservation-software/CalendarView.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, collection, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { FiX, FiChevronLeft, FiChevronRight, FiCalendar, FiPlus, FiUsers, FiTrash2, FiClock, FiMapPin, FiMoreVertical } from 'react-icons/fi';
import { firestore, auth } from '../../firebase';

const SLOT_HEIGHT = 60;
const TIME_COL_WIDTH = 70;
const MIN_DURATION = 15;
const TABLE_COL_WIDTH = 140;
const TABLE_ROW_HEIGHT = 44;
const HOUR_WIDTH = 220; 
const TABLE_CELL_WIDTH = HOUR_WIDTH / 4; 

// Enhanced color scheme
const COLORS = {
  primary: '#fe8a24',
  primaryDark: '#e57a1a',
  primaryLight: '#fff3e8',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  purple: '#8b5cf6',
  gray: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e5e5e5',
    300: '#d4d4d4',
    400: '#a3a3a3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  }
};

const CalendarView = ({
  reservations, selectedDate, onDateChange, onReservationClick,
  onCreateReservation, selectedRestaurant, startDate, endDate,
  onStartDateChange, onEndDateChange,
}) => {
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewRange, setViewRange] = useState('day');
  const [localReservations, setLocalReservations] = useState(reservations);
  const [dragging, setDragging] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [tables, setTables] = useState([]);
  const scrollRef = useRef(null);
  const db = firestore;
  const [settings, setSettings] = useState({ timeBarShowsStartOfHour: true });
  const [contextMenu, setContextMenu] = useState(null);
  const [combinations, setCombinations] = useState([]);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  
  useEffect(() => { setLocalReservations(reservations); }, [reservations]);
  useEffect(() => { onDateChange(currentDate); }, [viewRange]);

  // Fetch tables from restaurant subcollection
  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const collectionName = selectedRestaurant?._collection || 'restaurants';
    const unsub = onSnapshot(
      collection(db, collectionName, selectedRestaurant.id, 'tables'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.name > b.name ? 1 : -1));
        setTables(data);
      }
    );
    return () => unsub();
  }, [selectedRestaurant]);

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const collectionName = selectedRestaurant?._collection || 'restaurants';
    const unsub = onSnapshot(
      collection(db, collectionName, selectedRestaurant.id, 'combinations'),
      (snap) => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (a.name > b.name ? 1 : -1));
        setCombinations(data);
      }
    );
    return () => unsub();
  }, [selectedRestaurant]);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedRestaurant?.id) return;
      try {
        const collectionName = selectedRestaurant?._collection || 'restaurants';
        const docRef = doc(db, collectionName, selectedRestaurant.id, 'reservationSettings', 'config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const settingsData = docSnap.data();
          setSettings(settingsData);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [selectedRestaurant]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contextMenu && !e.target.closest('.meal-status-menu')) {
        setContextMenu(null);
      }
    };
    
    if (contextMenu) {
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [contextMenu]);

  const getRestaurantHours = () => {
    if (!selectedRestaurant?.customHours?.length) return { openHour: 8, closeHour: 23 };
    const ch = selectedRestaurant.customHours.find(h => h.openTime && h.closeTime)
      || selectedRestaurant.customHours[0];
    if (!ch?.openTime || !ch?.closeTime) return { openHour: 8, closeHour: 23 };
    const [openHour] = ch.openTime.split(':').map(Number);
    const [closeHour] = ch.closeTime.split(':').map(Number);
    const finalClose = closeHour <= openHour ? 24 : Math.min(closeHour, 24);
    return { openHour, closeHour: Math.min(finalClose, 24) };
  };

  const { openHour, closeHour } = getRestaurantHours();
  const totalHours = closeHour - openHour;
  const totalHeight = totalHours * SLOT_HEIGHT;
  const hours = Array.from({ length: totalHours }, (_, i) => openHour + i);

  const minutesFromOpen = (date, fromTime) => {
    if (fromTime && /^\d{2}:\d{2}$/.test(fromTime)) {
      const [h, m] = fromTime.split(':').map(Number);
      return (h - openHour) * 60 + m;
    }
    const d = date?.toDate?.() || new Date(date);
    return (d.getHours() - openHour) * 60 + d.getMinutes();
  };

  const getReservationStyles = (status, source) => {
    if (source === 'mobile_app') {
      return { 
        bg: 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)',
        border: '#9333ea',
        text: '#581c87',
        shadow: '0 2px 4px rgba(147, 51, 234, 0.1)'
      };
    }
    
    const map = {
      confirmed: { bg: 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)', border: '#10b981', text: '#065f46', shadow: '0 2px 4px rgba(16, 185, 129, 0.1)' },
      pending:   { bg: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', border: '#f59e0b', text: '#78350f', shadow: '0 2px 4px rgba(245, 158, 11, 0.1)' },
      cancelled: { bg: 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', border: '#ef4444', text: '#991b1b', shadow: '0 2px 4px rgba(239, 68, 68, 0.1)' },
      completed: { bg: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', border: '#3b82f6', text: '#1e40af', shadow: '0 2px 4px rgba(59, 130, 246, 0.1)' },
    };
    return map[status?.toLowerCase()] || map.pending;
  };

  const getMealStatusConfig = (mealStatus) => {
    const map = {
      'arrived':        { color: '#ef4444', label: 'Arrived', icon: '🔴', bg: '#fee2e2' },
      'food_delivered': { color: '#3b82f6', label: 'Food', icon: '🔵', bg: '#dbeafe' },
      'dessert':        { color: '#8b5cf6', label: 'Dessert', icon: '🟣', bg: '#f3e8ff' },
      'bill_delivered': { color: '#eab308', label: 'Bill', icon: '🟡', bg: '#fefce8' },
      'table_cleared':  { color: '#84cc16', label: 'Cleared', icon: '🟢', bg: '#ecfccb' },
      'no_show':        { color: '#000000', label: 'No Show', icon: '⚫', bg: '#f5f5f5' },
      'clear_out':      { color: '#6b7280', label: 'Clear Out', icon: '⚪', bg: '#f3f4f6' },
    };
    return map[mealStatus?.toLowerCase()] || null;
  };

  const MealStatusMenu = ({ position, reservation, onClose }) => {
    const menuItems = [
      { status: 'arrived', color: '#ef4444', icon: '🔴', label: 'Arrived' },
      { status: 'food_delivered', color: '#3b82f6', icon: '🔵', label: 'Food delivered' },
      { status: 'dessert', color: '#8b5cf6', icon: '🟣', label: 'Dessert' },
      { status: 'bill_delivered', color: '#eab308', icon: '🟡', label: 'Bill delivered' },
      { status: 'table_cleared', color: '#84cc16', icon: '🟢', label: 'Table cleared' },
      { status: 'no_show', color: '#000000', icon: '⚫', label: 'No show' },
      { status: null, color: '#6b7280', icon: '⚪', label: 'Clear out' },
    ];

    const handleSelect = async (status) => {
      try {
        await updateDoc(doc(db, 'reservations', reservation.id), {
          meal_status: status,
          updated_at: new Date(),
        });
        onClose();
      } catch (err) {
        console.error('Failed to update meal status:', err);
      }
    };

    return (
      <>
        <div 
          className="fixed inset-0 z-40" 
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          onContextMenu={(e) => { e.preventDefault(); onClose(); }}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <div
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 min-w-[220px] meal-status-menu animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(position.x, window.innerWidth - 240)}px`,
            top: position.y + 320 > window.innerHeight
              ? `${Math.max(0, position.y - 320)}px`
              : `${position.y}px`,
            maxHeight: '320px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="px-4 py-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meal Status</p>
            <p className="text-sm font-semibold text-gray-900 truncate mt-0.5">{reservation.customer_name}</p>
          </div>
          
          {menuItems.map(({ status, color, icon, label }) => {
            const isActive = reservation.meal_status === status;
            return (
              <button
                key={status || 'clear'}
                onClick={() => handleSelect(status)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all duration-150 ${
                  isActive ? 'bg-gray-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-base w-6">{icon}</span>
                <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                  {label}
                </span>
                {isActive && (
                  <span className="ml-auto text-xs font-bold" style={{ color }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </>
    );
  };

  const getDaysToDisplay = () => {
    if (viewRange === 'day') return [currentDate];
    if (viewRange === 'week') {
      const ws = new Date(currentDate);
      ws.setDate(ws.getDate() - ws.getDay());
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(d.getDate() + i); return d; });
    }
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    for (let i = firstDay.getDay() - 1; i >= 0; i--) { const d = new Date(firstDay); d.setDate(d.getDate() - (i+1)); days.push(d); }
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i));
    for (let i = 1; i < 7 - lastDay.getDay(); i++) { const d = new Date(lastDay); d.setDate(d.getDate() + i); days.push(d); }
    return days;
  };

  const getReservationsForDay = (day) => {
    const dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);
    
    return localReservations.filter(r => {
      const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      const resTime = resDate.getTime();
      return resTime >= dayStart.getTime() && resTime <= dayEnd.getTime();
    });
  };

  const isToday = (d) => new Date().toDateString() === d.toDateString();
  const isCurrentMonth = (d) => d.getMonth() === currentDate.getMonth();

  const navigateDate = (dir) => {
    const d = new Date(currentDate);
    if (viewRange === 'day') d.setDate(d.getDate() + dir);
    else if (viewRange === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d); onDateChange(d);
  };

  const formatDateForInput = (d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
  };

  const getDateRangeText = () => {
    if (viewRange === 'day') return currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (viewRange === 'week') {
      const ws = new Date(currentDate); ws.setDate(ws.getDate() - ws.getDay());
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      return `${ws.toLocaleDateString('en-US',{month:'short',day:'numeric'})} - ${we.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}`;
    }
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const DRAG_THRESHOLD = 4;
  const dragRef = useRef(null);
  const [dragTargetDay, setDragTargetDay] = useState(null);

  const totalTableSlots = (closeHour - openHour) * 4;

  const handleMouseDownMove = (e, reservation) => {
    e.preventDefault(); e.stopPropagation();
    if (e.detail === 2) return;
    
    const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
    const origStart = minutesFromOpen(resDate);
    const duration = reservation.duration_minutes || 75;
    const info = { id: reservation.id, type: 'move', startY: e.clientY, origStart, origDuration: duration, reservation, hasMoved: false };
    dragRef.current = info;
    setDragging(info);
  };

  const handleMouseDownResize = (e, reservation) => {
    e.preventDefault(); e.stopPropagation();
    const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
    const origStart = minutesFromOpen(resDate);
    const duration = reservation.duration_minutes || 75;
    const info = { id: reservation.id, type: 'resize', startY: e.clientY, origStart, origDuration: duration, reservation, hasMoved: false };
    dragRef.current = info;
    setDragging(info);
  };

  const handleMouseMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;

    if (d.type === 'table-move' || d.type === 'table-resize') {
      const dx = e.clientX - d.startX;
      
      if (!d.hasMoved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!d.hasMoved) {
        dragRef.current = { ...d, hasMoved: true };
        setDragging(prev => prev ? { ...prev, hasMoved: true } : prev);
        setDragState({ id: d.id, startMinutes: d.origStart, duration: d.origDuration, tableId: d.tableId });
      }

      if (d.type === 'table-resize') {
        const deltaSlots = Math.round(dx / TABLE_CELL_WIDTH);
        const minSlots = Math.ceil(MIN_DURATION / 15);
        const newDurSlots = Math.max(minSlots, Math.round(d.origDuration / 15) + deltaSlots);
        const maxSlots = totalTableSlots - d.origSlot;
        const clampedSlots = Math.min(newDurSlots, maxSlots);
        setDragState({ id: d.id, startMinutes: d.origStart, duration: clampedSlots * 15, tableId: d.tableId });
        return;
      }

      const rows = document.querySelectorAll('[data-table-row]');
      let hoveredTableId = d.tableId;
      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        if (e.clientY >= rect.top && e.clientY <= rect.bottom)
          hoveredTableId = row.getAttribute('data-table-row');
      });
      dragRef._tableId = hoveredTableId;

      const deltaSlots = Math.round(dx / TABLE_CELL_WIDTH);
      const origSlot = Math.round(d.origStart / 15);
      const durSlots = Math.round(d.origDuration / 15);
      const maxSlot = totalTableSlots - durSlots;
      const newSlot = Math.max(0, Math.min(origSlot + deltaSlots, maxSlot));

      setDragState({ id: d.id, startMinutes: newSlot * 15, duration: d.origDuration, tableId: hoveredTableId });
      return;
    }

    const dy = e.clientY - d.startY;
    if (!d.hasMoved && Math.abs(dy) < DRAG_THRESHOLD) return;
    if (!d.hasMoved) {
      dragRef.current = { ...d, hasMoved: true };
      setDragging(prev => prev ? { ...prev, hasMoved: true } : prev);
      setDragState({ id: d.id, startMinutes: d.origStart, duration: d.origDuration });
    }
    const rawMinutes = (dy / SLOT_HEIGHT) * 60;
    const deltaMinutes = Math.round(rawMinutes / 5) * 5;
    const totalMinutes = totalHours * 60;

    if (d.type === 'move') {
      const cols = document.querySelectorAll('[data-day-col]');
      let hoveredDay = null;
      cols.forEach(col => {
        const rect = col.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right)
          hoveredDay = col.getAttribute('data-day-col');
      });
      if (hoveredDay) setDragTargetDay(hoveredDay);
      
      const rawNewStart = d.origStart + deltaMinutes;
      const snappedStart = Math.round(rawNewStart / 15) * 15;
      const newStart = Math.max(0, Math.min(snappedStart, totalMinutes - d.origDuration));
      
      setDragState({ id: d.id, startMinutes: newStart, duration: d.origDuration });
    } else {
      const newDuration = Math.max(MIN_DURATION, d.origDuration + deltaMinutes);
      setDragState({ id: d.id, startMinutes: d.origStart, duration: newDuration });
    }
  }, [totalHours, totalTableSlots]);

  const handleMouseUp = useCallback(async () => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (!d.hasMoved) {
      onReservationClick(d.reservation);
      setDragging(null); setDragState(null); setDragTargetDay(null);
      return;
    }
    if (d.type === 'table-move' || d.type === 'table-resize') {
      setDragState(prev => {
        if (!prev) { setDragging(null); return null; }
        const reservation = d.reservation;
        const origDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
        const newDate = new Date(origDate);
        const snapDuration = Math.round(prev.duration / 5) * 5;
        if (d.type === 'table-resize') {
          setLocalReservations(rs => rs.map(r =>
            r.id === reservation.id ? { ...r, duration_minutes: snapDuration } : r
          ));
          updateDoc(doc(db, 'reservations', reservation.id), {
            duration_minutes: snapDuration,
            updated_at: new Date(),
          }).catch(err => { console.error(err); setLocalReservations(reservations); });
        } else {
          const totalMins = openHour * 60 + prev.startMinutes;
          const newHour = Math.floor(totalMins / 60) % 24;
          const newMin = totalMins % 60;
          newDate.setHours(newHour, newMin, 0, 0);
          const newFromTime = `${String(newHour).padStart(2,'0')}:${String(newMin).padStart(2,'0')}`;
          const newTableId = dragRef._tableId || prev.tableId;
          const isUnassigned = newTableId === '__unassigned__';
          const movedTable = tables.find(t => t.id === newTableId);
          const isCombo = newTableId?.startsWith('combo__');
          const realComboId = isCombo ? newTableId.replace('combo__', '') : null;
          const movedCombo = isCombo ? combinations.find(c => c.id === realComboId) : null;

          const wasMultiTable = d.isMultiTable && d.originalTableIds?.length > 1;

          const tableUpdate = wasMultiTable
            ? {
                table_id: reservation.table_id,
                table_name: reservation.table_name,
                table_ids: reservation.table_ids,
                table_names: reservation.table_names,
                combination_id: reservation.combination_id || null,
                combination_name: reservation.combination_name || null,
              }
            : isUnassigned
            ? { table_id: null, table_name: '', table_ids: [], table_names: [], combination_id: null, combination_name: null }
            : isCombo
            ? {
                table_id: null,
                table_name: null,
                table_ids: movedCombo?.tableIds || [],
                table_names: movedCombo?.tableNames || [],
                combination_id: realComboId,
                combination_name: movedCombo?.name || '',
              }
            : {
                table_id: newTableId,
                table_name: movedTable?.name || '',
                table_ids: [newTableId],
                table_names: [movedTable?.name || ''],
                combination_id: null,
                combination_name: null,
              };

            setLocalReservations(rs => rs.map(r =>
              r.id === reservation.id
                ? {
                    ...r,
                    reservation_date: newDate,
                    from_time: newFromTime,
                    duration_minutes: snapDuration,
                    ...tableUpdate,
                  }
                : r
            ));

          updateDoc(doc(db, 'reservations', reservation.id), {
            reservation_date: newDate,
            from_time: newFromTime,
            duration_minutes: snapDuration,
            ...tableUpdate,
            updated_at: serverTimestamp(),
          }).catch(err => {
            console.error(err);
            setLocalReservations(reservations);
          });
        }
        setDragging(null);
        return null;
      });
      return;
    }

    setDragState(prev => {
      if (!prev) { setDragging(null); setDragTargetDay(null); return null; }
      const reservation = d.reservation;
      const origDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
      let targetDate = new Date(origDate);
      const currentTargetDay = dragRef._targetDay;
      if (d.type === 'move' && currentTargetDay) {
        const parsed = new Date(currentTargetDay);
        if (!isNaN(parsed)) targetDate = new Date(parsed);
      }
      const snapMinutes = Math.round(prev.startMinutes / 5) * 5;
      targetDate.setHours(openHour + Math.floor(snapMinutes / 60), snapMinutes % 60, 0, 0);
      const snapDuration = Math.round(prev.duration / 5) * 5;
      setLocalReservations(rs => rs.map(r =>
        r.id === reservation.id ? { ...r, reservation_date: targetDate, from_time: savedFromTime, duration_minutes: snapDuration } : r
      ));
      const fromH = targetDate.getHours();
      const fromM = targetDate.getMinutes();
      const savedFromTime = `${String(fromH).padStart(2,'0')}:${String(fromM).padStart(2,'0')}`;
      updateDoc(doc(db, 'reservations', reservation.id), {
        reservation_date: targetDate,
        from_time: savedFromTime,
        duration_minutes: snapDuration,
        updated_at: new Date(),
      }).catch(err => { console.error('Failed to update:', err); setLocalReservations(reservations); });
      setDragging(null);
      setDragTargetDay(null);
      return null;
    });
  }, [openHour, db, reservations, onReservationClick, tables, combinations]);

  useEffect(() => { dragRef._targetDay = dragTargetDay; }, [dragTargetDay]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  const tableTimeSlots = (() => {
    const slots = [];
    for (let h = openHour; h < closeHour; h++)
      for (let m = 0; m < 60; m += 15)
        slots.push({ hour: h, minute: m });
    return slots;
  })();

  const minutesToSlot = (date, fromTime) => {
    if (fromTime && /^\d{2}:\d{2}$/.test(fromTime)) {
      const [h, m] = fromTime.split(':').map(Number);
      return ((h - openHour) * 60 + m) / 15;
    }
    const d = date?.toDate?.() || new Date(date);
    return ((d.getHours() - openHour) * 60 + d.getMinutes()) / 15;
  };

  const renderDayTableView = () => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);
    
    const dayRes = localReservations.filter(r => {
      const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      const resTime = resDate.getTime();
      return resTime >= dayStart.getTime() && resTime <= dayEnd.getTime();
    });

    const resByTable = {};

    dayRes.forEach(r => {
      const addToKey = (key) => {
        if (!key) return;
        if (!resByTable[key]) resByTable[key] = [];
        if (!resByTable[key].some(x => x.id === r.id)) {
          resByTable[key].push(r);
        }
      };

      if (Array.isArray(r.table_ids) && r.table_ids.length > 0) {
        r.table_ids.forEach(tid => addToKey(tid));
      } else if (r.table_id) {
        addToKey(r.table_id);
      } else {
        addToKey('__unassigned__');
      }
    });

    const unassigned = resByTable['__unassigned__'] || [];

    const nowSlot = isToday(currentDate)
      ? (() => { const n = new Date(); return ((n.getHours() - openHour) * 60 + n.getMinutes()) / 15; })()
      : -1;

    const renderResBar = (r, tableId) => {
      const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      const isActive = dragState?.id === r.id;
      const slot = isActive ? dragState.startMinutes / 15 : minutesToSlot(resDate, r.from_time);
      const durSlots = isActive
        ? dragState.duration / 15
        : Math.max(1, Math.round((r.duration_minutes || 75) / 15));
      if (isActive && dragState.tableId !== null && dragState.tableId !== tableId) {
        if (dragState.tableId === tableId) return null;
        return null;
      }
      const styles = getReservationStyles(r.status, r.source); 
      const left = slot * TABLE_CELL_WIDTH;
      const width = durSlots * TABLE_CELL_WIDTH - 2;

      const isMultiTable = Array.isArray(r.table_ids) && r.table_ids.length > 1;
      const allTableNames = r.table_names?.join(', ') || r.table_name || '';
      const mealConfig = r.meal_status ? getMealStatusConfig(r.meal_status) : null;

      return (
        <div
          key={r.id}
          onMouseDown={(e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            e.stopPropagation();
            const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
            const origSlot = minutesToSlot(resDate, r.from_time);
            const origDuration = r.duration_minutes || 75;
            const dragTableId = isMultiTable ? null : tableId;
            const info = {
              id: r.id, type: 'table-move',
              startX: e.clientX,
              origSlot, origStart: origSlot * 15, origDuration,
              tableId: dragTableId, reservation: r, hasMoved: false,
              isMultiTable, originalTableIds: r.table_ids,
              startClientX: e.clientX,
            };
            dragRef.current = info;
            setDragging(info);
          }}
          onMouseUp={(e) => {
            if (dragRef.current && !dragRef.current.hasMoved) {
              dragRef.current = null;
              setDragging(null);
              setDragState(null);
              onReservationClick(r);
            }
          }}
          onMouseEnter={() => setHoveredReservation(r.id)}
          onMouseLeave={() => setHoveredReservation(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            if (dragRef._checkTimeout) {
              clearTimeout(dragRef._checkTimeout);
              dragRef._checkTimeout = null;
            }
            dragRef.current = null;
            setDragging(null);
            setDragState(null);
            setContextMenu({ position: { x: e.clientX, y: e.clientY }, reservation: r });
          }}
          className="absolute top-1 rounded-lg overflow-hidden select-none group/res"
          style={{
            left: left + 1, width: Math.max(width, 32),
            height: TABLE_ROW_HEIGHT - 8,
            background: styles.bg,
            border: `1px solid ${styles.border}`,
            borderLeft: `3px solid ${styles.border}`,
            cursor: dragging?.id === r.id ? (dragging.type === 'table-resize' ? 'ew-resize' : 'grabbing') : 'grab',
            zIndex: isActive ? 30 : (hoveredReservation === r.id ? 25 : 10),
            boxShadow: isActive ? `0 4px 16px rgba(0,0,0,0.15)` : (hoveredReservation === r.id ? `0 2px 8px rgba(0,0,0,0.1)` : '0 1px 2px rgba(0,0,0,0.05)'),
          }}
        >
          {isMultiTable && (
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-center gap-1"
              style={{
                height: 4,
                background: `repeating-linear-gradient(90deg, ${styles.border} 0px, ${styles.border} 6px, transparent 6px, transparent 12px)`,
                opacity: 0.4,
              }}
            />
          )}
          <div className="px-2 h-full flex items-center gap-2 overflow-hidden pr-6" style={{ paddingTop: isMultiTable ? 4 : 0 }}>
            {mealConfig && (
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0 animate-pulse"
                style={{ backgroundColor: mealConfig.color }}
                title={mealConfig.label}
              />
            )}
            {r.source === 'mobile_app' && (
              <span className="text-xs flex-shrink-0" title="Mobile App Reservation">📱</span>
            )}
            {(r.change_request || r.cancel_reason) && (
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full animate-pulse"
                style={{
                  width: 16, height: 16,
                  backgroundColor: r.cancel_reason ? COLORS.purple : COLORS.info,
                  fontSize: 9, color: 'white', fontWeight: 'bold',
                }}
                title={r.cancel_reason ? `Cancel request: ${r.cancel_reason}` : `Change request: ${r.change_request}`}
              >
                {r.cancel_reason ? '✕' : '!'}
              </span>
            )}
            {isMultiTable && (
              <span
                className="flex-shrink-0 flex items-center gap-0.5 px-1.5 rounded-full font-bold text-white text-[10px]"
                style={{ backgroundColor: styles.border }}
                title={`Group table: ${allTableNames}`}
              >
                ⛓ {r.table_ids.length}
              </span>
            )}
            <span className="text-xs font-mono font-semibold whitespace-nowrap" style={{ color: styles.text }}>
              {r.from_time || `${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`}
            </span>
            {width > 60 && (
              <span className="text-xs font-medium truncate" style={{ color: styles.text }}>
                {r.customer_name?.split(' ').slice(-1)[0] || 'Guest'} ({r.number_of_guests})
              </span>
            )}
            {width > 120 && isMultiTable && (
              <span
                className="text-[10px] truncate font-semibold flex-shrink-0"
                style={{ color: styles.border, opacity: 0.8 }}
              >
                [{allTableNames}]
              </span>
            )}
            {isActive && width > 60 && (
              <span className="text-[9px] ml-auto whitespace-nowrap font-mono font-semibold" style={{ color: styles.text, opacity: 0.6 }}>
                {Math.round((isActive ? dragState.duration : r.duration_minutes || 75))}m
              </span>
            )}
          </div>
          <div
            className="absolute top-0 right-0 bottom-0 w-4 flex items-center justify-center cursor-ew-resize opacity-0 group-hover/res:opacity-100 transition-opacity"
            onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              const origSlot = minutesToSlot(resDate);
              const origDuration = r.duration_minutes || 75;
              const info = {
                id: r.id, type: 'table-resize',
                startX: e.clientX,
                origSlot, origStart: origSlot * 15, origDuration,
                tableId, reservation: r, hasMoved: false,
              };
              dragRef.current = info;
              setDragging(info);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center gap-0.5">
              <div className="w-1 h-4 rounded-full bg-gray-400" />
              <div className="w-1 h-4 rounded-full bg-gray-400" />
            </div>
          </div>
        </div>
      );
    };

    const renderRow = (table, isUnassigned = false) => {
      if (!isUnassigned && !table) return null;
      const tableId = isUnassigned ? '__unassigned__' : table.id;
      const tableRes = resByTable[tableId] || [];
      const draggedToThisRow = dragging?.hasMoved && 
        dragState?.tableId === tableId && 
        dragState?.id && 
        !tableRes.some(r => r.id === dragState.id);
      const activelyDraggedRes = draggedToThisRow 
        ? localReservations.find(r => r.id === dragState.id) 
        : null;
      const allTableRes = activelyDraggedRes ? [...tableRes, activelyDraggedRes] : tableRes;
      const isDragTarget = dragging?.hasMoved && dragState?.tableId === tableId;

      return (
        <div key={tableId} data-table-row={tableId}
          className="flex border-b border-gray-200 group hover:bg-gray-50/30 transition-colors"
          style={{ height: TABLE_ROW_HEIGHT }}>
          <div
            className={`flex-shrink-0 flex items-center justify-between px-3 border-r-2 transition-all duration-150 ${
              isUnassigned ? 'bg-gradient-to-r from-orange-50 to-orange-50/30 border-orange-200' : 'bg-gray-50/50 group-hover:bg-gray-100/80 border-gray-200'
            }`}
            style={{ width: TABLE_COL_WIDTH }}
          >
            {isUnassigned ? (
              <div className="flex items-center gap-2">
                <FiMapPin className="w-3 h-3 text-orange-400" />
                <span className="text-xs font-medium text-orange-600 italic">Unassigned</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">{table.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-bold text-gray-800 truncate block">{table.name}</span>
                </div>
                <span className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0">
                  <FiUsers className="w-2.5 h-2.5" />{table.maxCapacity}
                </span>
              </div>
            )}
          </div>

          <div 
            className={`relative overflow-hidden transition-all duration-150 ${isDragTarget ? 'bg-blue-50/20' : ''}`}
            style={{ width: (closeHour - openHour) * HOUR_WIDTH }}
          >
            {/* Vertical hour grid lines */}
            {Array.from({ length: closeHour - openHour }, (_, i) => (
              <div key={i} className="absolute top-0 bottom-0 border-l border-gray-300" style={{ left: i * HOUR_WIDTH }} />
            ))}
            {/* Vertical quarter-hour grid lines */}
            {Array.from({ length: (closeHour - openHour) * 4 }, (_, i) => (
              <div key={`slot-${i}`} className="absolute top-0 bottom-0 border-l border-gray-200" style={{ left: i * TABLE_CELL_WIDTH }} />
            ))}
            {/* Vertical half-hour markers */}
            {Array.from({ length: (closeHour - openHour) * 2 }, (_, i) => (
              <div key={`half-${i}`} className="absolute top-0 bottom-0 border-l border-dashed border-gray-300" style={{ left: (i * 2) * (TABLE_CELL_WIDTH / 2) + TABLE_CELL_WIDTH }} />
            ))}
            
            <div className="absolute inset-0 cursor-crosshair z-0 hover:bg-gradient-to-r hover:from-transparent hover:to-primary/5 transition-colors"
              onClick={(e) => {
                if (dragging) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const slot = Math.floor((e.clientX - rect.left) / TABLE_CELL_WIDTH);
                const totalMins = openHour * 60 + slot * 15;
                const d = new Date(currentDate);
                d.setHours(Math.floor(totalMins / 60), totalMins % 60, 0, 0);
                onCreateReservation && onCreateReservation(d);
              }} />
            {allTableRes.map(r => renderResBar(r, tableId))}
          </div>
        </div>
      );
    };

    return (
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <div style={{ width: '100%' }}>
            {/* Sticky header with enhanced design */}
            <div className="flex sticky top-0 z-20 bg-white border-b-2 border-gray-200 shadow-sm" style={{ height: 48 }}>
              <div className="flex-shrink-0 bg-gradient-to-r from-gray-800 to-gray-900 flex items-center justify-center border-r-2 border-gray-700"
                style={{ width: TABLE_COL_WIDTH }}>
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-200 uppercase tracking-wider">Table</div>
                  <div className="flex items-center gap-1 justify-center text-gray-400 text-[10px] mt-0.5">
                    <FiUsers className="w-2.5 h-2.5" /> Capacity
                  </div>
                </div>
              </div>
              <div className="flex relative" style={{ minWidth: (closeHour - openHour) * HOUR_WIDTH }}>
                {Array.from({ length: closeHour - openHour }, (_, hourIndex) => {
                  const hour = openHour + hourIndex;
                  return (
                    <div key={hourIndex} className="relative border-r border-gray-200"
                      style={{ width: HOUR_WIDTH, flexShrink: 0 }}>
                      <div className={`absolute inset-0 flex ${settings?.timeBarShowsStartOfHour ? 'items-start' : 'items-end'} justify-start ${settings?.timeBarShowsStartOfHour ? 'pt-2' : 'pb-2'} pl-2 bg-gradient-to-r from-gray-50 to-transparent`}>
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-gray-700">
                            {String(hour).padStart(2,'0')}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">:00</span>
                        </div>
                      </div>
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-gray-400 font-medium">:30</div>
                      <div className="absolute top-0 bottom-0 left-1/4 border-l border-gray-200" />
                      <div className="absolute top-0 bottom-0 left-2/4 border-l border-gray-300" />
                      <div className="absolute top-0 bottom-0 left-3/4 border-l border-gray-200" />
                    </div>
                  );
                })}
                {nowSlot >= 0 && nowSlot <= totalTableSlots && (
                  <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: nowSlot * TABLE_CELL_WIDTH }}>
                    <div className="flex items-start">
                      <div className="w-2 h-2 bg-rose-500 rounded-full -ml-1 mt-0.5 shadow-lg" />
                      <div className="w-0.5 h-full bg-rose-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              {tables.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-center">
                  <div className="animate-fade-in">
                    <div className="text-5xl mb-4">🪑</div>
                    <p className="text-gray-600 font-semibold text-lg">No tables yet</p>
                    <p className="text-gray-400 text-sm mt-1">Add tables in Table Management first</p>
                  </div>
                </div>
              ) : (
                tables.map(t => renderRow(t))
              )}

              {/* Combinations section */}
              {combinations.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-purple-100/30 border-y border-purple-200">
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">⛓ Table Combinations</span>
                    <div className="flex-1 h-px bg-gradient-to-r from-purple-200 to-transparent" />
                  </div>
                  {combinations.map(combo => {
                    const comboKey = `combo__${combo.id}`;
                    const comboRes = resByTable[comboKey] || [];
                    const draggedToThisCombo = dragging?.hasMoved && 
                      dragState?.tableId === comboKey && 
                      dragState?.id && 
                      !comboRes.some(r => r.id === dragState.id);
                    const activelyDraggedToCombo = draggedToThisCombo 
                      ? localReservations.find(r => r.id === dragState.id) 
                      : null;
                    const allComboRes = activelyDraggedToCombo ? [...comboRes, activelyDraggedToCombo] : comboRes;
                    const isDragTarget = dragging?.hasMoved && dragState?.tableId === comboKey;
                    return (
                      <div key={comboKey} data-table-row={comboKey}
                        className="flex border-b border-purple-100 group hover:bg-purple-50/30 transition-colors"
                        style={{ height: TABLE_ROW_HEIGHT }}>
                        <div className="flex-shrink-0 flex items-center justify-between px-3 border-r-2 border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100/30 group-hover:from-purple-100 group-hover:to-purple-200/30 transition-all"
                          style={{ width: TABLE_COL_WIDTH }}>
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                              <span className="text-sm">⛓</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-bold text-purple-800 truncate block">{combo.name}</span>
                            </div>
                            {combo.capacity && (
                              <span className="flex items-center gap-1 bg-purple-200 text-purple-700 rounded-full px-1.5 py-0.5 text-[10px] font-semibold flex-shrink-0">
                                <FiUsers className="w-2.5 h-2.5" />{combo.capacity}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`relative overflow-hidden ${isDragTarget ? 'bg-purple-50/30' : ''}`}
                          style={{ width: (closeHour - openHour) * HOUR_WIDTH }}>
                          <div className="absolute inset-0 cursor-crosshair z-0 hover:bg-purple-50/10 transition-colors"
                            onClick={(e) => {
                              if (dragging) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const slot = Math.floor((e.clientX - rect.left) / TABLE_CELL_WIDTH);
                              const totalMins = openHour * 60 + slot * 15;
                              const d = new Date(currentDate);
                              d.setHours(Math.floor(totalMins / 60), totalMins % 60, 0, 0);
                              onCreateReservation && onCreateReservation(d);
                            }} />
                          {allComboRes.map(r => renderResBar(r, comboKey))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {unassigned.length > 0 && renderRow(null, true)}

              {nowSlot >= 0 && tables.length > 0 && (
                <div className="absolute top-0 bottom-0 z-20 pointer-events-none"
                  style={{ left: TABLE_COL_WIDTH + nowSlot * TABLE_CELL_WIDTH }}>
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-rose-500 rounded-full -ml-1 mt-1 shadow-lg ring-2 ring-rose-200" />
                    <div className="w-0.5 h-full bg-rose-500" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGrid = () => {
    const days = getDaysToDisplay();
    const isWeek = viewRange === 'week';

    return (
      <div className="flex-1 overflow-hidden flex flex-col bg-white">
        {isWeek && (
          <div className="flex flex-shrink-0 bg-white border-b-2 border-gray-200 shadow-sm" style={{ paddingLeft: TIME_COL_WIDTH }}>
            {days.map((day, i) => (
              <div key={i} className={`flex-1 py-4 text-center border-l border-gray-100 transition-all duration-200 ${
                isToday(day) ? 'bg-gradient-to-b from-amber-50 to-amber-100/30' : 'hover:bg-gray-50'
              }`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${
                  isToday(day) ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  {day.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-2xl font-bold mt-0.5 ${
                  isToday(day) ? 'text-amber-700' : 'text-gray-800'
                }`}>
                  {day.getDate()}
                </div>
                <div className="text-xs text-gray-400 mt-1 font-medium">
                  {getReservationsForDay(day).length} reservations
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="flex" style={{ height: totalHeight }}>
            <div className="flex-shrink-0 bg-gray-50 border-r-2 border-gray-200 sticky left-0 z-20 shadow-sm" style={{ width: TIME_COL_WIDTH }}>
              {hours.map((hour) => (
                <div key={hour} style={{ height: SLOT_HEIGHT }} className="border-b border-gray-200 flex items-start justify-end pr-3 pt-2">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-600">
                      {hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`}
                    </span>
                    <span className="text-[9px] text-gray-400 mt-0.5">:00</span>
                  </div>
                </div>
              ))}
            </div>

            {days.map((day, dayIdx) => {
              const dayRes = getReservationsForDay(day);
              const nowMin = isToday(day) ? minutesFromOpen(new Date()) : -1;
              const isDropTarget = dragging?.hasMoved && dragTargetDay === day.toDateString() && dragging.type === 'move';

              return (
                <div key={dayIdx} data-day-col={day.toDateString()}
                  className={`flex-1 relative border-l border-gray-200 min-w-0 transition-all duration-200 ${
                    isToday(day) && !isWeek ? 'bg-gradient-to-b from-amber-50/50 to-transparent' : 'bg-white'
                  } ${isDropTarget ? 'bg-blue-50/40 shadow-inner' : ''}`}>
                  {hours.map((hour, hourIdx) => {
                    const isEvenHour = hour % 2 === 0;
                    return (
                      <div key={hour} style={{ height: SLOT_HEIGHT }} className={`relative group border-b ${
                        isEvenHour ? 'border-gray-200' : 'border-gray-100'
                      }`}>
                        <div className="absolute top-0 bottom-0 left-0 w-px bg-gray-300" />
                        <div className="absolute top-0 bottom-0 left-1/4 w-px bg-gray-200" />
                        <div className="absolute top-0 bottom-0 left-2/4 w-px bg-gray-300" />
                        <div className="absolute top-0 bottom-0 left-3/4 w-px bg-gray-200" />
                        <div className="absolute w-full border-b border-dashed border-gray-200" style={{ top: SLOT_HEIGHT / 2 }} />
                        <div className="absolute left-0 right-0 top-1/4 bottom-0 border-t border-dashed border-gray-100" />
                        <div className="absolute left-0 right-0 top-3/4 bottom-0 border-t border-dashed border-gray-100" />
                        
                        <div
                          className="absolute inset-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent cursor-pointer transition-all duration-150 flex items-center justify-center opacity-0 hover:opacity-100 z-10"
                          onClick={() => { const d = new Date(day); d.setHours(hour, 0, 0, 0); onCreateReservation && onCreateReservation(d); }}>
                          <div className="flex items-center gap-1.5 bg-primary text-white text-xs px-3 py-1.5 rounded-full shadow-lg font-medium transform hover:scale-105 transition-transform">
                            <FiPlus className="w-3 h-3" />
                            <span>{`${String(hour).padStart(2,'0')}:00`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {nowMin >= 0 && nowMin < totalHours * 60 && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowMin / 60) * SLOT_HEIGHT }}>
                      <div className="flex items-center">
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50 -ml-1 flex-shrink-0 ring-2 ring-rose-200" />
                        <div className="flex-1 h-0.5 bg-gradient-to-r from-rose-500 to-rose-300" />
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 pointer-events-none">
                    {dayRes.map(r => {
                      const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
                      const isActive = dragState?.id === r.id;
                      const isDraggingToAnotherDay = isActive && dragging?.type === 'move' && dragTargetDay && dragTargetDay !== resDate.toDateString();
                      if (isDraggingToAnotherDay && day.toDateString() === resDate.toDateString()) return null;
                      const shouldShowInThisCol = isDraggingToAnotherDay ? day.toDateString() === dragTargetDay : true;
                      if (!shouldShowInThisCol) return null;
                      const startMin = isActive ? dragState.startMinutes : minutesFromOpen(resDate, r.from_time);
                      const duration = isActive ? dragState.duration : (r.duration_minutes || 75);
                      const top = (startMin / 60) * SLOT_HEIGHT;
                      const height = Math.max((duration / 60) * SLOT_HEIGHT, 32);
                      const styles = getReservationStyles(r.status, r.source);
                      const startMins = r.from_time ? (() => { const [h,m] = r.from_time.split(':').map(Number); return h*60+m; })() : resDate.getHours()*60+resDate.getMinutes();
                      const endTotalMins = startMins + duration;
                      const endTime = { getHours: () => Math.floor(endTotalMins/60)%24, getMinutes: () => endTotalMins%60 };
                      const mealConfig = r.meal_status ? getMealStatusConfig(r.meal_status) : null;

                      return (
                        <div key={r.id}
                          className={`absolute rounded-xl overflow-hidden pointer-events-auto ${
                            isActive ? 'z-30 shadow-2xl ring-2 ring-primary/50' : 'z-10 hover:shadow-xl hover:z-20'
                          }`}
                          style={{
                            top: top + 2, left: 4, right: 4, height: height - 4,
                            background: styles.bg,
                            borderLeft: `4px solid ${styles.border}`,
                            boxShadow: isActive ? `0 8px 24px rgba(0,0,0,0.15)` : (hoveredReservation === r.id ? `0 4px 12px rgba(0,0,0,0.1)` : `0 1px 3px rgba(0,0,0,0.08)`),
                            cursor: dragging?.id === r.id && dragging.type === 'move' ? 'grabbing' : 'grab',
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 2) return;
                            e.preventDefault();
                            e.stopPropagation();
                            handleMouseDownMove(e, r);
                          }}
                          onMouseEnter={() => setHoveredReservation(r.id)}
                          onMouseLeave={() => setHoveredReservation(null)}
                          onMouseUp={(e) => {
                            if (dragRef.current && !dragRef.current.hasMoved) {
                              dragRef.current = null;
                              setDragging(null);
                              setDragState(null);
                              onReservationClick(r);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            if (dragRef._checkTimeout) {
                              clearTimeout(dragRef._checkTimeout);
                              dragRef._checkTimeout = null;
                            }
                            dragRef.current = null;
                            setDragging(null);
                            setDragState(null);
                            setContextMenu({ position: { x: e.clientX, y: e.clientY }, reservation: r });
                          }}>
                          <div className="px-3 py-2 h-full flex flex-col justify-between overflow-hidden">
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {mealConfig && (
                                    <div 
                                      className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse"
                                      style={{ backgroundColor: mealConfig.color }}
                                      title={mealConfig.label}
                                    />
                                  )}
                                  {r.source === 'mobile_app' && (
                                    <span className="text-xs flex-shrink-0" title="Mobile App Reservation">📱</span>
                                  )}
                                  {(r.change_request || r.cancel_reason) && (
                                    <span
                                      className="flex-shrink-0 flex items-center justify-center rounded-full animate-pulse"
                                      style={{
                                        width: 14, height: 14,
                                        backgroundColor: r.cancel_reason ? COLORS.purple : COLORS.info,
                                        fontSize: 8, color: 'white', fontWeight: 'bold',
                                      }}
                                      title={r.cancel_reason ? `Cancel request: ${r.cancel_reason}` : `Change request: ${r.change_request}`}
                                    >
                                      {r.cancel_reason ? '✕' : '!'}
                                    </span>
                                  )}
                                  <span className="text-xs font-bold truncate" style={{ color: styles.text }}>
                                    {r.customer_name || 'Guest'}
                                  </span>
                                </div>
                                <span className="text-xs font-mono font-semibold whitespace-nowrap" style={{ color: styles.border }}>
                                {r.from_time || `${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`}
                                </span>
                              </div>
                              {height > 50 && (
                                <div className="text-xs opacity-60 mt-1 font-medium" style={{ color: styles.text }}>
                                  → {`${String(endTime.getHours()).padStart(2,'0')}:${String(endTime.getMinutes()).padStart(2,'0')}`}
                                </div>
                              )}
                            </div>
                            {height > 70 && (
                              <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1.5">
                                  <div className="flex items-center gap-1" style={{ color: styles.border }}>
                                    <FiUsers className="w-3 h-3" />
                                    <span className="text-xs font-semibold">{r.number_of_guests}</span>
                                  </div>
                                </div>
                                {r.ServiceType_Reservation && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                    style={{ backgroundColor: styles.border + '18', color: styles.text }}>
                                    {r.ServiceType_Reservation}
                                  </span>
                                )}
                                {r.table_name && height > 90 && (
                                  <span className="text-[10px] truncate font-medium" style={{ color: styles.text, opacity: 0.7 }}>
                                    🪑 {r.table_name}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {isToday(day) && height > 100 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {['arrived', 'food_delivered', 'dessert', 'bill_delivered', 'table_cleared'].map((status) => {
                                  const config = getMealStatusConfig(status);
                                  const isActiveStatus = r.meal_status === status;
                                  return (
                                    <button
                                      key={status}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await updateDoc(doc(db, 'reservations', r.id), {
                                            meal_status: status,
                                            updated_at: serverTimestamp(),
                                          });
                                        } catch (err) {
                                          console.error('Failed to update meal status:', err);
                                        }
                                      }}
                                      className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-all duration-150 ${
                                        isActiveStatus ? 'scale-110 ring-2 ring-offset-1 shadow-md' : 'opacity-40 hover:opacity-100 hover:scale-105'
                                      }`}
                                      style={{ 
                                        backgroundColor: isActiveStatus ? config.color : config.color + '30',
                                        ringColor: isActiveStatus ? config.color : 'transparent'
                                      }}
                                      title={config.label}
                                    >
                                      <span style={{ fontSize: '8px' }}>{config.icon}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div
                            className="absolute bottom-0 left-0 right-0 h-3 flex items-center justify-center cursor-ns-resize hover:bg-black/5 rounded-b-xl transition-colors"
                            onMouseDown={(e) => handleMouseDownResize(e, r)}
                            onClick={(e) => e.stopPropagation()}>
                            <div className="w-8 h-0.5 rounded-full" style={{ backgroundColor: styles.border, opacity: 0.4 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const days = getDaysToDisplay();
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return (
      <div className="flex-1 overflow-auto p-6 bg-gray-50">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xl">
          <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
              <div key={d} className="py-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                {d.slice(0, 3)}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100 border-b border-gray-100 last:border-b-0">
              {week.map((day, di) => {
                const dayRes = getReservationsForDay(day);
                const inMonth = isCurrentMonth(day);
                return (
                  <div key={di}
                    className={`min-h-[140px] p-3 cursor-pointer group transition-all duration-200 ${
                      inMonth ? 'bg-white hover:bg-gradient-to-b hover:from-orange-50 hover:to-transparent' : 'bg-gray-50/50'
                    } ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''}`}
                    onClick={() => { setCurrentDate(day); setViewRange('day'); onDateChange(day); }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${
                        isToday(day) ? 'bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center shadow-md' : 
                        inMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {day.getDate()}
                      </span>
                      {dayRes.length > 0 && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                          {dayRes.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {dayRes.slice(0, 3).map(r => {
                        const s = getReservationStyles(r.status, r.source);
                        return (
                          <div key={r.id} 
                            className="px-2 py-1.5 rounded-lg text-xs truncate border-l-3 cursor-pointer hover:opacity-80 transition-all duration-150"
                            style={{ backgroundColor: s.bg, borderLeftColor: s.border, color: s.text }}
                            onClick={e => { e.stopPropagation(); onReservationClick(r); }}>
                            <span className="font-mono font-semibold">
                              {(() => { const d = r.reservation_date?.toDate?.() || new Date(r.reservation_date); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()}
                            </span>
                            <span className="ml-1.5">· {r.customer_name?.split(' ')[0] || 'Guest'}</span>
                            <span className="ml-1.5 text-[10px] opacity-60">({r.number_of_guests})</span>
                          </div>
                        );
                      })}
                      {dayRes.length > 3 && (
                        <div className="text-xs text-gray-400 px-2 pt-1 font-medium">
                          +{dayRes.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 select-none"
      style={{ cursor: dragging ? (dragging.type === 'resize' ? 'ns-resize' : dragging.type === 'table-resize' ? 'ew-resize' : 'grabbing') : 'default' }}>

      <div className="bg-white border-b border-gray-200 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-orange-50 text-primary rounded-xl transition-all duration-200 hover:scale-110">
              <FiChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => navigateDate(1)} className="p-2 hover:bg-orange-50 text-primary rounded-xl transition-all duration-200 hover:scale-110">
              <FiChevronRight className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1" />
            <button onClick={() => { const t = new Date(); setCurrentDate(t); onDateChange(t); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold shadow-md transition-all duration-200 hover:shadow-lg transform hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(to right, #fe8a24, #e57a1a)', color: '#ffffff' }}>
              Today
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-50 to-orange-100/50 rounded-2xl">
              <FiCalendar className="w-4 h-4 text-primary" />
              <h2 className="text-base font-bold text-gray-800">{getDateRangeText()}</h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-2xl">
              <FiUsers className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-bold text-primary">
                {(() => {
                  const dayRes = getReservationsForDay(currentDate);
                  const totalGuests = dayRes.reduce((sum, r) => sum + (r.number_of_guests || 0), 0);
                  return `${dayRes.length} res · ${totalGuests} guests`;
                })()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="date" value={formatDateForInput(currentDate)}
                onChange={e => { const d = new Date(e.target.value); setCurrentDate(d); onDateChange(d); }}
               className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:outline-none bg-gray-50 transition-all" style={{ color: '#1f2937' }} />
              <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
            </div>
            <div className="flex rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm">
              {['day','week','month'].map(r => (
                <button key={r} onClick={() => setViewRange(r)}
                    className={`px-4 py-2 text-sm font-semibold capitalize transition-all duration-200`}
                    style={{
                      background: viewRange === r ? 'linear-gradient(to right, #fe8a24, #e57a1a)' : '#ffffff',
                      color: viewRange === r ? '#ffffff' : '#1f2937',
                    }}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {viewRange === 'month' && (
          <div className="px-6 pb-4 flex items-center gap-4 border-t border-gray-100 pt-4 bg-gray-50/30">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">FROM</label>
            <input type="date" value={startDate ? formatDateForInput(startDate) : ''}
              onChange={e => { const d = new Date(e.target.value); onStartDateChange(d); onDateChange(d); }}
              className="px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white" />
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">TO</label>
            <input type="date" value={endDate ? formatDateForInput(endDate) : ''}
              min={startDate ? formatDateForInput(startDate) : ''}
              onChange={e => onEndDateChange(new Date(e.target.value))}
              className="px-3 py-1.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary bg-white" />
          </div>
        )}
      </div>

      {viewRange === 'month' ? renderMonthView() : viewRange === 'day' ? renderDayTableView() : renderGrid()}

      {/* Footer with legend - UPDATED with Current Time indicator */}
      <div className="flex-shrink-0 border-t-2 border-gray-200 px-6 py-3 bg-white shadow-inner">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Booking Status</span>
              {[
                { color: '#f59e0b', label: 'Pending' },
                { color: '#10b981', label: 'Confirmed' },
                { color: '#3b82f6', label: 'Completed' },
                { color: '#ef4444', label: 'Cancelled' },
                { color: '#9333ea', label: 'Mobile App' }
              ].map(({color, label}) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Meal Progress</span>
              {[
                { icon: '🔴', label: 'Arrived' },
                { icon: '🔵', label: 'Food' },
                { icon: '🟣', label: 'Dessert' },
                { icon: '🟡', label: 'Bill' },
                { icon: '🟢', label: 'Cleared' },
                { icon: '⚫', label: 'No Show' },
              ].map(({icon, label}) => (
                <div key={label} className="flex items-center gap-1">
                  <span className="text-xs">{icon}</span>
                  <span className="text-xs text-gray-600 font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* NEW: Current Time Indicator in Legend */}
            <div className="flex items-center gap-3 border-l-2 border-gray-200 pl-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Timeline</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-rose-200" style={{ backgroundColor: '#f43f5e' }} />
                <span className="text-xs text-gray-600 font-medium">Current Time</span>
                <span className="text-[10px] text-gray-400 font-mono ml-1">
                  {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-5 text-xs text-gray-400 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[9px]" style={{ backgroundColor: COLORS.info }}>!</span>
              <span>Change request</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[9px]" style={{ backgroundColor: COLORS.purple }}>✕</span>
              <span>Cancel request</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-primary">🖱</span>
              <span>Drag to move</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-primary">↕</span>
              <span>Resize edges</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-primary">✚</span>
              <span>Click slot</span>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <MealStatusMenu
          position={contextMenu.position}
          reservation={contextMenu.reservation}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default CalendarView;