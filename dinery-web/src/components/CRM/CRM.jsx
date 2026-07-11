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
import Campaigns from "./Campaigns";
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden mb-6">
      <div className="px-6 py-4 border-b border-gray-50 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {action && <div className="ml-4 flex-shrink-0">{action}</div>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = "orange", icon, trend }) {
  const colors = { 
    orange: "text-[#fe8a24]", 
    green: "text-emerald-600", 
    blue: "text-blue-600", 
    purple: "text-purple-600", 
    gray: "text-gray-500",
    rose: "text-rose-500",
    indigo: "text-indigo-600"
  };
  
  const bgColors = {
    orange: "bg-orange-50",
    green: "bg-emerald-50",
    blue: "bg-blue-50",
    purple: "bg-purple-50",
    gray: "bg-gray-50",
    rose: "bg-rose-50",
    indigo: "bg-indigo-50"
  };
  
  const iconColors = {
    orange: "text-orange-500",
    green: "text-emerald-500",
    blue: "text-blue-500",
    purple: "text-purple-500",
    gray: "text-gray-400",
    rose: "text-rose-500",
    indigo: "text-indigo-500"
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all duration-200 hover:border-gray-200 group">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-bold ${colors[color] || colors.orange}`}>{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1 font-medium">{sub}</p>}
          {trend && (
            <div className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold ${trend > 0 ? "text-emerald-600" : "text-rose-500"}`}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d={trend > 0 ? "M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" : "M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"} />
              </svg>
              {trend > 0 ? "+" : ""}{trend}%
            </div>
          )}
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-xl ${bgColors[color]} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
            <svg className={`w-5 h-5 ${iconColors[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function RefreshButton({ onClick, refreshing }) {
  return (
    <button onClick={onClick} disabled={refreshing} className="flex items-center gap-2 text-xs font-medium text-gray-500 hover:text-[#fe8a24] border border-gray-200 hover:border-[#fe8a24] rounded-xl px-4 py-2 transition-all duration-200 disabled:opacity-50 flex-shrink-0 hover:shadow-sm">
      <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
      {refreshing ? "Refreshing…" : "Refresh"}
    </button>
  );
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
    estimatedRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [recentFeedback, setRecentFeedback] = useState([]);
  const [hoveredMetric, setHoveredMetric] = useState(null);

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
        estimatedRevenue: logData.estimatedRevenue || 0,
      });
      setRecentFeedback(feedbacks.slice(0, 5));
      setLastUpdated(new Date());
    } catch (e) { console.error("CRM Overview load error:", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, [restaurantId]);

  useEffect(() => { load(false); }, [load]);

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#fe8a24] border-t-transparent mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Loading analytics…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header with last updated and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-gradient-to-b from-[#fe8a24] to-orange-300 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Analytics Dashboard</h2>
            <p className="text-sm text-gray-400 font-medium">Real-time insights into your guest engagement and campaign performance</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>Live</span>
            <span className="hidden sm:inline">· {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : ""}</span>
          </div>
          <RefreshButton onClick={() => load(true)} refreshing={refreshing} />
        </div>
      </div>

      {/* Key Metrics Row - Email Activity */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard 
          label="Emails Sent" 
          value={stats.emailsSent} 
          color="orange" 
          icon="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          sub={`Last 30 days`}
        />
        <MetricCard 
          label="Survey Responses" 
          value={stats.feedbackCount} 
          color="blue" 
          icon="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
        <MetricCard 
          label="Response Rate" 
          value={`${stats.responseRate}%`} 
          color="green" 
          icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          sub={`${stats.feedbackCount} of ${stats.emailsSent} responses`}
        />
        <MetricCard 
          label="Avg Overall Rating" 
          value={stats.avgOverall} 
          color="purple" 
          icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          sub="out of 5 stars"
        />
      </div>

      {/* Offer Performance Section */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-400 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 tracking-tight">Offer Performance</h3>
            <p className="text-xs text-gray-400 font-medium">Track how your return visit offers are performing</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <MetricCard 
            label="Offers Sent" 
            value={stats.offersSent} 
            color="orange" 
            icon="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
          />
          <MetricCard 
            label="Link Clicks" 
            value={stats.offerClicks} 
            color="blue" 
            icon="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
            sub={pct(stats.offerClicks, stats.offersSent) + " click-through rate"}
          />
          <MetricCard 
            label="Reservations Booked" 
            value={stats.offerReservationsCreated} 
            color="purple" 
            icon="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            sub={pct(stats.offerReservationsCreated, stats.offerClicks) + " conversion from clicks"}
          />
          <MetricCard 
            label="Redeemed Visits" 
            value={stats.offersRedeemed} 
            color="green" 
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            sub="completed visits"
          />
          <MetricCard 
            label="Redemption Rate" 
            value={pct(stats.offersRedeemed, stats.offersSent)} 
            color="rose" 
            icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            sub="of total offers sent"
          />
        </div>
      </div>

      {/* Revenue and Ratings Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-green-400 rounded-full" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 tracking-tight">Campaign Revenue</h3>
              <p className="text-xs text-gray-400 font-medium">Estimated revenue from campaign-driven bookings</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/30 rounded-2xl border border-emerald-100 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Estimated Revenue Generated</p>
                  <p className="text-3xl font-bold text-emerald-700 mt-2">{stats.estimatedRevenue.toLocaleString()}</p>
                  <p className="text-xs text-emerald-500 mt-1 font-medium">from campaign reservations, after discount</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-emerald-600">
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-emerald-400 rounded-full" />
                  {stats.offerReservationsCreated} bookings
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block w-2 h-2 bg-emerald-300 rounded-full" />
                  {stats.offersRedeemed} redeemed
                </span>
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-6 bg-gradient-to-b from-orange-400 to-yellow-300 rounded-full" />
            <div>
              <h3 className="text-sm font-bold text-gray-700 tracking-tight">Average Ratings</h3>
              <p className="text-xs text-gray-400 font-medium">Guest satisfaction across all categories</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <MetricCard 
              label="Overall" 
              value={stats.avgOverall} 
              color="orange" 
              sub="out of 5" 
              icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
            <MetricCard 
              label="Food" 
              value={stats.avgFood} 
              color="orange" 
              sub="out of 5" 
              icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <MetricCard 
              label="Service" 
              value={stats.avgService} 
              color="orange" 
              sub="out of 5" 
              icon="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
            />
            <MetricCard 
              label="Atmosphere" 
              value={stats.avgAtmosphere} 
              color="orange" 
              sub="out of 5" 
              icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </div>
        </div>
      </div>

      {/* Public Review Funnel */}
      <div>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-6 bg-gradient-to-b from-indigo-400 to-purple-400 rounded-full" />
          <div>
            <h3 className="text-sm font-bold text-gray-700 tracking-tight">Public Review Funnel</h3>
            <p className="text-xs text-gray-400 font-medium">Guest advocacy and public review prompts</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            label="Positive Submissions" 
            value={stats.positiveCount} 
            color="green" 
            icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            sub={`${pct(stats.positiveCount, stats.feedbackCount)} of total responses`}
          />
          <MetricCard 
            label="Google Review Prompts" 
            value={stats.positiveCount} 
            color="blue" 
            icon="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
            sub="shown to eligible guests"
          />
          <MetricCard 
            label="TripAdvisor Prompts" 
            value={stats.positiveCount} 
            color="purple" 
            icon="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            sub="shown to eligible guests"
          />
        </div>
      </div>

      {/* Recent Feedback Section */}
      <SectionCard 
        title="Recent Guest Feedback" 
        subtitle="Latest submissions from your guests" 
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">{recentFeedback.length} new</span>
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        }
      >
        {recentFeedback.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No feedback collected yet</p>
            <p className="text-xs text-gray-400 mt-1">Guest responses will appear here once they submit the survey</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentFeedback.map((fb, index) => {
              const avg = (((fb.foodRating || 0) + (fb.serviceRating || 0) + (fb.atmosphereRating || 0) + (fb.overallRating || 0)) / 4);
              const isPositive = avg >= 4;
              const submittedAt = fb.createdAt?.toDate ? fb.createdAt.toDate() : null;
              
              return (
                <div key={fb.id} className={`group relative bg-gradient-to-r from-gray-50/50 to-transparent hover:from-orange-50/30 transition-all duration-200 rounded-xl p-4 border border-gray-50 hover:border-orange-100 ${index > 0 ? "border-t" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-emerald-100" : "bg-gray-100"}`}>
                        <span className={`text-xs font-bold ${isPositive ? "text-emerald-600" : "text-gray-500"}`}>
                          {(fb.email || "G").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{fb.email || "Anonymous Guest"}</p>
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${isPositive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                            {isPositive ? "★" : ""} {avg.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => val !== null && val !== undefined && (
                            <span key={label} className="flex items-center gap-1 text-xs text-gray-500">
                              <span className="font-medium">{label}</span> <StarRating value={val} />
                            </span>
                          ))}
                        </div>
                        {fb.comments && (
                          <p className="text-sm text-gray-600 italic mt-2 bg-white rounded-xl px-3 py-2 border border-gray-100">"{fb.comments}"</p>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className="text-xs text-gray-400 font-medium">
                        {submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
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
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <svg className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-sm font-medium text-gray-500">No thank you emails sent yet</p>
      <p className="text-xs text-gray-400 mt-1">Emails appear here after the scheduled function runs</p>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-4"><RefreshButton onClick={() => load(true)} refreshing={refreshing} /></div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Guest","Email","Visit date","Sent at","Status"].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider pb-3 pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {emails.map((r) => {
              const visitDate = r.reservation_date?.toDate?.() || (r.reservation_date ? new Date(r.reservation_date) : null);
              const sentAt = r.thankYouEmailSentAt?.toDate?.() || null;
              return (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 pr-4 font-medium text-gray-800 whitespace-nowrap">{r.customer_name || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{r.customer_email || "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{visitDate ? visitDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</td>
                  <td className="py-3 pr-4 text-gray-500 whitespace-nowrap">{sentAt ? sentAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
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
      {emails.length === 50 && <p className="text-xs text-gray-400 text-center mt-4">Showing 50 most recent entries</p>}
    </div>
  );
}

// ─── Email Automation ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS = {
  enabled: false, sendHour: "10",
  thankYouMessage: "Thank you for visiting {{restaurant_name}}.\n\nWe hope you had a wonderful experience and look forward to welcoming you again soon.",
  offerEnabled: false,
  selectedOfferId: "",
  avgRevenuePerGuest: "",
  surveyEnabled: true,
  surveyQuestions: { food: true, service: true, atmosphere: true, overall: true, comments: true },
  reviewThreshold: "4.5", googleReviewUrl: "", tripAdvisorUrl: "",
};

function EmailAutomation({ restaurantId, collectionName = "restaurants" }) {
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

  // ── Offers list (from the Offers tab) ────────────────────────────────────
  const [restaurantOffers, setRestaurantOffers] = useState([]);
  const [loadingOffers, setLoadingOffers] = useState(false);

  useEffect(() => {
    if (!restaurantId) return;
    setLoadingOffers(true);
    getDocs(collection(firestore, collectionName, restaurantId, "offer"))
      .then((snap) => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const active = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((o) => {
            if (o.is_active === false) return false;
            const start = o.start_date ? new Date(o.start_date) : null;
            const end = o.end_date ? new Date(o.end_date) : null;
            if (end) {
              const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());
              if (endDay < today) return false; // expired
            }
            if (start) {
              const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
              if (startDay > today) return false; // not started yet
            }
            return true;
          });
        setRestaurantOffers(active);
      })
      .catch(console.error)
      .finally(() => setLoadingOffers(false));
  }, [restaurantId, collectionName]);

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

      const selectedOfferForTest = restaurantOffers.find((o) => o.id === settings.selectedOfferId);
      const testOfferLink = selectedOfferForTest
        ? `https://dashboard.dinery.ai/reserve/${encodeURIComponent(restaurantId)}?offer=${encodeURIComponent(selectedOfferForTest.offer_id)}&offerId=${encodeURIComponent(selectedOfferForTest.id)}&source=preview`
        : "https://dashboard.dinery.ai/reserve/";
      const offerHtml = settings.offerEnabled && selectedOfferForTest ? `
        <div style="margin-top:20px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:10px;">
          <p style="margin:0 0 6px;font-weight:bold;color:#fe8a24;font-size:15px;">${selectedOfferForTest.offer_name || "Welcome Back Offer"}</p>
          <p style="margin:0 0 12px;font-size:13px;color:#555;">${(selectedOfferForTest.description || "").replace(/\n/g, "<br/>")}</p>
          ${selectedOfferForTest.discount_percent ? `<p style="margin:0 0 12px;font-size:13px;color:#555;">Discount: <strong>${selectedOfferForTest.discount_percent}% off</strong></p>` : ""}
          <p style="margin:0 0 12px;font-size:13px;color:#555;">Offer code: <strong style="font-family:monospace;background:#fff;border:1px solid #fe8a24;padding:2px 8px;border-radius:4px;">${selectedOfferForTest.offer_id}</strong></p>
          <a href="${testOfferLink}" style="display:inline-block;background:#fe8a24;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">Book Your Next Visit</a>
        </div>` : "";

      const surveyHtml = settings.surveyEnabled ? `
        <div style="margin-top:24px;padding:20px;background:#fffbf5;border:1px solid #fde3c0;border-radius:12px;text-align:center;">
          <a href="https://dashboard.dinery.ai/feedback/PREVIEW" style="text-decoration:none;display:block;">
            <p style="margin:0 0 10px;font-size:14px;font-weight:bold;color:#1e293b;">⭐ Rate Your Experience</p>
            <p style="margin:0 0 10px;font-size:28px;letter-spacing:4px;line-height:1;">⭐⭐⭐⭐⭐</p>
            <p style="margin:0;font-size:13px;color:#666;line-height:1.5;">It only takes 10 seconds, but it will help us a lot. ❤️</p>
            <p style="margin:6px 0 0;font-size:12px;color:#fe8a24;font-weight:bold;">Click the stars to rate your visit →</p>
          </a>
        </div>` : "";

      const payload = {
        to: testEmail.trim(),
        subject: `[TEST PREVIEW] Thank you for visiting ${restaurantName}!`,
        isReservation: true,
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
          <SectionCard title="Return Visit Offer" subtitle="Attach one of your existing offers to the thank-you email." action={<Toggle enabled={settings.offerEnabled} onChange={(v) => set("offerEnabled", v)} />}>
            {settings.offerEnabled ? (
              loadingOffers ? (
                <p className="text-sm text-gray-400">Loading your offers…</p>
              ) : restaurantOffers.length === 0 ? (
                <p className="text-sm text-gray-400">You don't have any offers yet. Create one in the Offers tab first.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Offer</label>
                    <select value={settings.selectedOfferId} onChange={(e) => set("selectedOfferId", e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
                      <option value="">— Select an offer —</option>
                      {restaurantOffers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.offer_id}: {o.offer_name}{o.discount_percent ? ` (${o.discount_percent}% off)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  {settings.selectedOfferId && (() => {
                    const selected = restaurantOffers.find((o) => o.id === settings.selectedOfferId);
                    if (!selected) return null;
                    return (
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-xs text-gray-600">
                        <p className="font-semibold text-[#fe8a24] mb-1">{selected.offer_name} — code {selected.offer_id}</p>
                        <p>{selected.description}</p>
                        <p className="mt-2 text-gray-500">
                          Usage: {selected.usage_limit_type === "unlimited" ? "Unlimited" : selected.usage_limit_type === "max_uses" ? `Max ${selected.max_uses} total uses` : "One use per guest"}
                        </p>
                      </div>
                    );
                  })()}
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4"><p className="text-xs text-[#fe8a24] font-semibold mb-1">How the offer link works</p><p className="text-xs text-gray-600">When a guest clicks "Book Your Next Visit", the click is logged, then they land on the reservation page with the offer code attached. When they complete that booking, it's automatically credited back to this campaign — so you can see clicks, bookings, and redemptions all in the Overview tab.</p></div>
                </div>
              )
            ) : <p className="text-sm text-gray-400">Enable to attach a return visit offer to this email.</p>}
          </SectionCard>
          <SectionCard title="Campaign Revenue Tracking" subtitle="Used to estimate revenue generated by guests who book using a campaign offer.">
            <label className="block text-sm font-medium text-gray-700 mb-1">Average Revenue per Guest</label>
            <input
              type="number"
              min="0"
              step="1"
              value={settings.avgRevenuePerGuest}
              onChange={(e) => set("avgRevenuePerGuest", e.target.value)}
              placeholder="e.g. 450"
              className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
            />
            <p className="text-xs text-gray-400 mt-2">Average amount one guest typically spends during a visit. No currency symbol — just a number.</p>
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
                  {settings.offerEnabled && settings.selectedOfferId && <li>Return visit offer — <span className="font-mono">{restaurantOffers.find((o) => o.id === settings.selectedOfferId)?.offer_id || "the selected offer"}</span></li>}
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
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
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
  const color = value >= 4 ? "bg-emerald-500" : value >= 3 ? "bg-amber-400" : "bg-rose-400";
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
        <MetricCard label="Total Responses" value={feedbacks.length} color="orange" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <MetricCard label="Avg Food" value={avgOf("foodRating")} color="orange" sub="out of 5" icon="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        <MetricCard label="Avg Service" value={avgOf("serviceRating")} color="blue" sub="out of 5" icon="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
        <MetricCard label="Avg Atmosphere" value={avgOf("atmosphereRating")} color="purple" sub="out of 5" icon="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        <MetricCard label="Avg Overall" value={avgOf("overallRating")} color="green" sub="out of 5" icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
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
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Average by category</h3>
            <div className="space-y-3">
              <RatingBar label="Food" value={parseFloat(avgOf("foodRating")) || 0} />
              <RatingBar label="Service" value={parseFloat(avgOf("serviceRating")) || 0} />
              <RatingBar label="Atmosphere" value={parseFloat(avgOf("atmosphereRating")) || 0} />
              <RatingBar label="Overall" value={parseFloat(avgOf("overallRating")) || 0} />
            </div>
          </div>
          {/* Distribution */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
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
              <span className="text-emerald-600 font-semibold">{distribution.filter(d => d.star >= 4).reduce((s, d) => s + d.count, 0)} positive</span>
              <span className="text-amber-600 font-semibold">{distribution.filter(d => d.star === 3).reduce((s, d) => s + d.count, 0)} neutral</span>
              <span className="text-rose-500 font-semibold">{distribution.filter(d => d.star <= 2).reduce((s, d) => s + d.count, 0)} negative</span>
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
        <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          {feedbacks.length === 0 ? (
            <>
              <p className="text-gray-500 text-base font-semibold mb-1">No feedback yet</p>
              <p className="text-gray-400 text-sm">Once guests submit the survey, their responses appear here.</p>
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
                className="bg-white rounded-xl border border-gray-100 p-5 hover:border-[#fe8a24]/30 hover:shadow-md transition-all duration-200 cursor-pointer group"
                onClick={() => setSelectedFeedback(fb)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-emerald-100" : "bg-gray-100"}`}>
                      <span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-gray-500"}`}>
                        {(fb.email || "G").charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{fb.email || "Anonymous Guest"}</p>
                      <p className="text-xs text-gray-400">{submittedAt ? submittedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isPositive ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : parseFloat(avg) >= 3 ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                      {avg} ★
                    </span>
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-[#fe8a24] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mb-2">
                  {[["Food", fb.foodRating], ["Service", fb.serviceRating], ["Atmosphere", fb.atmosphereRating], ["Overall", fb.overallRating]].map(([label, val]) => val !== null && val !== undefined && (
                    <span key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span className="font-medium">{label}</span> <StarRating value={val} />
                    </span>
                  ))}
                </div>
                {fb.comments && (
                  <p className="text-sm text-gray-500 italic line-clamp-2 mt-1 bg-gray-50/50 rounded-lg px-4 py-2 border border-gray-50">"{fb.comments}"</p>
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
  { key: "campaigns", label: "Campaigns", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> },
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
      <div className="bg-white border-b border-gray-100 flex-shrink-0">
        <div className="px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-[#fe8a24] to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div><h1 className="text-lg font-bold text-gray-900 leading-tight">CRM</h1><p className="text-xs text-gray-400 font-medium">Customer Relationship Management</p></div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {restaurants.length > 1 && !isStaff ? (
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></div>
                <select value={selectedRestaurant.id} onChange={(e) => handleRestaurantChange(e.target.value)} className="pl-9 pr-8 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#fe8a24] appearance-none cursor-pointer hover:border-[#fe8a24] transition-colors">
                  {restaurants.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none"><svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-gradient-to-r from-orange-50 to-orange-100/50 border border-orange-200 rounded-xl px-4 py-2">
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
          {activeTab === "overview" && <CRMOverview restaurantId={selectedRestaurant.id} />}
          {activeTab === "email-settings" && <EmailAutomation restaurantId={selectedRestaurant.id} collectionName={selectedRestaurant._collection || "restaurants"} />}
          {activeTab === "campaigns" && <Campaigns restaurantId={selectedRestaurant.id} collectionName={selectedRestaurant._collection || "restaurants"} />}
          {activeTab === "feedback" && <GuestFeedback restaurantId={selectedRestaurant.id} />}
        </div>
      </div>    
    </div>
  );
}