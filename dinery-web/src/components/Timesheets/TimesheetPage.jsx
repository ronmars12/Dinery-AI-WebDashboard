// src/components/Timesheets/TimesheetPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import { firestore as db } from "../../firebase";
import { getFunctions, httpsCallable } from "firebase/functions"; 
import AddUserPage from "./AddUserPage";

// ─── Palette (matches Reservation Software / Dinery orange) ──────────────────
const C = {
  orange:      "#F47B20",
  orangeHover: "#e06d14",
  orangeLight: "#FFF7F0",
  orangeBorder:"#FFD9B3",
  dark:        "#1a1a2e",
  white:       "#FFFFFF",
  gray50:      "#F9FAFB",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray300:     "#D1D5DB",
  gray400:     "#9CA3AF",
  gray500:     "#6B7280",
  gray700:     "#374151",
  gray900:     "#111827",
  blue:        "#3B82F6",
  green:       "#16a34a",
  red:         "#dc2626",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#FFE8D0", tc: "#C45D0A" },
  { bg: "#FFF3E8", tc: "#F47B20" },
  { bg: "#FFDDB8", tc: "#A04C08" },
  { bg: "#FFE0C2", tc: "#D4670E" },
  { bg: "#FFD0A0", tc: "#B55509" },
];

function getInitials(name = "") {
  const parts = name.trim().split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}
function getAvatarColor(name = "") {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#dcfce7" />
    <path d="M4.5 8l2.5 2.5L11 5.5" stroke={C.green} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const CrossIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="7" fill="#fee2e2" />
    <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={C.red} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const DashIcon = () => <span style={{ color: C.gray400 }}>—</span>;

const IconCalendar = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: -2 }}>
    <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconTable = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: -2 }}>
    <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
    <path d="M1 6h14M1 11h14M6 1v14" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);
const IconList = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: -2 }}>
    <path d="M5 4h9M5 8h9M5 12h9M2 4h.5M2 8h.5M2 12h.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
const IconSettings = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: -2 }}>
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: -1 }}>
    <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M11 2l3 3-9 9H2v-3l9-9z" stroke={C.orange} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke={C.red} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: -1 }}>
    <circle cx="6.5" cy="6.5" r="4.5" stroke={C.gray400} strokeWidth="1.5" />
    <path d="M10 10l3.5 3.5" stroke={C.gray400} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

// ─── Sortable TH ──────────────────────────────────────────────────────────────
function Th({ children, field, sort = {}, onSort, center, style }) {
  const active = sort.field === field;
  return (
    <th
      onClick={() => field && onSort && onSort(field)}
      style={{
        padding: "10px 12px",
        textAlign: center ? "center" : "left",
        fontSize: 11,
        fontWeight: 600,
        color: active ? C.orange : C.gray500,
        whiteSpace: "nowrap",
        borderBottom: `1px solid ${C.gray200}`,
        borderRight: `1px solid ${C.gray100}`,
        background: C.gray50,
        cursor: field ? "pointer" : "default",
        userSelect: "none",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        ...style,
      }}
    >
      {children}
      {field && (
        <span style={{ marginLeft: 3, opacity: active ? 1 : 0.2, fontSize: 9 }}>
          {active ? (sort.dir === "asc" ? "▲" : "▼") : "▲"}
        </span>
      )}
    </th>
  );
}

