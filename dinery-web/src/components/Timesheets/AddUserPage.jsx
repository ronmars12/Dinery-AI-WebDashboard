// src/components/Timesheets/AddUserPage.jsx

import React, { useState } from "react";
import { collection, addDoc, serverTimestamp, updateDoc, deleteDoc, doc, query, where, getDocs } from "firebase/firestore";
import { firestore as db } from "../../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  orange:      "#F47B20",
  orangeLight: "#FFF3E8",
  orangeMid:   "#FFD9B3",
  orangeDark:  "#C45D0A",
  white:       "#FFFFFF",
  gray50:      "#FAFAFA",
  gray100:     "#F3F4F6",
  gray200:     "#E5E7EB",
  gray400:     "#9CA3AF",
  gray600:     "#4B5563",
  gray900:     "#111827",
  red:         "#dc2626",
};

const TABS = [
  "Personal Information",
  "Contact Information",
  "Business Information",
  "App Settings",
];

const DEPARTMENTS = [
  "Kitchen", "Bar", "Front of house", "Management",
  "Cleaning", "Security", "Hotel", "Administration",
];

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES = {
  Admin: {
    label: "Admin",
    description: "Full system access: manage employees, settings, all bookings, reports, and user permissions.",
    color: "#F47B20",
  },
  Manager: {
    label: "Manager",
    description: "Manage staff, oversee daily operations, approve timesheets, view reports. Cannot change system settings or user roles.",
    color: "#3B82F6",
  },
  Staff: {
    label: "Staff",
    description: "Standard employee access: clock in/out, view own schedule, limited booking management.",
    color: "#10B981",
  },
};

function generatePassword(length = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Email validation function
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  return emailRegex.test(email.trim());
}

const EMPTY_FORM = {
  firstName: "", lastName: "", mobilePhone: "", email: "",
  gender: "Male", birthDay: "", birthMonth: "",
  birthYear: "", initials: "",
  workPhone: "", extension: "", privateMobilePhone: "",
  privateEmail: "", privateLandline: "", closestRelativeName: "",
  closestRelativePhone: "",
  jobTitle: "", socialSecurityNumber: "", classification: "Employee",
  sortNumber: "", department: "Kitchen",
  deptWaiters: false, deptBar: false, deptCleaning: false,
  deptSecurity: false, deptHotel: false, deptAdmin: false,
  addressLine1: "", addressLine2: "", city: "",
  zipCode: "", state: "", note: "",
  role: "Staff", language: "EN",
  disableIpFilter: false, enableIpFilterLogin: false,
  disableAutoClockout: false, receiveDailyBooking: false,
  cannotDeleteBookings: false,
};

// ─── Shared styles ────────────────────────────────────────────────────────────
const inputStyle = {
  height: 36, width: "100%", fontSize: 13,
  padding: "0 10px", borderRadius: 6,
  border: `1px solid ${C.gray200}`,
  background: C.white, color: C.gray900,
  outline: "none", boxSizing: "border-box",
};
const textareaStyle = {
  ...inputStyle, height: 90, padding: "8px 10px", resize: "vertical",
};

function FieldRow({ label, required, children, alignTop, hint }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "240px 1fr",
      alignItems: alignTop ? "flex-start" : "center",
      gap: 16, padding: "10px 0",
      borderBottom: `1px solid ${C.gray100}`,
    }}>
      <div style={{ paddingTop: alignTop ? 8 : 0 }}>
        <label style={{ fontSize: 13, color: C.gray600 }}>
          {label}{required && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
        </label>
        {hint && <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} type="button" style={{
      height: 32, padding: "0 18px", fontSize: 13,
      borderRadius: 6, border: `1px solid ${active ? C.orange : C.gray200}`,
      cursor: "pointer", fontWeight: active ? 700 : 400,
      background: active ? C.orange : C.white,
      color: active ? C.white : C.gray600,
      transition: "all 0.15s",
    }}>
      {children}
    </button>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function SectionHeader({ title }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, color: C.orange,
      textTransform: "uppercase", letterSpacing: "0.07em",
      padding: "16px 0 6px",
      borderBottom: `2px solid ${C.orangeMid}`,
      marginBottom: 2,
    }}>
      {title}
    </div>
  );
}

