// src/components/reservation-software/ReservationTableView.jsx
// GastroPlanner-inspired: dark floor map (left) + dense reservation grid (right)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  getFirestore, collection, doc, getDoc, onSnapshot, updateDoc,
} from 'firebase/firestore';
import { FiUsers, FiClock, FiSearch, FiChevronLeft, FiChevronRight, FiFilter, FiPhone, FiMail, FiMessageSquare, FiLock, FiFileText } from 'react-icons/fi';

const db = getFirestore();

// ─── Floor map constants ────────────────────────────────────────────────────────
const GRID    = 20;
const CHAIR_W = 16;
const CHAIR_H = 10;
const CHAIR_GAP = 6;

const TABLE_SIZES = {
  square:    { w: 72,  h: 72  },
  rectangle: { w: 120, h: 64  },
  round:     { w: 72,  h: 72  },
  bar:       { w: 150, h: 46  },
};

const ZONE_COLORS = [
  { id: "none",   fill: null,      stroke: null      },
  { id: "green",  fill: "#bbf7d0", stroke: "#22c55e" },
  { id: "yellow", fill: "#fef08a", stroke: "#eab308" },
  { id: "pink",   fill: "#fbcfe8", stroke: "#ec4899" },
  { id: "purple", fill: "#ddd6fe", stroke: "#8b5cf6" },
  { id: "blue",   fill: "#bfdbfe", stroke: "#3b82f6" },
  { id: "orange", fill: "#fed7aa", stroke: "#f97316" },
  { id: "white",  fill: "#f1f5f9", stroke: "#94a3b8" },
];

const MEAL_STATUS_COLORS = {
  arrived:        "#ef4444",
  food_delivered: "#3b82f6",
  dessert:        "#8b5cf6",
  bill_delivered: "#eab308",
  table_cleared:  "#84cc16",
  no_show:        "#f1f5f9",
};

const statusFill = (t, mealStatus, derivedStatus) => {
  if (mealStatus && MEAL_STATUS_COLORS[mealStatus]) return MEAL_STATUS_COLORS[mealStatus];
  if (derivedStatus === "seated")   return "#ef4444";
  if (derivedStatus === "reserved") return "#f59e0b";
  if (t.online === false)           return "#8b5cf6";
  return "#22c55e";
};

function getTableColor(table, zone, mealStatus, derivedStatus) {
  const zObj = ZONE_COLORS.find(z => z.id === (zone || "none")) || ZONE_COLORS[0];
  const fill   = zObj.fill   || "#334155";
  const stroke = statusFill(table, mealStatus, derivedStatus);
  return { fill, stroke };
}

function circleChairs(cx, cy, r, n) {
  if (!n || n <= 0) return [];
  const orbitR = r + CHAIR_GAP + CHAIR_H / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { cx: cx + orbitR * Math.cos(a), cy: cy + orbitR * Math.sin(a), deg: (a * 180) / Math.PI + 90 };
  });
}
function rectChairs(tx, ty, tw, th, n) {
  if (!n || n <= 0) return [];
  const perTop    = Math.max(1, Math.ceil(n / 4));
  const perBottom = Math.max(1, Math.ceil(n / 4));
  const rem = n - perTop - perBottom;
  const perLeft  = rem > 0 ? Math.ceil(rem / 2) : 0;
  const perRight = rem > 0 ? rem - perLeft : 0;
  const chairs = [];
  for (let i = 0; i < perTop;    i++) chairs.push({ x: tx + ((i+1)/(perTop+1))    * tw - CHAIR_W/2, y: ty - CHAIR_GAP - CHAIR_H, isH: true  });
  for (let i = 0; i < perBottom; i++) chairs.push({ x: tx + ((i+1)/(perBottom+1)) * tw - CHAIR_W/2, y: ty + th + CHAIR_GAP,      isH: true  });
  for (let i = 0; i < perLeft;   i++) chairs.push({ x: tx - CHAIR_GAP - CHAIR_H, y: ty + ((i+1)/(perLeft+1))  * th - CHAIR_W/2, isH: false });
  for (let i = 0; i < perRight;  i++) chairs.push({ x: tx + tw + CHAIR_GAP,       y: ty + ((i+1)/(perRight+1)) * th - CHAIR_W/2, isH: false });
  return chairs;
}

// ─── Reservation helpers ────────────────────────────────────────────────────────
const STATUS_CFG = {
  confirmed: { bg: "#16a34a", text: "#fff",     label: "Confirmed" },
  pending:   { bg: "#d97706", text: "#fff",     label: "Pending"   },
  cancelled: { bg: "#dc2626", text: "#fff",     label: "Cancelled" },
  completed: { bg: "#2563eb", text: "#fff",     label: "Completed" },
};
const statusCfg = (s) => STATUS_CFG[s?.toLowerCase()] || STATUS_CFG.pending;

const MEAL_CFG = {
  arrived:        { color: "#ef4444", icon: "🔴", label: "Arrived"        },
  food_delivered: { color: "#3b82f6", icon: "🔵", label: "Food"           },
  dessert:        { color: "#8b5cf6", icon: "🟣", label: "Dessert"        },
  bill_delivered: { color: "#eab308", icon: "🟡", label: "Bill"           },
  table_cleared:  { color: "#84cc16", icon: "🟢", label: "Cleared"        },
  no_show:        { color: "#ffffff", icon: "⚫", label: "No Show", bg: "#374151"  },
};

