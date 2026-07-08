import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { firestore, auth } from "../../firebase";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StarRating({ value, size = "md" }) {
  const sz = size === "lg" ? "w-5 h-5" : "w-4 h-4";
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`${sz} ${s <= value ? "text-[#fe8a24]" : "text-gray-200"}`} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <div onClick={() => onChange(!enabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${enabled ? "bg-[#fe8a24]" : "bg-gray-300"}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = "orange" }) {
  const colors = { orange: "text-[#fe8a24]", green: "text-green-600", blue: "text-blue-600", purple: "text-purple-600", gray: "text-gray-500" };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-3xl font-bold ${colors[color] || colors.orange}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function RefreshButton({ onClick, refreshing }) {
  return (
    <button onClick={onClick} disabled={refreshing} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 flex-shrink-0">
      <svg className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
}

// Turns { offerDurationValue: 3, offerDurationUnit: "weeks" } into "3 weeks" — used
// client-side for the test/preview email, mirroring the same helper in
// functions/sendThankYouEmails.js.
function formatOfferDuration(value, unit) {
  const n = parseInt(value, 10);
  if (!n) return "";
  const labels = { days: n === 1 ? "day" : "days", weeks: n === 1 ? "week" : "weeks", months: n === 1 ? "month" : "months" };
  return `${n} ${labels[unit] || unit || "days"}`;
}

function pct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ─── Overview ─────────────────────────────────────────────────────────────────

function CRMOverview({ restaurantId }) {
  const [stats, setStats] = useState({
    emailsSent: 0, feedbackCount: 0, avgOverall: "0.0", avgFood: "0.0", avgService: "0.0", avgAtmosphere: "0.0",
    positiveCount: 0, responseRate: 0,
    offersSent: 0, offerClicks: 0, offerReservationsCreated: 0, offersRedeemed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const fbQuery = query(collection(firestore, "feedback"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc"));
      const fbSnap = await getDocs(fbQuery);
      const feedbacks = fbSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const logSnap = await getDoc(doc(firestore, "crm_stats", restaurantId));
      const logData = logSnap.exists() ? logSnap.data() : {};
      const count = feedbacks.length;
      const avgField = (field) => count > 0 ? (feedbacks.reduce((s, f) => s + (f[field] || 0), 0) / count).toFixed(1) : "0.0";
      const positive = feedbacks.filter((f) => (((f.foodRating || 0) + (f.serviceRating || 0) + (f.atmosphereRating || 0) + (f.overallRating || 0)) / 4) >= 4.5).length;
      setStats({
        emailsSent: logData.emailsSent || 0,
        feedbackCount: count,
        avgOverall: avgField("overallRating"), avgFood: avgField("foodRating"), avgService: avgField("serviceRating"), avgAtmosphere: avgField("atmosphereRating"),
        positiveCount: positive,
        responseRate: logData.emailsSent > 0 ? Math.round((count / logData.emailsSent) * 100) : 0,
        offersSent: logData.offersSent || 0,
        offerClicks: logData.offerClicks || 0,
        offerReservationsCreated: logData.offerReservationsCreated || 0,
        offersRedeemed: logData.offersRedeemed || 0,
      });
      setRecentFeedback(feedbacks.slice(0, 5));
      setLastUpdated(new Date());
    } catch (e) { console.error("CRM Overview load error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 -mt-2">
        <p className="text-xs text-gray-400">{lastUpdated ? `Last updated ${lastUpdated.toLocaleTimeString()}` : ""}</p>
        <RefreshButton onClick={() => load(true)} refreshing={refreshing} />
      </div>
      <div className="mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Email Activity</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <MetricCard label="Emails Sent" value={stats.emailsSent} color="orange" />
          <MetricCard label="Survey Responses" value={stats.feedbackCount} color="blue" />
          <MetricCard label="Response Rate" value={`${stats.responseRate}%`} color="green" />
        </div>
      </div>
      <div className="mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Offer Performance</p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <MetricCard label="Offers Sent" value={stats.offersSent} color="orange" />
          <MetricCard label="Link Clicks" value={stats.offerClicks} sub={pct(stats.offerClicks, stats.offersSent) + " click rate"} color="blue" />
          <MetricCard label="Reservations Created" value={stats.offerReservationsCreated} sub={pct(stats.offerReservationsCreated, stats.offerClicks) + " of clicks booked"} color="purple" />
          <MetricCard label="Offers Redeemed" value={stats.offersRedeemed} sub="visit completed" color="green" />
          <MetricCard label="Redemption Rate" value={pct(stats.offersRedeemed, stats.offersSent)} sub="of offers sent" color="green" />
        </div>
      </div>
      <div className="mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Average Ratings</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard label="Overall" value={stats.avgOverall} sub="out of 5" color="orange" />
          <MetricCard label="Food Quality" value={stats.avgFood} sub="out of 5" color="orange" />
          <MetricCard label="Service" value={stats.avgService} sub="out of 5" color="orange" />
          <MetricCard label="Atmosphere" value={stats.avgAtmosphere} sub="out of 5" color="orange" />
        </div>
      </div>
      <div className="mb-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Public Review Funnel</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <MetricCard label="Positive Submissions" value={stats.positiveCount} color="green" />
          <MetricCard label="Google Review Prompts" value={stats.positiveCount} sub="shown to eligible guests" color="blue" />
          <MetricCard label="TripAdvisor Prompts" value={stats.positiveCount} sub="shown to eligible guests" color="blue" />
        </div>
      </div>
      <SectionCard title="Recent Feedback" subtitle="Latest 5 guest submissions">
        {recentFeedback.length === 0 ? (
          <div className="text-center py-10">
            <svg className="mx-auto h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            <p className="text-sm text-gray-400">No feedback collected yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentFeedback.map((fb) => (
              <div key={fb.id} className="py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-800">{fb.email || "Guest"}</span>
                  <span className="text-xs text-gray-400">{fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString() : "—"}</span>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-1">
                  {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => (
                    <span key={label} className="flex items-center gap-1">{label} <StarRating value={val} /></span>
                  ))}
                </div>
                {fb.comments && <p className="text-sm text-gray-600 italic mt-1 bg-gray-50 rounded-lg px-3 py-2">"{fb.comments}"</p>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Email Log ────────────────────────────────────────────────────────────────

function EmailLog({ restaurantId }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const q = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), orderBy("thankYouEmailSentAt", "desc"), limit(50));
      const snap = await getDocs(q);
      setEmails(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch {
      try {
        const q2 = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), limit(50));
        const snap2 = await getDocs(q2);
        const rows = snap2.docs.map((d) => ({ id: d.id, ...d.data() }));
        rows.sort((a, b) => { const tA = a.thankYouEmailSentAt?.toDate?.() || new Date(0); const tB = b.thankYouEmailSentAt?.toDate?.() || new Date(0); return tB - tA; });
        setEmails(rows);
      } catch (e2) { console.error("Email log load error:", e2); }
    } finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fe8a24]" /></div>;

  if (emails.length === 0) return (
    <div className="text-center py-10">
      <svg className="mx-auto h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
      <p className="text-sm text-gray-400">No thank you emails sent yet.</p>
      <p className="text-xs text-gray-300 mt-1">Emails appear here after the scheduled function runs.</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-3"><RefreshButton onClick={() => load(true)} refreshing={refreshing} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Guest","Email","Visit date","Sent at","Status"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emails.map((r) => {
              const visitDate = r.reservation_date?.toDate?.() || (r.reservation_date ? new Date(r.reservation_date) : null);
              const sentAt = r.thankYouEmailSentAt?.toDate?.() || null;
              return (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{r.customer_name || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{r.customer_email || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{visitDate ? visitDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{sentAt ? sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      Sent
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {emails.length === 50 && <p className="text-xs text-gray-400 text-center mt-4">Showing 50 most recent.</p>}
    </div>
  );
}

// ─── Email Automation ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  enabled: false, sendHour: "10",
  thankYouMessage: "Thank you for visiting {{restaurant_name}}.\n\nWe hope you had a wonderful experience and look forward to welcoming you again soon.",
  offerEnabled: false, offerTitle: "Welcome Back Offer",
  offerDescription: "We would love to welcome you back. If you visit us again within the next {{offer_duration}}, use the offer below and receive 10% off all starters, main courses, and desserts.",
  offerCode: "WELCOME10",
  offerDurationValue: "3", offerDurationUnit: "weeks",
  offerConditions: "",
  surveyEnabled: true,
  surveyQuestions: { food: true, service: true, atmosphere: true, overall: true, comments: true },
  reviewThreshold: "4.5", googleReviewUrl: "", tripAdvisorUrl: "",
};

function EmailAutomation({ restaurantId }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activePanel, setActivePanel] = useState("settings");

  // ── Test panel state ─────────────────────────────────────────────────────
  const [testEmail, setTestEmail] = useState("");
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState(null); // {ok, message}
  const [checklist, setChecklist] = useState(null);   // built when panel opens
  const [checklistLoading, setChecklistLoading] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoading(true);
    getDoc(doc(firestore, "crm_settings", restaurantId))
      .then((snap) => { if (snap.exists()) setSettings({ ...DEFAULT_SETTINGS, ...snap.data() }); })
      .catch(console.error).finally(() => setLoading(false));
  }, [restaurantId]);

  const set = (key, value) => setSettings((prev) => ({ ...prev, [key]: value }));
  const setSurveyQ = (key, value) => setSettings((prev) => ({ ...prev, surveyQuestions: { ...prev.surveyQuestions, [key]: value } }));

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    try {
      await setDoc(doc(firestore, "crm_settings", restaurantId), settings, { merge: true });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error("Save settings error:", e); }
    finally { setSaving(false); }
  };

  // ── Send a preview email using the existing sendEmail Cloud Function ────
  const sendTestEmail = async () => {
    if (!testEmail.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      // Use getFunctions from firebase/functions — same pattern as PublicReservationPage
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions(undefined, "asia-southeast1");
      const sendEmailFn = httpsCallable(functions, "sendEmail");

      const restaurantName = "Your Restaurant (preview)";
      const thankYouHtml = (settings.thankYouMessage || "")
        .replace(/{{restaurant_name}}/g, restaurantName)
        .replace(/{{customer_first_name}}/g, "Test Guest")
        .replace(/{{customer_full_name}}/g, "Test Guest")
        .replace(/{{reservation_date}}/g, new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }))
        .replace(/{{reservation_time}}/g, "19:00")
        .replace(/{{party_size}}/g, "2")
        .replace(/\n/g, "<br/>");

      const durationText = formatOfferDuration(settings.offerDurationValue, settings.offerDurationUnit);
      const offerDescriptionFilled = (settings.offerDescription || "").replace(/{{\s*offer_duration\s*}}/g, durationText);
      const offerConditions = (settings.offerConditions || "").trim();

      const offerHtml = settings.offerEnabled ? `
        <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
          <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${settings.offerTitle || "Welcome Back Offer"}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#555;">${offerDescriptionFilled.replace(/\n/g, "<br/>")}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${settings.offerCode}</strong></p>
          <a href="https://dashboard.dinery.ai/reserve/" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
          ${offerConditions ? `<p style="margin:12px 0 0;font-size:11px;color:#999;line-height:1.5;">${offerConditions.replace(/\n/g, "<br/>")}</p>` : ""}
        </div>` : "";

      const surveyHtml = settings.surveyEnabled ? `
        <div style="margin-top:20px;text-align:center;">
          <a href="https://dashboard.dinery.ai/feedback/PREVIEW" style="display:inline-block;background:#1e293b;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">Share Your Feedback</a>
          <p style="margin:10px 0 0;font-size:12px;color:#999;">It only takes a minute.</p>
        </div>` : "";

      const payload = {
        to: testEmail.trim(),
        subject: `[TEST PREVIEW] Thank you for visiting ${restaurantName}!`,
        isReservation: true, // bypasses the auth check in sendEmail.js
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#1e293b;">
          <div style="background:#fff3e8;border:2px solid #fe8a24;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:12px;color:#c05a00;font-weight:600;">
            ⚠️ TEST PREVIEW — this is what your guests will receive. Links are placeholders.
          </div>
          <h2 style="color:#fe8a24;margin-bottom:4px;">Thank you for visiting!</h2>
          <p style="font-size:14px;line-height:1.6;">${thankYouHtml}</p>
          ${offerHtml}
          ${surveyHtml}
        </div>`,
      };

      console.log("📧 Calling sendEmail with payload:", { to: payload.to, subject: payload.subject });

      const result = await sendEmailFn(payload);
      const data = result.data;

      console.log("📧 sendEmail response:", data);

      // Your sendEmail.js returns { success, id, message, error } — check it explicitly
      if (data?.success === false) {
        setTestResult({
          ok: false,
          message: `Function ran but Resend rejected the email: ${data.error || data.message || "Unknown Resend error"}. Check that RESEND_API_KEY is bound to sendEmail in Firebase.`,
        });
      } else if (data?.id?.startsWith("simulated-")) {
        setTestResult({
          ok: false,
          message: `Function ran but RESEND_API_KEY is not set — email was simulated, not actually sent. Go to Firebase Console → Functions → sendEmail → Secrets and bind RESEND_API_KEY.`,
        });
      } else {
        setTestResult({
          ok: true,
          message: `Email sent! Resend ID: ${data?.id || "—"}. Check ${testEmail.trim()} — also check your spam folder.`,
        });
      }
    } catch (e) {
      console.error("sendTestEmail error:", e);
      // httpsCallable throws for network errors, auth errors, and function-level HttpsError
      const msg = e?.message || "Unknown error";
      const isAuth = msg.toLowerCase().includes("unauthenticated");
      setTestResult({
        ok: false,
        message: isAuth
          ? "Auth error: the sendEmail function rejected the call. Make sure you are logged in and the isReservation flag is set — check sendEmail.js line that reads isReservationEmail."
          : `Error calling sendEmail: ${msg}`,
      });
    } finally {
      setTestSending(false);
    }
  };

  // ── Checklist: validates all conditions the scheduler checks ─────────────
  const runChecklist = async () => {
    setChecklistLoading(true);
    setChecklist(null);
    try {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, "0");
      const hourMatch = currentHour === String(settings.sendHour).padStart(2, "0");
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const dayStart = new Date(yesterday); dayStart.setHours(0,0,0,0);
      const dayEnd = new Date(yesterday); dayEnd.setHours(23,59,59,999);
      let sampleReservation = null;
      let alreadySent = false;
      let hasEmail = false;
      let goodStatus = false;
      try {
        const { Timestamp } = await import("firebase/firestore");
        const resQ = query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("reservation_date", ">=", Timestamp.fromDate(dayStart)), where("reservation_date", "<=", Timestamp.fromDate(dayEnd)), limit(10));
        const snap = await getDocs(resQ);
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        sampleReservation = all[0] || null;
        if (sampleReservation) {
          hasEmail = !!sampleReservation.customer_email?.trim();
          goodStatus = ["confirmed", "completed"].includes(sampleReservation.status);
          alreadySent = sampleReservation.thankYouEmailSent === true;
        }
      } catch (_) {}
      let indexOk = true;
      let indexLink = "";
      try {
        await getDocs(query(collection(firestore, "reservations"), where("restaurant_id", "==", restaurantId), where("thankYouEmailSent", "==", true), orderBy("thankYouEmailSentAt", "desc"), limit(1)));
      } catch (indexErr) {
        indexOk = false;
        // Log the full error — Firebase embeds the index creation URL in the error message
        console.error("🔴 Firestore index missing — create it here:", indexErr.message || indexErr);
        const urlMatch = (indexErr.message || "").match(/https:\/\/console\.firebase\.google\.com[^\s"']*/);
        if (urlMatch) indexLink = urlMatch[0];
      }
      setChecklist({
        items: [
          { label: "Email automation enabled", ok: settings.enabled, detail: settings.enabled ? "Enabled in settings" : "Turn on in the Settings panel first" },
          { label: "Send hour matches current hour", ok: hourMatch, detail: hourMatch ? `Both set to ${currentHour}:00 ✓` : `Configured: ${settings.sendHour}:00 — Current server hour: ${currentHour}:00. Go to Settings and change Send Time to "${currentHour}:00 — ${parseInt(currentHour) < 12 ? currentHour + ":00 AM" : parseInt(currentHour) === 12 ? "12:00 PM" : (parseInt(currentHour)-12).toString().padStart(2,"0")+":00 PM"}" then save, then re-run this checklist.` },
          { label: "crm_settings saved to Firestore", ok: true, detail: "Settings doc found (you loaded them successfully)" },
          { label: "Yesterday's reservations found", ok: !!sampleReservation, detail: sampleReservation ? `Found: ${sampleReservation.customer_name || sampleReservation.id}` : "No reservations found for yesterday. Create a test reservation with yesterday's date." },
          { label: "Reservation has customer email", ok: hasEmail, detail: hasEmail ? sampleReservation.customer_email : "No email on the sample reservation — add one in Firestore." },
          { label: "Status is confirmed or completed", ok: goodStatus, detail: goodStatus ? `Status: ${sampleReservation.status}` : `Status is "${sampleReservation?.status || "unknown"}" — change it to confirmed or completed.` },
          { label: "Email not already sent", ok: !alreadySent, detail: alreadySent ? "thankYouEmailSent is already true — delete that field in Firestore to re-test." : "Not yet sent for this reservation" },
          { label: "Firestore index for email log", ok: indexOk, detail: indexOk ? "Composite index exists" : indexLink ? `Index missing. A creation link was logged to your browser console (F12 → Console tab). Click it and wait ~1 minute, then re-run.` : "Index missing. Check browser console (F12 → Console) for a 🔴 error with a Firebase link. If no link appears, create it manually in Firebase Console → Firestore → Indexes tab.", indexLink },
        ],
        checkedAt: new Date(),
      });
    } catch (e) {
      console.error("Checklist error:", e);
    } finally {
      setChecklistLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Email Automation</h2>
          <p className="text-sm text-gray-500 mt-1">Configure your thank you email workflow and view sent email history.</p>
        </div>
        {activePanel === "settings" && (
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-[#fe8a24] text-white text-sm font-semibold rounded-lg hover:bg-[#e07a1f] transition-colors disabled:opacity-60 shadow-sm">
            {saving ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Saving…</> : saved ? <>✓ Saved!</> : "Save Settings"}
          </button>
        )}
      </div>
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[
          ["settings", "Settings", "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z"],
          ["log", "Email Log", "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"],
          ["test", "Test", "M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"],
        ].map(([key, label, path]) => (
          <button key={key} onClick={() => { setActivePanel(key); if (key === "test" && !checklist) runChecklist(); }} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activePanel === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} /></svg>
            {label}
          </button>
        ))}
      </div>
      {activePanel === "settings" && (
        <div>
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 border ${settings.enabled ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${settings.enabled ? "bg-green-500 animate-pulse" : "bg-gray-300"}`} />
            <div className="flex-1">
              <p className={`text-sm font-semibold ${settings.enabled ? "text-green-800" : "text-gray-600"}`}>{settings.enabled ? `Automation active — sending at ${settings.sendHour}:00 (${parseInt(settings.sendHour) < 12 ? settings.sendHour + ":00 AM" : settings.sendHour === "12" ? "12:00 PM" : (parseInt(settings.sendHour) - 12).toString().padStart(2,"0") + ":00 PM"}) the day after each visit` : "Automation is off"}</p>
              <p className={`text-xs mt-0.5 ${settings.enabled ? "text-green-600" : "text-gray-400"}`}>{settings.enabled ? `Offer ${settings.offerEnabled ? "✓ enabled" : "✗ disabled"} · Survey ${settings.surveyEnabled ? "✓ enabled" : "✗ disabled"} · Review threshold ${settings.reviewThreshold}★` : "Enable below to start sending thank you emails automatically."}</p>
            </div>
            <Toggle enabled={settings.enabled} onChange={(v) => set("enabled", v)} />
          </div>
          <SectionCard title="Send Time" subtitle="When the email is sent the day after the reservation.">
            <select value={settings.sendHour} onChange={(e) => set("sendHour", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              {Array.from({ length: 24 }, (_, i) => {
                const val = String(i).padStart(2, "0");
                const h12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                const ampm = i < 12 ? "AM" : "PM";
                return <option key={val} value={val}>{val}:00 — {h12}:00 {ampm}</option>;
              })}
            </select>
            <p className="text-xs text-gray-400 mt-2">Only sent for <span className="font-mono bg-gray-100 px-1 rounded">confirmed</span> or <span className="font-mono bg-gray-100 px-1 rounded">completed</span> reservations. Each reservation receives only one email.</p>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-xs text-amber-700"><span className="font-semibold">Testing tip:</span> set this to the current hour then run <span className="font-mono bg-white px-1 rounded border border-amber-200">gcloud scheduler jobs run</span> from your terminal.</p></div>
          </SectionCard>
          <SectionCard title="Thank You Message" subtitle="The opening message guests receive. Click a tag to insert it.">
            <textarea value={settings.thankYouMessage} onChange={(e) => set("thankYouMessage", e.target.value)} rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24] resize-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              {["{{restaurant_name}}","{{customer_first_name}}","{{customer_full_name}}","{{reservation_date}}","{{reservation_time}}","{{party_size}}"].map((tag) => (
                <span key={tag} className="text-xs bg-orange-50 text-[#fe8a24] border border-orange-200 rounded px-2 py-1 font-mono cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => set("thankYouMessage", settings.thankYouMessage + " " + tag)}>{tag}</span>
              ))}
            </div>
          </SectionCard>
          <SectionCard title="Return Visit Offer" subtitle="Show a promotional offer to encourage guests to book again." action={<Toggle enabled={settings.offerEnabled} onChange={(v) => set("offerEnabled", v)} />}>
            {settings.offerEnabled ? (
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer Title</label><input type="text" value={settings.offerTitle} onChange={(e) => set("offerTitle", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Valid For</label>
                  <div className="flex gap-2">
                    <input type="number" min="1" value={settings.offerDurationValue} onChange={(e) => set("offerDurationValue", e.target.value)} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
                    <select value={settings.offerDurationUnit} onChange={(e) => set("offerDurationUnit", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">How long the offer is valid for. Use the <span className="font-mono bg-gray-100 px-1 rounded">{"{{offer_duration}}"}</span> tag in the description below to mention it, e.g. "valid for the next {"{{offer_duration}}"}".</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Description</label>
                  <textarea value={settings.offerDescription} onChange={(e) => set("offerDescription", e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24] resize-none" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["{{offer_duration}}"].map((tag) => (
                      <span key={tag} className="text-xs bg-orange-50 text-[#fe8a24] border border-orange-200 rounded px-2 py-1 font-mono cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => set("offerDescription", settings.offerDescription + " " + tag)}>{tag}</span>
                    ))}
                  </div>
                </div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">Offer Code</label><input type="text" value={settings.offerCode} onChange={(e) => set("offerCode", e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Offer Conditions <span className="text-gray-400 font-normal">(optional)</span></label>
                  <textarea value={settings.offerConditions} onChange={(e) => set("offerConditions", e.target.value)} rows={2} placeholder="e.g. Valid Tuesday–Thursday only. Minimum spend $50. Cannot be combined with other offers." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24] resize-none" />
                  <p className="text-xs text-gray-400 mt-1">Shown in small print at the bottom of the offer box in the email, below the button.</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4"><p className="text-xs text-[#fe8a24] font-semibold mb-1">How the offer link works</p><p className="text-xs text-gray-600">When a guest clicks "Book Your Next Visit", the click is logged, then they land on the reservation page with the offer code attached. When they complete that booking, it's automatically credited back to this campaign — so you can see clicks, bookings, and redemptions all in the Overview tab.</p></div>
              </div>
            ) : <p className="text-sm text-gray-400">Enable to configure a return visit offer for your guests.</p>}
          </SectionCard>
          <SectionCard title="Feedback Survey" subtitle="Collect star ratings and written comments from guests after their visit." action={<Toggle enabled={settings.surveyEnabled} onChange={(v) => set("surveyEnabled", v)} />}>
            {settings.surveyEnabled ? (
              <div>
                <p className="text-sm text-gray-500 mb-4">Choose which questions appear in the survey.</p>
                {[{key:"food",label:"Food Quality (1–5 stars)"},{key:"service",label:"Service (1–5 stars)"},{key:"atmosphere",label:"Atmosphere (1–5 stars)"},{key:"overall",label:"Overall Experience (1–5 stars)"},{key:"comments",label:"Additional Comments (free text)"}].map(({key,label}) => (
                  <div key={key} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-700">{label}</span>
                    <Toggle enabled={settings.surveyQuestions[key]} onChange={(v) => setSurveyQ(key, v)} />
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">Enable to collect structured feedback from your guests.</p>}
          </SectionCard>
          <SectionCard title="Public Review Funnel" subtitle="Prompt satisfied guests to leave a public review on Google or TripAdvisor.">
            <div className="space-y-5">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Suggest public review if average rating is above</label>
                <select value={settings.reviewThreshold} onChange={(e) => set("reviewThreshold", e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
                  <option value="4.0">4.0 and above</option><option value="4.5">4.5 and above</option><option value="5.0">5.0 only</option>
                </select>
              </div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Google Review URL</label><input type="url" value={settings.googleReviewUrl} onChange={(e) => set("googleReviewUrl", e.target.value)} placeholder="https://g.page/r/YOUR_PLACE_ID/review" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">TripAdvisor Review URL</label><input type="url" value={settings.tripAdvisorUrl} onChange={(e) => set("tripAdvisorUrl", e.target.value)} placeholder="https://www.tripadvisor.com/UserReview-..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" /></div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4"><p className="text-xs text-blue-700 font-semibold mb-1">How the review funnel works</p><p className="text-xs text-gray-600">After a guest submits feedback, the average of all ratings is calculated. If it exceeds the threshold, they are shown Google or TripAdvisor review buttons. If below, a polite thank-you is shown with no review links.</p></div>
            </div>
          </SectionCard>
        </div>
      )}
      {activePanel === "log" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Sent Email Log</h3>
            <p className="text-sm text-gray-500 mt-0.5">Reservations that received a thank you email.</p>
          </div>
          <div className="px-6 py-5"><EmailLog restaurantId={restaurantId} /></div>
        </div>
      )}

      {/* ── Test panel ────────────────────────────────────────────────────── */}
      {activePanel === "test" && (
        <div className="space-y-6">

          {/* Send preview email */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Send a preview email</h3>
              <p className="text-sm text-gray-500 mt-0.5">Sends a real email using your current settings so you can see exactly what guests receive. Uses your existing <span className="font-mono text-xs bg-gray-100 px-1 rounded">sendEmail</span> Cloud Function.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
                  onKeyDown={(e) => e.key === "Enter" && sendTestEmail()}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testSending || !testEmail.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-[#fe8a24] text-white text-sm font-semibold rounded-lg hover:bg-[#e07a1f] transition-colors disabled:opacity-50"
                >
                  {testSending ? (
                    <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Sending…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> Send Preview</>
                  )}
                </button>
              </div>
              {testResult && (
                <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-sm ${testResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}>
                  <span className="text-base flex-shrink-0">{testResult.ok ? "✓" : "✗"}</span>
                  <span>{testResult.message}</span>
                </div>
              )}
              <div className="bg-gray-50 rounded-lg px-4 py-3 text-xs text-gray-500">
                <p className="font-semibold text-gray-600 mb-1">What this sends</p>
                <ul className="space-y-0.5 list-disc list-inside">
                  <li>Your thank you message with placeholder guest/reservation data</li>
                  {settings.offerEnabled && <li>Return visit offer — title, description (with duration filled in), code <span className="font-mono">{settings.offerCode}</span>{settings.offerConditions ? ", and your conditions text" : ""}</li>}
                  {settings.surveyEnabled && <li>Feedback survey button — links to <span className="font-mono">/feedback/PREVIEW</span> (shows not-found since it is a preview, not a real reservation)</li>}
                  <li>Orange warning banner at top marking it as a test</li>
                </ul>
                <p className="mt-2">Note: the preview's offer button links directly to the reservation page (not through click tracking), so sending a test won't affect your Offer Performance stats.</p>
              </div>
            </div>
          </div>

          {/* Pre-flight checklist */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Pre-flight checklist</h3>
                <p className="text-sm text-gray-500 mt-0.5">Checks every condition the scheduled function verifies before sending. Run this to diagnose why emails aren't going out.</p>
              </div>
              <button
                onClick={runChecklist}
                disabled={checklistLoading}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${checklistLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {checklistLoading ? "Checking…" : "Re-run"}
              </button>
            </div>
            <div className="px-6 py-5">
              {checklistLoading && (
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#fe8a24]" />
                  Running checks against Firestore…
                </div>
              )}
              {checklist && !checklistLoading && (
                <div className="space-y-2">
                  {checklist.items.map((item, i) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${item.ok ? "bg-green-50 border-green-100" : "bg-red-50 border-red-200"}`}>
                      <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold mt-0.5 ${item.ok ? "bg-green-500" : "bg-red-500"}`}>
                        {item.ok ? "✓" : "✗"}
                      </span>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${item.ok ? "text-green-900" : "text-red-900"}`}>{item.label}</p>
                        <p className={`text-xs mt-0.5 ${item.ok ? "text-green-600" : "text-red-700"}`}>{item.detail}</p>
                        {!item.ok && item.indexLink && (
                          <a href={item.indexLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Create index in Firebase Console
                          </a>
                        )}
                        {!item.ok && !item.indexLink && item.label === "Firestore index for email log" && (
                          <a href={`https://console.firebase.google.com/project/dinery-9c261/firestore/indexes`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-red-600 border border-red-300 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Open Firestore Indexes
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex items-center justify-between text-xs text-gray-400">
                    <span>Checked at {checklist.checkedAt.toLocaleTimeString()}</span>
                    <span className={`font-semibold ${checklist.items.every(i => i.ok) ? "text-green-600" : "text-red-500"}`}>
                      {checklist.items.filter(i => i.ok).length}/{checklist.items.length} passed
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual trigger instructions */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">Manually trigger the scheduled function</h3>
              <p className="text-sm text-gray-500 mt-0.5">Forces the function to run now without waiting for the next hourly tick.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-gray-900 rounded-lg px-4 py-3 font-mono text-sm text-green-400 overflow-x-auto">
                <p className="text-gray-500 text-xs mb-2"># Step 1 — find the scheduler job name</p>
                <p>gcloud scheduler jobs list --project=YOUR_PROJECT_ID</p>
                <p className="text-gray-500 text-xs mt-3 mb-2"># Step 2 — trigger it immediately</p>
                <p>gcloud scheduler jobs run \</p>
                <p className="pl-4">firebase-schedule-sendThankYouEmails-asia-southeast1 \</p>
                <p className="pl-4">--project=YOUR_PROJECT_ID \</p>
                <p className="pl-4">--location=asia-southeast1</p>
                <p className="text-gray-500 text-xs mt-3 mb-2"># Step 3 — watch the logs live</p>
                <p>firebase functions:log --only sendThankYouEmails</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {[
                  { icon: "🕐", title: "Hour must match", desc: `Current hour: ${String(new Date().getHours()).padStart(2,"0")}:00. Set Send Time in Settings to this exact hour, save, then trigger.` },
                  { icon: "📅", title: "Date must be yesterday", desc: "The function looks for reservations where reservation_date is yesterday. Create a test reservation dated yesterday." },
                  { icon: "📧", title: "Check logs for errors", desc: "Look for ✅ or ❌ lines in the Cloud Functions log. Simulated sends appear when RESEND_API_KEY is not bound." },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-lg mb-1">{icon}</p>
                    <p className="font-semibold text-gray-700 mb-1">{title}</p>
                    <p className="text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// ─── Feedback Detail Modal ────────────────────────────────────────────────────

function FeedbackDetailModal({ feedback, onClose }) {
  const [reservation, setReservation] = useState(null);
  const [loadingRes, setLoadingRes] = useState(false);

  useEffect(() => {
    if (!feedback?.reservationId) return;
    setLoadingRes(true);
    getDoc(doc(firestore, "reservations", feedback.reservationId))
      .then((snap) => { if (snap.exists()) setReservation({ id: snap.id, ...snap.data() }); })
      .catch(console.error)
      .finally(() => setLoadingRes(false));
  }, [feedback?.reservationId]);

  if (!feedback) return null;

  const avg = (((feedback.foodRating || 0) + (feedback.serviceRating || 0) + (feedback.atmosphereRating || 0) + (feedback.overallRating || 0)) / 4).toFixed(1);
  const isPositive = parseFloat(avg) >= 4;
  const submittedAt = feedback.createdAt?.toDate ? feedback.createdAt.toDate() : null;

  const visitDate = reservation?.reservation_date?.toDate?.() || (reservation?.reservation_date ? new Date(reservation.reservation_date) : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Feedback Detail</h3>
            <p className="text-xs text-gray-400 mt-0.5">{submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-5">
            {/* Guest + avg badge */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{feedback.email || "Anonymous Guest"}</p>
                {reservation && <p className="text-xs text-gray-400 mt-0.5">{reservation.customer_name}{reservation.number_of_guests ? ` · ${reservation.number_of_guests} guests` : ""}</p>}
              </div>
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${isPositive ? "bg-green-100 text-green-700" : parseFloat(avg) >= 3 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                {avg} ★ avg
              </span>
            </div>

            {/* Ratings grid */}
            <div className="grid grid-cols-2 gap-3">
              {[{label:"Food Quality",val:feedback.foodRating},{label:"Service",val:feedback.serviceRating},{label:"Atmosphere",val:feedback.atmosphereRating},{label:"Overall",val:feedback.overallRating}].map(({label,val}) => val !== null && (
                <div key={label} className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-2">{label}</p>
                  <StarRating value={val} size="lg" />
                  <p className="text-sm font-bold text-gray-700 mt-1">{val} / 5</p>
                </div>
              ))}
            </div>

            {/* Comments */}
            {feedback.comments && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Comments</p>
                <div className="bg-gray-50 rounded-xl p-4 border-l-4 border-[#fe8a24]">
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{feedback.comments}"</p>
                </div>
              </div>
            )}

            {/* Linked reservation */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Linked Reservation</p>
              {loadingRes ? (
                <div className="flex items-center gap-2 text-xs text-gray-400"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300" /> Loading…</div>
              ) : reservation ? (
                <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Visit date</span>
                    <span className="font-medium text-gray-700">{visitDate ? visitDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Time</span>
                    <span className="font-medium text-gray-700">{reservation.from_time || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Party size</span>
                    <span className="font-medium text-gray-700">{reservation.number_of_guests ? `${reservation.number_of_guests} guests` : "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Table</span>
                    <span className="font-medium text-gray-700">{reservation.table_name || reservation.combination_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status</span>
                    <span className={`font-medium capitalize ${reservation.status === "completed" ? "text-blue-600" : reservation.status === "confirmed" ? "text-green-600" : "text-gray-500"}`}>{reservation.status}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Reservation not found or was deleted.</p>
              )}
            </div>

            {/* Survey link (useful for sharing/testing) */}
            {feedback.reservationId && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Survey Link</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                  <span className="text-xs text-gray-500 font-mono truncate flex-1">/feedback/{feedback.reservationId}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${window.location.origin}/feedback/${feedback.reservationId}`); }}
                    className="text-xs text-[#fe8a24] font-semibold hover:underline flex-shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Guest Feedback ───────────────────────────────────────────────────────────

function exportToCSV(feedbacks) {
  const headers = ["Email","Food","Service","Atmosphere","Overall","Average","Comments","Submitted"];
  const rows = feedbacks.map((fb) => {
    const avg = (((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4).toFixed(1);
    const date = fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString("en-GB") : "";
    return [fb.email || "", fb.foodRating || "", fb.serviceRating || "", fb.atmosphereRating || "", fb.overallRating || "", avg, `"${(fb.comments || "").replace(/"/g, '""')}"`, date];
  });
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `feedback-${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function RatingBar({ label, value, max = 5 }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color = value >= 4 ? "bg-green-500" : value >= 3 ? "bg-yellow-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value > 0 ? value : "—"}</span>
    </div>
  );
}

function GuestFeedback({ restaurantId }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [sortDir, setSortDir] = useState("desc");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [activeView, setActiveView] = useState("list"); // list | summary

  const load = useCallback(async (isManualRefresh = false) => {
    if (!restaurantId) return;
    if (isManualRefresh) setRefreshing(true); else setLoading(true);
    try {
      const snap = await getDocs(query(collection(firestore, "feedback"), where("restaurantId", "==", restaurantId), orderBy("createdAt", "desc")));
      setFeedbacks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error("Load feedback error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  const avgRating = (fb) => ((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4;
  const avgOf = (field) => feedbacks.length > 0 ? (feedbacks.reduce((s, f) => s + (f[field] || 0), 0) / feedbacks.length).toFixed(1) : "—";

  const filtered = feedbacks.filter((fb) => {
    if (search && !fb.comments?.toLowerCase().includes(search.toLowerCase()) && !fb.email?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterRating !== "all") {
      const avg = avgRating(fb);
      if (filterRating === "positive" && avg < 4) return false;
      if (filterRating === "neutral" && (avg < 3 || avg >= 4)) return false;
      if (filterRating === "negative" && avg >= 3) return false;
    }
    if (dateFrom) {
      const fbDate = fb.createdAt?.toDate?.() || new Date(0);
      if (fbDate < new Date(dateFrom)) return false;
    }
    if (dateTo) {
      const fbDate = fb.createdAt?.toDate?.() || new Date(0);
      const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
      if (fbDate > end) return false;
    }
    return true;
  }).sort((a, b) => {
    const tA = a.createdAt?.toDate?.() || new Date(0);
    const tB = b.createdAt?.toDate?.() || new Date(0);
    return sortDir === "desc" ? tB - tA : tA - tB;
  });

  // Distribution breakdown: count per star for overall
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: feedbacks.filter((fb) => Math.round(((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4) === star).length,
  }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Guest Feedback</h2>
          <p className="text-sm text-gray-500 mt-1">Responses collected via your thank you email survey.</p>
        </div>
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <button onClick={() => exportToCSV(filtered)} className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-lg px-3 py-1.5 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          )}
          <RefreshButton onClick={() => load(true)} refreshing={refreshing} />
        </div>
      </div>

      {/* Summary metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <MetricCard label="Total Responses" value={feedbacks.length} color="orange" />
        <MetricCard label="Avg Food" value={avgOf("foodRating")} sub="out of 5" />
        <MetricCard label="Avg Service" value={avgOf("serviceRating")} sub="out of 5" />
        <MetricCard label="Avg Atmosphere" value={avgOf("atmosphereRating")} sub="out of 5" />
        <MetricCard label="Avg Overall" value={avgOf("overallRating")} sub="out of 5" color="green" />
      </div>

      {/* View switcher */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {[["list","List view"],["summary","Summary"]].map(([key, label]) => (
          <button key={key} onClick={() => setActiveView(key)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeView === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>{label}</button>
        ))}
      </div>

      {/* Summary view */}
      {activeView === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Rating bars */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Average by category</h3>
            <div className="space-y-3">
              <RatingBar label="Food" value={parseFloat(avgOf("foodRating")) || 0} />
              <RatingBar label="Service" value={parseFloat(avgOf("serviceRating")) || 0} />
              <RatingBar label="Atmosphere" value={parseFloat(avgOf("atmosphereRating")) || 0} />
              <RatingBar label="Overall" value={parseFloat(avgOf("overallRating")) || 0} />
            </div>
          </div>
          {/* Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Rating distribution</h3>
            <div className="space-y-2">
              {distribution.map(({ star, count }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6 flex-shrink-0">{star}★</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-[#fe8a24] h-2 rounded-full transition-all" style={{ width: feedbacks.length > 0 ? `${(count / feedbacks.length) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-8 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
              <span className="text-green-600 font-semibold">{distribution.filter(d => d.star >= 4).reduce((s, d) => s + d.count, 0)} positive</span>
              <span className="text-yellow-600 font-semibold">{distribution.filter(d => d.star === 3).reduce((s, d) => s + d.count, 0)} neutral</span>
              <span className="text-red-500 font-semibold">{distribution.filter(d => d.star <= 2).reduce((s, d) => s + d.count, 0)} negative</span>
            </div>
          </div>
        </div>
      )}

      {/* Filters — shown in list view */}
      {activeView === "list" && (
        <div className="space-y-3 mb-6">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Search by email or comment…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-9 pr-3 border border-gray-300 rounded-lg py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            </div>
            <select value={filterRating} onChange={(e) => setFilterRating(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              <option value="all">All ratings</option>
              <option value="positive">Positive (4+)</option>
              <option value="neutral">Neutral (3–4)</option>
              <option value="negative">Negative (below 3)</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs text-gray-400 font-medium">Date range:</span>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            <span className="text-xs text-gray-400">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(""); setDateTo(""); }} className="text-xs text-gray-400 hover:text-red-500 transition-colors">Clear dates</button>
            )}
            {filtered.length !== feedbacks.length && (
              <span className="text-xs text-[#fe8a24] font-medium">{filtered.length} of {feedbacks.length} shown</span>
            )}
          </div>
        </div>
      )}

      {/* Empty state for list view */}
      {activeView === "list" && filtered.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          {feedbacks.length === 0 ? (
            <>
              <p className="text-gray-500 text-sm font-medium mb-1">No feedback yet</p>
              <p className="text-gray-400 text-xs">Once guests submit the survey, their responses appear here.</p>
              <p className="text-gray-300 text-xs mt-2">To test, visit <span className="font-mono">/feedback/&lt;reservationId&gt;</span> directly in your browser.</p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">No feedback matches your current filters.</p>
          )}
        </div>
      )}

      {/* Feedback list */}
      {activeView === "list" && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((fb) => {
            const avg = avgRating(fb).toFixed(1);
            const isPositive = parseFloat(avg) >= 4;
            const submittedAt = fb.createdAt?.toDate ? fb.createdAt.toDate() : null;
            return (
              <div
                key={fb.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:border-[#fe8a24]/40 hover:shadow-sm transition-all cursor-pointer"
                onClick={() => setSelectedFeedback(fb)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar initial */}
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-[#fe8a24]">{(fb.email || "G").charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{fb.email || "Anonymous Guest"}</p>
                      <p className="text-xs text-gray-400">{submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${isPositive ? "bg-green-100 text-green-700" : parseFloat(avg) >= 3 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {avg} ★
                    </span>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                {/* Compact inline ratings */}
                <div className="flex flex-wrap gap-3 mb-2">
                  {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => val !== null && val !== undefined && (
                    <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
                      {label} <StarRating value={val} />
                    </span>
                  ))}
                </div>
                {fb.comments && (
                  <p className="text-sm text-gray-500 italic line-clamp-2 mt-1">"{fb.comments}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedFeedback && (
        <FeedbackDetailModal feedback={selectedFeedback} onClose={() => setSelectedFeedback(null)} />
      )}
    </div>
  );
}

// ─── NAV TABS ─────────────────────────────────────────────────────────────────

const NAV_TABS = [
  { key: "overview", label: "Overview", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
  { key: "email-settings", label: "Email Automation", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> },
  { key: "feedback", label: "Guest Feedback", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg> },
];

// ─── Main CRM Shell ───────────────────────────────────────────────────────────

export default function CRM() {
  const [activeTab, setActiveTab] = useState("overview");
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    async function resolveRestaurants() {
      setLoading(true);
      try {
        const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
        if (staffRestaurantId) {
          setIsStaff(true);
          const staffCollection = sessionStorage.getItem("staffCollection") || "restaurants";
          const snap = await getDoc(doc(firestore, staffCollection, staffRestaurantId));
          if (snap.exists()) { const r = { id: snap.id, ...snap.data() }; setRestaurants([r]); setSelectedRestaurant(r); }
          setLoading(false); return;
        }
        const currentUser = auth.currentUser;
        if (!currentUser) { setLoading(false); return; }
        let role = "owner";
        try { const us = await getDoc(doc(firestore, "users", currentUser.uid)); if (us.exists()) role = (us.data().role || "owner").toLowerCase(); } catch (_) {}
        const col1 = role === "tester" ? "TestRestaurant" : "restaurants";
        const col2 = role === "tester" ? null : "TestRestaurant";
        const snap1 = await getDocs(query(collection(firestore, col1), where("Owner_ID", "==", currentUser.uid)));
        let all = snap1.docs.map((d) => ({ id: d.id, ...d.data(), _collection: col1 }));
        if (col2) { try { const snap2 = await getDocs(query(collection(firestore, col2), where("Owner_ID", "==", currentUser.uid))); all = [...all, ...snap2.docs.map((d) => ({ id: d.id, ...d.data(), _collection: col2 }))]; } catch (_) {} }
        setRestaurants(all);
        if (all.length > 0) setSelectedRestaurant(all[0]);
      } catch (e) { console.error("CRM restaurant resolve error:", e); }
      finally { setLoading(false); }
    }
    resolveRestaurants();
  }, []);

  const handleRestaurantChange = (id) => { const found = restaurants.find((r) => r.id === id); if (found) setSelectedRestaurant(found); };

  if (loading) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24] mx-auto mb-3" /><p className="text-sm text-gray-400">Loading CRM…</p></div>
    </div>
  );

  if (!selectedRestaurant) return (
    <div className="flex items-center justify-center h-full min-h-screen bg-gray-50">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-[#fe8a24]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
        </div>
        <p className="text-gray-700 text-base font-semibold">No restaurant found</p>
        <p className="text-gray-400 text-sm mt-1">Please add a restaurant first in the Restaurant section.</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-[#fe8a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div><h1 className="text-lg font-bold text-gray-900 leading-tight">CRM</h1><p className="text-xs text-gray-400">Customer Relationship Management</p></div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {restaurants.length > 1 && !isStaff ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                <select value={selectedRestaurant.id} onChange={(e) => handleRestaurantChange(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#fe8a24] appearance-none cursor-pointer hover:border-[#fe8a24] transition-colors">
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <svg className="w-4 h-4 text-[#fe8a24]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                <span className="text-sm font-semibold text-[#fe8a24]">{selectedRestaurant.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-6 flex gap-1 pb-0">
          {NAV_TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${activeTab === tab.key ? "border-[#fe8a24] text-[#fe8a24]" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {activeTab === "overview" && <div className="mb-6"><h2 className="text-2xl font-bold text-gray-900">CRM Overview</h2><p className="text-sm text-gray-500 mt-1">Performance summary for your guest engagement automation.</p></div>}
          {activeTab === "overview" && <CRMOverview restaurantId={selectedRestaurant.id} />}
          {activeTab === "email-settings" && <EmailAutomation restaurantId={selectedRestaurant.id} />}
          {activeTab === "feedback" && <GuestFeedback restaurantId={selectedRestaurant.id} />}
        </div>
      </div>
    </div>
  );
}