// src/components/reservation-software/CalendarView.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc, collection, onSnapshot, getDoc, serverTimestamp } from 'firebase/firestore';
import { FiX, FiChevronLeft, FiChevronRight, FiCalendar, FiPlus, FiUsers, FiTrash2, FiClock, FiMapPin, FiMoreVertical, FiFileText, FiLock, FiSun, FiMoon, FiRefreshCw } from 'react-icons/fi';
import { firestore, auth } from '../../firebase';
import { useTheme } from '../../ThemeContext';

// ─── Note Indicator Component ──────────────────────────────────────────────────
const NoteIndicator = ({ publicNote, internalNote, isDark }) => {
  const hasPublic = publicNote && publicNote.trim().length > 0;
  const hasInternal = internalNote && internalNote.trim().length > 0;
  
  if (!hasPublic && !hasInternal) return null;
  
  return (
    <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
      {hasPublic && (
        <div className="relative group">
          <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-help ${isDark ? 'bg-blue-500/20 border border-blue-400/50 hover:bg-blue-500/30' : 'bg-blue-100 border border-blue-300/50 hover:bg-blue-200'}`}>
            <FiFileText className={`w-2.5 h-2.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
          </div>
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border shadow-lg max-w-[250px] truncate font-medium ${isDark ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
            📝 {publicNote.length > 50 ? publicNote.slice(0, 50) + '...' : publicNote}
          </div>
        </div>
      )}
      {hasInternal && (
        <div className="relative group">
          <div className={`w-4 h-4 rounded flex items-center justify-center transition-colors cursor-help ${isDark ? 'bg-amber-500/20 border border-amber-400/50 hover:bg-amber-500/30' : 'bg-amber-100 border border-amber-300/50 hover:bg-amber-200'}`}>
            <FiLock className={`w-2.5 h-2.5 ${isDark ? 'text-amber-300' : 'text-amber-600'}`} />
          </div>
          <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border shadow-lg max-w-[250px] truncate font-medium ${isDark ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}>
            🔒 {internalNote.length > 50 ? internalNote.slice(0, 50) + '...' : internalNote}
          </div>
        </div>
      )}
    </div>
  );
};

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
  onCreateReservation, selectedRestaurant, forceRender: externalForceRender = 0,
}) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [currentDate, setCurrentDate] = useState(selectedDate);
  const [viewRange, setViewRange] = useState('day');
  const [localReservations, setLocalReservations] = useState(reservations);
  const [isLoading, setIsLoading] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [tables, setTables] = useState([]);
  const scrollRef = useRef(null);
  const db = firestore;
  const [settings, setSettings] = useState({ timeBarShowsStartOfHour: true });
  const [contextMenu, setContextMenu] = useState(null);
  const [combinations, setCombinations] = useState([]);
  const [hoveredReservation, setHoveredReservation] = useState(null);
  const [overlapMenu, setOverlapMenu] = useState(null);
  // Responsive: detect screen size with improved tablet detection
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  
  // Force re-render for tablets
  const [forceRender, setForceRender] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      // iPad specific detection - check both width and height
      const isIPad = /iPad|Macintosh/.test(navigator.userAgent) && 
                     (width >= 768 && width <= 1024) && 
                     ('ontouchstart' in window || navigator.maxTouchPoints > 0);
      const isTabletDevice = (width >= 768 && width <= 1024) || isIPad;
      
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024 || isTabletDevice);
      setIsDesktop(width >= 1024 && !isTabletDevice);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Detect touch device and force re-render for tablets
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(isTouch);
    
    // Force re-render when tablet detection changes or on resize
    const handleResize = () => {
      const width = window.innerWidth;
      const isTabletDevice = (width >= 768 && width <= 1024) || 
        (/iPad|Macintosh/.test(navigator.userAgent) && width >= 768 && width <= 1024 && ('ontouchstart' in window || navigator.maxTouchPoints > 0));
      
      // Force re-render if tablet state changes
      if ((isTabletDevice && !isTablet) || (!isTabletDevice && isTablet)) {
        setForceRender(prev => prev + 1);
        // Also force a layout recalculation
        setTimeout(() => {
          if (scrollRef.current) {
            scrollRef.current.style.opacity = '0.99';
            requestAnimationFrame(() => {
              scrollRef.current.style.opacity = '1';
            });
          }
        }, 50);
      }
    };
    
    window.addEventListener('resize', handleResize);
    // Initial force render for tablets
    if (isTablet || isTouch) {
      setTimeout(() => setForceRender(prev => prev + 1), 100);
    }
    
    return () => window.removeEventListener('resize', handleResize);
  }, [isTablet]);

  // Also force re-render when external forceRender changes
  useEffect(() => {
    if (externalForceRender > 0) {
      setForceRender(prev => prev + 1);
    }
  }, [externalForceRender]);

  useEffect(() => { setLocalReservations(reservations); }, [reservations]);

  // Show loading when date changes from parent
  useEffect(() => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      if (currentDate.toDateString() !== newDate.toDateString()) {
        setIsLoading(true);
        const timer = setTimeout(() => {
          setCurrentDate(newDate);
          setIsLoading(false);
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedDate]);

  // Show loading when reservations change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setLocalReservations(reservations);
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [reservations]);

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

  useEffect(() => {
    if (!contextMenu) return;
    
    const prevent = (e) => {
      // Only prevent if not scrolling inside the meal status menu itself
      if (e.target.closest('.meal-status-menu')) return;
      e.preventDefault();
      e.stopPropagation();
    };
    
    document.addEventListener('wheel', prevent, { passive: false });
    document.addEventListener('touchmove', prevent, { passive: false });
    
    return () => {
      document.removeEventListener('wheel', prevent);
      document.removeEventListener('touchmove', prevent);
    };
  }, [contextMenu]);

  // Cleanup function for drag state
  useEffect(() => {
    const handleCleanup = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setDragging(null);
        setDragState(null);
        setDragTargetDay(null);
      }
    };
    
    return () => {
      handleCleanup();
    };
  }, []);

  // Add touch feedback styles
  useEffect(() => {
    if (isTouchDevice) {
      const style = document.createElement('style');
      style.textContent = `
        [data-table-row]:active {
          background-color: ${isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)'};
        }
        .reservation-bar {
          transition: box-shadow 0.2s ease, transform 0.1s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .reservation-bar:active {
          transform: scale(1.02);
        }
        @media (hover: none) {
          .reservation-bar:hover {
            transform: none;
          }
        }
      `;
      document.head.appendChild(style);
      return () => style.remove();
    }
  }, [isTouchDevice, isDarkMode]);

  const getRestaurantHours = () => {
    try {
      if (!selectedRestaurant?.customHours?.length) return { openHour: 8, closeHour: 23 };
      const ch = selectedRestaurant.customHours.find(h => h.openTime && h.closeTime)
        || selectedRestaurant.customHours[0];
      if (!ch?.openTime || !ch?.closeTime) return { openHour: 8, closeHour: 23 };
      const [openHour] = ch.openTime.split(':').map(Number);
      const [closeHour] = ch.closeTime.split(':').map(Number);
      const finalClose = closeHour <= openHour ? 24 : Math.min(closeHour, 24);
      return { openHour: openHour || 8, closeHour: Math.min(finalClose, 24) || 23 };
    } catch (e) {
      return { openHour: 8, closeHour: 23 };
    }
  };

  const getOverlappingReservations = (res, tableId, excludeId = null) => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    return localReservations.filter(r => {
      if (r.id === res.id) return false;
      if (excludeId && r.id === excludeId) return false;
      const rTableIds = Array.isArray(r.table_ids) && r.table_ids.length > 0 ? r.table_ids : [r.table_id];
      if (!rTableIds.includes(tableId)) return false;
      const rDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      if (rDate < dayStart || rDate > dayEnd) return false;
      const aStart = minutesToSlot(res.reservation_date, res.from_time) * 15;
      const aEnd = aStart + (res.duration_minutes || 75);
      const bStart = minutesToSlot(rDate, r.from_time) * 15;
      const bEnd = bStart + (r.duration_minutes || 75);
      return aStart < bEnd && aEnd > bStart;
    });
  };

  const checkDropCollision = (draggedRes, newTableId, newStartMinutes, duration) => {
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(currentDate);
    dayEnd.setHours(23, 59, 59, 999);

    return localReservations.find(r => {
      if (r.id === draggedRes.id) return false;
      const rTableIds = Array.isArray(r.table_ids) && r.table_ids.length > 0 ? r.table_ids : [r.table_id];
      if (!rTableIds.includes(newTableId)) return false;
      const rDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      if (rDate < dayStart || rDate > dayEnd) return false;
      const bStart = minutesToSlot(rDate, r.from_time) * 15;
      const bEnd = bStart + (r.duration_minutes || 75);
      return newStartMinutes < bEnd && (newStartMinutes + duration) > bStart;
    });
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
        bg: isDarkMode ? 'linear-gradient(135deg, #2d1b4e 0%, #1a1030 100%)' : 'linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%)',
        border: '#9333ea',
        text: isDarkMode ? '#d8b4fe' : '#581c87',
        shadow: '0 2px 4px rgba(147, 51, 234, 0.1)'
      };
    }
  const map = {
    confirmed: { 
      bg: isDarkMode ? 'linear-gradient(135deg, #065f46 0%, #0a3d2e 100%)' : 'linear-gradient(135deg, #d1fae5 0%, #ecfdf5 100%)', 
      border: '#10b981', 
      text: isDarkMode ? '#6ee7b7' : '#065f46', 
      shadow: '0 2px 4px rgba(16, 185, 129, 0.1)' 
    },
    pending: { 
      bg: isDarkMode ? 'linear-gradient(135deg, #78350f 0%, #4d2408 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)', 
      border: '#f59e0b', 
      text: isDarkMode ? '#fcd34d' : '#78350f', 
      shadow: '0 2px 4px rgba(245, 158, 11, 0.1)' 
    },
    cancelled: { 
      bg: isDarkMode ? 'linear-gradient(135deg, #7f1d1d 0%, #4c1313 100%)' : 'linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%)', 
      border: '#ef4444', 
      text: isDarkMode ? '#fca5a5' : '#991b1b', 
      shadow: '0 2px 4px rgba(239, 68, 68, 0.1)' 
    },
    completed: { 
      bg: isDarkMode ? 'linear-gradient(135deg, #1e3a5f 0%, #11233a 100%)' : 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)', 
      border: '#3b82f6', 
      text: isDarkMode ? '#93c5fd' : '#1e40af', 
      shadow: '0 2px 4px rgba(59, 130, 246, 0.1)' 
    },
    // add these two:
    table_cleared: {
      bg: isDarkMode ? 'linear-gradient(135deg, #1a3a1a 0%, #0f2410 100%)' : 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
      border: '#84cc16',
      text: isDarkMode ? '#a3e635' : '#365314',
      shadow: '0 2px 4px rgba(132, 204, 22, 0.1)'
    },
    no_show: {
      bg: isDarkMode ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' : 'linear-gradient(135deg, #f3f4f6 0%, #f9fafb 100%)',
      border: '#6b7280',
      text: isDarkMode ? '#9ca3af' : '#374151',
      shadow: '0 2px 4px rgba(107, 114, 128, 0.1)'
    },
  };
  return map[status?.toLowerCase()] || map.pending;
  };

  const getMealStatusConfig = (mealStatus) => {
    const map = {
      'arrived':        { color: '#ef4444', label: 'Arrived', icon: '🔴', bg: isDarkMode ? '#7f1d1d' : '#fee2e2' },
      'food_delivered': { color: '#3b82f6', label: 'Food', icon: '🔵', bg: isDarkMode ? '#1e3a5f' : '#dbeafe' },
      'dessert':        { color: '#8b5cf6', label: 'Dessert', icon: '🟣', bg: isDarkMode ? '#2d1b4e' : '#f3e8ff' },
      'bill_delivered': { color: '#eab308', label: 'Bill', icon: '🟡', bg: isDarkMode ? '#4d2408' : '#fefce8' },
      'table_cleared':  { color: '#84cc16', label: 'Cleared', icon: '🟢', bg: isDarkMode ? '#0a3d2e' : '#ecfccb' },
      'no_show':        { color: '#000000', label: 'No Show', icon: '⚫', bg: isDarkMode ? '#1f2937' : '#f5f5f5' },
      'clear_out':      { color: '#6b7280', label: 'Clear Out', icon: '⚪', bg: isDarkMode ? '#374151' : '#f3f4f6' },
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
          onContextMenu={(e) => { e.preventDefault(); onClose(); }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onTouchMove={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onScroll={(e) => { e.preventDefault(); e.stopPropagation(); }}
        />
        <div
          className={`fixed z-50 rounded-xl shadow-2xl border py-2 min-w-[180px] md:min-w-[220px] meal-status-menu animate-in fade-in zoom-in-95 duration-100 ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}
          style={{
            left: `${Math.min(position.x, window.innerWidth - (isMobile ? 180 : 240))}px`,
            top: position.y + 280 > window.innerHeight
              ? `${Math.max(0, position.y - 280)}px`
              : `${position.y}px`,
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={`px-3 md:px-4 py-2 border-b ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gradient-to-r from-gray-50 to-white'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>Meal Status</p>
            <p className={`text-xs md:text-sm font-semibold truncate mt-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>{reservation.customer_name}</p>
          </div>
          
          {menuItems.map(({ status, color, icon, label }) => {
            const isActive = reservation.meal_status === status;
            return (
              <button
                key={status || 'clear'}
                onClick={() => handleSelect(status)}
                className={`w-full px-3 py-1.5 flex items-center gap-2 transition-all duration-150 ${
                  isActive ? (isDarkMode ? 'bg-gray-700' : 'bg-gray-50') : (isDarkMode ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50')
                }`}
              >
                <span className="text-sm md:text-base w-5 md:w-6">{icon}</span>
                <span className={`text-xs md:text-sm font-medium ${isActive ? (isDarkMode ? 'text-gray-100' : 'text-gray-900') : (isDarkMode ? 'text-gray-300' : 'text-gray-700')}`}>
                  {isMobile && label.length > 10 ? label.substring(0, 10) + '...' : label}
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

  const OverlapMenu = ({ overlapMenu, onClose }) => {
    const { draggedRes, targetRes, originalTableId, newTableId, newFromTime, newDate, snapDuration, movedTable } = overlapMenu;

    const handleSwitchTables = async () => {
      try {
        const aTableUpdate = {
          table_id: newTableId,
          table_name: movedTable?.name || '',
          table_ids: [newTableId],
          table_names: [movedTable?.name || ''],
          combination_id: null,
          combination_name: null,
        };
        const originalTable = tables.find(t => t.id === originalTableId);
        const bTableUpdate = {
          table_id: originalTableId,
          table_name: originalTable?.name || '',
          table_ids: [originalTableId],
          table_names: [originalTable?.name || ''],
          combination_id: null,
          combination_name: null,
        };
        setLocalReservations(rs => rs.map(r => {
          if (r.id === draggedRes.id) return { ...r, ...aTableUpdate };
          if (r.id === targetRes.id) return { ...r, ...bTableUpdate };
          return r;
        }));
        await Promise.all([
          updateDoc(doc(db, 'reservations', draggedRes.id), { ...aTableUpdate, updated_at: serverTimestamp() }),
          updateDoc(doc(db, 'reservations', targetRes.id), { ...bTableUpdate, updated_at: serverTimestamp() }),
        ]);
        onClose();
      } catch (err) {
        console.error('Switch tables failed:', err);
      }
    };

    const handleOverlap = () => {
      const aTableUpdate = {
        table_id: newTableId,
        table_name: movedTable?.name || '',
        table_ids: [newTableId],
        table_names: [movedTable?.name || ''],
        combination_id: null,
        combination_name: null,
      };
      setLocalReservations(rs => rs.map(r =>
        r.id === draggedRes.id ? { ...r, ...aTableUpdate } : r
      ));
      updateDoc(doc(db, 'reservations', draggedRes.id), {
        ...aTableUpdate,
        updated_at: serverTimestamp(),
      }).catch(err => console.error(err));
      onClose();
    };

    return (
      <>
        <div 
          className="fixed inset-0 z-40 bg-black/20" 
          onClick={onClose}
          onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
        />
        <div
          className={`fixed z-50 rounded-xl shadow-2xl border py-2 min-w-[200px] ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}
        style={{
          left: isMobile ? '50%' : `${Math.min(overlapMenu.position.x - 100, window.innerWidth - 220)}px`,
          top: isMobile ? '50%' : `${Math.min(overlapMenu.position.y - 20, window.innerHeight - 160)}px`,
          transform: isMobile ? 'translate(-50%, -50%)' : 'none',
          width: isMobile ? 'calc(100vw - 40px)' : 'auto',
          maxWidth: isMobile ? '320px' : 'none',
        }}
        >
          <div className={`px-4 py-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-400'}`}>Reservation Conflict</p>
            <p className={`text-xs font-semibold mt-0.5 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
              {draggedRes.customer_name} → {targetRes.customer_name}
            </p>
          </div>
          <button
            onClick={handleSwitchTables}
            onTouchEnd={(e) => { e.preventDefault(); handleSwitchTables(); }}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-150 min-h-[48px] ${isDarkMode ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            <span>⇄</span>
            <span className="text-sm font-medium">Switch tables</span>
          </button>
          <button
            onClick={handleOverlap}
            onTouchEnd={(e) => { e.preventDefault(); handleOverlap(); }}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-150 min-h-[48px] ${isDarkMode ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            <span>⚠️</span>
            <span className="text-sm font-medium">Overlap</span>
          </button>
          <button
            onClick={onClose}
            onTouchEnd={(e) => { e.preventDefault(); onClose(); }}
            className={`w-full px-4 py-3 flex items-center gap-3 transition-all duration-150 min-h-[48px] ${isDarkMode ? 'hover:bg-gray-700/50 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
          >
            <span>✕</span>
            <span className="text-sm font-medium">Cancel</span>
          </button>
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
    setIsLoading(true);
    const d = new Date(currentDate);
    if (viewRange === 'day') d.setDate(d.getDate() + dir);
    else if (viewRange === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    
    setTimeout(() => {
      setCurrentDate(d);
      if (onDateChange) {
        onDateChange(d);
      }
      setIsLoading(false);
    }, 300);
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
    // For touch events, prevent default but don't stop propagation
    if (e.type === 'touchstart' || e.type === 'touchmove') {
      e.preventDefault();
      // Don't stop propagation for touch events to allow scrolling
    } else {
      e.preventDefault();
      e.stopPropagation();
    }
    
    let clientY, clientX;
    if (e.type === 'touchstart' || e.type === 'touchmove') {
      const touch = e.touches ? e.touches[0] : e.changedTouches?.[0];
      if (!touch) return;
      clientY = touch.clientY;
      clientX = touch.clientX;
    } else {
      clientY = e.clientY;
      clientX = e.clientX;
    }
    
    if (e.detail === 2) return;
    
    const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
    const origStart = minutesFromOpen(resDate);
    const duration = reservation.duration_minutes || 75;
    const info = { 
      id: reservation.id, 
      type: 'move', 
      startY: clientY,
      startX: clientX,
      origStart, 
      origDuration: duration, 
      reservation, 
      hasMoved: false,
      isTouch: e.type === 'touchstart' || e.type === 'touchmove',
      initialClientY: clientY,
      initialClientX: clientX,
    };
    dragRef.current = info;
    setDragging(info);
  };

  const handleMouseDownResize = (e, reservation) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    let clientX, clientY;
    if (e.type === 'touchstart') {
      const touch = e.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
    const origStart = minutesFromOpen(resDate);
    const duration = reservation.duration_minutes || 75;
    const info = { 
      id: reservation.id, 
      type: 'resize', 
      startY: clientY,
      startX: clientX,
      origStart, 
      origDuration: duration, 
      reservation, 
      hasMoved: false,
      isTouch: e.type === 'touchstart'
    };
    dragRef.current = info;
    setDragging(info);
  };

  const handleMouseMove = useCallback((e) => {
    const d = dragRef.current;
    if (!d) return;

    // Prevent default for touch events to avoid scrolling while dragging
    if (e.type === 'touchmove') {
      e.preventDefault();
    }

    let clientX, clientY;
    if (e.type === 'touchmove') {
      const touch = e.touches[0];
      if (!touch) return;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // For touch devices, use a larger threshold to prevent accidental drags
    const threshold = d.isTouch ? 8 : DRAG_THRESHOLD;

    if (d.type === 'table-move' || d.type === 'table-resize') {
      const dx = clientX - d.startX;
      
      if (!d.hasMoved && Math.abs(dx) < threshold) return;
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

      // For touch devices, use a more robust method to find the target row
      const rows = document.querySelectorAll('[data-table-row]');
      let hoveredTableId = d.tableId;
      let closestRow = null;
      let closestDistance = Infinity;

      rows.forEach(row => {
        const rect = row.getBoundingClientRect();
        const midY = (rect.top + rect.bottom) / 2;
        const distance = Math.abs(clientY - midY);
        
        // Increase tolerance for touch devices
        const tolerance = d.isTouch ? 30 : 10;
        if (distance < closestDistance && clientY >= rect.top - tolerance && clientY <= rect.bottom + tolerance) {
          closestDistance = distance;
          closestRow = row;
        }
      });

      if (closestRow) {
        hoveredTableId = closestRow.getAttribute('data-table-row');
      }
      dragRef._tableId = hoveredTableId;

      const deltaSlots = Math.round(dx / TABLE_CELL_WIDTH);
      const origSlot = Math.round(d.origStart / 15);
      const durSlots = Math.round(d.origDuration / 15);
      const maxSlot = totalTableSlots - durSlots;
      const newSlot = Math.max(0, Math.min(origSlot + deltaSlots, maxSlot));

      setDragState({ id: d.id, startMinutes: newSlot * 15, duration: d.origDuration, tableId: hoveredTableId });
      return;
    }

    const dy = clientY - d.startY;
    if (!d.hasMoved && Math.abs(dy) < threshold) return;
    if (!d.hasMoved) {
      dragRef.current = { ...d, hasMoved: true };
      setDragging(prev => prev ? { ...prev, hasMoved: true } : prev);
      setDragState({ id: d.id, startMinutes: d.origStart, duration: d.origDuration });
    }
    
    // Use smoother calculation for touch
    const rawMinutes = (dy / SLOT_HEIGHT) * 60;
    const snapIncrement = d.isTouch ? 5 : 5;
    const deltaMinutes = Math.round(rawMinutes / snapIncrement) * snapIncrement;
    const totalMinutes = totalHours * 60;

    if (d.type === 'move') {
      const cols = document.querySelectorAll('[data-day-col]');
      let hoveredDay = null;
      cols.forEach(col => {
        const rect = col.getBoundingClientRect();
        // Increase tolerance for touch devices
        const tolerance = d.isTouch ? 20 : 0;
        if (clientX >= rect.left - tolerance && clientX <= rect.right + tolerance)
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

  const handleMouseUp = useCallback(async (e) => {
    const d = dragRef.current;
    if (!d) return;
    
    if (e && e.type && (e.type === 'touchend' || e.type === 'touchcancel')) {
      e.preventDefault();
    }
    
    dragRef.current = null;
    
    if (!d.hasMoved) {
      if (d.reservation) {
        onReservationClick(d.reservation);
      }
      setDragging(null); 
      setDragState(null); 
      setDragTargetDay(null);
      return;
    }
    
    if (d.type === 'table-move' || d.type === 'table-resize') {
      setDragState(prev => {
        if (!prev) { 
          setDragging(null); 
          return null; 
        }
        
        const reservation = d.reservation;
        if (!reservation || !reservation.id) {
          setDragging(null);
          return null;
        }
        
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
          const collision = !isUnassigned && !wasMultiTable
            ? checkDropCollision(reservation, newTableId, prev.startMinutes, snapDuration)
            : null;

          if (collision) {
            setOverlapMenu({
              position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              draggedRes: reservation,
              targetRes: collision,
              originalTableId: d.tableId,
              newTableId,
              newFromTime,
              newDate: new Date(newDate),
              snapDuration,
              movedTable,
              isCombo,
              realComboId,
              movedCombo,
            });
            setDragging(null);
            setDragState(null);
            return null;
          }

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
      if (!prev) { 
        setDragging(null); 
        setDragTargetDay(null); 
        return null; 
      }
      
      const reservation = d.reservation;
      if (!reservation || !reservation.id) {
        setDragging(null);
        setDragTargetDay(null);
        return null;
      }
      
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
      const fromH = targetDate.getHours();
      const fromM = targetDate.getMinutes();
      const savedFromTime = `${String(fromH).padStart(2,'0')}:${String(fromM).padStart(2,'0')}`;
      
      setLocalReservations(rs => rs.map(r =>
        r.id === reservation.id ? { ...r, reservation_date: targetDate, from_time: savedFromTime, duration_minutes: snapDuration } : r
      ));
      
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
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp, { passive: false });
      window.addEventListener('touchcancel', handleMouseUp, { passive: false });
      
      return () => { 
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
        window.removeEventListener('touchcancel', handleMouseUp);
      };
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

  // ─── DAY TABLE VIEW ──────────────────────────────────────────────────────────
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

    // Responsive table column width - improved for tablets
    const responsiveTableColWidth = isMobile ? 90 : (isTablet ? 110 : TABLE_COL_WIDTH);
    const responsiveHourWidth = isMobile ? 110 : (isTablet ? 150 : HOUR_WIDTH);
    const responsiveCellWidth = responsiveHourWidth / 4;

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
      const styles = getReservationStyles(r.meal_status || r.status, r.source);
      const isCleared = r.meal_status === 'table_cleared';
      const isNoShow = r.meal_status === 'no_show';
      const left = slot * responsiveCellWidth;
      const width = (isCleared ? (durSlots * 0.3) : durSlots) * responsiveCellWidth - 2;
      const overlappingRes = getOverlappingReservations(r, tableId);
      const isOverlapping = overlappingRes.length > 0;
      const isMultiTable = Array.isArray(r.table_ids) && r.table_ids.length > 1;
      const allTableNames = r.table_names?.join(', ') || r.table_name || '';
      const mealConfig = r.meal_status ? getMealStatusConfig(r.meal_status) : null;
      const hasPublicNote = r.special_requests && r.special_requests.trim().length > 0;
      const hasInternalNote = r.internal_notes && r.internal_notes.trim().length > 0;

      return (
        <div
          key={r.id}
          className={`reservation-bar absolute top-1 rounded-lg overflow-hidden select-none group/res ${isActive ? 'ring-2 ring-primary/50 z-30' : 'z-10'}`}
          style={{
            left: left + 1, width: Math.max(width, 32),
            height: (isTablet ? TABLE_ROW_HEIGHT - 10 : TABLE_ROW_HEIGHT - 8),
            background: styles.bg,
            border: `1px solid ${styles.border}`,
            borderLeft: `3px solid ${styles.border}`,
            cursor: dragging?.id === r.id ? (dragging.type === 'table-resize' ? 'ew-resize' : 'grabbing') : 'grab',
            boxShadow: isActive ? `0 4px 16px rgba(0,0,0,0.15)` : (hoveredReservation === r.id ? `0 2px 8px rgba(0,0,0,0.1)` : '0 1px 2px rgba(0,0,0,0.05)'),
            touchAction: 'none',
            opacity: isNoShow ? 0.4 : 1,
          }}
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
              startY: e.clientY,
              origSlot, origStart: origSlot * 15, origDuration,
              tableId: dragTableId, reservation: r, hasMoved: false,
              isMultiTable, originalTableIds: r.table_ids,
              startClientX: e.clientX,
            };
            dragRef.current = info;
            setDragging(info);
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const touch = e.touches[0];
            if (!touch) return;
            
            const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
            const origSlot = minutesToSlot(resDate, r.from_time);
            const origDuration = r.duration_minutes || 75;
            const dragTableId = isMultiTable ? null : tableId;
            const info = {
              id: r.id, type: 'table-move',
              startX: touch.clientX,
              startY: touch.clientY,
              origSlot, origStart: origSlot * 15, origDuration,
              tableId: dragTableId, reservation: r, hasMoved: false,
              isMultiTable, originalTableIds: r.table_ids,
              startClientX: touch.clientX,
              isTouch: true,
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
          onTouchEnd={(e) => {
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
          {isOverlapping && (
            <div
              className="absolute inset-0 pointer-events-none z-20 rounded-lg"
              style={{
                background: `repeating-linear-gradient(
                  45deg,
                  rgba(239, 68, 68, 0.3) 0px,
                  rgba(239, 68, 68, 0.3) 6px,
                  rgba(34, 197, 94, 0.3) 6px,
                  rgba(34, 197, 94, 0.3) 12px
                )`,
              }}
            />
          )}
          <div className="px-1 md:px-2 h-full flex items-center gap-1 md:gap-2 overflow-hidden pr-4 md:pr-6" style={{ paddingTop: isMultiTable ? 4 : 0 }}>
            {mealConfig && (
              <div 
                className="w-2 h-2 md:w-3 md:h-3 rounded-full flex-shrink-0 animate-pulse"
                style={{ backgroundColor: mealConfig.color }}
                title={mealConfig.label}
              />
            )}
            {r.source === 'mobile_app' && (
              <span className="text-[8px] md:text-xs flex-shrink-0" title="Mobile App Reservation">📱</span>
            )}
            <NoteIndicator publicNote={r.special_requests} internalNote={r.internal_notes} isDark={isDarkMode} />
            {(r.change_request || r.cancel_reason) && (
              <span
                className="flex-shrink-0 flex items-center justify-center rounded-full animate-pulse"
                style={{
                  width: isMobile ? 12 : 16, 
                  height: isMobile ? 12 : 16,
                  backgroundColor: r.cancel_reason ? COLORS.purple : COLORS.info,
                  fontSize: isMobile ? 7 : 9, 
                  color: 'white', fontWeight: 'bold',
                }}
                title={r.cancel_reason ? `Cancel request: ${r.cancel_reason}` : `Change request: ${r.change_request}`}
              >
                {r.cancel_reason ? '✕' : '!'}
              </span>
            )}
            {isMultiTable && (
              <span
                className="flex-shrink-0 flex items-center gap-0.5 px-1 md:px-1.5 rounded-full font-bold text-white text-[8px] md:text-[10px]"
                style={{ backgroundColor: styles.border }}
                title={`Group table: ${allTableNames}`}
              >
                ⛓ {r.table_ids.length}
              </span>
            )}
            <span className={`${isMobile ? 'text-[8px]' : 'text-[9px] md:text-xs'} font-mono font-semibold whitespace-nowrap`} style={{ color: styles.text }}>
              {r.from_time || `${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`}
            </span>
              {width > 50 && (
              <span className={`${isMobile ? 'text-[8px]' : 'text-[9px] md:text-xs'} font-medium truncate`} style={{ color: styles.text }}>
              {isMobile ? `${r.number_of_guests} ${r.customer_name || 'Guest'}` : `${r.number_of_guests} · ${r.customer_name || 'Guest'}`}
              </span>
            )}
            {width > 100 && isMultiTable && (
              <span
                className="text-[8px] md:text-[10px] truncate font-semibold flex-shrink-0 hidden md:inline"
                style={{ color: styles.border, opacity: 0.8 }}
              >
                [{allTableNames}]
              </span>
            )}
            {isActive && width > 60 && (
              <span className="text-[8px] md:text-[9px] ml-auto whitespace-nowrap font-mono font-semibold" style={{ color: styles.text, opacity: 0.6 }}>
                {Math.round((isActive ? dragState.duration : r.duration_minutes || 75))}m
              </span>
            )}
          </div>
          <div
            className={`absolute top-0 right-0 bottom-0 w-3 md:w-4 flex items-center justify-center cursor-ew-resize opacity-0 group-hover/res:opacity-100 transition-opacity ${isDarkMode ? 'hover:bg-gray-700/20' : 'hover:bg-black/5'}`}
            onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              const origSlot = minutesToSlot(resDate);
              const origDuration = r.duration_minutes || 75;
              const info = {
                id: r.id, type: 'table-resize',
                startX: e.clientX,
                startY: e.clientY,
                origSlot, origStart: origSlot * 15, origDuration,
                tableId, reservation: r, hasMoved: false,
              };
              dragRef.current = info;
              setDragging(info);
            }}
            onTouchStart={(e) => {
              e.preventDefault(); 
              e.stopPropagation();
              const touch = e.touches[0];
              if (!touch) return;
              
              // Add haptic feedback if available
              if (navigator.vibrate) {
                navigator.vibrate(10);
              }
              
              const origSlot = minutesToSlot(resDate);
              const origDuration = r.duration_minutes || 75;
              const info = {
                id: r.id, type: 'table-resize',
                startX: touch.clientX,
                startY: touch.clientY,
                origSlot, origStart: origSlot * 15, origDuration,
                tableId, reservation: r, hasMoved: false,
                isTouch: true,
              };
              dragRef.current = info;
              setDragging(info);
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex flex-col items-center gap-0.5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-full w-0.5 md:w-1 h-3 md:h-4`} />
            <div className={`flex flex-col items-center gap-0.5 ${isDarkMode ? 'bg-gray-600' : 'bg-gray-400'} rounded-full w-0.5 md:w-1 h-3 md:h-4`} />
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
          className={`flex border-b transition-all duration-200 ${isDragTarget ? (isDarkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50/50 border-blue-300') : (isDarkMode ? 'border-gray-700 hover:bg-gray-800/30' : 'border-gray-200 hover:bg-gray-50/30')}`}
          style={{ 
            height: isTablet ? 38 : TABLE_ROW_HEIGHT,
            transform: isDragTarget ? 'scale(1.01)' : 'scale(1)',
            boxShadow: isDragTarget ? 'inset 0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
          }}
        >
          <div
            className={`flex-shrink-0 flex items-center justify-between px-2 md:px-3 border-r-2 transition-all duration-150 ${
              isUnassigned ? (isDarkMode ? 'bg-orange-900/30 border-orange-800' : 'bg-gradient-to-r from-orange-50 to-orange-50/30 border-orange-200') : (isDarkMode ? 'bg-gray-800/50 group-hover:bg-gray-700/80 border-gray-700' : 'bg-gray-50/50 group-hover:bg-gray-100/80 border-gray-200')
            }`}
            style={{ width: responsiveTableColWidth }}
          >
            {isUnassigned ? (
              <div className="flex items-center gap-1 md:gap-2">
                <FiMapPin className={`w-2.5 h-2.5 md:w-3 md:h-3 ${isDarkMode ? 'text-orange-400' : 'text-orange-400'}`} />
                <span className={`text-[10px] md:text-xs font-medium ${isDarkMode ? 'text-orange-300' : 'text-orange-600'} italic`}>Unassigned</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 md:gap-2 min-w-0">
                <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-gray-700' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`}>
                  <span className={`text-[10px] md:text-xs font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{table.name.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <span className={`text-xs md:text-sm font-bold truncate block ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{table.name}</span>
                </div>
                <span className={`flex items-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[8px] md:text-[10px] font-semibold flex-shrink-0 ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
                  <FiUsers className="w-2 h-2 md:w-2.5 md:h-2.5" />{table.maxCapacity}
                </span>
              </div>
            )}
          </div>

          <div 
            className={`relative overflow-hidden transition-all duration-150 flex-1 ${isDragTarget ? (isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50/20') : ''}`}
            style={{ position: 'relative', minWidth: (closeHour - openHour) * responsiveHourWidth }}
          >
            {/* Vertical hour grid lines - absolute positioned relative to parent */}
            {Array.from({ length: closeHour - openHour + 1 }, (_, i) => (
              <div 
                key={`hour-${i}`} 
                className={`absolute top-0 bottom-0 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
                style={{ left: i * responsiveHourWidth, zIndex: 1 }} 
              />
            ))}

            {/* Vertical quarter-hour grid lines */}
            {Array.from({ length: (closeHour - openHour) * 4 }, (_, i) => {
              const slotWidth = responsiveHourWidth / 4;
              return (
                <div 
                  key={`slot-${i}`} 
                  className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? 'border-gray-300' : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`} 
                  style={{ left: (i + 1) * slotWidth, zIndex: 1 }} 
                />
              );
            })}

            {/* Half-hour markers */}
            {Array.from({ length: (closeHour - openHour) * 2 }, (_, i) => {
              const halfWidth = responsiveHourWidth / 2;
              return (
                <div 
                  key={`half-${i}`} 
                  className={`absolute top-0 bottom-0 border-l border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
                  style={{ left: (i + 0.5) * halfWidth, zIndex: 1 }}
                />
              );
            })}
            <div className={`absolute inset-0 cursor-crosshair z-0 hover:bg-gradient-to-r hover:from-transparent ${isDarkMode ? 'hover:to-primary/10' : 'hover:to-primary/5'} transition-colors`}
              onClick={(e) => {
                if (dragging) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const slot = Math.floor((e.clientX - rect.left) / responsiveCellWidth);
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
      <div className={`flex-1 overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div 
            className="flex-1 overflow-auto" 
            ref={scrollRef}
            onWheel={(e) => {
              if (contextMenu) e.stopPropagation();
            }}
            onTouchMove={(e) => {
              if (contextMenu) e.stopPropagation();
            }}
          >
          <div className="w-full">
            {/* Sticky header with enhanced design - Responsive */}
            <div className={`flex sticky top-0 z-20 ${isDarkMode ? 'bg-gray-800 border-b-2 border-gray-700' : 'bg-white border-b-2 border-gray-200'} shadow-sm`} style={{ height: isMobile ? 40 : (isTablet ? 44 : 48) }}>
              <div className={`flex-shrink-0 ${isDarkMode ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-r-2 border-gray-700' : 'bg-gradient-to-r from-gray-800 to-gray-900 border-r-2 border-gray-700'} flex items-center justify-center`}
                style={{ width: responsiveTableColWidth }}>
                <div className="text-center">
                  <div className="text-[8px] md:text-xs font-bold text-gray-200 uppercase tracking-wider">Table</div>
                  {!isMobile && !isTablet && (
                    <div className="flex items-center gap-1 justify-center text-gray-400 text-[10px] mt-0.5">
                      <FiUsers className="w-2.5 h-2.5" /> Capacity
                    </div>
                  )}
                </div>
              </div>
              <div className={`flex relative overflow-x-auto flex-1 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} style={{ minWidth: (closeHour - openHour) * responsiveHourWidth, position: 'relative' }}>
                {Array.from({ length: closeHour - openHour }, (_, hourIndex) => {
                  const hour = openHour + hourIndex;
                  return (
                    <div key={hourIndex} className={`relative border-r flex-shrink-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
                      style={{ width: responsiveHourWidth, position: 'relative', zIndex: 2 }}>
                      <div className={`absolute inset-0 flex ${settings?.timeBarShowsStartOfHour ? 'items-start' : 'items-end'} justify-start ${settings?.timeBarShowsStartOfHour ? 'pt-1 md:pt-2' : 'pb-1 md:pb-2'} pl-1 md:pl-2 ${isDarkMode ? 'bg-gradient-to-r from-gray-800 to-transparent' : 'bg-gradient-to-r from-gray-50 to-transparent'}`}>
                        <div className="flex items-baseline gap-0.5 md:gap-1">
                          <span className={`${isMobile ? 'text-[9px]' : 'text-[10px] md:text-sm'} font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                            {String(hour).padStart(2,'0')}
                          </span>
                          <span className={`text-[8px] md:text-[10px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>:00</span>
                        </div>
                      </div>
                      <div className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[7px] md:text-[9px] font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>:30</div>
                      {/* Quarter hour markers in header */}
                      <div className={`absolute top-0 bottom-0 left-1/4 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} style={{ zIndex: 1 }} />
                      <div className={`absolute top-0 bottom-0 left-2/4 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} style={{ zIndex: 1 }} />
                      <div className={`absolute top-0 bottom-0 left-3/4 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} style={{ zIndex: 1 }} />
                    </div>
                  );
                })}
                {nowSlot >= 0 && nowSlot <= totalTableSlots && (
                  <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: nowSlot * responsiveCellWidth, zIndex: 3 }}>
                    <div className="flex items-start">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-rose-500 rounded-full -ml-1 mt-0.5 shadow-lg" />
                      <div className="w-0.5 h-full bg-rose-500" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`relative ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
              {tables.length === 0 ? (
                <div className="flex items-center justify-center py-12 md:py-20 text-center">
                  <div className="animate-fade-in">
                    <div className="text-3xl md:text-5xl mb-3 md:mb-4">🪑</div>
                    <p className={`font-semibold text-base md:text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>No tables yet</p>
                    <p className={`text-xs md:text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Add tables in Table Management first</p>
                  </div>
                </div>
              ) : (
                tables.map(t => renderRow(t))
              )}

              {/* Combinations section */}
              {combinations.length > 0 && (
                <>
                  <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1.5 md:py-2 ${isDarkMode ? 'bg-purple-900/30 border-purple-800' : 'bg-gradient-to-r from-purple-50 to-purple-100/30 border-y border-purple-200'} border-y`}>
                    <span className={`text-[9px] md:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>⛓ Table Combinations</span>
                    <div className={`flex-1 h-px ${isDarkMode ? 'bg-purple-800' : 'bg-gradient-to-r from-purple-200 to-transparent'}`} />
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
                        className={`flex border-b transition-colors ${isDarkMode ? 'border-purple-900/50 group hover:bg-purple-900/20' : 'border-purple-100 group hover:bg-purple-50/30'}`}
                        style={{ height: isTablet ? 38 : TABLE_ROW_HEIGHT }}>
                        <div className={`flex-shrink-0 flex items-center justify-between px-2 md:px-3 border-r-2 transition-all ${isDarkMode ? 'border-purple-800 bg-purple-900/30 group-hover:bg-purple-800/40' : 'border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100/30 group-hover:from-purple-100 group-hover:to-purple-200/30'}`}
                          style={{ width: responsiveTableColWidth }}>
                          <div className="flex items-center gap-1 md:gap-2 min-w-0">
                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-purple-800/50' : 'bg-gradient-to-br from-purple-100 to-purple-200'}`}>
                              <span className="text-xs md:text-sm">⛓</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs md:text-sm font-bold truncate block ${isDarkMode ? 'text-purple-300' : 'text-purple-800'}`}>{combo.name}</span>
                            </div>
                            {combo.capacity && (
                              <span className={`flex items-center gap-0.5 md:gap-1 rounded-full px-1 md:px-1.5 py-0.5 text-[8px] md:text-[10px] font-semibold flex-shrink-0 ${isDarkMode ? 'bg-purple-800/50 text-purple-300' : 'bg-purple-200 text-purple-700'}`}>
                                <FiUsers className="w-2 h-2 md:w-2.5 md:h-2.5" />{combo.capacity}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={`relative overflow-hidden flex-1 ${isDragTarget ? (isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50/30') : ''}`}
                          style={{ position: 'relative', minWidth: (closeHour - openHour) * responsiveHourWidth }}>
                          {/* Grid lines for combinations */}
                          {Array.from({ length: closeHour - openHour + 1 }, (_, i) => (
                            <div 
                              key={`combo-hour-${i}`} 
                              className={`absolute top-0 bottom-0 border-l ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`} 
                              style={{ left: i * responsiveHourWidth, zIndex: 1 }} 
                            />
                          ))}
                          {Array.from({ length: (closeHour - openHour) * 4 }, (_, i) => {
                            const slotWidth = responsiveHourWidth / 4;
                            return (
                              <div 
                                key={`combo-slot-${i}`} 
                                className={`absolute top-0 bottom-0 border-l ${i % 4 === 0 ? 'border-gray-300' : (isDarkMode ? 'border-gray-800' : 'border-gray-200')}`} 
                                style={{ left: (i + 1) * slotWidth, zIndex: 1 }} 
                              />
                            );
                          })}
                          {/* Rest of the combinations content */}
                          <div className={`absolute inset-0 cursor-crosshair z-0 ${isDarkMode ? 'hover:bg-purple-900/10' : 'hover:bg-purple-50/10'} transition-colors`}
                            onClick={(e) => {
                              if (dragging) return;
                              const rect = e.currentTarget.getBoundingClientRect();
                              const slot = Math.floor((e.clientX - rect.left) / responsiveCellWidth);
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
                  style={{ left: responsiveTableColWidth + nowSlot * responsiveCellWidth }}>
                  <div className="flex items-start">
                    <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-rose-500 rounded-full -ml-1 mt-1 shadow-lg ring-2 ring-rose-200" />
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

  // ─── WEEK GRID VIEW ──────────────────────────────────────────────────────────
  const renderGrid = () => {
    const days = getDaysToDisplay();
    const isWeek = viewRange === 'week';

    // Responsive time column width
    const responsiveTimeColWidth = isMobile ? 40 : (isTablet ? 55 : TIME_COL_WIDTH);

    return (
      <div className={`flex-1 overflow-hidden flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {isWeek && (
          <div className={`flex flex-shrink-0 ${isDarkMode ? 'bg-gray-800 border-b-2 border-gray-700' : 'bg-white border-b-2 border-gray-200'} shadow-sm overflow-x-auto`} style={{ paddingLeft: responsiveTimeColWidth }}>
            {days.map((day, i) => {
              const dayRes = getReservationsForDay(day);
              return (
                <div key={i} className={`flex-1 py-1 sm:py-2 md:py-4 text-center border-l transition-all duration-200 min-w-[40px] sm:min-w-[50px] md:min-w-[60px] ${
                  isToday(day) ? (isDarkMode ? 'bg-amber-900/30' : 'bg-gradient-to-b from-amber-50 to-amber-100/30') : (isDarkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50')
                } ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className={`text-[8px] sm:text-[9px] md:text-xs font-semibold uppercase tracking-wider mb-0.5 md:mb-1 ${
                    isToday(day) ? (isDarkMode ? 'text-amber-400' : 'text-amber-600') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                  }`}>
                    {isMobile ? day.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1) : day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className={`text-sm sm:text-base md:text-2xl font-bold mt-0.5 ${
                    isToday(day) ? (isDarkMode ? 'text-amber-400' : 'text-amber-700') : (isDarkMode ? 'text-gray-300' : 'text-gray-800')
                  }`}>
                    {day.getDate()}
                  </div>
                  {!isMobile && (
                    <div className={`text-[8px] md:text-xs mt-0.5 md:mt-1 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {dayRes.length} res
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div 
            className="flex-1 overflow-y-auto" 
            ref={scrollRef}
            onWheel={(e) => {
              if (contextMenu) e.stopPropagation();
            }}
            onTouchMove={(e) => {
              if (contextMenu) e.stopPropagation();
            }}
          >
          <div className="flex" style={{ height: totalHeight }}>
            <div className={`flex-shrink-0 ${isDarkMode ? 'bg-gray-800 border-r-2 border-gray-700' : 'bg-gray-50 border-r-2 border-gray-200'} sticky left-0 z-20 shadow-sm`} style={{ width: responsiveTimeColWidth }}>
              {hours.map((hour) => (
                <div key={hour} style={{ height: SLOT_HEIGHT }} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex items-start justify-end pr-1 md:pr-3 pt-1 md:pt-2`}>
                  <div className="flex flex-col items-end">
                    <span className={`text-[8px] md:text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isMobile ? (hour === 12 ? '12' : hour > 12 ? `${hour-12}` : `${hour}`) : (hour === 12 ? '12 PM' : hour > 12 ? `${hour-12} PM` : `${hour} AM`)}
                    </span>
                    {!isMobile && <span className={`text-[9px] mt-0.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>:00</span>}
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
                  className={`flex-1 relative border-l transition-all duration-200 min-w-[60px] sm:min-w-[80px] ${
                    isToday(day) && !isWeek ? (isDarkMode ? 'bg-amber-900/20' : 'bg-gradient-to-b from-amber-50/50 to-transparent') : (isDarkMode ? 'bg-gray-900' : 'bg-white')
                  } ${isDropTarget ? (isDarkMode ? 'bg-blue-900/40 shadow-inner' : 'bg-blue-50/40 shadow-inner') : ''} ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {hours.map((hour, hourIdx) => {
                    const isEvenHour = hour % 2 === 0;
                    return (
                      <div key={hour} style={{ height: SLOT_HEIGHT }} className={`relative group border-b ${
                        isEvenHour ? (isDarkMode ? 'border-gray-700' : 'border-gray-200') : (isDarkMode ? 'border-gray-800' : 'border-gray-100')
                      }`}>
                        <div className={`absolute top-0 bottom-0 left-0 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                        <div className={`absolute top-0 bottom-0 left-1/4 w-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                        <div className={`absolute top-0 bottom-0 left-2/4 w-px ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                        <div className={`absolute top-0 bottom-0 left-3/4 w-px ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'}`} />
                        <div className={`absolute w-full border-b border-dashed ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} style={{ top: SLOT_HEIGHT / 2 }} />
                        <div className={`absolute left-0 right-0 top-1/4 bottom-0 border-t border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                        <div className={`absolute left-0 right-0 top-3/4 bottom-0 border-t border-dashed ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                        
                        <div
                          className={`absolute inset-0 hover:bg-gradient-to-r hover:from-primary/5 hover:to-transparent cursor-pointer transition-all duration-150 flex items-center justify-center opacity-0 hover:opacity-100 z-10 ${isDarkMode ? 'hover:from-primary/10' : ''}`}
                          onClick={() => { const d = new Date(day); d.setHours(hour, 0, 0, 0); onCreateReservation && onCreateReservation(d); }}>
                          <div className="flex items-center gap-1 md:gap-1.5 bg-primary text-white text-[8px] md:text-xs px-1.5 md:px-3 py-1 md:py-1.5 rounded-full shadow-lg font-medium transform hover:scale-105 transition-transform">
                            <FiPlus className="w-2 h-2 md:w-3 md:h-3" />
                            {!isMobile && <span>{`${String(hour).padStart(2,'0')}:00`}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {nowMin >= 0 && nowMin < totalHours * 60 && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowMin / 60) * SLOT_HEIGHT }}>
                      <div className="flex items-center">
                        <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 bg-rose-500 rounded-full shadow-lg shadow-rose-500/50 -ml-1 flex-shrink-0 ring-2 ring-rose-200" />
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
                      const styles = getReservationStyles(r.meal_status || r.status, r.source);
                      const startMins = r.from_time ? (() => { const [h,m] = r.from_time.split(':').map(Number); return h*60+m; })() : resDate.getHours()*60+resDate.getMinutes();
                      const endTotalMins = startMins + duration;
                      const endTime = { getHours: () => Math.floor(endTotalMins/60)%24, getMinutes: () => endTotalMins%60 };
                      const mealConfig = r.meal_status ? getMealStatusConfig(r.meal_status) : null;
                      const hasPublicNote = r.special_requests && r.special_requests.trim().length > 0;
                      const hasInternalNote = r.internal_notes && r.internal_notes.trim().length > 0;

                      // Check if we should show compact view
                      const showCompact = height < 50 || isMobile;

                      return (
                        <div key={r.id}
                          className={`reservation-bar absolute rounded-lg md:rounded-xl overflow-hidden pointer-events-auto ${
                            isActive ? 'z-30 shadow-2xl ring-2 ring-primary/50' : 'z-10 hover:shadow-xl hover:z-20'
                          }`}
                          style={{
                            top: top + 2, left: 2, right: 2, height: height - 4,
                            background: styles.bg,
                            borderLeft: showCompact ? `2px solid ${styles.border}` : `4px solid ${styles.border}`,
                            boxShadow: isActive ? `0 8px 24px rgba(0,0,0,0.15)` : (hoveredReservation === r.id ? `0 4px 12px rgba(0,0,0,0.1)` : `0 1px 3px rgba(0,0,0,0.08)`),
                            cursor: dragging?.id === r.id && dragging.type === 'move' ? 'grabbing' : 'grab',
                            touchAction: 'none',
                          }}
                          onMouseDown={(e) => {
                            if (e.button === 2) return;
                            e.preventDefault();
                            e.stopPropagation();
                            handleMouseDownMove(e, r);
                          }}
                          onTouchStart={(e) => {
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
                          onTouchEnd={(e) => {
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
                          <div className={`px-1 md:px-3 py-1 md:py-2 h-full flex flex-col justify-between overflow-hidden`}>
                            <div>
                              <div className="flex items-center justify-between gap-1 md:gap-2">
                                <div className="flex items-center gap-0.5 md:gap-1.5 min-w-0">
                                  {mealConfig && (
                                    <div 
                                      className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 animate-pulse"
                                      style={{ backgroundColor: mealConfig.color }}
                                      title={mealConfig.label}
                                    />
                                  )}
                                  {r.source === 'mobile_app' && (
                                    <span className="text-[6px] md:text-xs flex-shrink-0" title="Mobile App Reservation">📱</span>
                                  )}
                                  {!showCompact && (
                                    <NoteIndicator publicNote={r.special_requests} internalNote={r.internal_notes} isDark={isDarkMode} />
                                  )}
                                  {(r.change_request || r.cancel_reason) && (
                                    <span
                                      className="flex-shrink-0 flex items-center justify-center rounded-full animate-pulse"
                                      style={{
                                        width: showCompact ? 10 : 14, 
                                        height: showCompact ? 10 : 14,
                                        backgroundColor: r.cancel_reason ? COLORS.purple : COLORS.info,
                                        fontSize: showCompact ? 6 : 8, 
                                        color: 'white', fontWeight: 'bold',
                                      }}
                                      title={r.cancel_reason ? `Cancel request: ${r.cancel_reason}` : `Change request: ${r.change_request}`}
                                    >
                                      {r.cancel_reason ? '✕' : '!'}
                                    </span>
                                  )}
                                {!showCompact && (
                                  <span className={`text-[10px] md:text-xs font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} style={{ color: styles.text }}>
                                  {r.number_of_guests} · {r.customer_name || 'Guest'}
                                  </span>
                                )}
                                {showCompact && (
                                  <span className={`text-[8px] md:text-xs font-bold truncate ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`} style={{ color: styles.text }}>
                                    {r.number_of_guests} · {r.customer_name || 'Guest'}
                                  </span>
                                )}
                                </div>
                                <span className="text-[8px] md:text-xs font-mono font-semibold whitespace-nowrap" style={{ color: styles.border }}>
                                  {r.from_time || `${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`}
                                </span>
                              </div>
                              {!showCompact && height > 50 && (
                                <div className={`text-[8px] md:text-xs opacity-60 mt-0.5 md:mt-1 font-medium ${isDarkMode ? 'text-gray-300' : ''}`} style={{ color: styles.text }}>
                                  → {`${String(endTime.getHours()).padStart(2,'0')}:${String(endTime.getMinutes()).padStart(2,'0')}`}
                                </div>
                              )}
                            </div>
                            {!showCompact && height > 70 && (
                              <div className="flex items-center gap-1 md:gap-3 mt-1">
                                <div className="flex items-center gap-0.5 md:gap-1.5">
                                  <div className="flex items-center gap-0.5 md:gap-1" style={{ color: styles.border }}>
                                    <FiUsers className="w-2 h-2 md:w-3 md:h-3" />
                                    <span className={`text-[8px] md:text-xs font-semibold ${isDarkMode ? 'text-gray-300' : ''}`}>{r.number_of_guests}</span>
                                  </div>
                                </div>
                                {r.ServiceType_Reservation && (
                                  <span className={`text-[7px] md:text-[10px] px-1 md:px-2 py-0.5 rounded-full font-medium ${isDarkMode ? 'text-gray-300' : ''}`}
                                    style={{ backgroundColor: styles.border + '18', color: styles.text }}>
                                    {isMobile ? r.ServiceType_Reservation.slice(0, 3) : r.ServiceType_Reservation}
                                  </span>
                                )}
                                {r.table_name && height > 90 && !isMobile && (
                                  <span className={`text-[8px] md:text-[10px] truncate font-medium ${isDarkMode ? 'text-gray-400' : ''}`} style={{ color: styles.text, opacity: 0.7 }}>
                                    🪑 {r.table_name}
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {isToday(day) && height > 100 && !isMobile && (
                              <div className="flex gap-0.5 md:gap-1 mt-1 md:mt-2 flex-wrap">
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
                                      className={`flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center transition-all duration-150 ${
                                        isActiveStatus ? 'scale-110 ring-2 ring-offset-1 shadow-md' : 'opacity-40 hover:opacity-100 hover:scale-105'
                                      }`}
                                      style={{ 
                                        backgroundColor: isActiveStatus ? config.color : config.color + '30',
                                        ringColor: isActiveStatus ? config.color : 'transparent'
                                      }}
                                      title={config.label}
                                    >
                                      <span style={{ fontSize: isMobile ? '6px' : '8px' }}>{config.icon}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          {!showCompact && (
                            <div
                              className={`absolute bottom-0 left-0 right-0 h-2 md:h-3 flex items-center justify-center cursor-ns-resize ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'} rounded-b-xl transition-colors`}
                              onMouseDown={(e) => handleMouseDownResize(e, r)}
                              onTouchStart={(e) => handleMouseDownResize(e, r)}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="w-4 md:w-8 h-0.5 rounded-full" style={{ backgroundColor: styles.border, opacity: 0.4 }} />
                            </div>
                          )}
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

  // ─── MONTH VIEW ──────────────────────────────────────────────────────────────
  const renderMonthView = () => {
    const days = getDaysToDisplay();
    const weeks = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    
    return (
      <div className={`flex-1 overflow-auto p-2 md:p-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`rounded-xl md:rounded-2xl border overflow-hidden shadow-lg md:shadow-xl ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className={`grid grid-cols-7 ${isDarkMode ? 'bg-gray-800 border-b-2 border-gray-700' : 'bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200'}`}>
            {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(d => (
              <div key={d} className={`py-2 md:py-4 text-center text-[8px] md:text-xs font-bold uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {isMobile ? d.slice(0, 1) : d.slice(0, 3)}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className={`grid grid-cols-7 divide-x ${isDarkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-100 border-gray-100'} border-b last:border-b-0`}>
              {week.map((day, di) => {
                const dayRes = getReservationsForDay(day);
                const inMonth = isCurrentMonth(day);
                return (
                  <div key={di}
                    className={`min-h-[70px] sm:min-h-[80px] md:min-h-[140px] p-1 md:p-3 cursor-pointer group transition-all duration-200 ${
                      inMonth ? (isDarkMode ? 'bg-gray-800 hover:bg-gray-700/50' : 'bg-white hover:bg-gradient-to-b hover:from-orange-50 hover:to-transparent') : (isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/50')
                    } ${isToday(day) ? 'ring-2 ring-primary ring-inset' : ''}`}
                    onClick={() => { 
                      setIsLoading(true);
                      setTimeout(() => {
                        setCurrentDate(day); 
                        setViewRange('day'); 
                        if (onDateChange) {
                          onDateChange(day);
                        }
                        setIsLoading(false);
                      }, 300);
                    }}
                  >
                    <div className="flex items-center justify-between mb-1 md:mb-2">
                      <span className={`text-xs md:text-sm font-semibold ${
                        isToday(day) ? 'bg-primary text-white w-5 h-5 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-md' : 
                        inMonth ? (isDarkMode ? 'text-gray-200' : 'text-gray-900') : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
                      }`}>
                        {day.getDate()}
                      </span>
                      {dayRes.length > 0 && (
                        <span className={`text-[8px] md:text-xs px-1 md:px-2 py-0.5 rounded-full font-semibold ${isDarkMode ? 'bg-orange-900/50 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                          {dayRes.length}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5 md:space-y-1.5">
                      {dayRes.slice(0, isMobile ? 2 : 3).map(r => {
                        const s = getReservationStyles(r.status, r.source);
                        const resDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
                        return (
                          <div key={r.id} 
                            className={`px-1 md:px-2 py-0.5 md:py-1.5 rounded-lg text-[7px] md:text-xs truncate border-l-2 md:border-l-3 cursor-pointer hover:opacity-80 transition-all duration-150 flex items-center justify-between ${isDarkMode ? 'text-gray-200' : ''}`}
                            style={{ backgroundColor: s.bg, borderLeftColor: s.border, color: s.text }}
                            onClick={e => { e.stopPropagation(); onReservationClick(r); }}>
                            <div className="flex items-center gap-0.5 md:gap-1 min-w-0">
                              <span className="font-mono font-semibold flex-shrink-0 text-[6px] md:text-[10px]">
                                {`${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`}
                              </span>
                              {!isMobile && (
                                <span className={`ml-0.5 md:ml-1 truncate ${isDarkMode ? 'text-gray-300' : ''}`}>· {r.customer_name || 'Guest'}</span>
                              )}
                              <span className={`text-[6px] md:text-[10px] opacity-60 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : ''}`}>({r.number_of_guests})</span>
                            </div>
                            {!isMobile && <NoteIndicator publicNote={r.special_requests} internalNote={r.internal_notes} isDark={isDarkMode} />}
                          </div>
                        );
                      })}
                      {dayRes.length > (isMobile ? 2 : 3) && (
                        <div className={`text-[7px] md:text-xs px-1 md:px-2 pt-0.5 md:pt-1 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                          +{dayRes.length - (isMobile ? 2 : 3)} more
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
    <div className={`h-full flex flex-col select-none relative ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}
      style={{ 
        cursor: dragging ? (dragging.type === 'resize' ? 'ns-resize' : dragging.type === 'table-resize' ? 'ew-resize' : 'grabbing') : 'default',
        touchAction: isTouchDevice ? 'none' : 'none',
        minHeight: '100%',
        transition: 'transform 0.05s ease',
      }}>

      {/* ─── Loading Overlay ────────────────────────────────────────────────── */}
      {isLoading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${isDarkMode ? 'bg-gray-900/80' : 'bg-white/80'} backdrop-blur-sm transition-opacity duration-300`}>
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
            <p className={`text-xs sm:text-sm font-medium animate-pulse ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading reservations...</p>
          </div>
        </div>
      )}

      {/* ─── HEADER ────────────────────────────────────────────────────────────── */}
      <div className={`border-b shadow-lg flex-shrink-0 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-3 md:px-6 py-2 md:py-4 gap-2 md:gap-0">
          {/* Left: View Range Display */}
          <div className="flex items-center gap-1 md:gap-2 w-full md:w-auto justify-between md:justify-start">
            <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl ${isDarkMode ? 'bg-gray-700/50' : 'bg-gradient-to-r from-orange-50 to-orange-100/50'}`}>
              <FiCalendar className={`w-3 h-3 md:w-4 md:h-4 text-primary flex-shrink-0`} />
              <h2 className={`text-[10px] md:text-base font-bold truncate max-w-[120px] md:max-w-none ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {getDateRangeText()}
              </h2>
            </div>
          </div>

          {/* Middle: Stats */}
          {!isMobile && (
            <div className={`flex items-center gap-2 md:gap-4 px-3 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl ${isDarkMode ? 'bg-primary/10' : 'bg-primary/10'}`}>
              <FiUsers className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary" />
              <span className={`text-[10px] md:text-sm font-bold text-primary whitespace-nowrap`}>
                {(() => {
                  const dayRes = getReservationsForDay(currentDate);
                  const totalGuests = dayRes.reduce((sum, r) => sum + (r.number_of_guests || 0), 0);
                  return `${dayRes.length} res · ${totalGuests} guests`;
                })()}
              </span>
            </div>
          )}

          {/* Right: View Controls + Theme Toggle + Refresh */}
          <div className="flex items-center gap-1 md:gap-3 w-full md:w-auto justify-end">
            <div className={`flex rounded-xl overflow-hidden border-2 shadow-sm ${isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
              {['day','week','month'].map(r => (
                <button key={r} onClick={() => setViewRange(r)}
                  className={`px-2 md:px-4 py-1 md:py-2 text-[8px] md:text-sm font-semibold capitalize transition-all duration-200 whitespace-nowrap ${
                    viewRange === r ? 'text-white' : (isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-800')
                  }`}
                  style={{
                    background: viewRange === r ? 'linear-gradient(to right, #fe8a24, #e57a1a)' : (isDarkMode ? 'transparent' : '#ffffff'),
                  }}>
                  {isMobile ? (r === 'day' ? 'D' : r === 'week' ? 'W' : 'M') : r}
                </button>
              ))}
            </div>
            
            {/* Manual refresh button for tablets */}
            {(isTablet || isTouchDevice) && (
              <button 
                onClick={() => {
                  setForceRender(prev => prev + 1);
                  setViewRange('day');
                  setTimeout(() => setViewRange(viewRange), 50);
                }}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
                title="Refresh Calendar"
              >
                <FiRefreshCw className="w-4 h-4" />
              </button>
            )}
            
            {/* Theme Toggle Button */}
            <button 
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'}`}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <FiSun className="w-4 h-4 text-amber-400" /> : <FiMoon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* ─── BODY ────────────────────────────────────────────────────────────────── */}
      {viewRange === 'month' ? renderMonthView() : viewRange === 'day' ? renderDayTableView() : renderGrid()}

      {/* ─── FOOTER ────────────────────────────────────────────────────────────── */}
      <div className={`flex-shrink-0 border-t-2 px-2 md:px-6 py-2 md:py-3 shadow-inner overflow-x-auto ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center justify-between flex-wrap gap-1 md:gap-2 min-w-[600px] md:min-w-0">
          <div className="flex items-center gap-2 md:gap-6 flex-wrap">
            <span className={`text-[8px] md:text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Status</span>
            {[
              { color: '#f59e0b', label: 'Pending' },
              { color: '#10b981', label: 'Confirmed' },
              { color: '#3b82f6', label: 'Completed' },
              { color: '#ef4444', label: 'Cancelled' },
              { color: '#9333ea', label: 'Mobile' }
            ].map(({color, label}) => (
              <div key={label} className="flex items-center gap-0.5 md:gap-1.5">
                <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full shadow-sm" style={{ backgroundColor: color }} />
                <span className={`text-[7px] md:text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {isMobile && label === 'Pending' ? 'P' : isMobile && label === 'Confirmed' ? 'C' : isMobile && label === 'Completed' ? 'D' : isMobile && label === 'Cancelled' ? 'X' : isMobile ? '📱' : label}
                </span>
              </div>
            ))}
          </div>
          
          {!isMobile && (
            <div className={`flex items-center gap-2 md:gap-5 text-[8px] md:text-xs flex-wrap ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              <div className="flex items-center gap-0.5 md:gap-1.5">
                <span className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px] md:text-[9px]" style={{ backgroundColor: COLORS.info }}>!</span>
                <span className={isDarkMode ? 'text-gray-400' : ''}>Change</span>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1.5">
                <span className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 rounded-full flex items-center justify-center text-white font-bold text-[6px] md:text-[9px]" style={{ backgroundColor: COLORS.purple }}>✕</span>
                <span className={isDarkMode ? 'text-gray-400' : ''}>Cancel</span>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1">
                <span className="text-primary text-[10px] md:text-sm">🖱</span>
                <span className={`hidden sm:inline ${isDarkMode ? 'text-gray-400' : ''}`}>Drag to move</span>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1">
                <span className="text-primary text-[10px] md:text-sm">↕</span>
                <span className={`hidden sm:inline ${isDarkMode ? 'text-gray-400' : ''}`}>Resize</span>
              </div>
              <div className="flex items-center gap-0.5 md:gap-1">
                <span className="text-primary text-[10px] md:text-sm">✚</span>
                <span className={`hidden sm:inline ${isDarkMode ? 'text-gray-400' : ''}`}>Click slot</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <MealStatusMenu
          position={contextMenu.position}
          reservation={contextMenu.reservation}
          onClose={() => setContextMenu(null)}
        />
      )}
      {overlapMenu && (
        <OverlapMenu
          overlapMenu={overlapMenu}
          onClose={() => setOverlapMenu(null)}
        />
      )}
    </div>
  );
};

export default CalendarView;