const fmtTime = (d) => {
  const dt = d?.toDate?.() || (d ? new Date(d) : null);
  if (!dt) return "--:--";
  return dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
};
const fmtEndTime = (d, mins) => {
  const dt = d?.toDate?.() || (d ? new Date(d) : null);
  if (!dt || !mins) return "--:--";
  return new Date(dt.getTime() + mins * 60000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
};

// ─── Note Indicator Component ──────────────────────────────────────────────────
const NoteIndicator = ({ publicNote, internalNote }) => {
  const hasPublic = publicNote && publicNote.trim().length > 0;
  const hasInternal = internalNote && internalNote.trim().length > 0;
  
  if (!hasPublic && !hasInternal) return null;
  
  return (
    <div className="flex items-center gap-0.5">
      {hasPublic && (
        <div className="relative group">
          <FiFileText className="w-3.5 h-3.5 text-blue-400" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-slate-600">
            Public: {publicNote.length > 30 ? publicNote.slice(0, 30) + '...' : publicNote}
          </div>
        </div>
      )}
      {hasInternal && (
        <div className="relative group">
          <FiLock className="w-3.5 h-3.5 text-amber-400" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-slate-600">
            Internal: {internalNote.length > 30 ? internalNote.slice(0, 30) + '...' : internalNote}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function ReservationTableView({ selectedRestaurant, reservations, selectedDate, onReservationClick, onNewBookingFromTable, onWalkInFromTable, onDateChange }) {
  const svgRef  = useRef(null);
  const wrapRef = useRef(null);

  // Map
  const [positions, setPositions] = useState({});
  const [shapes,    setShapes]    = useState({});
  const [zones,     setZones]     = useState({});
  const [scales,    setScales]    = useState({});
  const [rots,      setRots]      = useState({});
  const [walls,     setWalls]     = useState([]);
  const [canvasBg,  setCanvasBg]  = useState("#0f172a");
  const [gridColor, setGridColor] = useState("#1e293b");
  const [gridStyle, setGridStyle] = useState("dots");
  const [canvasSize,setCanvasSize]= useState({ w: 1600, h: 1000 });
  const [tables,    setTables]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  // View
  const [zoom,   setZoom]   = useState(0.65);
  const [pan,    setPan]    = useState({ x: 20, y: 20 });
  const isPanning = useRef(false);
  const panStart  = useRef(null);

  // Splitter — percentage of total width given to floor map
  const [splitPct,     setSplitPct]     = useState(38);
  const [isResizing,   setIsResizing]   = useState(false);
  const containerRef = useRef(null);
  const splitterRef  = useRef(null);

  // Responsive: detect screen size
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      // Auto-adjust split for tablet/mobile
      if (width < 1024) {
        setSplitPct(prev => Math.min(prev, 45));
      }
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Splitter drag handlers
  const onSplitterMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    const onMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxPct = isMobile ? 70 : 80;
      const minPct = isMobile ? 15 : 20;
      const pct = Math.min(maxPct, Math.max(minPct, ((e.clientX - rect.left) / rect.width) * 100));
      setSplitPct(Math.round(pct));
    };
    const onUp = () => setIsResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isResizing, isMobile]);

  // Selection
  const [selectedTableIds, setSelectedTableIds] = useState([]);

  // Right panel
  const [viewDate,     setViewDate]     = useState(selectedDate || new Date());
  const [searchQ,      setSearchQ]      = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedRes,  setExpandedRes]  = useState(null);
  const [updatingMeal, setUpdatingMeal] = useState(null);
  const [showFilter,   setShowFilter]   = useState(false);
  const [guestFilter,  setGuestFilter]  = useState({ min: "", max: "" });
  const [timeFilter,   setTimeFilter]   = useState({ from: "", to: "" });
  const [tableFilter,  setTableFilter]  = useState("");
  const [dateRange,    setDateRange]    = useState({ start: "", end: "" });

  useEffect(() => { if (selectedDate) setViewDate(selectedDate); }, [selectedDate]);

  // ── Load map + tables ──
  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const col = selectedRestaurant._collection || "restaurants";
    const rid = selectedRestaurant.id;

    setTables([]);
    setPositions({});
    setShapes({});
    setZones({});
    setScales({});
    setRots({});
    setWalls([]);
    setLoading(true);

    let loadedTables = [];

    const unsub = onSnapshot(collection(db, col, rid, "tables"), snap => {
      loadedTables = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTables(loadedTables);
    });

    getDoc(doc(db, col, rid, "tableMap", "layout")).then(snap => {
      if (snap.exists()) {
        const d = snap.data();
        const savedPositions = d.positions || {};

        const autoFill = (currentTables) => {
          const filled = { ...savedPositions };
          let idx = 0;
          currentTables.forEach(t => {
            if (!t?.id || filled[t.id]) return;
            const col2 = 5;
            filled[t.id] = { x: 80 + (idx % col2) * 200, y: 80 + Math.floor(idx / col2) * 200 };
            idx++;
          });
          return filled;
        };

        setPositions(autoFill(loadedTables));
        setShapes(d.shapes || {});
        setZones(d.zones   || {});
        setScales(d.scales || {});
        setRots(d.rots     || {});
        setWalls(d.walls   || []);
        if (d.canvasBg)   setCanvasBg(d.canvasBg);
        if (d.gridColor)  setGridColor(d.gridColor);
        if (d.gridStyle)  setGridStyle(d.gridStyle);
        if (d.canvasSize) setCanvasSize(d.canvasSize);
      } else {
        setPositions(prev => prev);
      }
      setLoading(false);
    }).catch(e => { console.error("Map load error:", e); setLoading(false); });

    return () => unsub();
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    if (tables.length === 0) return;
    setPositions(prev => {
      const filled = { ...prev };
      let needsUpdate = false;
      let idx = Object.keys(filled).length;
      tables.forEach(t => {
        if (!t?.id || filled[t.id]) return;
        const col2 = 5;
        filled[t.id] = { x: 80 + (idx % col2) * 200, y: 80 + Math.floor(idx / col2) * 200 };
        idx++;
        needsUpdate = true;
      });
      return needsUpdate ? filled : prev;
    });
    setShapes(prev => {
      const filled = { ...prev };
      tables.forEach(t => { if (t?.id && !filled[t.id]) filled[t.id] = "square"; });
      return filled;
    });
  }, [tables]);

  // ── Wheel zoom ──
  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.15, Math.min(3, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // ── Pan ──
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    isPanning.current = false;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y, moved: false };
  }, [pan]);
  const onMouseMove = useCallback((e) => {
    if (!panStart.current) return;
    const dx = e.clientX - panStart.current.x - pan.x;
    const dy = e.clientY - panStart.current.y - pan.y;
    if (Math.hypot(dx, dy) > 4) { isPanning.current = true; panStart.current.moved = true; }
    if (panStart.current.moved) setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, [pan]);
  const onMouseUp = useCallback(() => { panStart.current = null; }, []);
  const [tablePopover, setTablePopover] = useState(null);
  const [mealPickerRes, setMealPickerRes] = useState(null);

  useEffect(() => {
    if (!tablePopover && !mealPickerRes) return;
    const handleGlobalClick = () => {
      setTablePopover(null);
      setMealPickerRes(null);
    };
    const timer = setTimeout(() => {
      document.addEventListener('click', handleGlobalClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [tablePopover, mealPickerRes]);

  const handleTableClick = useCallback((tableId, e) => {
    e.stopPropagation();
    if (isPanning.current) return;
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedTableIds(prev => prev.includes(tableId) ? prev.filter(x => x !== tableId) : [...prev, tableId]);
      setTablePopover(null);
      return;
    }
    setSelectedTableIds(prev => (prev.length === 1 && prev[0] === tableId) ? [] : [tableId]);
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      setTablePopover({ tableId, x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const handleTableRightClick = useCallback((tableId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPanning.current) return;
    
    const dayS = new Date(viewDate); 
    dayS.setHours(0, 0, 0, 0);
    const dayE = new Date(viewDate); 
    dayE.setHours(23, 59, 59, 999);
    
    const tableRes = (reservations || []).filter(r => {
      if (r.status === 'cancelled' || r.status === 'completed') return false;
      const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      if (rd < dayS || rd > dayE) return false;
      return r.table_id === tableId || (Array.isArray(r.table_ids) && r.table_ids.includes(tableId));
    }).sort((a, b) => {
      const da = a.reservation_date?.toDate?.() || new Date(a.reservation_date);
      const db2 = b.reservation_date?.toDate?.() || new Date(b.reservation_date);
      return da - db2;
    });

    if (tableRes.length === 0) return;

    const now = new Date();
    const activeRes = tableRes.find(r => {
      const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
      const resEnd = new Date(rd.getTime() + (r.duration_minutes || 90) * 60000);
      return now >= rd && now <= resEnd;
    }) || tableRes[0];

    setTablePopover(null);
    setMealPickerRes({
      resId: activeRes.id,
      name: activeRes.customer_name || 'Guest',
      x: e.clientX,
      y: e.clientY,
    });
  }, [reservations, viewDate]);

  // ── Meal status update ──
  const updateMealStatus = async (resId, status) => {
    setUpdatingMeal(resId);
    try {
      await updateDoc(doc(db, "reservations", resId), { 
        meal_status: status, 
        updated_at: new Date() 
      });
    } catch(e) { 
      console.error("Error updating meal status:", e); 
    } finally { 
      setUpdatingMeal(null); 
    }
  };

  // ── Filter reservations ──
  const hasDateRange = dateRange.start || dateRange.end;
  const rangeStart = dateRange.start
    ? new Date(dateRange.start + "-01T00:00:00")
    : null;
  const rangeEnd = dateRange.end
    ? (() => {
        const [y, m] = dateRange.end.split("-").map(Number);
        const d = new Date(y, m, 0);
        d.setHours(23, 59, 59, 999);
        return d;
      })()
    : null;
  const dayStart = new Date(viewDate); dayStart.setHours(0,0,0,0);
  const dayEnd   = new Date(viewDate); dayEnd.setHours(23,59,59,999);

  const filteredReservations = (reservations || []).filter(r => {
    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
    if (hasDateRange) {
      if (rangeStart && rd < rangeStart) return false;
      if (rangeEnd   && rd > rangeEnd)   return false;
    } else {
      if (rd < dayStart || rd > dayEnd) return false;
    }
    if (statusFilter !== "all" && r.status?.toLowerCase() !== statusFilter) return false;
    if (guestFilter.min && (r.number_of_guests || 0) < parseInt(guestFilter.min)) return false;
    if (guestFilter.max && (r.number_of_guests || 0) > parseInt(guestFilter.max)) return false;
    if (timeFilter.from) {
      const [fh, fm] = timeFilter.from.split(":").map(Number);
      const rdH = rd.getHours(), rdM = rd.getMinutes();
      if (rdH * 60 + rdM < fh * 60 + fm) return false;
    }
    if (timeFilter.to) {
      const [th, tm] = timeFilter.to.split(":").map(Number);
      const rdH = rd.getHours(), rdM = rd.getMinutes();
      if (rdH * 60 + rdM > th * 60 + tm) return false;
    }
    if (tableFilter) {
      const tnames = (r.table_names || (r.table_name ? [r.table_name] : [])).join(" ").toLowerCase();
      if (!tnames.includes(tableFilter.toLowerCase())) return false;
    }
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const name  = (r.customer_name  || "").toLowerCase();
      const phone = (r.customer_phone || "").toLowerCase();
      const email = (r.customer_email || "").toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !email.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => {
    const da = a.reservation_date?.toDate?.() || new Date(a.reservation_date);
    const db2 = b.reservation_date?.toDate?.() || new Date(b.reservation_date);
    return da - db2;
  });

  // Count reservations per table for today
  const tableResCounts = {};
  (reservations || []).forEach(r => {
    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
    const inRange = hasDateRange
      ? (!rangeStart || rd >= rangeStart) && (!rangeEnd || rd <= rangeEnd)
      : rd >= dayStart && rd <= dayEnd;
    if (!inRange || r.status === "cancelled") return;
    const ids = Array.isArray(r.table_ids) ? r.table_ids : (r.table_id ? [r.table_id] : []);
    ids.forEach(tid => { tableResCounts[tid] = (tableResCounts[tid] || 0) + 1; });
  });

  const CANVAS = canvasSize;
  const selectedTable = selectedTableIds.length === 1 ? tables.find(t => t.id === selectedTableIds[0]) : null;

  // Build meal status map
  const tableMealStatus = {};
  (reservations || []).forEach(r => {
    if (!r.meal_status) return;
    if (r.status === 'cancelled' || r.status === 'completed') return;
    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
    const inRange = hasDateRange
      ? (!rangeStart || rd >= rangeStart) && (!rangeEnd || rd <= rangeEnd)
      : rd >= dayStart && rd <= dayEnd;
    if (!inRange) return;
    const ids = Array.isArray(r.table_ids) ? r.table_ids : (r.table_id ? [r.table_id] : []);
    ids.forEach(tid => { tableMealStatus[tid] = r.meal_status; });
  });

  const tableDerivedStatus = {};
  const mapDayStart = new Date(viewDate); mapDayStart.setHours(0, 0, 0, 0);
  const mapDayEnd   = new Date(viewDate); mapDayEnd.setHours(23, 59, 59, 999);

  (reservations || []).forEach(r => {
    if (r.status === 'cancelled' || r.status === 'completed') return;
    const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
    if (rd < mapDayStart || rd > mapDayEnd) return;
    const ids = Array.isArray(r.table_ids) ? r.table_ids : (r.table_id ? [r.table_id] : []);
    const now = new Date();
    const resEnd = new Date(rd.getTime() + (r.duration_minutes || 90) * 60000);
    ids.forEach(tid => {
      if (now >= rd && now <= resEnd) {
        tableDerivedStatus[tid] = 'seated';
      } else if (!tableDerivedStatus[tid]) {
        tableDerivedStatus[tid] = 'reserved';
      }
    });
  });

  // Get responsive grid columns
  const getGridColumns = () => {
    if (isMobile) {
      return "32px 60px 40px 1fr 1fr 40px";
    }
    if (isTablet) {
      return "32px 70px 60px 1fr 1fr 80px 60px";
    }
    return "36px 80px 90px 60px 1fr 1fr 110px 100px 48px";
  };

  // Get responsive column headers
  const getColumnHeaders = () => {
    if (isMobile) {
      return ["#", "TIME", "STA", "NAME", "TABLE", ""];
    }
    if (isTablet) {
      return ["#", "TIME", "STA", "NAME", "TABLE", "MEAL", ""];
    }
    return ["#", "TIME", "STATUS", "PAX", "FIRST NAME", "LAST NAME", "TABLE", "MEAL", ""];
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full" style={{ background: "#0f172a" }}>
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" />
    </div>
  );

  return (
    <div 
      ref={containerRef} 
      className="flex flex-col md:flex-row h-full min-h-0 overflow-hidden bg-gray-900" 
      style={{ 
        height: "100%", 
        maxHeight: "100%", 
        cursor: isResizing ? "col-resize" : "default",
        flexDirection: isMobile ? "column" : "row"
      }}
    >

      {/* ══════════════════════════════════════════════
          LEFT: Floor Map
      ══════════════════════════════════════════════ */}
      <div 
        className="flex flex-col h-full min-h-0" 
        style={{ 
          width: isMobile ? "100%" : `${splitPct}%`,
          minWidth: isMobile ? "100%" : 200, 
          maxHeight: isMobile ? "50vh" : "100%",
          flexShrink: 0,
          flexGrow: isMobile ? 1 : 0
        }}
      >

        {/* Map header */}
        <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0 flex-wrap gap-1"
          style={{ background: "#1e293b", borderColor: "#334155" }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Floor Plan</span>
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              {viewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            {selectedTableIds.length > 0 && (
              <span className="text-[10px] bg-[#fe8a24] text-white px-2 py-0.5 rounded-full font-semibold">
                {selectedTableIds.length === 1 ? `Table ${tables.find(t=>t.id===selectedTableIds[0])?.name||""}` : `${selectedTableIds.length} selected`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {/* Legend dots - hide on mobile */}
            <div className="hidden md:flex items-center gap-1">
              {[["#22c55e","free"],["#f59e0b","reserved"],["#ef4444","seated"],["#8b5cf6","internal"]].map(([c,l])=>(
                <div key={l} className="flex items-center gap-0.5 mr-1">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: c }} />
                  <span className="text-[10px] text-slate-400">{l}</span>
                </div>
              ))}
              <div className="w-px h-3 mx-1" style={{ background: "#334155" }} />
            </div>
            <button onClick={() => setZoom(z => Math.min(3, +(z+0.1).toFixed(2)))}
              className="w-6 h-6 rounded text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold">+</button>
            <span className="text-[10px] text-slate-400 w-8 text-center hidden sm:inline">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.max(0.15, +(z-0.1).toFixed(2)))}
              className="w-6 h-6 rounded text-slate-300 hover:bg-slate-700 flex items-center justify-center text-sm font-bold">−</button>
            <button onClick={() => { setZoom(0.65); setPan({x:20,y:20}); }}
              className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 hover:bg-slate-700 hidden sm:inline">Reset</button>
            {selectedTableIds.length > 0 && (
              <button onClick={() => setSelectedTableIds([])}
                className="text-[10px] px-1.5 py-0.5 rounded text-slate-400 hover:bg-slate-700 ml-1">
                Clear
              </button>
            )}
          </div>
        </div>

        {/* SVG canvas */}
        <div ref={wrapRef} className="flex-1 overflow-hidden select-none min-h-0 relative"
          style={{ background: canvasBg, cursor: panStart.current?.moved ? "grabbing" : "grab" }}
          onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
          onClick={(e) => {
            if (!isPanning.current) {
              setSelectedTableIds([]);
              setTablePopover(null);
              setMealPickerRes(null);
            }
          }}
        >
          <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <rect x={-5000} y={-5000} width={CANVAS.w+10000} height={CANVAS.h+10000} fill={canvasBg} />

              {/* Grid */}
              {gridStyle === "dots" && Array.from({length:Math.ceil((CANVAS.h+1000)/GRID)}).map((_,r) =>
                Array.from({length:Math.ceil((CANVAS.w+1000)/GRID)}).map((_,c) => (
                  <circle key={`${r}-${c}`} cx={c*GRID} cy={r*GRID} r={0.7} fill={gridColor} />
                ))
              )}
              {gridStyle === "lines" && <>
                {Array.from({length:Math.ceil((CANVAS.w+1000)/GRID)}).map((_,c) => (
                  <line key={`v${c}`} x1={c*GRID} y1={-200} x2={c*GRID} y2={CANVAS.h+200} stroke={gridColor} strokeWidth={0.4} opacity={0.6} />
                ))}
                {Array.from({length:Math.ceil((CANVAS.h+1000)/GRID)}).map((_,r) => (
                  <line key={`h${r}`} x1={-200} y1={r*GRID} x2={CANVAS.w+200} y2={r*GRID} stroke={gridColor} strokeWidth={0.4} opacity={0.6} />
                ))}
              </>}

              {/* Walls */}
              {walls.map(w => (
                <line key={w.id} x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                  stroke="#cbd5e1" strokeWidth={w.thick||8} strokeLinecap="round" />
              ))}

              {/* Tables */}
              {tables.map(table => {
                if (!table?.id) return null;
                const pos   = positions[table.id]; if (!pos) return null;
                const shape = shapes[table.id] || "square";
                const sz    = TABLE_SIZES[shape] || TABLE_SIZES.square;
                const scale = scales[table.id]  || 1;
                const rot   = rots[table.id]    || 0;
                const w = sz.w * scale, h = sz.h * scale;
                const cx = pos.x + w/2, cy = pos.y + h/2;
                const pax = Math.max(0, table.maxCapacity || 0);
                const zone = zones[table.id] || "none";
                const { fill, stroke } = getTableColor(table, zone, tableMealStatus[table.id], tableDerivedStatus[table.id]);
                const isSel = selectedTableIds.includes(table.id);
                const resCount = tableResCounts[table.id] || 0;

                return (
                  <g key={table.id}
                    transform={rot ? `rotate(${rot},${cx},${cy})` : undefined}
                    style={{ cursor: "pointer" }}
                    onClick={(e) => handleTableClick(table.id, e)}
                    onContextMenu={(e) => handleTableRightClick(table.id, e)}
                  >
                    {/* Chairs */}
                    {shape === "round"
                      ? circleChairs(cx, cy, w/2, pax).map((c,i) => (
                          <g key={i} transform={`rotate(${c.deg},${c.cx},${c.cy})`}>
                            <rect x={c.cx-CHAIR_W/2} y={c.cy-CHAIR_H/2} width={CHAIR_W} height={CHAIR_H}
                              rx={3} fill="#64748b" />
                          </g>
                        ))
                      : rectChairs(pos.x, pos.y, w, h, pax).map((c,i) =>
                          c.isH
                            ? <rect key={i} x={c.x} y={c.y} width={CHAIR_W} height={CHAIR_H} rx={3} fill="#64748b" />
                            : <g key={i} transform={`rotate(90,${c.x+CHAIR_H/2},${c.y+CHAIR_W/2})`}>
                                <rect x={c.x} y={c.y} width={CHAIR_H} height={CHAIR_W} rx={3} fill="#64748b" />
                              </g>
                        )
                    }

                    {/* Selection glow */}
                    {isSel && (shape === "round"
                      ? <circle cx={cx} cy={cy} r={w/2+8} fill="#fe8a24" opacity={0.2} />
                      : <rect x={pos.x-8} y={pos.y-8} width={w+16} height={h+16} rx={14} fill="#fe8a24" opacity={0.2} />
                    )}

                    {/* Table surface */}
                    {shape === "round"
                      ? <circle cx={cx} cy={cy} r={w/2} fill={fill} stroke={stroke} strokeWidth={isSel?3:2.5} />
                      : <rect x={pos.x} y={pos.y} width={w} height={h} rx={8}
                          fill={fill} stroke={stroke} strokeWidth={isSel?3:2.5} />
                    }

                    {/* Selection ring */}
                    {isSel && (shape === "round"
                      ? <circle cx={cx} cy={cy} r={w/2+5} fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="4 2" />
                      : <rect x={pos.x-5} y={pos.y-5} width={w+10} height={h+10} fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="4 2" rx={12} />
                    )}

                    {/* Table name */}
                    <text x={cx} y={cy + (resCount > 0 ? 3 : 5)}
                      textAnchor="middle" fontSize={Math.max(11, Math.min(w/5, 16))} fontWeight="700"
                      fill="#ffffff" style={{ fontFamily: "system-ui,sans-serif", pointerEvents: "none" }}>
                      {table.name}
                    </text>
                    {resCount > 0 && (
                      <text x={cx} y={cy + 16} textAnchor="middle" fontSize={9} fill="#ffffff" opacity={0.7}
                        style={{ fontFamily: "system-ui,sans-serif", pointerEvents: "none" }}>
                        {resCount} res
                      </text>
                    )}

                    {/* Reservation count badge */}
                    {resCount > 0 && (
                      <g>
                        <circle cx={pos.x + w - 2} cy={pos.y + 2} r={8} fill="#fe8a24" stroke={canvasBg} strokeWidth={1.5} />
                        <text x={pos.x + w - 2} y={pos.y + 6} textAnchor="middle" fontSize={8} fontWeight="800"
                          fill="white" style={{ fontFamily: "system-ui,sans-serif", pointerEvents: "none" }}>
                          {resCount > 9 ? "9+" : resCount}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
          {/* ── Table popover ── */}
          {tablePopover && (() => {
            const popoverTable = tables.find(t => t.id === tablePopover.tableId);
            const tableRes = (reservations || []).filter(r => {
              if (r.status === 'cancelled') return false;
              const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
              const inRange = hasDateRange
                ? (!rangeStart || rd >= rangeStart) && (!rangeEnd || rd <= rangeEnd)
                : rd >= dayStart && rd <= dayEnd;
              if (!inRange) return false;
              return r.table_id === tablePopover.tableId ||
                (Array.isArray(r.table_ids) && r.table_ids.includes(tablePopover.tableId));
            }).sort((a,b) => {
              const da = a.reservation_date?.toDate?.() || new Date(a.reservation_date);
              const db2 = b.reservation_date?.toDate?.() || new Date(b.reservation_date);
              return da - db2;
            });

            const popW = isMobile ? 200 : 220;
            const popH = Math.min(40 + tableRes.length * 44, 300);
            const mapRect = wrapRef.current?.getBoundingClientRect();
            const mapW = mapRect?.width || 400;
            const mapH = mapRect?.height || 400;
            let px = tablePopover.x + 12;
            let py = tablePopover.y + 12;
            if (px + popW > mapW - 8) px = tablePopover.x - popW - 8;
            if (py + popH > mapH - 8) py = tablePopover.y - popH - 8;

            return (
              <div
                style={{
                  position: 'absolute', left: px, top: py, width: popW, zIndex: 50,
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  overflow: 'hidden', pointerEvents: 'auto',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ background: '#0f172a', padding: '8px 12px', borderBottom: '1px solid #334155' }}
                  className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Table {popoverTable?.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {popoverTable?.maxCapacity ? `Cap. ${popoverTable.maxCapacity}` : ''}
                    </span>
                    <button onClick={() => setTablePopover(null)}
                      className="text-slate-500 hover:text-white text-xs leading-none">×</button>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ padding: '8px 10px', borderBottom: '1px solid #334155' }}
                  className="flex gap-1.5 flex-wrap">
                  <button
                   onClick={() => {
                      const tId = tablePopover.tableId;
                      const tName = tables.find(t => t.id === tId)?.name;
                      const now = new Date();
                      const base = new Date(viewDate);
                      const roundedMins = Math.ceil((now.getHours() * 60 + now.getMinutes()) / 15) * 15;
                      base.setHours(Math.floor(roundedMins / 60), roundedMins % 60, 0, 0);
                      setTablePopover(null);
                      onNewBookingFromTable?.(tId, tName, base);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-white bg-[#fe8a24] hover:bg-[#ff9d47] rounded-lg py-1.5 transition-colors min-w-[60px]">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    New
                  </button>
                  <button
                   onClick={() => {
                      const tId = tablePopover.tableId;
                      const tName = tables.find(t => t.id === tId)?.name;
                      const now = new Date();
                      const base = new Date(viewDate);
                      base.setHours(now.getHours(), now.getMinutes(), 0, 0);
                      setTablePopover(null);
                      onWalkInFromTable?.(tId, tName, base);
                    }}
                    className="flex-1 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg py-1.5 transition-colors min-w-[60px]">
                    🚶 Walk in
                  </button>
                </div>

                {/* Reservations list */}
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {tableRes.length === 0 ? (
                    <div className="text-center text-[10px] text-slate-500 py-4">No reservations today</div>
                  ) : (
                    tableRes.map(r => {
                      const rd = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
                      const startStr = rd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const endDate = new Date(rd.getTime() + (r.duration_minutes || 90) * 60000);
                      const endStr = endDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
                      const mCfg = MEAL_CFG[r.meal_status];
                      const sCfg = STATUS_CFG[r.status?.toLowerCase()] || STATUS_CFG.pending;
                      return (
                        <div key={r.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700/50 last:border-0 select-none"
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMealPickerRes({ 
                              resId: r.id, 
                              name: r.customer_name || 'Guest', 
                              x: e.clientX, 
                              y: e.clientY 
                            });
                          }}
                          onClick={(e) => {
                            onReservationClick && onReservationClick(r);
                            setTablePopover(null);
                          }}
                        >
                          {/* Time block */}
                          <div className="flex-shrink-0 text-center">
                            <div className="text-[11px] font-bold text-white">{startStr}</div>
                            <div className="text-[10px] text-slate-400">{endStr}</div>
                          </div>
                          {/* Guest info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-semibold text-white truncate">
                                {r.customer_name || 'Guest'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-slate-400">👥 {r.number_of_guests}</span>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                style={{ background: sCfg.bg + '33', color: sCfg.bg }}>
                                {sCfg.label}
                              </span>
                            </div>
                            {mCfg && (
                              <div className="mt-1">
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: (mCfg.bg || mCfg.color) + '33',
                                    color: mCfg.color,
                                    border: `1px solid ${mCfg.color}40`,
                                  }}>
                                  {mCfg.icon} {mCfg.label}
                                </span>
                              </div>
                            )}
                          </div>
                          <svg className="w-3 h-3 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── Meal status picker ── */}
          {mealPickerRes && (() => {
            const pickerW = isMobile ? 180 : 220;
            const pickerH = Object.keys(MEAL_CFG).length * 44 + 80;
            const vw = window.innerWidth, vh = window.innerHeight;
            let px = mealPickerRes.x + 8;
            let py = mealPickerRes.y + 8;
            if (px + pickerW > vw - 8) px = mealPickerRes.x - pickerW - 8;
            if (py + pickerH > vh - 8) py = mealPickerRes.y - pickerH - 8;

            return (
              <div
                style={{
                  position: 'fixed', left: px, top: py, width: pickerW, zIndex: 100,
                  background: '#1e293b', border: '1px solid #334155',
                  borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  overflow: 'hidden',
                }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ background: '#0f172a', padding: '8px 12px', borderBottom: '1px solid #334155' }}
                  className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meal Status</p>
                    <p className="text-xs font-semibold text-white truncate">{mealPickerRes.name}</p>
                  </div>
                  <button onClick={() => setMealPickerRes(null)}
                    className="text-slate-500 hover:text-white text-sm leading-none ml-2">×</button>
                </div>

                {/* Options */}
                <div>
                  {Object.entries(MEAL_CFG).map(([k, v]) => {
                    const currentRes = (reservations || []).find(r => r.id === mealPickerRes.resId);
                    const isActive = currentRes?.meal_status === k;
                    return (
                     <button key={k}
                        onClick={async () => {
                          await updateMealStatus(mealPickerRes.resId, isActive ? null : k);
                          setMealPickerRes(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/60 transition-colors text-left"
                        style={{ background: isActive ? v.color + '20' : 'transparent' }}>
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ backgroundColor: v.color }} />
                        <span className="text-sm text-white font-medium">{v.label}</span>
                        {isActive && <span className="ml-auto text-[10px] text-slate-400">✓ active</span>}
                      </button>
                    );
                  })}
                  {(() => {
                    const currentRes = (reservations || []).find(r => r.id === mealPickerRes.resId);
                    return currentRes?.meal_status ? (
                      <button
                        onClick={async () => {
                          await updateMealStatus(mealPickerRes.resId, null);
                          setMealPickerRes(null);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-900/30 transition-colors text-left border-t border-slate-700">
                        <span className="w-3.5 h-3.5 rounded-full flex-shrink-0 bg-slate-600" />
                        <span className="text-sm text-slate-400 font-medium">Clear status</span>
                      </button>
                    ) : null;
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Map footer hint - hide on mobile */}
        <div className="px-3 py-1.5 flex-shrink-0 border-t flex items-center gap-3 hidden md:flex"
          style={{ background: "#1e293b", borderColor: "#334155" }}>
          <span className="text-[10px] text-slate-500">Click table · Right-click meal · Shift+click multi · Scroll zoom · Drag pan</span>
          <span className="ml-auto text-[10px] text-slate-500">{tables.length} tables · {filteredReservations.length} reservations</span>
        </div>
        {/* Mobile footer hint */}
        <div className="px-3 py-1.5 flex-shrink-0 border-t flex items-center gap-3 md:hidden"
          style={{ background: "#1e293b", borderColor: "#334155" }}>
          <span className="text-[9px] text-slate-500">Tap table · Hold for meal</span>
          <span className="ml-auto text-[9px] text-slate-500">{tables.length} tables</span>
        </div>
      </div>

      {/* Draggable splitter - hide on mobile */}
      {!isMobile && (
        <div
          ref={splitterRef}
          onMouseDown={onSplitterMouseDown}
          className="flex-shrink-0 relative group"
          style={{ width: 6, background: "#1e293b", cursor: "col-resize", zIndex: 10 }}
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 rounded-full transition-all"
            style={{ background: isResizing ? "#fe8a24" : "#334155" }} />
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex flex-col gap-0.5">
              {[0,1,2].map(i => <div key={i} className="w-0.5 h-3 rounded-full" style={{ background: "#64748b" }} />)}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          RIGHT: Reservation Grid
      ══════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0" style={{ borderLeft: "none" }}>
        {/* Grid toolbar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 flex-wrap"
          style={{ background: "#1e293b", borderColor: "#334155" }}>

          {/* Date nav */}
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg px-1 py-0.5">
            <button onClick={() => { const d=new Date(viewDate); d.setDate(d.getDate()-1); setViewDate(d); onDateChange && onDateChange(d); }}
              className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-400">
              <FiChevronLeft className="w-3 h-3" />
            </button>
            <button onClick={() => { const d = new Date(); setViewDate(d); onDateChange && onDateChange(d); }}
              className="text-xs font-semibold text-white px-2 py-0.5 hover:bg-slate-700 rounded transition-colors">
              {isMobile 
                ? viewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                : viewDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
              }
            </button>
            <button onClick={() => { const d=new Date(viewDate); d.setDate(d.getDate()+1); setViewDate(d); onDateChange && onDateChange(d); }}
              className="w-6 h-6 rounded hover:bg-slate-700 flex items-center justify-center text-slate-400">
              <FiChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Status filters - simplified on mobile */}
          <div className="flex items-center gap-1 overflow-x-auto flex-nowrap">
            {[["all","All"],["confirmed","✓"],["pending","P"],["cancelled","C"],["completed","Done"]].map(([k,l]) => (
              <button key={k} onClick={() => setStatusFilter(k)}
                className={`text-xs px-2 md:px-3 py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${
                  statusFilter === k
                    ? k === "confirmed" ? "bg-green-600 text-white"
                    : k === "cancelled" ? "bg-red-600 text-white"
                    : k === "pending"   ? "bg-yellow-500 text-white"
                    : k === "completed" ? "bg-blue-600 text-white"
                    : "bg-[#fe8a24] text-white"
                    : "text-slate-400 hover:bg-slate-700 hover:text-white"
                }`}>
                {isMobile && k !== "all" ? l : k === "all" ? l : l}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="ml-auto flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1">
            <FiSearch className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder={isMobile ? "Search…" : "Search guest…"}
              className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-20 md:w-28" />
            {searchQ && <button onClick={() => setSearchQ("")} className="text-slate-500 hover:text-white text-xs">×</button>}
          </div>

          {/* Filter toggle */}
          <button onClick={() => setShowFilter(f => !f)}
            className={`flex items-center gap-1.5 px-2 md:px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
              showFilter || guestFilter.min || guestFilter.max || timeFilter.from || timeFilter.to || tableFilter || dateRange.start || dateRange.end
                ? "bg-[#fe8a24] border-[#fe8a24] text-white"
                : "border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white"
            }`}>
            <FiFilter className="w-3 h-3" />
            {!isMobile && "Filter"}
            {(guestFilter.min || guestFilter.max || timeFilter.from || timeFilter.to || tableFilter || dateRange.start || dateRange.end) && (
              <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
            )}
          </button>

          {/* Count - hide on mobile */}
          <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:inline">
            {filteredReservations.length} res
          </span>
        </div>

        {/* Filter panel - responsive grid */}
        {showFilter && (
          <div className="px-3 py-2.5 border-b flex flex-wrap items-end gap-3 md:gap-4"
            style={{ background: "#162032", borderColor: "#334155" }}>

            {/* Date range */}
            <div className="flex-1 min-w-[120px] md:min-w-[160px]">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                Month
                {(dateRange.start || dateRange.end) && (
                  <span className="text-[#fe8a24] font-bold">●</span>
                )}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <input type="month" value={dateRange.start}
                  onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-28 md:w-36"
                  style={{ colorScheme: "dark" }} />
                <span className="text-slate-500 text-sm">→</span>
                <input type="month" value={dateRange.end}
                  min={dateRange.start || undefined}
                  onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-28 md:w-36"
                  style={{ colorScheme: "dark" }} />
                {(dateRange.start || dateRange.end) && (
                  <button onClick={() => setDateRange({ start: "", end: "" })}
                    className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none" title="Clear">×</button>
                )}
              </div>
            </div>

            {/* Time from–to */}
            <div className="flex-1 min-w-[100px] md:min-w-[140px]">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Time</p>
              <div className="flex items-center gap-1 flex-wrap">
                <input type="time" value={timeFilter.from}
                  onChange={e => setTimeFilter(p => ({ ...p, from: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-20 md:w-24" />
                <span className="text-slate-500 text-xs">–</span>
                <input type="time" value={timeFilter.to}
                  onChange={e => setTimeFilter(p => ({ ...p, to: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-20 md:w-24" />
              </div>
            </div>

            {/* Guests */}
            <div className="flex-1 min-w-[80px] md:min-w-[120px]">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Guests</p>
              <div className="flex items-center gap-1">
                <input type="number" min="1" max="99" value={guestFilter.min} placeholder="min"
                  onChange={e => setGuestFilter(p => ({ ...p, min: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-12 md:w-16" />
                <span className="text-slate-500 text-xs">–</span>
                <input type="number" min="1" max="99" value={guestFilter.max} placeholder="max"
                  onChange={e => setGuestFilter(p => ({ ...p, max: e.target.value }))}
                  className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-12 md:w-16" />
              </div>
            </div>

            {/* Table name */}
            <div className="flex-1 min-w-[80px] md:min-w-[120px]">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Table</p>
              <input type="text" value={tableFilter} placeholder="e.g. VIP"
                onChange={e => setTableFilter(e.target.value)}
                className="bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1 focus:outline-none focus:border-[#fe8a24] w-full" />
            </div>

            {/* Clear all */}
            <button
              onClick={() => {
                setGuestFilter({ min: "", max: "" });
                setTimeFilter({ from: "", to: "" });
                setTableFilter("");
                setDateRange({ start: "", end: "" });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 hover:bg-red-900 hover:text-red-300 transition-colors font-medium whitespace-nowrap">
              Clear
            </button>
          </div>
        )}

        {/* Column headers - responsive */}
        <div 
          className="grid flex-shrink-0 border-b overflow-x-auto"
          style={{
            gridTemplateColumns: getGridColumns(),
            background: "#1e293b", 
            borderColor: "#334155",
            minWidth: isMobile ? "400px" : "auto"
          }}
        >
          {getColumnHeaders().map((h, i) => (
            <div key={i} className="px-2 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider truncate">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto min-h-0" style={{ background: "#0f172a" }}>
          {filteredReservations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-3">
                <FiUsers className="w-5 h-5 text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-slate-400">No reservations</p>
              <p className="text-xs text-slate-600 mt-1">
                {selectedTableIds.length > 0 ? "No reservations for selected table(s)" : "No reservations match the current filters"}
              </p>
            </div>
          ) : (
            filteredReservations.map((res, idx) => {
              const rd   = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
              const sCfg = statusCfg(res.status);
              const mCfg = MEAL_CFG[res.meal_status];
              const isExpanded = expandedRes === res.id;
              const nameParts = (res.customer_name || "Guest").split(" ");
              const firstName = nameParts[0];
              const lastName  = nameParts.slice(1).join(" ") || "—";
              const tableNames = res.table_names?.join(", ") || res.table_name || "—";
              const isEven = idx % 2 === 0;

              return (
                <div key={res.id}>
                  {/* Main row */}
                  <div
                    className="grid items-center border-b cursor-pointer transition-colors group overflow-x-auto"
                    style={{
                      gridTemplateColumns: getGridColumns(),
                      background: isExpanded ? "#1e3a5f" : isEven ? "#0f172a" : "#111827",
                      borderColor: "#1e293b",
                      minHeight: isMobile ? "48px" : "52px",
                      minWidth: isMobile ? "400px" : "auto"
                    }}
                    onClick={() => setExpandedRes(isExpanded ? null : res.id)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMealPickerRes({ 
                        resId: res.id, 
                        name: res.customer_name || 'Guest', 
                        x: e.clientX, 
                        y: e.clientY 
                      });
                    }}
                  >
                    {/* Checkbox / row num */}
                    <div className="px-2 py-3 text-xs text-slate-500 text-center">{idx+1}</div>

                    {/* Time */}
                    <div className="px-2 py-3">
                      <div className="text-sm font-bold text-white">{fmtTime(rd)}</div>
                      {!isMobile && <div className="text-sm text-slate-300">{fmtEndTime(rd, res.duration_minutes)}</div>}
                    </div>

                    {/* Status - simplified on mobile */}
                    {!isMobile && (
                      <div className="px-2 py-3">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: sCfg.bg, color: sCfg.text }}>
                          {sCfg.label}
                        </span>
                      </div>
                    )}
                    {isMobile && (
                      <div className="px-1 py-2">
                        <span className="w-2 h-2 rounded-full inline-block" 
                          style={{ background: sCfg.bg }} />
                      </div>
                    )}

                    {/* Pax - show only on desktop */}
                    {!isMobile && !isTablet && (
                      <div className="px-2 py-2 flex items-center gap-1">
                        <FiUsers className="w-3 h-3 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-semibold text-white">{res.number_of_guests || "—"}</span>
                      </div>
                    )}

                    {/* Name */}
                    <div className="px-2 py-2">
                      <span className="text-sm font-semibold text-white truncate block">{firstName}</span>
                      {!isMobile && res.customer_phone && (
                        <span className="text-xs text-slate-400 truncate block">{res.customer_phone}</span>
                      )}
                      {!isMobile && (
                        <div className="mt-1">
                          <NoteIndicator 
                            publicNote={res.special_requests} 
                            internalNote={res.internal_notes} 
                          />
                        </div>
                      )}
                    </div>

                    {/* Last name / Table - conditional */}
                    {!isMobile && !isTablet && (
                      <div className="px-2 py-2">
                        <span className="text-sm text-slate-300 truncate block">{lastName}</span>
                        {res.customer_email && (
                          <span className="text-xs text-slate-400 truncate block">{res.customer_email}</span>
                        )}
                      </div>
                    )}

                    {/* Table */}
                    <div className="px-2 py-2">
                      <span className="text-xs font-bold bg-slate-700 text-slate-200 px-2.5 py-1 rounded truncate block max-w-full">
                        {tableNames}
                      </span>
                      {!isMobile && res.combination_name && (
                        <span className="text-xs text-blue-400 mt-0.5 block truncate">🔗 {res.combination_name}</span>
                      )}
                    </div>

                    {/* Meal - hide on mobile */}
                    {!isMobile && !isTablet && (
                      <div className="px-2 py-2">
                        {mCfg ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background: mCfg.bg || mCfg.color,
                              color: mCfg.color === '#f1f5f9' || mCfg.bg ? mCfg.color : "#fff",
                              border: mCfg.bg ? `1px solid ${mCfg.color}40` : 'none',
                            }}>
                            {mCfg.icon} {mCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    )}
                    {isTablet && (
                      <div className="px-2 py-2">
                        {mCfg ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                            style={{
                              background: mCfg.bg || mCfg.color,
                              color: mCfg.color === '#f1f5f9' || mCfg.bg ? mCfg.color : "#fff",
                              border: mCfg.bg ? `1px solid ${mCfg.color}40` : 'none',
                            }}>
                            {mCfg.icon}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </div>
                    )}

                    {/* Expand arrow */}
                    <div className="px-2 py-2 flex items-center justify-center">
                      <svg className={`w-3 h-3 text-slate-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded detail row - Responsive */}
                  {isExpanded && (
                    <div className="border-b px-3 md:px-4 py-3"
                      style={{ background: "#162032", borderColor: "#1e293b" }}>
                      
                      {/* Top section: Customer info + Tags + Actions */}
                      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Customer info */}
                          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
                            <span className="font-semibold text-white">{res.customer_name || 'Guest'}</span>
                            <span className="text-xs text-slate-400 hidden md:inline">·</span>
                            {res.customer_phone && (
                              <div className="flex items-center gap-1 text-xs text-slate-300">
                                <FiPhone className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">{res.customer_phone}</span>
                              </div>
                            )}
                            {res.customer_email && !isMobile && (
                              <div className="flex items-center gap-1 text-xs text-slate-300">
                                <FiMail className="w-3 h-3 text-slate-500" />
                                <span className="hidden sm:inline">{res.customer_email}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Tags */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            {res.ServiceType_Reservation && (
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded capitalize">
                                {res.ServiceType_Reservation}
                              </span>
                            )}
                            {res.source === "reservation_link" && (
                              <span className="text-[10px] bg-blue-900 text-blue-300 px-2 py-0.5 rounded">🌐 Online</span>
                            )}
                            {res.is_walkin && (
                              <span className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded">🚶 Walk-in</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Action button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); onReservationClick && onReservationClick(res); }}
                          className="text-xs bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors flex-shrink-0">
                          Open →
                        </button>
                      </div>

                      {/* Middle section: 2-column responsive grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-3">
                        {/* Left: Notes */}
                        <div className="space-y-2">
                          {/* Public Notes */}
                          {res.special_requests && (
                            <div className="flex items-start gap-2 text-xs bg-slate-800/80 rounded-lg px-3 py-2 border border-blue-900/30">
                              <FiFileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-blue-400" />
                              <div>
                                <span className="text-[9px] font-semibold text-blue-400 uppercase tracking-wider">Public</span>
                                <p className="text-slate-300 mt-0.5">{res.special_requests}</p>
                              </div>
                            </div>
                          )}

                          {/* Internal Notes */}
                          {res.internal_notes && (
                            <div className="flex items-start gap-2 text-xs bg-amber-900/10 rounded-lg px-3 py-2 border border-amber-800/30">
                              <FiLock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
                              <div>
                                <span className="text-[9px] font-semibold text-amber-400 uppercase tracking-wider">Internal</span>
                                <p className="text-amber-300/80 mt-0.5">{res.internal_notes}</p>
                              </div>
                            </div>
                          )}
                          
                          {/* No notes message */}
                          {!res.special_requests && !res.internal_notes && (
                            <div className="text-xs text-slate-600 italic py-1">No notes</div>
                          )}
                        </div>

                        {/* Right: Meal Status */}
                        <div>
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Meal Status</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(MEAL_CFG).map(([k, v]) => (
                              <button key={k}
                                onClick={(e) => { e.stopPropagation(); updateMealStatus(res.id, k); }}
                                disabled={updatingMeal === res.id}
                                className={`text-[10px] px-2.5 py-1 rounded font-semibold transition-all ${
                                  res.meal_status === k
                                    ? "ring-2 ring-offset-1 ring-offset-slate-900"
                                    : "opacity-60 hover:opacity-100"
                                }`}
                                style={{
                                  background: v.color + "25",
                                  color: v.color,
                                  ringColor: v.color,
                                }}>
                                {v.icon} {!isMobile && v.label}
                              </button>
                            ))}
                            {res.meal_status && (
                              <button
                                onClick={(e) => { e.stopPropagation(); updateMealStatus(res.id, null); }}
                                className="text-[10px] px-2.5 py-1 rounded font-semibold bg-slate-700 text-slate-400 hover:bg-slate-600">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom: Pre-selected Menu Items */}
                      {res.selected_menu_items?.length > 0 && (
                        <div className="mt-1 pt-3 border-t border-slate-700/50">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">🍽️ Menu Items</span>
                            <span className="text-[9px] text-slate-600 font-normal">
                              ({res.selected_menu_items.reduce((s,i) => s + (i.qty || 1), 0)} items)
                            </span>
                            {res.selected_menu_items.some(i => i.price) && (
                              <span className="text-xs font-bold text-[#fe8a24] ml-auto">
                                Total: {res.selected_menu_items.reduce((s, i) =>
                                  s + (parseFloat(i.price) || 0) * (i.qty || 1), 0
                                ).toFixed(0)},-
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                            {res.selected_menu_items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-1.5 border border-slate-700/50 hover:border-slate-600 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  {item.qty > 1 && (
                                    <span className="text-[10px] font-bold bg-[#fe8a24] text-white px-1.5 py-0.5 rounded-full flex-shrink-0">
                                      ×{item.qty}
                                    </span>
                                  )}
                                  <span className="text-xs text-slate-300 truncate">{item.name}</span>
                                </div>
                                {item.price && (
                                  <span className="text-xs font-bold text-[#fe8a24] flex-shrink-0 ml-2">
                                    {item.qty > 1
                                      ? `${(parseFloat(item.price) * item.qty).toFixed(0)},-`
                                      : `${item.price},-`}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Grid footer stats - responsive */}
        <div className="px-3 py-2 border-t flex items-center gap-2 md:gap-4 flex-shrink-0 flex-wrap"
          style={{ background: "#1e293b", borderColor: "#334155" }}>
          <div className="flex items-center gap-2 md:gap-3 text-xs text-slate-400 flex-wrap">
            <span><span className="text-white font-bold">{filteredReservations.length}</span> res</span>
            {!isMobile && (
              <>
                <span><span className="text-white font-bold">{filteredReservations.reduce((s,r)=>s+(r.number_of_guests||0),0)}</span> guests</span>
                <span><span className="text-green-400 font-bold">{filteredReservations.filter(r=>r.status==="confirmed").length}</span> ✓</span>
                <span><span className="text-yellow-400 font-bold">{filteredReservations.filter(r=>r.status==="pending").length}</span> P</span>
                <span><span className="text-red-400 font-bold">{filteredReservations.filter(r=>r.status==="cancelled").length}</span> C</span>
              </>
            )}
          </div>
          {selectedTableIds.length > 0 && (
            <button onClick={() => setSelectedTableIds([])}
              className="ml-auto text-xs text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-lg transition-colors">
              Show all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}