// ─── RoleSelector Component ───────────────────────────────────────────────────
function RoleSelector({ role, setRole }) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
      {Object.entries(ROLES).map(([key, value]) => (
        <button
          key={key}
          type="button"
          onClick={() => setRole(key)}
          style={{
            flex: 1,
            minWidth: 150,
            padding: "16px 20px",
            borderRadius: 12,
            border: `2px solid ${role === key ? value.color : C.gray200}`,
            background: role === key ? `${value.color}10` : C.white,
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s",
          }}
        >
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 8,
          }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: role === key ? value.color : C.gray200,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: role === key ? C.white : C.gray600,
            }}>
              {key === "Admin" && "👑"}
              {key === "Manager" && "📋"}
              {key === "Staff" && "👤"}
            </div>
            <div>
              <div style={{
                fontSize: 16,
                fontWeight: 700,
                color: role === key ? value.color : C.gray900,
              }}>
                {value.label}
              </div>
            </div>
          </div>
          <p style={{
            fontSize: 12,
            color: C.gray600,
            margin: 0,
            lineHeight: 1.5,
          }}>
            {value.description}
          </p>
        </button>
      ))}
    </div>
  );
}

// ─── Tab: Personal Information ────────────────────────────────────────────────
function TabPersonal({ form, set }) {
  return (
    <div>
      <SectionHeader title="Identity" />
      <FieldRow label="First name" required>
        <input style={inputStyle} placeholder="e.g. John"
          value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
      </FieldRow>
      <FieldRow label="Last name">
        <input style={inputStyle} placeholder="e.g. Smith"
          value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
      </FieldRow>
      <FieldRow label="Initials" hint="Max 3 characters">
        <input style={{ ...inputStyle, width: 80 }} maxLength={3} placeholder="JS"
          value={form.initials} onChange={(e) => set("initials", e.target.value.toUpperCase())} />
      </FieldRow>
      <FieldRow label="Gender">
        <div style={{ display: "flex", gap: 8 }}>
          <ToggleBtn active={form.gender === "Male"}   onClick={() => set("gender", "Male")}>Male</ToggleBtn>
          <ToggleBtn active={form.gender === "Female"} onClick={() => set("gender", "Female")}>Female</ToggleBtn>
        </div>
      </FieldRow>
      <FieldRow label="Birthday">
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[
            { key: "birthDay",   ph: "DD",   w: 64,  max: 2 },
            { key: "birthMonth", ph: "MM",   w: 64,  max: 2 },
            { key: "birthYear",  ph: "YYYY", w: 88,  max: 4 },
          ].map(({ key, ph, w, max }) => (
            <input key={key} style={{ ...inputStyle, width: w, textAlign: "center" }}
              placeholder={ph} maxLength={max} value={form[key]}
              onChange={(e) => set(key, e.target.value.replace(/\D/, ""))} />
          ))}
          <span style={{ fontSize: 12, color: C.gray400 }}>dd / mm / yyyy</span>
        </div>
      </FieldRow>

      <SectionHeader title="Login credentials" />
      <FieldRow label="Email (private)" required>
        <input style={inputStyle} type="email" placeholder="john@example.com"
          value={form.email} onChange={(e) => set("email", e.target.value)} />
      </FieldRow>
      <FieldRow label="Mobile phone (private)">
        <input style={inputStyle} placeholder="+64 21 234 567"
          value={form.mobilePhone} onChange={(e) => set("mobilePhone", e.target.value)} />
      </FieldRow>
    </div>
  );
}

