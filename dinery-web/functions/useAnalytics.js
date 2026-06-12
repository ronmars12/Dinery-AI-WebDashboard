// src/hooks/useAnalytics.js
// Reads precomputed analytics docs instead of raw reservations
// Replaces the expensive onSnapshot query in AnalyticsSection

import { useState, useEffect, useMemo } from "react";
import {
  getFirestore, collection, query, where,
  getDocs, doc, getDoc, orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pad2 = (n) => String(n).padStart(2, "0");

const getPeriodDailyKeys = (start, end) => {
  const keys = [];
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endCopy = new Date(end);
  endCopy.setHours(23, 59, 59, 999);
  while (cur <= endCopy) {
    keys.push(
      `${cur.getFullYear()}-${pad2(cur.getMonth()+1)}-${pad2(cur.getDate())}`
    );
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

const getPeriodMonthlyKeys = (start, end) => {
  const keys = new Set();
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    keys.add(`${cur.getFullYear()}-${pad2(cur.getMonth()+1)}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return [...keys];
};

// Merge an array of analytics docs into one aggregate object
const mergeAnalyticsDocs = (docs) => {
  const result = {
    totalBookings: 0,
    confirmed: 0,
    cancelled: 0,
    pending: 0,
    completed: 0,
    totalGuests: 0,
    noShows: 0,
    durationSum: 0,
    durationCount: 0,
    originCounts: {},
    arrivalBySlot: {},
    createdByHour: {},
    leadTimeDist: {},
    guestCountDist: {},
    weekdayDist: {},
  };

  for (const d of docs) {
    if (!d) continue;
    result.totalBookings += d.totalBookings || 0;
    result.confirmed     += d.confirmed     || 0;
    result.cancelled     += d.cancelled     || 0;
    result.pending       += d.pending       || 0;
    result.completed     += d.completed     || 0;
    result.totalGuests   += d.totalGuests   || 0;
    result.noShows       += d.noShows       || 0;
    result.durationSum   += d.durationSum   || 0;
    result.durationCount += d.durationCount || 0;

    // Merge nested maps
    mergeMap(result.originCounts,   d.originCounts   || {});
    mergeMap(result.createdByHour,  d.createdByHour  || {});
    mergeMap(result.leadTimeDist,   d.leadTimeDist   || {});
    mergeMap(result.guestCountDist, d.guestCountDist || {});

    // arrivalBySlot is nested 2 levels
    for (const [slot, val] of Object.entries(d.arrivalBySlot || {})) {
      if (!result.arrivalBySlot[slot]) result.arrivalBySlot[slot] = { guests: 0, bookings: 0 };
      result.arrivalBySlot[slot].guests   += val.guests   || 0;
      result.arrivalBySlot[slot].bookings += val.bookings || 0;
    }

    // weekdayDist is nested 2 levels
    for (const [day, val] of Object.entries(d.weekdayDist || {})) {
      if (!result.weekdayDist[day]) result.weekdayDist[day] = { bookings: 0, guests: 0, cancellations: 0 };
      result.weekdayDist[day].bookings      += val.bookings      || 0;
      result.weekdayDist[day].guests        += val.guests        || 0;
      result.weekdayDist[day].cancellations += val.cancellations || 0;
    }
  }

  return result;
};

const mergeMap = (target, source) => {
  for (const [k, v] of Object.entries(source)) {
    target[k] = (target[k] || 0) + (typeof v === "number" ? v : 0);
  }
};

// ─── Determine which granularity to use ──────────────────────────────────────
// < 35 days  → read daily docs (max 35 reads)
// < 13 months → read monthly docs (max 13 reads)
// else        → read yearly docs (max 5 reads)

const getGranularity = (start, end) => {
  if (!start || !end) return "daily";
  const days = (end - start) / (1000 * 60 * 60 * 24);
  if (days <= 35)  return "daily";
  const months = (end.getFullYear() - start.getFullYear()) * 12 +
                 (end.getMonth() - start.getMonth());
  if (months <= 13) return "monthly";
  return "yearly";
};

// ─── Main hook ────────────────────────────────────────────────────────────────

export function useAnalytics({ restaurantId, rangeStart, rangeEnd, enabled = true }) {
  const db   = getFirestore();
  const user = getAuth().currentUser;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const granularity = useMemo(
    () => getGranularity(rangeStart, rangeEnd),
    [rangeStart, rangeEnd]
  );

  useEffect(() => {
    if (!enabled || !restaurantId || !rangeStart || !rangeEnd || !user) {
      setData(null);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);

      try {
        const base = `restaurants/${restaurantId}`;
        let docs = [];

        if (granularity === "daily") {
          // Read individual daily docs — max 35 reads per period
          const keys = getPeriodDailyKeys(rangeStart, rangeEnd);
          const snaps = await Promise.all(
            keys.map(k => getDoc(doc(db, base, "analyticsDaily", k)))
          );
          docs = snaps.filter(s => s.exists()).map(s => s.data());

        } else if (granularity === "monthly") {
          // Read monthly docs — max 13 reads
          const keys = getPeriodMonthlyKeys(rangeStart, rangeEnd);
          const snaps = await Promise.all(
            keys.map(k => getDoc(doc(db, base, "analyticsMonthly", k)))
          );
          docs = snaps.filter(s => s.exists()).map(s => s.data());

          // If range doesn't align to full months, fetch daily for partial months
          // at start and end to get accurate numbers
          const startMonthKey = `${rangeStart.getFullYear()}-${pad2(rangeStart.getMonth()+1)}`;
          const endMonthKey   = `${rangeEnd.getFullYear()}-${pad2(rangeEnd.getMonth()+1)}`;
          const startIsPartial = rangeStart.getDate() > 1;
          const endIsPartial   = rangeEnd.getDate() < new Date(rangeEnd.getFullYear(), rangeEnd.getMonth()+1, 0).getDate();

          if (startIsPartial || endIsPartial) {
            // Replace the partial months with daily reads for those months only
            docs = docs.filter(d => {
              if (!d.date && !d.month) return true;
              const k = d.month || d.date?.slice(0, 7);
              if (startIsPartial && k === startMonthKey) return false;
              if (endIsPartial   && k === endMonthKey)   return false;
              return true;
            });
            const partialKeys = [];
            if (startIsPartial) partialKeys.push(...getPeriodDailyKeys(rangeStart, new Date(rangeStart.getFullYear(), rangeStart.getMonth()+1, 0)));
            if (endIsPartial)   partialKeys.push(...getPeriodDailyKeys(new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), 1), rangeEnd));
            const partialSnaps = await Promise.all(
              [...new Set(partialKeys)].map(k => getDoc(doc(db, base, "analyticsDaily", k)))
            );
            docs.push(...partialSnaps.filter(s => s.exists()).map(s => s.data()));
          }

        } else {
          // Yearly — max 5 reads
          const years = new Set();
          for (let y = rangeStart.getFullYear(); y <= rangeEnd.getFullYear(); y++) years.add(String(y));
          const snaps = await Promise.all(
            [...years].map(y => getDoc(doc(db, base, "analyticsYearly", y)))
          );
          docs = snaps.filter(s => s.exists()).map(s => s.data());
        }

        if (!cancelled) {
          const merged = mergeAnalyticsDocs(docs);
          setData(merged);
        }
      } catch (err) {
        console.error("useAnalytics fetch error:", err);
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();

    return () => { cancelled = true; };
  }, [restaurantId, rangeStart?.getTime(), rangeEnd?.getTime(), granularity, user?.uid]);

  // ── Derived analytics from the merged aggregate ──────────────────────────

  const kpis = useMemo(() => {
    if (!data) return null;
    const total    = data.totalBookings;
    const avgG     = total > 0 ? (data.totalGuests / total).toFixed(1) : "0";
    const avgDur   = data.durationCount > 0 ? Math.round(data.durationSum / data.durationCount) : 0;
    const noShowR  = total > 0 ? ((data.noShows / total) * 100).toFixed(1) : "0";
    const cancelR  = total > 0 ? ((data.cancelled / total) * 100).toFixed(1) : "0";
    return {
      total, confirmed: data.confirmed, cancelled: data.cancelled,
      pending: data.pending, completed: data.completed,
      totalGuests: data.totalGuests, noShows: data.noShows,
      avgG, avgDur, noShowRate: noShowR, cancelRate: cancelR,
    };
  }, [data]);

  const statusData = useMemo(() => {
    if (!data) return [];
    const STATUS_COLORS = { confirmed:"#34d399", pending:"#fbbf24", cancelled:"#f87171", completed:"#60a5fa" };
    return ["confirmed","pending","cancelled","completed"]
      .map(s => ({ name: s.charAt(0).toUpperCase()+s.slice(1), value: data[s] || 0, color: STATUS_COLORS[s] }))
      .filter(s => s.value > 0);
  }, [data]);

  const originData = useMemo(() => {
    if (!data) return [];
    const COLORS = { online:"#60a5fa", internal:"#a78bfa", walkin:"#fe8a24", dineryApp:"#34d399" };
    const LABELS = { online:"Online", internal:"Internal", walkin:"Walk-in", dineryApp:"Dinery App" };
    return Object.entries(data.originCounts || {})
      .map(([k, v]) => ({ name: LABELS[k]||k, value: v, color: COLORS[k]||"#94a3b8" }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [data]);

  const arrivalData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.arrivalBySlot || {})
      .map(([slot, v]) => ({
        time: slot.replace("_", ":"),
        guests: v.guests || 0,
        bookings: v.bookings || 0,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [data]);

  const createdPerHour = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.createdByHour || {})
      .map(([hour, count]) => ({ hour, count: count || 0 }))
      .filter(v => v.count > 0)
      .sort((a, b) => a.hour.localeCompare(b.hour));
  }, [data]);

  const bookingsPerGuest = useMemo(() => {
    if (!data) return [];
    return Array.from({ length: 12 }, (_, i) => {
      const key = i === 11 ? "12plus" : String(i+1);
      return { label: i === 11 ? "12+" : String(i+1), count: data.guestCountDist?.[key] || 0 };
    });
  }, [data]);

  const weekdayData = useMemo(() => {
    if (!data) return [];
    const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    return DAYS.map(day => {
      const v = data.weekdayDist?.[day] || {};
      const bookings = v.bookings || 0;
      const cancels  = v.cancellations || 0;
      return {
        day,
        bookings,
        guests: v.guests || 0,
        cancelRate: bookings > 0 ? +((cancels / bookings) * 100).toFixed(1) : 0,
      };
    });
  }, [data]);

  const leadTimeData = useMemo(() => {
    if (!data) return [];
    const LABELS = {
      same_day:"Same day", "1_day":"1 day", "2_3_days":"2–3 days",
      "4_7_days":"4–7 days", "1_2_weeks":"1–2 weeks", "2plus_weeks":"2+ weeks",
    };
    return Object.entries(data.leadTimeDist || {})
      .map(([k, v]) => ({ label: LABELS[k]||k, count: v || 0 }))
      .filter(v => v.count > 0);
  }, [data]);

  return {
    loading,
    error,
    data,          
    granularity,  
    kpis,
    statusData,
    originData,
    arrivalData,
    createdPerHour,
    bookingsPerGuest,
    weekdayData,
    leadTimeData,
  };
}