// ─── Nav Button (top bar) ─────────────────────────────────────────────────────
function NavBtn({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        height: 34, padding: "0 14px",
        fontSize: 13, fontWeight: active ? 600 : 400,
        borderRadius: 8,
        border: active ? `1.5px solid ${C.orange}` : `1px solid ${C.gray200}`,
        background: active ? C.orangeLight : C.white,
        color: active ? C.orange : C.gray700,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TimesheetPage({ restaurantId }) {
  const staffRole = sessionStorage.getItem("staffRole");
  const isStaff   = !!sessionStorage.getItem("staffRestaurantId");
  const canManage = !isStaff || staffRole === 'admin' || staffRole === 'manager';
  const [employees, setEmployees]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [posFilter, setPosFilter]       = useState("");
  const [sort, setSort]                 = useState({ field: "name", dir: "asc" });
  const [deletingId, setDeletingId]     = useState(null);
  const [showAddUser, setShowAddUser]   = useState(false);
  const [activeView, setActiveView]     = useState("list");
  const [animationDirection, setAnimationDirection] = useState("right");

  useEffect(() => {
    console.log("TimesheetPage restaurantId:", restaurantId);
    if (!restaurantId) return;

    const unsub = onSnapshot(
      collection(db, "restaurants", restaurantId, "staff"),
      (snap) => {
        setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, [restaurantId]);

  const positions = useMemo(
    () => [...new Set(employees.map((e) => e.position).filter(Boolean))].sort(),
    [employees]
  );

  const filtered = useMemo(() => {
    let list = [...employees];
    if (posFilter)     list = list.filter((e) => e.position === posFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((e) =>
        (e.name || "").toLowerCase().includes(q) ||
        (e.position || "").toLowerCase().includes(q) ||
        (e.email || "").toLowerCase().includes(q) ||
        (String(e.employeeNumber || "")).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const av = (a[sort.field] ?? "").toString().toLowerCase();
      const bv = (b[sort.field] ?? "").toString().toLowerCase();
      return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
}, [employees, search, posFilter, sort]);

  function handleSort(field) {
    setSort((prev) =>
      prev.field === field
        ? { field, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { field, dir: "asc" }
    );
  }

  async function handleDelete(id) {
  console.log("🗑️ Delete button clicked for employee ID:", id);
  
  if (!window.confirm("Delete this employee? This will permanently remove their account and all associated data.")) {
    console.log("❌ User cancelled deletion");
    return;
  }
  
  console.log("✅ User confirmed deletion");
  
  // Find the employee to get their UID
  const employee = employees.find(emp => emp.id === id);
  if (!employee) {
    console.error("❌ Employee not found with ID:", id);
    alert("Employee not found");
    return;
  }
  
  console.log("📋 Employee data found:", {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    uid: employee.uid,
    hasAuth: !!employee.uid
  });
  
  // Check if employee has a UID (Auth user)
  if (!employee.uid) {
    console.warn("⚠️ Employee has no UID (no Auth account), only deleting Firestore document");
    try {
      console.log("🔥 Deleting Firestore document for:", id);
      await deleteDoc(doc(db, "restaurants", restaurantId, "staff", id));
      console.log("✅ Firestore document deleted successfully (no Auth user)");
      alert("Employee deleted successfully");
    } catch (e) {
      console.error("❌ Delete error:", e);
      alert("Failed to delete employee. Please try again.");
    }
    return;
  }
  
  setDeletingId(id);
  console.log("🔒 Setting deleting state for ID:", id);
  
  try {
    // 1. Delete the Auth user using Cloud Function
    console.log("🔄 Initializing Cloud Function...");
    const functions = getFunctions(); // Removed region parameter
    const deleteStaffAccount = httpsCallable(functions, "deleteStaffAccount");
    
    console.log(`📧 Attempting to delete Auth user with UID: ${employee.uid}`);
    console.log(`📧 Employee email: ${employee.email}`);
    
    const result = await deleteStaffAccount({ uid: employee.uid });
    
    console.log("✅ Cloud Function response:", result);
    console.log("✅ Auth user deleted successfully from Firebase Authentication");
    
    // 2. Delete the Firestore document
    console.log("🔥 Deleting Firestore document for ID:", id);
    await deleteDoc(doc(db, "restaurants", restaurantId, "staff", id));
    console.log("✅ Firestore document deleted successfully");
    
    console.log("🎉 Employee fully deleted (Auth + Firestore)");
    alert("Employee deleted successfully");
    
  } catch (e) {
    console.error("❌❌❌ DELETE ERROR ❌❌❌");
    console.error("Error object:", e);
    console.error("Error code:", e?.code);
    console.error("Error message:", e?.message);
    console.error("Error details:", e?.details);
    
    const errorMessage = e?.message || e?.details || "Failed to delete employee. Please try again.";
    alert(errorMessage);
  } finally {
    console.log("🔓 Clearing deleting state");
    setDeletingId(null);
  }
}

  function handleAddUser() {
    setAnimationDirection("right");
    setShowAddUser(true);
  }

  function handleBackToList() {
    setAnimationDirection("left");
    setShowAddUser(false);
  }

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  // Animation styles
  const pageContainerStyle = {
    position: "relative",
    width: "100%",
    height: "100%",
    overflow: "hidden",
  };

  const pageStyle = (isVisible, direction) => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    transform: isVisible ? "translateX(0)" : `translateX(${direction === "right" ? "100%" : "-100%"})`,
    opacity: isVisible ? 1 : 0,
    transition: "transform 0.3s ease-in-out, opacity 0.2s ease-in-out",
    pointerEvents: isVisible ? "auto" : "none",
    overflow: "auto",
  });

  const td = {
    padding: "9px 12px",
    borderBottom: `1px solid ${C.gray100}`,
    borderRight: `1px solid ${C.gray100}`,
    verticalAlign: "middle",
    fontSize: 13,
    color: C.gray900,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    background: C.white,
  };
  const iconBtn = {
    background: "none", border: "none", cursor: "pointer",
    padding: "4px 5px", borderRadius: 6,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.12s",
  };

  return (
    <div style={pageContainerStyle}>
      {/* Timesheet List View */}
      <div style={pageStyle(!showAddUser, "left")}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%", fontFamily: "inherit", background: C.white }}>

          {/* ── Top orange accent bar ── */}
          <div style={{ height: 4, background: C.orange, flexShrink: 0 }} />

          {/* ── App Header (matches Reservation Software header) ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 24px",
            borderBottom: `1px solid ${C.gray200}`,
            flexShrink: 0,
            background: C.white,
          }}>
            {/* Left: title */}
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.gray900 }}>
                Employee Management
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: C.gray400 }}>
                Manage your restaurant staff
              </p>
            </div>

            {/* Right: action buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                {canManage && (
                  <button
                    onClick={handleAddUser}
                    style={{
                      height: 34, padding: "0 16px", fontSize: 13, fontWeight: 600,
                      borderRadius: 8, border: "none",
                      background: C.orange, color: C.white, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6,
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = C.orange)}
                  >
                    <IconPlus /> Add User
                  </button>
                )}

              {/* Settings */}
              <button style={{
                height: 34, width: 34, borderRadius: 8,
                border: `1px solid ${C.gray200}`, background: C.white,
                color: C.gray500, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <IconSettings />
              </button>
            </div>
          </div>

          {/* ── View toggle tabs (Calendar / Table/List / List) ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 24px",
            borderBottom: `1px solid ${C.gray200}`,
            background: C.white,
            flexShrink: 0,
          }}>
            <NavBtn active={activeView === "calendar"} onClick={() => setActiveView("calendar")}
              icon={<IconCalendar />} label="Calendar" />
            <NavBtn active={activeView === "table"} onClick={() => setActiveView("table")}
              icon={<IconTable />} label="Table/List" />
            <NavBtn active={activeView === "list"} onClick={() => setActiveView("list")}
              icon={<IconList />} label="List" />
          </div>

          {/* ── Sub-header: date nav + search + count (matches day nav bar) ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "8px 24px",
            borderBottom: `1px solid ${C.gray200}`,
            background: C.white,
            flexShrink: 0,
            flexWrap: "wrap",
            gap: 8,
          }}>
            {/* Left: prev / today / next */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${C.gray200}`, background: C.white,
                color: C.gray700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><IconChevronLeft /></button>

              <button style={{
                height: 28, padding: "0 12px", fontSize: 12, fontWeight: 600,
                borderRadius: 6, border: `1px solid ${C.gray200}`,
                background: C.orange, color: C.white, cursor: "pointer",
              }}>Today</button>

              <button style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${C.gray200}`, background: C.white,
                color: C.gray700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}><IconChevronRight /></button>
            </div>

            {/* Center: date + count */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.gray900 }}>{today}</span>
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 13, fontWeight: 600, color: C.orange,
                background: C.orangeLight, padding: "2px 10px",
                borderRadius: 20, border: `1px solid ${C.orangeBorder}`,
              }}>
                <IconCalendar /> {filtered.length}
              </span>
            </div>

            {/* Right: search + position filter + date display */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)" }}>
                  <IconSearch />
                </span>
                <input
                  type="text"
                  placeholder="Search employees…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    height: 32, paddingLeft: 30, paddingRight: 10,
                    fontSize: 12, borderRadius: 8,
                    border: `1px solid ${C.gray200}`, background: C.white,
                    color: C.gray900, outline: "none", width: 200,
                  }}
                />
              </div>

              <select
                value={posFilter}
                onChange={(e) => setPosFilter(e.target.value)}
                style={{
                  height: 32, fontSize: 12, padding: "0 8px",
                  borderRadius: 8, border: `1px solid ${C.gray200}`,
                  background: C.white, color: C.gray700, outline: "none", width: 140,
                }}
              >
                <option value="">All positions</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>

              {/* Day / Week / Month pills */}
              <div style={{ display: "flex", border: `1px solid ${C.gray200}`, borderRadius: 8, overflow: "hidden" }}>
                {["Day", "Week", "Month"].map((v, i) => (
                  <button
                    key={v}
                    style={{
                      height: 32, padding: "0 12px", fontSize: 12,
                      border: "none",
                      borderLeft: i > 0 ? `1px solid ${C.gray200}` : "none",
                      background: v === "Day" ? C.orange : C.white,
                      color: v === "Day" ? C.white : C.gray700,
                      cursor: "pointer", fontWeight: v === "Day" ? 600 : 400,
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          <div style={{ flex: 1, overflowX: "auto", overflowY: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 900 }}>
              <colgroup>
                <col style={{ width: 36 }} />
                <col style={{ width: 200 }} />
                <col style={{ width: 80 }} />
                <col style={{ width: 44 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 150 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 130 }} />
                <col style={{ width: 36 }} />
                <col style={{ width: 36 }} />
              </colgroup>
              <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                <tr>
                  <th colSpan={1} style={{
                    padding: "10px 8px",
                    fontSize: 10, fontWeight: 700, color: C.gray500,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    background: C.gray50, borderBottom: `1px solid ${C.gray200}`,
                    borderRight: `1px solid ${C.gray200}`,
                    textAlign: "center",
                  }}>
                    #
                  </th>
                  <Th field="name" sort={sort} onSort={handleSort}>Name</Th>
                  <Th field="employeeNumber" sort={sort} onSort={handleSort}>ID</Th>
                  <Th field="age" sort={sort} onSort={handleSort} center>Age</Th>
                  <Th center title="Phone Number">PN</Th>
                  <Th center title="Kitchen Ops">KO</Th>
                  <Th center title="Badge">B</Th>
                  <Th center>📷</Th>
                  <Th field="position" sort={sort} onSort={handleSort}>Position</Th>
                  <Th field="endDate" sort={sort} onSort={handleSort}>End date</Th>
                  <Th>Mobile</Th>
                  <Th center>Edit</Th>
                  <Th center>Del</Th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={13} style={{ ...td, textAlign: "center", padding: 60, color: C.gray400 }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
                      <div style={{ fontSize: 14 }}>Loading employees…</div>
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={13} style={{ ...td, textAlign: "center", padding: 60, color: C.gray400 }}>
                      <div style={{ fontSize: 28, marginBottom: 10 }}>👤</div>
                      <div style={{ fontSize: 14 }}>No employees found.</div>
                      {canManage && (
                      <button
                        onClick={handleAddUser}
                        style={{
                          marginTop: 12, height: 34, padding: "0 18px",
                          fontSize: 13, borderRadius: 8, border: "none",
                          background: C.orange, color: C.white, cursor: "pointer", fontWeight: 600,
                        }}
                      >
                        + Add First Employee
                      </button>
                    )}
                    </td>
                  </tr>
                )}
                {filtered.map((emp, i) => {
                  const initials = getInitials(emp.name);
                  const { bg, tc } = getAvatarColor(emp.name);
                  const endDate = emp.endDate
                    ? new Date(emp.endDate).toLocaleDateString("en-NZ")
                    : null;

                  return (
                    <tr
                      key={emp.id}
                      style={{ opacity: deletingId === emp.id ? 0.35 : 1, transition: "opacity 0.2s" }}
                      onMouseEnter={(e) =>
                        Array.from(e.currentTarget.cells).forEach((c) => (c.style.background = C.orangeLight))
                      }
                      onMouseLeave={(e) =>
                        Array.from(e.currentTarget.cells).forEach((c) => (c.style.background = C.white))
                      }
                    >
                      <td style={{
                        ...td,
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 12,
                        color: C.orange,
                        borderRight: `1px solid ${C.gray200}`,
                        background: C.gray50,
                        width: 36,
                      }}>
                        {i + 1}
                      </td>

                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{
                            width: 30, height: 30, borderRadius: "50%",
                            background: bg, color: tc,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>{emp.name || "—"}</div>
                            {emp.email && (
                              <div style={{ fontSize: 11, color: C.gray400 }}>{emp.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ ...td, color: C.blue, fontSize: 12, fontWeight: 500 }}>
                        {emp.employeeNumber || "—"}
                      </td>

                      <td style={{ ...td, textAlign: "center", fontSize: 12 }}>{emp.age ?? "—"}</td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {emp.mobilePhone ? <CheckIcon /> : <CrossIcon />}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {emp.active !== false ? <CheckIcon /> : <CrossIcon />}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {emp.smsConsent ? <CheckIcon /> : <CrossIcon />}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <span style={{ fontSize: 14, opacity: emp.hasDocs ? 1 : 0.2 }}>🖼️</span>
                      </td>

                      <td style={td}>
                        {emp.position ? (
                          <span style={{
                            fontSize: 11, fontWeight: 600, padding: "2px 8px",
                            borderRadius: 12, background: C.orangeLight,
                            color: C.orange, border: `1px solid ${C.orangeBorder}`,
                          }}>
                            {emp.position}
                          </span>
                        ) : <DashIcon />}
                      </td>

                      <td style={{ ...td, fontSize: 12, color: endDate ? C.red : C.gray400 }}>
                        {endDate || "—"}
                      </td>

                      <td style={td}>
                        {emp.mobilePhone ? (
                          <a href={`tel:${emp.mobilePhone}`}
                            style={{ color: C.blue, textDecoration: "none", fontSize: 12 }}>
                            {emp.mobilePhone}
                          </a>
                        ) : <DashIcon />}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        <button
                          style={iconBtn}
                          title="Edit"
                          onClick={() => console.log("Edit", emp.id)}
                          onMouseEnter={(e) => (e.currentTarget.style.background = C.orangeLight)}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                          <IconEdit />
                        </button>
                      </td>
                      <td style={{ ...td, textAlign: "center" }}>
                        {canManage && (
                          <button
                            style={iconBtn}
                            title="Delete"
                            onClick={() => handleDelete(emp.id)}
                            disabled={deletingId === emp.id}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#fee2e2")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                          >
                            <IconTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Status bar ── */}
          <div style={{
            padding: "6px 24px",
            borderTop: `1px solid ${C.gray200}`,
            background: C.gray50,
            fontSize: 11, color: C.gray400,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <span>{loading ? "Loading…" : `${filtered.length} employee${filtered.length !== 1 ? "s" : ""} shown`}</span>
            <span>{employees.length} total</span>
          </div>
        </div>
      </div>

      {/* Add User View */}
      <div style={pageStyle(showAddUser, "right")}>
        <AddUserPage onBack={handleBackToList} restaurantId={restaurantId} />
      </div>
    </div>
  );
}