// ─── Tab: Contact Information ─────────────────────────────────────────────────
function TabContact({ form, set }) {
  return (
    <div>
      <SectionHeader title="Work contact" />
      <FieldRow label="Work phone">
        <input style={inputStyle} placeholder="+64 9 123 4567"
          value={form.workPhone} onChange={(e) => set("workPhone", e.target.value)} />
      </FieldRow>
      <FieldRow label="Extension">
        <input style={{ ...inputStyle, width: 110 }} placeholder="e.g. 101"
          value={form.extension} onChange={(e) => set("extension", e.target.value)} />
      </FieldRow>

      <SectionHeader title="Private contact" />
      <FieldRow label="Private mobile phone">
        <input style={inputStyle} placeholder="+64 21 234 567"
          value={form.privateMobilePhone} onChange={(e) => set("privateMobilePhone", e.target.value)} />
      </FieldRow>
      <FieldRow label="Private email">
        <input style={inputStyle} type="email" placeholder="private@example.com"
          value={form.privateEmail} onChange={(e) => set("privateEmail", e.target.value)} />
      </FieldRow>
      <FieldRow label="Private landline">
        <input style={inputStyle} placeholder="+64 9 876 5432"
          value={form.privateLandline} onChange={(e) => set("privateLandline", e.target.value)} />
      </FieldRow>

      <SectionHeader title="Emergency contact" />
      <FieldRow label="Name of closest relative">
        <input style={inputStyle} placeholder="Full name"
          value={form.closestRelativeName} onChange={(e) => set("closestRelativeName", e.target.value)} />
      </FieldRow>
      <FieldRow label="Phone of closest relative">
        <input style={inputStyle} placeholder="+64 21 000 000"
          value={form.closestRelativePhone} onChange={(e) => set("closestRelativePhone", e.target.value)} />
      </FieldRow>
    </div>
  );
}

// ─── Tab: Business Information ────────────────────────────────────────────────
function TabBusiness({ form, set }) {
  return (
    <div>
      <SectionHeader title="Role & Classification" />
      <FieldRow label="Job title">
        <select style={inputStyle} value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)}>
          <option value="">— Select job title —</option>
          <optgroup label="Restaurant / Front of house">
            <option>Waiter</option>
            <option>Restaurant staff - waiter</option>
          </optgroup>
          <optgroup label="Kitchen">
            <option>Chef</option>
            <option>Kitchen worker</option>
          </optgroup>
        </select>
      </FieldRow>
      <FieldRow label="Classification">
        <div style={{ display: "flex", gap: 8 }}>
          {["Employee", "Supervisor", "Manager"].map((c) => (
            <ToggleBtn key={c} active={form.classification === c} onClick={() => set("classification", c)}>
              {c}
            </ToggleBtn>
          ))}
        </div>
      </FieldRow>
      <FieldRow label="Social Security Number">
        <input style={{ ...inputStyle, width: 200 }} placeholder="e.g. 123-45-6789"
          value={form.socialSecurityNumber} onChange={(e) => set("socialSecurityNumber", e.target.value)} />
      </FieldRow>
      <FieldRow label="Sort number" hint="Used to sort on employee schedule">
        <input style={{ ...inputStyle, width: 110 }} placeholder="e.g. 19"
          value={form.sortNumber} onChange={(e) => set("sortNumber", e.target.value)} />
      </FieldRow>

      <SectionHeader title="Department" />
      <FieldRow label="Primary department">
        <select style={{ ...inputStyle, width: 200 }} value={form.department}
          onChange={(e) => set("department", e.target.value)}>
          {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </FieldRow>
      <FieldRow label="Additional departments" alignTop>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, paddingTop: 4 }}>
          {[
            { key: "deptWaiters",  label: "Waiters" },
            { key: "deptBar",      label: "Bar" },
            { key: "deptCleaning", label: "Cleaning" },
            { key: "deptSecurity", label: "Security" },
            { key: "deptHotel",    label: "Hotel" },
            { key: "deptAdmin",    label: "Admin" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: C.gray600 }}>
              <input type="checkbox" checked={form[key]}
                onChange={(e) => set(key, e.target.checked)}
                style={{ width: 15, height: 15, accentColor: C.orange, cursor: "pointer" }} />
              {label}
            </label>
          ))}
        </div>
      </FieldRow>
      <SectionHeader title="Address" />
      <FieldRow label="Address line 1">
        <input style={inputStyle} placeholder="Street address"
          value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} />
      </FieldRow>
      <FieldRow label="Address line 2">
        <input style={inputStyle} placeholder="Apt, suite, unit…"
          value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} />
      </FieldRow>
      <FieldRow label="City">
        <input style={inputStyle} placeholder="e.g. Auckland"
          value={form.city} onChange={(e) => set("city", e.target.value)} />
      </FieldRow>
      <FieldRow label="Zip code">
        <input style={{ ...inputStyle, width: 130 }} placeholder="e.g. 1010"
          value={form.zipCode} onChange={(e) => set("zipCode", e.target.value)} />
      </FieldRow>
      <FieldRow label="State">
        <input style={inputStyle} placeholder="e.g. Auckland Region"
          value={form.state} onChange={(e) => set("state", e.target.value)} />
      </FieldRow>
      <FieldRow label="Note" alignTop>
        <textarea style={textareaStyle} placeholder="Any additional notes…"
          value={form.note} onChange={(e) => set("note", e.target.value)} />
      </FieldRow>
    </div>
  );
}

// ─── Tab: App Settings ────────────────────────────────────────────────────────
function TabAppSettings({ form, set }) {
  return (
    <div>
      <SectionHeader title="User Role" />
      <RoleSelector role={form.role} setRole={(role) => set("role", role)} />

      <SectionHeader title="Access & Permissions" />
      <div style={{
        margin: "12px 0 20px",
        padding: "16px 20px",
        background: C.orangeLight,
        borderRadius: 12,
        border: `1px solid ${C.orangeMid}`,
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.orange,
          marginBottom: 8,
        }}>
          {ROLES[form.role]?.label} Permissions:
        </div>
        <ul style={{
          margin: 0,
          paddingLeft: 20,
          fontSize: 12,
          color: C.gray600,
          lineHeight: 1.6,
        }}>
          {form.role === "Admin" && (
            <>
              <li>✓ Full system access and configuration</li>
              <li>✓ Create/edit/delete employees and their roles</li>
            </>
          )}
          {form.role === "Manager" && (
            <>
              <li>✓ Manage daily operations and floor plan</li>
              <li>✓ Approve employee timesheets and time-off requests</li>
            </>
          )}
          {form.role === "Staff" && (
            <>
              <li>✓ Clock in/out and track working hours</li>
              <li>✓ View personal schedule and shifts</li>
            </>
          )}
        </ul>
      </div>

      <FieldRow label="Language">
        <select style={{ ...inputStyle, width: 90 }}
          value={form.language} onChange={(e) => set("language", e.target.value)}>
          {["EN", "NO", "DA", "SV", "FI", "DE", "FR"].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </FieldRow>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AddUserPage({ onBack, restaurantId }) {
  const [activeTab, setActiveTab] = useState(0);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.firstName.trim()) { setError("First name is required."); setActiveTab(0); return; }
    if (!form.email.trim())     { setError("Email is required.");      setActiveTab(0); return; }
    
    // Add email validation
    if (!isValidEmail(form.email)) {
      setError(`Invalid email address: "${form.email}". Please enter a valid email like name@example.com`);
      setActiveTab(0);
      return;
    }
    
    if (!restaurantId) { setError("Restaurant ID is missing. Please go back and try again."); return; }

    setSaving(true);
    setError("");

    const tempPassword = generatePassword();
    let firestoreDocId = null;

    // Log email for debugging
    console.log("Email being sent:", `"${form.email.trim()}"`);
    console.log("Email length:", form.email.trim().length);

    // Check if email already exists in Firestore
    try {
      const staffCollection = collection(db, "restaurants", restaurantId, "staff");
      const q = query(staffCollection, where("email", "==", form.email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        setError("This email is already registered to another employee. Please use a different email.");
        setSaving(false);
        return;
      }
    } catch (checkError) {
      console.error("Error checking existing email:", checkError);
    }

    // ── Role-based permission flags ──
    const rolePermissions = {
      Admin: {
        canManageEmployees: true,
        canManageSettings: true,
        canManageRoles: true,
        canDeleteBookings: true,
        canApproveTimesheets: true,
      },
      Manager: {
        canManageEmployees: false,
        canManageSettings: false,
        canManageRoles: false,
        canDeleteBookings: form.cannotDeleteBookings ? false : true,
        canApproveTimesheets: true,
      },
      Staff: {
        canManageEmployees: false,
        canManageSettings: false,
        canManageRoles: false,
        canDeleteBookings: false,
        canApproveTimesheets: false,
      },
    };

    try {
      // ── 1. FIRST: Save to Firestore under restaurants/{restaurantId}/staff ──
      const staffDocRef = collection(db, "restaurants", restaurantId, "staff");
      const docRef = await addDoc(staffDocRef, {
        name: `${form.firstName} ${form.lastName}`.trim(),
        firstName: form.firstName || "",
        lastName: form.lastName || "",
        mobilePhone: form.mobilePhone || "",
        email: form.email.trim().toLowerCase(),
        gender: form.gender || "Male",
        birthday: `${form.birthDay || ""}/${form.birthMonth || ""}/${form.birthYear || ""}`,
        initials: form.initials || "",
        workPhone: form.workPhone || "",
        extension: form.extension || "",
        privateMobilePhone: form.privateMobilePhone || "",
        privateEmail: form.privateEmail || "",
        privateLandline: form.privateLandline || "",
        closestRelativeName: form.closestRelativeName || "",
        closestRelativePhone: form.closestRelativePhone || "",
        jobTitle: form.jobTitle || "",
        socialSecurityNumber: form.socialSecurityNumber || "",
        classification: form.classification || "Employee",
        sortNumber: form.sortNumber || "",
        department: form.department || "Kitchen",
        additionalDepts: {
          waiters: form.deptWaiters || false,
          bar: form.deptBar || false,
          cleaning: form.deptCleaning || false,
          security: form.deptSecurity || false,
          hotel: form.deptHotel || false,
          admin: form.deptAdmin || false,
        },
        addressLine1: form.addressLine1 || "",
        addressLine2: form.addressLine2 || "",
        city: form.city || "",
        zipCode: form.zipCode || "",
        state: form.state || "",
        note: form.note || "",
        role: form.role,
        permissions: rolePermissions[form.role],
        language: form.language || "EN",
        disableIpFilter: form.disableIpFilter || false,
        enableIpFilterLogin: form.enableIpFilterLogin || false,
        disableAutoClockout: form.disableAutoClockout || false,
        receiveDailyBooking: form.receiveDailyBooking || false,
        cannotDeleteBookings: form.cannotDeleteBookings || false,
        active: true,
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        lastAtWork: null,
        authCreated: false,
      });
      
      firestoreDocId = docRef.id;
      console.log("✅ Firestore document created:", firestoreDocId);

      // ── 2. SECOND: Create Auth account via Cloud Function ──
      const functions = getFunctions();
      const createStaffAccount = httpsCallable(functions, "createStaffAccount");

      const result = await createStaffAccount({
        email: form.email.trim().toLowerCase(),
        password: tempPassword,
        displayName: `${form.firstName} ${form.lastName}`.trim(),
      });
      
      const uid = result?.data?.uid;
      if (!uid) throw new Error("Failed to create account. No UID returned.");

      // ── 3. Update Firestore document with uid and mark auth as created ──
      const docRef2 = doc(db, "restaurants", restaurantId, "staff", firestoreDocId);
      await updateDoc(docRef2, {
        uid: uid,
        authCreated: true,
      });

      // ── 4. Send welcome email (Don't block user creation if email fails)
      try {
        const sendEmail = httpsCallable(functions, "sendEmail");
        const emailResult = await sendEmail({
          to: form.email.trim().toLowerCase(),
          subject: `Welcome to Dinery — Your login details`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#111827;">
              <div style="background:#F47B20;padding:28px 32px;border-radius:12px 12px 0 0;">
                <h1 style="color:#fff;margin:0;font-size:22px;">Welcome to Dinery! 🍽️</h1>
              </div>
              <div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 12px 12px;">
                <p style="margin-top:0;">Hi <strong>${form.firstName}</strong>,</p>
                <p>Your employee account has been created. Here are your login credentials:</p>
                <div style="background:#FFF3E8;border:1px solid #FFD9B3;border-radius:8px;padding:20px 24px;margin:20px 0;">
                  <p style="margin:0 0 8px;font-size:13px;color:#4B5563;">Email</p>
                  <p style="margin:0 0 16px;font-size:16px;font-weight:700;">${form.email.trim().toLowerCase()}</p>
                  <p style="margin:0 0 8px;font-size:13px;color:#4B5563;">Temporary Password</p>
                  <p style="margin:0;font-size:20px;font-weight:700;letter-spacing:2px;color:#F47B20;">${tempPassword}</p>
                </div>
                <p style="color:#dc2626;font-size:13px;">⚠️ Please change your password after your first login.</p>
                <p style="font-size:13px;color:#6B7280;margin-bottom:0;">
                  If you have any questions, contact your manager or reply to this email.
                </p>
              </div>
            </div>
          `,
        });
        
        if (emailResult?.data?.success) {
          console.log(`✅ Welcome email sent to ${form.email.trim()}`);
        } else {
          console.warn("⚠️ Email sending had issues but user was created:", emailResult?.data?.message);
        }
        
      } catch (emailError) {
        // Log error but don't fail the whole operation
        console.warn("⚠️ Email sending failed but user was created successfully:", emailError);
      }
      
      console.log(`✅ User created successfully`);
      setSaved(true);
      setTimeout(() => onBack && onBack(), 1500);
      
    } catch (e) {
      console.error("handleSave error:", e);
      
      // ── CLEANUP: If auth creation failed, delete the Firestore document ──
      if (firestoreDocId) {
        try {
          const docRef = doc(db, "restaurants", restaurantId, "staff", firestoreDocId);
          await deleteDoc(docRef);
          console.log("🧹 Cleaned up Firestore document after auth failure");
        } catch (cleanupError) {
          console.error("Failed to clean up Firestore document:", cleanupError);
        }
      }
      
      // Parse error message
      let errorMessage = "Failed to save. Please try again.";
      
      if (e?.message) {
        errorMessage = e.message;
      }
      
      if (e?.details) {
        errorMessage = e.details;
      }
      
      const combined = errorMessage.toLowerCase();
      
      if (combined.includes("already-exists") || combined.includes("already in use")) {
        setError("This email already has an account. Use a different email.");
      } else if (combined.includes("invalid-email") || combined.includes("invalid email")) {
        setError(`Invalid email address: "${form.email.trim()}". Please enter a valid email like name@example.com`);
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.gray50, fontFamily: "inherit" }}>

      <div style={{ height: 4, background: C.orange, flexShrink: 0 }} />

      <div style={{
        background: `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeDark} 100%)`,
        padding: "16px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} style={{
            width: 34, height: 34, borderRadius: 8,
            border: "none", background: "rgba(255,255,255,0.2)",
            color: C.white, cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>←</button>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          }}>👤</div>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 18 }}>Add New Employee</div>
            <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 12 }}>
              Fill in all sections and press Save
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBack} style={{
            height: 36, padding: "0 18px", fontSize: 13, borderRadius: 8,
            border: `1px solid rgba(255,255,255,0.4)`, background: "transparent",
            color: C.white, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || saved} style={{
            height: 36, padding: "0 24px", fontSize: 13, fontWeight: 700, borderRadius: 8,
            border: "none",
            background: saved ? "#16a34a" : saving ? "rgba(255,255,255,0.4)" : C.white,
            color: saved ? C.white : saving ? "rgba(255,255,255,0.6)" : C.orange,
            cursor: saving || saved ? "not-allowed" : "pointer",
            transition: "all 0.2s",
          }}>
            {saved ? "✓ Saved!" : saving ? "Saving…" : "SAVE"}
          </button>
        </div>
      </div>

      <div style={{
        display: "flex",
        background: C.white,
        borderBottom: `2px solid ${C.orange}`,
        flexShrink: 0,
        paddingLeft: 24,
      }}>
        {TABS.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            height: 46, padding: "0 22px", fontSize: 13,
            fontWeight: activeTab === i ? 700 : 400,
            border: "none",
            borderBottom: activeTab === i ? `3px solid ${C.orange}` : "3px solid transparent",
            background: "transparent",
            color: activeTab === i ? C.orange : C.gray600,
            cursor: "pointer", whiteSpace: "nowrap",
            transition: "all 0.15s",
          }}>
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 20, height: 20, borderRadius: "50%",
              background: activeTab === i ? C.orange : C.gray200,
              color: activeTab === i ? C.white : C.gray600,
              fontSize: 11, fontWeight: 700, marginRight: 8,
            }}>{i + 1}</span>
            {tab}
          </button>
        ))}
      </div>

      <div style={{ height: 3, background: C.gray200, flexShrink: 0 }}>
        <div style={{
          height: 3,
          width: `${((activeTab + 1) / TABS.length) * 100}%`,
          background: C.orange,
          transition: "width 0.3s ease",
        }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 28px 40px" }}>

        {error && (
          <div style={{
            margin: "16px 0 0",
            padding: "10px 16px",
            background: "#fee2e2", color: C.red,
            fontSize: 13, borderRadius: 8,
            border: "1px solid #fca5a5",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{
          background: C.white,
          borderRadius: 12,
          border: `1px solid ${C.gray200}`,
          padding: "8px 28px 24px",
          marginTop: 20,
          boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        }}>
          {activeTab === 0 && <TabPersonal    form={form} set={set} />}
          {activeTab === 1 && <TabContact     form={form} set={set} />}
          {activeTab === 2 && <TabBusiness    form={form} set={set} />}
          {activeTab === 3 && <TabAppSettings form={form} set={set} />}
        </div>
      </div>

      <div style={{
        flexShrink: 0,
        background: C.white,
        borderTop: `1px solid ${C.gray200}`,
        padding: "12px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {TABS.map((_, i) => (
            <div key={i} onClick={() => setActiveTab(i)} style={{
              width: i === activeTab ? 24 : 8,
              height: 8, borderRadius: 4, cursor: "pointer",
              background: i === activeTab ? C.orange : i < activeTab ? C.orangeMid : C.gray200,
              transition: "all 0.2s",
            }} />
          ))}
          <span style={{ fontSize: 12, color: C.gray400, marginLeft: 6 }}>
            Step {activeTab + 1} of {TABS.length}
          </span>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {activeTab > 0 && (
            <button onClick={() => setActiveTab((t) => t - 1)} style={{
              height: 38, padding: "0 20px", fontSize: 13, borderRadius: 8,
              border: `1px solid ${C.gray200}`, background: C.white,
              color: C.gray600, cursor: "pointer",
            }}>← Back</button>
          )}
          {activeTab < TABS.length - 1 ? (
            <button onClick={() => setActiveTab((t) => t + 1)} style={{
              height: 38, padding: "0 24px", fontSize: 13, fontWeight: 600,
              borderRadius: 8, border: "none",
              background: C.orange, color: C.white, cursor: "pointer",
            }}>Next →</button>
          ) : (
            <button onClick={handleSave} disabled={saving || saved} style={{
              height: 38, padding: "0 32px", fontSize: 13, fontWeight: 700,
              borderRadius: 8, border: "none",
              background: saved ? "#16a34a" : saving ? C.gray200 : C.orange,
              color: saved ? C.white : saving ? C.gray400 : C.white,
              cursor: saving || saved ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}>
              {saved ? "✓ Saved!" : saving ? "Saving…" : "SAVE"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}