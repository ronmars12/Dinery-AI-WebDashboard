
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { firestore } from '../../firebase';
import {
  FiUsers, FiCalendar, FiClock, FiMapPin,
  FiChevronLeft, FiChevronRight, FiCheck, FiEdit2
} from 'react-icons/fi';

const COUNTRY_CODES = [
  { code: '+1',   label: 'US' }, { code: '+44',  label: 'UK' },
  { code: '+61',  label: 'AU' }, { code: '+64',  label: 'NZ' },
  { code: '+63',  label: 'PH' }, { code: '+49',  label: 'DE' },
  { code: '+33',  label: 'FR' }, { code: '+358', label: 'FI' },
  { code: '+47',  label: 'NO' }, { code: '+46',  label: 'SE' },
];

const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// Per-tab cache using sessionStorage — isolates each browser tab so multiple
// reservation links open at the same time never overwrite each other's data.
const CACHE_PREFIX = '__dinery_res_cache__';
const restaurantCache = {
  has: (key) => {
    try { return !!sessionStorage.getItem(CACHE_PREFIX + key); } catch { return false; }
  },
  get: (key) => {
    try {
      const raw = sessionStorage.getItem(CACHE_PREFIX + key);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try { sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)); } catch { /* quota full — skip */ }
  },
};

// Wraps any promise with a timeout — prevents Firestore from hanging for 30s on slow connections
const withTimeout = (promise, ms = 8000) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
};

const generateTimeSlots = (openTime = '10:00', closeTime = '22:00', interval = 30, use24Hour = false) => {
  const slots = [];
  if (!openTime || !closeTime) return slots;

  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;

  if (cMin <= oMin) {
    cMin += 24 * 60;
  }

  const maxMin = oMin + 18 * 60;
  const endMin = Math.min(cMin, maxMin);

  for (let m = oMin; m < endMin; m += interval) {
    const actualMin = m % (24 * 60);
    const h = Math.floor(actualMin / 60);
    const min = actualMin % 60;
    const value = String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
    let label;
    if (use24Hour) {
      label = value;
    } else {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      label = h12 + ':' + String(min).padStart(2, '0') + ' ' + ampm;
    }
    slots.push({ value, label });
  }

  return slots;
};

const getOpenDayNames = (customHours) => {
  if (!customHours || !Array.isArray(customHours) || customHours.length === 0) {
    return new Set(ALL_DAYS);
  }
  const open = new Set();
  for (const slot of customHours) {
    if (!slot.days || !Array.isArray(slot.days)) continue;
    for (const d of slot.days) {
      if (d.name) open.add(d.name);
    }
  }
  return open.size > 0 ? open : new Set(ALL_DAYS);
};

const resolveHoursForDate = (customHours, date, reservationSettings) => {
  const hardDefault = { openTime: '10:00', closeTime: '22:00', maxGuests: 20, isOpen: true, interval: reservationSettings?.timeSlotInterval || 15, startOffset: 0, endOffset: 0 };

  if (!customHours || !Array.isArray(customHours) || customHours.length === 0) {
    return hardDefault;
  }
  if (!date) return hardDefault;

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });

  for (const slot of customHours) {
    if (!slot.days || !Array.isArray(slot.days)) continue;
    const dayEntry = slot.days.find(d => d.name === dayName);
    if (dayEntry) {
      const openTime  = slot.openTime  || '10:00';
      const closeTime = slot.closeTime || '22:00';
      const maxGuests = (dayEntry.maxGuests && dayEntry.maxGuests > 0) ? dayEntry.maxGuests : 20;
      const daySettings = reservationSettings?.dayIntervals?.[dayName];
      const interval = daySettings?.interval || reservationSettings?.timeSlotInterval || 15;
      const startOffset = daySettings?.startOffset || 0;
      const endOffset = daySettings?.endOffset || 0;
      return { openTime, closeTime, maxGuests, isOpen: true, interval, startOffset, endOffset };
    }
  }

  return { ...hardDefault, maxGuests: 0, isOpen: false };
};

// ─────────────────────────────────────────────────────────────────────────────
//  MiniCalendar
// ─────────────────────────────────────────────────────────────────────────────
function MiniCalendar({ selectedDate, onDateSelect, accentColor, openDayNames, holidays }) {
  const [view, setView] = useState(new Date());
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const cells = [];
  const firstDayMon = (firstDay + 6) % 7;
  for (let i = 0; i < firstDayMon; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const mName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasClosed = openDayNames && openDayNames.size < 7;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(yr, mo - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronLeft className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-sm font-bold text-white">{mName}</span>
        <button onClick={() => setView(new Date(yr, mo + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronRight className="w-4 h-4 text-white/70" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {days.map((d, i) => {
          const fullDay = ALL_DAYS[(i + 1) % 7];
          const isClosed = openDayNames && !openDayNames.has(fullDay);
          return (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${isClosed ? 'text-white/20' : 'text-white/40'}`}>
              {d}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const td = new Date(yr, mo, day); td.setHours(0, 0, 0, 0);
          const isPast = td < today;
          const dayFullName = ALL_DAYS[td.getDay()];
          const isClosed = openDayNames && !openDayNames.has(dayFullName);
          const isHoliday = holidays && holidays.some(h => {
            if (!h.startDate || !h.endDate || h.startDate.trim() === '' || h.endDate.trim() === '') return false;
            const start = new Date(h.startDate + 'T00:00:00');
            const end = new Date(h.endDate + 'T23:59:59');
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
            return td >= start && td <= end;
          });
          const isDisabled = isPast || isClosed || isHoliday;
          const isSel = selectedDate && td.toDateString() === selectedDate.toDateString();
          const isToday = td.toDateString() === today.toDateString();

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onDateSelect(td)}
              title={isHoliday && !isPast ? 'Closed for repairs / holiday' : isClosed && !isPast ? 'Closed' : undefined}
              className={[
                'aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-all relative',
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white/10',
                isHoliday && !isPast ? 'text-red-400/60' : '',
                isClosed && !isPast && !isHoliday ? 'text-white/20' : '',
                isPast && !isHoliday ? 'text-white/15' : '',
                !isSel && !isDisabled && !isToday ? 'text-white/80' : '',
                !isSel && isToday && !isDisabled ? 'text-white font-bold' : '',
              ].join(' ')}
              style={
                isSel
                  ? { backgroundColor: accentColor, color: 'white', fontWeight: 'bold' }
                  : isToday && !isDisabled
                  ? { outline: '2px solid ' + accentColor, outlineOffset: '-2px' }
                  : isHoliday && !isPast
                  ? { backgroundColor: 'rgba(239,68,68,0.12)', outline: '1px solid rgba(239,68,68,0.3)', outlineOffset: '-1px' }
                  : {}
              }
            >
              {day}
              {isHoliday && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-red-400/70" />
              )}
              {isClosed && !isPast && !isHoliday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
              )}
            </button>
          );
        })}
      </div>

      {(() => {
        const hasValidHolidays = holidays && holidays.some(h =>
          h.startDate && h.endDate &&
          h.startDate.trim() !== '' && h.endDate.trim() !== '' &&
          !isNaN(new Date(h.startDate).getTime()) && !isNaN(new Date(h.endDate).getTime())
        );
        return (hasClosed || hasValidHolidays) && (
          <div className="flex flex-col gap-1 mt-3">
            {hasClosed && (
              <p className="text-white/25 text-[10px] text-center">
                Dimmed dates are closed days
              </p>
            )}
            {holidays && holidays.some(h => h.startDate && h.endDate && h.startDate.trim() !== '' && h.endDate.trim() !== '') && (
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400/70 flex-shrink-0" />
                <p className="text-red-400/60 text-[10px]">
                  Red dates are closed for holidays / repairs
                </p>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PublicMenuDisplay (Inline Component)
// ─────────────────────────────────────────────────────────────────────────────
const ALLERGEN_ICONS = {
  gluten: '🌾', shellfish: '🦐', eggs: '🥚', fish: '🐟',
  peanuts: '🥜', soy: '🫘', milk: '🥛', nuts: '🌰',
  celery: '🥬', mustard: '🌭', sesame: '⚪', sulphites: '🍷',
  lupin: '🌼', molluscs: '🦪',
};

const ATTRIBUTE_CFG = {
  vegan:       { icon: '🌱', color: '#16a34a' },
  vegetarian:  { icon: '🥗', color: '#15803d' },
  gluten_free: { icon: '🚫', color: '#d97706' },
  spicy:       { icon: '🌶️', color: '#dc2626' },
  halal:       { icon: '☪️',  color: '#2563eb' },
  kosher:      { icon: '✡️',  color: '#7c3aed' },
  organic:     { icon: '🌿', color: '#059669' },
  popular:     { icon: '⭐', color: '#f59e0b' },
  new:         { icon: '🆕', color: '#3b82f6' },
  kids:        { icon: '👶', color: '#ec4899' },
};

function PublicMenuDisplay({ restaurantId, collectionName, guests, accentColor, lang, settings, onSelectionChange }) {
  const [categories, setCategories] = useState([]);
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState({});
  const [detailItem, setDetailItem] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const getQty = id => selectedItems[id]?.qty || 0;

  const accent = accentColor || '#fe8a24';
  const displayLang = lang || 'en';

  useEffect(() => {
    if (!restaurantId || !collectionName) return;
    const load = async () => {
      setLoading(true);
      try {
        const [catSnap, itemSnap] = await Promise.all([
          getDocs(collection(firestore, collectionName, restaurantId, 'menuCategories')),
          getDocs(collection(firestore, collectionName, restaurantId, 'menuItems')),
        ]);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(c => c.active !== false)
          .sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0));
        const its = itemSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(i => i.active !== false)
          .sort((a,b) => (a.sortOrder||0)-(b.sortOrder||0));
        setCategories(cats);
        setItems(its);
        const exp = {};
        cats.forEach(c => { exp[c.id] = true; });
        setExpanded(exp);
      } catch(e) {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [restaurantId, collectionName]);

  useEffect(() => {
    if (!onSelectionChange) return;
    const arr = Object.values(selectedItems).map(({ item, qty }) => ({
      id: item.id, name: getName(item), price: item.price || '', qty,
    }));
    onSelectionChange(arr);
  }, [selectedItems, onSelectionChange]);

  const minGuests = settings?.menuDisplayMinGuests || 1;

  if (!settings?.showMenuOnPublicPage) return null;
  if (guests < minGuests) return null;

  const visibleItems = items.filter(item => {
    const minG = item.minCapacity || item.minGuests || 0;
    const maxG = item.maxCapacity || item.maxGuests || 999;
    if (minG === 0 && maxG === 999) return true;
    return guests >= minG && guests <= maxG;
  });

  const getName = obj => obj?.name?.[displayLang] || obj?.name?.en || '';
  const getDesc = obj => obj?.description?.[displayLang] || obj?.description?.en || '';

  const changeQty = (item, delta) => {
    setSelectedItems(prev => {
      const current = prev[item.id]?.qty || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) { const { [item.id]: _, ...rest } = prev; return rest; }
      return { ...prev, [item.id]: { item, qty: next } };
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent }} />
    </div>
  );

  if (categories.length === 0 && visibleItems.length === 0) return null;

  const hasAnyItems = categories.some(c => visibleItems.some(i => i.category === c.id));
  if (!hasAnyItems) return null;

  const totalSelected = Object.values(selectedItems).reduce((s, { qty }) => s + qty, 0);
  const totalPrice = Object.values(selectedItems).reduce((s, { item, qty }) => s + (parseFloat(item.price) || 0) * qty, 0);

  return (
    <div className="mt-12 w-full">
      <div className="text-center mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2 text-white/40">
          {settings?.menuDisplayTitle || 'Our Menu'}
        </p>
        <h2 className="text-2xl md:text-3xl font-black text-white mb-2">
          {settings?.menuDisplayTitle || 'Our Menu'}
        </h2>
        {settings?.menuDisplaySubtitle && (
          <p className="text-white/50 text-sm max-w-md mx-auto">{settings.menuDisplaySubtitle}</p>
        )}
        <div className="inline-flex items-center gap-2 mt-3 px-4 py-1.5 rounded-full text-xs font-semibold text-white/60 border border-white/15 bg-white/5">
          👥 Showing items for {guests} guest{guests !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-white/25 text-xs">🍽️</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <div className="space-y-5">
        {categories.map(cat => {
          const catItems = visibleItems.filter(i => i.category === cat.id);
          if (catItems.length === 0) return null;
          const isExp = expanded[cat.id] !== false;

          return (
            <div key={cat.id} className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpanded(p => ({ ...p, [cat.id]: !isExp }))}
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || accent }} />
                  <span className="text-white font-bold text-base">{getName(cat)}</span>
                  <span className="text-white/35 text-xs bg-white/10 px-2 py-0.5 rounded-full">
                    {catItems.length}
                  </span>
                </div>
                <svg className={`w-4 h-4 text-white/35 transition-transform ${isExp ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isExp && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-4 pb-4">
                  {catItems.map(item => {
                    const name = getName(item);
                    const desc = getDesc(item);
                    const qty = getQty(item.id);
                    return (
                      <div key={item.id}
                        className={`rounded-xl border-2 transition-all overflow-hidden ${
                          qty > 0 ? 'bg-white/10' : 'border-white/10 bg-white/5 hover:bg-white/8 hover:border-white/20'
                        }`}
                        style={qty > 0 ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}33` } : {}}>
                        <button className="w-full text-left p-4 pb-2" onClick={() => setDetailItem(item)}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <p className="text-white font-bold text-sm leading-tight flex-1">{name}</p>
                            {item.price && (
                              <span className="text-sm font-black flex-shrink-0" style={{ color: accent }}>{item.price},-</span>
                            )}
                          </div>
                          {desc && <p className="text-white/45 text-xs leading-relaxed line-clamp-2 mb-2">{desc}</p>}
                          <div className="flex flex-wrap gap-1 mb-1">
                            {(item.attributes||[]).map(id => { const a = ATTRIBUTE_CFG[id]; return a ? <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: a.color+'22', color: a.color }}>{a.icon}</span> : null; })}
                            {(item.allergens||[]).map(id => <span key={id} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-300 font-semibold" title={id}>{ALLERGEN_ICONS[id]||'⚠️'}</span>)}
                          </div>
                          <p className="text-white/20 text-[10px]">Tap for details ›</p>
                        </button>
                        <div className="px-4 pb-3 pt-1 flex items-center justify-between border-t border-white/10 mt-1">
                          {qty > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Selected</span>
                                {qty > 1 && <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: accent }}>×{qty}</span>}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => changeQty(item, -1)} className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-lg leading-none">−</button>
                                <span className="text-white font-black text-sm w-5 text-center">{qty}</span>
                                <button onClick={() => changeQty(item, +1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-lg leading-none" style={{ backgroundColor: accent }}>+</button>
                              </div>
                            </>
                          ) : (
                            <button onClick={() => changeQty(item, +1)}
                              className="w-full py-1.5 rounded-lg text-xs font-bold text-white hover:opacity-90 flex items-center justify-center gap-1.5"
                              style={{ backgroundColor: accent+'cc' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
                              Add to reservation
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {totalSelected > 0 && (
        <div className="mt-6 rounded-2xl border p-4 flex items-center justify-between gap-4"
          style={{ background: accent+'15', borderColor: accent+'40' }}>
          <div>
            <p className="text-white font-bold text-sm">{totalSelected} item{totalSelected !== 1 ? 's' : ''} added to reservation</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {Object.values(selectedItems).map(({ item, qty }) => (
                <span key={item.id} className="text-[10px] px-2 py-0.5 rounded-full font-semibold text-white/80 bg-white/10">
                  {getName(item)}{qty > 1 ? ` ×${qty}` : ''}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            {totalPrice > 0 && <p className="text-lg font-black" style={{ color: accent }}>{totalPrice.toFixed(0)},-</p>}
            <button onClick={() => setSelectedItems({})} className="text-[10px] text-white/35 hover:text-white/60 transition-colors mt-0.5 block">Clear all</button>
          </div>
        </div>
      )}

      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setDetailItem(null)}>
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
          <div className="relative bg-gray-900 rounded-2xl border border-white/20 w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="h-1.5" style={{ background: categories.find(c=>c.id===detailItem.category)?.color || accent }} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="text-xl font-black text-white">{getName(detailItem)}</h3>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {detailItem.price && (
                    <span className="text-xl font-black" style={{ color: accent }}>{detailItem.price},-</span>
                  )}
                  <button onClick={() => setDetailItem(null)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              {getDesc(detailItem) && (
                <p className="text-white/65 text-sm leading-relaxed mb-5">{getDesc(detailItem)}</p>
              )}
              {(detailItem.attributes||[]).length > 0 && (
                <div className="mb-4">
                  <p className="text-white/30 text-[10px] font-bold uppercase tracking-wider mb-2">Dietary</p>
                  <div className="flex flex-wrap gap-2">
                    {(detailItem.attributes||[]).map(id => {
                      const a = ATTRIBUTE_CFG[id];
                      const label = id.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase());
                      return a ? (
                        <span key={id} className="text-xs px-3 py-1 rounded-full font-semibold"
                          style={{ background: a.color+'22', color: a.color, border: `1px solid ${a.color}35` }}>
                          {a.icon} {label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {(detailItem.allergens||[]).length > 0 && (
                <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-4">
                  <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">⚠️ Allergens</p>
                  <div className="flex flex-wrap gap-2">
                    {(detailItem.allergens||[]).map(id => (
                      <span key={id} className="text-xs px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-200 font-semibold">
                        {ALLERGEN_ICONS[id] || '⚠️'} {id.charAt(0).toUpperCase()+id.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 mt-6">
                {getQty(detailItem.id) > 0 ? (
                  <div className="flex items-center gap-3 flex-1">
                    <button onClick={() => changeQty(detailItem, -1)} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-xl">−</button>
                    <span className="text-white font-black text-lg flex-1 text-center">{getQty(detailItem.id)}</span>
                    <button onClick={() => changeQty(detailItem, +1)} className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: accent }}>+</button>
                  </div>
                ) : (
                  <button onClick={() => { changeQty(detailItem, +1); setDetailItem(null); }}
                    className="flex-1 py-3 rounded-xl text-sm font-black text-white hover:opacity-90 flex items-center justify-center gap-2"
                    style={{ backgroundColor: accent }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4"/></svg>
                    Add to reservation
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function PublicReservationPage() {
  const { restaurantId } = useParams();
  const db = firestore;
  const [searchParams] = useSearchParams();
  const urlOfferCode = searchParams.get('offer') || '';
  const urlCampaignId = searchParams.get('campaignId') || '';
  const [offerCodeInput, setOfferCodeInput] = useState('');
  const [offerCodeSource, setOfferCodeSource] = useState(null); 
  const [config, setConfig]                     = useState(null);
  const [restaurantData, setRestaurantData]     = useState(null);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [dataReady, setDataReady]               = useState(false);
  const [notFound, setNotFound]                 = useState(false);
  const [loadError, setLoadError]               = useState(false);
  const [retryCount, setRetryCount]             = useState(0);
  const [combinations, setCombinations]         = useState([]);
  const [step, setStep]                         = useState(1);
  const [selectedDate, setSelectedDate]         = useState(null);
  const [selectedTime, setSelectedTime]         = useState('');
  const [guests, setGuests]                     = useState(2);
  const [phoneCode, setPhoneCode]               = useState('+63');
  const [form, setForm]                         = useState({
    firstName: '', lastName: '', phone: '', email: '', company: '', notes: '', birthday: '',
  });
  const [agreeNewsletter, setAgreeNewsletter]   = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [saved, setSaved]                       = useState(false);
  const [error, setError]                       = useState('');
  const [settings, setSettings]                 = useState(null);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [allReservations, setAllReservations]   = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [justCreatedId, setJustCreatedId]       = useState(null);
  const [thankYouMessage, setThankYouMessage]   = useState('');
  const [restaurantPageUrl, setRestaurantPageUrl] = useState('');

  // 🔴 REAL-TIME reservation listener
  useEffect(() => {
    if (!restaurantData?.firestoreId) return;

    const reservationsQuery = query(
      collection(db, 'reservations'),
      where('restaurant_id', '==', restaurantData.firestoreId),
      where('status', 'in', ['pending', 'confirmed'])
    );

    const unsubscribe = onSnapshot(
      reservationsQuery,
      (snapshot) => {
        const reservationsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllReservations(reservationsData);
      },
      () => {
        // silent
      }
    );

    return () => unsubscribe();
  }, [db, restaurantData?.firestoreId]);

  useEffect(() => {
    if (urlOfferCode) {
      setOfferCodeInput(urlOfferCode);
      setOfferCodeSource('auto');
    }
  }, [urlOfferCode]);

  useEffect(() => {
    const load = async () => {
      try {
        // ── PHASE 0: Cache hit — instant render ──
        const cacheKey = restaurantId;
        if (restaurantCache.has(cacheKey)) {
          const cached = restaurantCache.get(cacheKey);
          setRestaurantData(cached.rd);
          setConfig(cached.cfg);
          setRestaurantTables(cached.tables);
          setCombinations(cached.combos);
          setLoading(false);
          setDataReady(true);
          // Always fetch fresh settings — never use cached settings for blocked slots
          try {
            const col = cached.rd._collection || 'restaurants';
            const freshSnap = await withTimeout(
              getDoc(doc(db, col, cached.rd.firestoreId, 'reservationSettings', 'config'))
            ).catch(() => null);
            if (freshSnap && freshSnap.exists()) {
              const s = freshSnap.data();
              if (s.blockedTimeSlots) {
                Object.keys(s.blockedTimeSlots).forEach(day => {
                  const val = s.blockedTimeSlots[day];
                  if (!Array.isArray(val)) {
                    s.blockedTimeSlots[day] = Object.values(val || {});
                  }
                });
              }
              setSettings(s);
              setThankYouMessage(s.thankYouMessage || '');
              setRestaurantPageUrl(s.restaurantPageUrl || '');
              restaurantCache.set(cacheKey, { ...cached, settings: s });
            } else {
              setSettings(cached.settings);
              setThankYouMessage(cached.settings?.thankYouMessage || '');
              setRestaurantPageUrl(cached.settings?.restaurantPageUrl || '');
            }
          } catch {
            setSettings(cached.settings);
            setThankYouMessage(cached.settings?.thankYouMessage || '');
            setRestaurantPageUrl(cached.settings?.restaurantPageUrl || '');
          }
          return;
        }
        let rSnap = null;
        let collectionName = 'restaurants';

        // ── PHASE 1: Parallel direct ID lookups with timeout ──
        const [directResult, testResult] = await Promise.allSettled([
          withTimeout(getDoc(doc(db, 'restaurants', restaurantId))),
          withTimeout(getDoc(doc(db, 'TestRestaurant', restaurantId))),
        ]);

        if (directResult.status === 'fulfilled' && directResult.value.exists()) {
          rSnap = directResult.value;
          collectionName = 'restaurants';
        } else if (testResult.status === 'fulfilled' && testResult.value.exists()) {
          rSnap = testResult.value;
          collectionName = 'TestRestaurant';
        }

        // ── Fallback: parallel name queries ──
        if (!rSnap) {
          const [restaurantsSnap, testQuerySnap] = await Promise.allSettled([
            withTimeout(getDocs(query(collection(db, 'restaurants'), where('name', '==', restaurantId)))),
            withTimeout(getDocs(query(collection(db, 'TestRestaurant'), where('name', '==', restaurantId)))),
          ]);

          if (restaurantsSnap.status === 'fulfilled' && !restaurantsSnap.value.empty) {
            rSnap = restaurantsSnap.value.docs[0];
            collectionName = 'restaurants';
          } else if (testQuerySnap.status === 'fulfilled' && !testQuerySnap.value.empty) {
            rSnap = testQuerySnap.value.docs[0];
            collectionName = 'TestRestaurant';
          }
        }

        if (!rSnap) {
          setNotFound(true);
          setLoading(false);
          return;
        }

        const docData = rSnap.data();
        const actualDocId = rSnap.id;
        const rd = {
          ...docData,
          firestoreId: actualDocId,
          _collection: collectionName,
          _urlParam: restaurantId,
          restaurantPageUrl: docData.restaurantPageUrl || '',
        };
        const [cSnap, tablesSnap, combosSnap, settingsSnap] = await Promise.all([
          withTimeout(getDoc(doc(db, collectionName, actualDocId, 'reservationConfig', 'config'))).catch(() => null),
          withTimeout(getDocs(collection(db, collectionName, actualDocId, 'tables'))).catch(() => null),
          withTimeout(getDocs(collection(db, collectionName, actualDocId, 'tableCombinations'))).catch(() => null),
          withTimeout(getDoc(doc(db, collectionName, actualDocId, 'reservationSettings', 'config'))).catch(() => null),
        ]);
        // ── Config ──
        let configData;
        if (cSnap && cSnap.exists()) {
          const cfg = cSnap.data();
          const { openTime: _o, closeTime: _c, ...safeConfig } = cfg;
          configData = { ...safeConfig, ownerId: rd.Owner_ID || null };
        } else {
          configData = {
            restaurantName:     rd.name || 'Restaurant',
            welcomeMessage:     'Reserve your table',
            subMessage:         'Book your perfect dining experience',
            backgroundMode:     'gradient',
            backgroundGradient: 'from-[#0f0c29] via-[#302b63] to-[#24243e]',
            backgroundColor:    '#1a1a2e',
            backgroundImageUrl: '',
            overlayOpacity:     0.5,
            accentColor:        '#fe8a24',
            logoUrl:            '',
            logoShape:          'circle',
            logoSize:           'md',
            timeInterval:       30,
            showNotes:          true,
            showCompany:        false,
            requireEmail:       true,
            requirePhone:       true,
            ownerId:            rd.Owner_ID || null,
          };
        }

        // ── Tables ──
        const tablesData = tablesSnap ? tablesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

        // ── Combinations ──
        const combosData = combosSnap ? combosSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];

        let settingsData = null;
        if (settingsSnap && settingsSnap.exists()) {
          settingsData = settingsSnap.data();
          if (settingsData.blockedTimeSlots) {
            Object.keys(settingsData.blockedTimeSlots).forEach(day => {
              const val = settingsData.blockedTimeSlots[day];
              if (!Array.isArray(val)) {
                settingsData.blockedTimeSlots[day] = Object.values(val || {});
              }
            });
          }
          setThankYouMessage(settingsData.thankYouMessage || '');
          setRestaurantPageUrl(settingsData.restaurantPageUrl || '');
        }

        // ── Commit all state at once — single render pass ──
        setRestaurantData(rd);
        setConfig(configData);
        setRestaurantTables(tablesData);
        setCombinations(combosData);
        setSettings(settingsData);
        setDataReady(true);

        // ── Save to cache ──
        restaurantCache.set(cacheKey, {
          rd,
          cfg: configData,
          tables: tablesData,
          combos: combosData,
          settings: settingsData,
        });

      } catch {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };

    if (restaurantId) {
      load();
    } else {
      setNotFound(true);
      setLoading(false);
    }
  }, [restaurantId, retryCount]);

  const autoAssignTable = (guestCount, bookedIds = new Set()) => {
    const eligible = restaurantTables.filter(t => {
      const maxCap = t.maxCapacity || t.capacity || 0;
      const minCap = (t.minCapacity && t.minCapacity > 0) ? t.minCapacity : 1;
      const capacityOk = guestCount >= minCap && (maxCap === 0 || guestCount <= maxCap);
      const onlineOk = t.online !== false;
      const sessionOk = !t.sessions || t.sessions === 'Reservation' || t.sessions === 'Both'
        || t.sessions === 'reservation' || t.sessions === 'both';
      const notBooked = !bookedIds.has(t.id);
      return capacityOk && onlineOk && sessionOk && notBooked;
    });

    if (eligible.length > 0) {
      eligible.sort((a, b) => {
        const pa = a.priority ?? 999, pb = b.priority ?? 999;
        if (pa !== pb) return pa - pb;
        const maxA = a.maxCapacity || a.capacity || 999;
        const maxB = b.maxCapacity || b.capacity || 999;
        return maxA - maxB;
      });
      const table = eligible[0];
      return {
        isCombination: false,
        table,
        tableIds: [table.id],
        tableNames: [table.name],
      };
    }

    const matchingCombos = combinations.filter(combo => {
      const minCap = (combo.minCapacity && combo.minCapacity > 0) ? combo.minCapacity : 1;
      const maxCap = combo.maxCapacity || 999;
      const fitsGuests = guestCount >= minCap && guestCount <= maxCap;
      const allFree = (combo.tableIds || []).every(tid => !bookedIds.has(tid));
      return fitsGuests && allFree;
    });

    if (matchingCombos.length > 0) {
      matchingCombos.sort((a, b) => (a.maxCapacity || 999) - (b.maxCapacity || 999));
      const combo = matchingCombos[0];
      return {
        isCombination: true,
        combination: combo,
        tableIds: combo.tableIds,
        tableNames: combo.tableNames,
      };
    }

    return null;
  };

  const customHours   = restaurantData?.customHours || [];
  const openDayNames  = getOpenDayNames(customHours);
  const resolvedHours = resolveHoursForDate(customHours, selectedDate, settings);
  const { openTime, closeTime, maxGuests, isOpen, interval, startOffset, endOffset } = resolvedHours;
  const [openHour, openMin] = openTime.split(':').map(Number);
  const [closeHour, closeMin] = closeTime.split(':').map(Number);
  const effectiveOpenMin = openHour * 60 + openMin + (startOffset || 0);
  const effectiveCloseMin = closeHour * 60 + closeMin - (endOffset || 0);
  const effectiveOpenTime = `${String(Math.floor(effectiveOpenMin / 60)).padStart(2, '0')}:${String(effectiveOpenMin % 60).padStart(2, '0')}`;
  const effectiveCloseTime = `${String(Math.floor(effectiveCloseMin / 60)).padStart(2, '0')}:${String(effectiveCloseMin % 60).padStart(2, '0')}`;
  const allTimeSlots = generateTimeSlots(effectiveOpenTime, effectiveCloseTime, interval, config?.use24HourFormat || false);
  const dayName = selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : null;
  const rawBlocked = settings?.blockedTimeSlots?.[dayName];
  const blockedSlots = Array.isArray(rawBlocked) 
    ? rawBlocked.map(s => String(s).trim())
    : [];
  const availableTimeSlots = allTimeSlots.filter(slot => {
    const slotVal = String(slot.value).trim();
    const isBlocked = blockedSlots.some(b => b === slotVal);
    return !isBlocked;
  });

  useEffect(() => {
    const checkAvailability = () => {
      if (!selectedDate || !restaurantId || availableTimeSlots.length === 0 || restaurantTables.length === 0) {
        return;
      }

      setSlotAvailability(null);

      const availability = {};
      const diningDuration = settings?.defaultReservationDuration || 120;
      const cleanupDuration = settings?.tableCleanupTime || 0;
      const defaultDuration = diningDuration + cleanupDuration;

      for (const slot of availableTimeSlots) {
        const slotDateTime = new Date(selectedDate);
        const [hours, minutes] = slot.value.split(':');
        slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        const slotEndTime = new Date(slotDateTime.getTime() + defaultDuration * 60000);

        const suitableCombos = combinations.filter(combo => {
          const minCap = (combo.minCapacity && combo.minCapacity > 0) ? combo.minCapacity : 1;
          return guests >= minCap && guests <= (combo.maxCapacity || 999);
        });

        const suitableTables = restaurantTables.filter(t => {
          const maxCap = t.maxCapacity || t.capacity || 0;
          const minCap = (t.minCapacity && t.minCapacity > 0) ? t.minCapacity : 1;
          const capacityOk = guests >= minCap && (maxCap === 0 || guests <= maxCap);
          const onlineOk = t.online !== false;
          const sessionOk = !t.sessions || t.sessions === 'Reservation' || t.sessions === 'Both'
            || t.sessions === 'reservation' || t.sessions === 'both';
          return capacityOk && onlineOk && sessionOk;
        });

        if (suitableCombos.length === 0 && suitableTables.length === 0) {
          availability[slot.value] = false;
          continue;
        }

        const bookedTableIds = new Set();

        allReservations.forEach(res => {
          if (res.id === justCreatedId) return;
          const resDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
          const resDining = res.duration_minutes || diningDuration;
          const resCleanup = settings?.tableCleanupTime || 0;
          const resTotalDuration = resDining + resCleanup;
          const resEndTime = new Date(resDate.getTime() + resTotalDuration * 60000);
          const overlaps = resDate < slotEndTime && resEndTime > slotDateTime;

          if (overlaps) {
            if (res.table_ids && Array.isArray(res.table_ids)) {
              res.table_ids.forEach(tid => bookedTableIds.add(tid));
            } else if (res.table_id) {
              bookedTableIds.add(res.table_id);
            }
          }
        });

        let hasAvailability = false;

        if (suitableTables.length > 0) {
          const freeTable = suitableTables.find(t => !bookedTableIds.has(t.id));
          if (freeTable) hasAvailability = true;
        }

        if (!hasAvailability && suitableCombos.length > 0) {
          for (const combo of suitableCombos) {
            const comboFree = (combo.tableIds || []).every(tid => !bookedTableIds.has(tid));
            if (comboFree) {
              hasAvailability = true;
              break;
            }
          }
        }

        availability[slot.value] = hasAvailability;
      }

      setSlotAvailability({ ...availability });
    };

    const timer = setTimeout(checkAvailability, 200);
    return () => clearTimeout(timer);
  }, [selectedDate, guests, restaurantData?.firestoreId, restaurantTables, combinations, settings?.defaultReservationDuration, settings?.tableCleanupTime, openTime, closeTime, config?.timeInterval, allReservations, settings?.blockedTimeSlots]);

  const timeSlots = availableTimeSlots.filter(slot => {
    if (!selectedDate) return true;

    const slotDateTime = new Date(selectedDate);
    const [hours, minutes] = slot.value.split(':');
    slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const now = new Date();
    const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilSlot < 0) return false;

    if (settings?.minAdvanceBookingHours > 0 && hoursUntilSlot < settings.minAdvanceBookingHours) {
      return false;
    }

    if (settings?.maxAdvanceBookingDays > 0) {
      const daysUntilSlot = (slotDateTime - now) / (1000 * 60 * 60 * 24);
      if (daysUntilSlot > settings.maxAdvanceBookingDays) {
        return false;
      }
    }

    return true;
  });

  const effectiveMax = settings?.maxGuestsPerReservation
    ? settings.maxGuestsPerReservation
    : (maxGuests > 0 ? maxGuests : 20);
  const guestOptions = Array.from({ length: Math.min(effectiveMax, 10) }, (_, i) => i + 1);
  const accent       = config?.accentColor || '#fe8a24';
  const displayName  = config?.restaurantName || restaurantData?.name || 'Restaurant';

  const logoSizePx = config?.logoSize === 'sm' ? 52 : config?.logoSize === 'lg' ? 96 : 72;
  const logoRadius = config?.logoShape === 'circle' ? '50%' : config?.logoShape === 'rounded' ? '18px' : '6px';

  const bgClass = config?.backgroundImageUrl
    ? ''
    : (config?.backgroundMode === 'gradient' || !config?.backgroundMode)
    ? 'bg-gradient-to-br ' + (config?.backgroundGradient || 'from-[#0f0c29] via-[#302b63] to-[#24243e]')
    : '';

  const bgStyle = (() => {
    if (config?.backgroundImageUrl) {
      return {
        backgroundImage: `url("${config.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      };
    }
    if (config?.backgroundMode === 'color') {
      return { backgroundColor: config.backgroundColor || '#1a1a2e' };
    }
    return {};
  })();

  const getTimeLabel = (value) => {
    if (!value) return 'Select a time';
    const found = timeSlots.find(t => t.value === value);
    return found ? found.label : value;
  };

  const getEffectiveDuration = (guestCount) => {
    const defaultDuration = settings?.defaultReservationDuration || 120;
    if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) {
      return defaultDuration;
    }
    const match = settings.guestDurationRules.find(
      r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
    );
    return match ? match.duration : defaultDuration;
  };

  const handleSubmit = async () => {
    if (saving) return;

    setError('');

    const holidayList = restaurantData?.customHolidays || [];
    if (selectedDate && holidayList.length > 0) {
      const resDateCheck = new Date(selectedDate);
      resDateCheck.setHours(0, 0, 0, 0);
      const isHolidayBlocked = holidayList.some(h => {
        if (!h.startDate || !h.endDate) return false;
        const start = new Date(h.startDate + 'T00:00:00');
        const end = new Date(h.endDate + 'T23:59:59');
        return resDateCheck >= start && resDateCheck <= end;
      });
      if (isHolidayBlocked) {
        setError('This date is unavailable. The restaurant is closed during this period.');
        return;
      }
    }

    if (step === 3) {
      const menuMinGuests = settings?.menuDisplayMinGuests || 1;
      const shouldShowMenu = settings?.showMenuOnPublicPage && guests >= menuMinGuests;

      if (shouldShowMenu && settings?.requireGroupMenuSelection) {
        const totalSelected = selectedMenuItems.reduce((s, i) => s + (i.qty || 1), 0);
        if (totalSelected < 1) {
          setError(
            settings?.groupMenuRequiredMessage ||
            'Please select at least one menu item to continue'
          );
          return;
        }
      }
      setStep(2);
      return;
    }

    if (step === 2) {
        if (!form.firstName || !form.lastName) {
          setError('Please enter your full name');
          return;
        }
      if (config.requirePhone && !form.phone) {
        setError('Phone number is required');
        return;
      }
      if (config.requireEmail && !form.email) {
        setError('Email address is required');
        return;
      }
    }

    if (settings?.minGuestsPerReservation && guests < settings.minGuestsPerReservation) {
      setError(`Minimum ${settings.minGuestsPerReservation} guests required`);
      setStep(1);
      return;
    }
    if (settings?.maxGuestsPerReservation && guests > settings.maxGuestsPerReservation) {
      setError(`Maximum ${settings.maxGuestsPerReservation} guests allowed`);
      setStep(1);
      return;
    }

    const menuMinGuests = settings?.menuDisplayMinGuests || 1;
    const shouldShowMenu = settings?.showMenuOnPublicPage && guests >= menuMinGuests;

    if (shouldShowMenu && step === 1) {
      setStep(3);
      return;
    }

    if (step !== 2) return;

    if (!restaurantData?.firestoreId) {
      setError('Restaurant data not loaded. Please refresh.');
      return;
    }

    try {
      setSaving(true);

      const resDate = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      resDate.setHours(h, m, 0, 0);
      const diningDuration = getEffectiveDuration(guests);
      const cleanupDuration = settings?.tableCleanupTime || 0;
      const defaultDuration = diningDuration + cleanupDuration;
      const resEndTime = new Date(resDate.getTime() + defaultDuration * 60000);

      const liveSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('restaurant_id', '==', restaurantData.firestoreId),
        where('status', 'in', ['pending', 'confirmed'])
      ));

      const liveReservations = liveSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.id !== justCreatedId);

      const bookedTableIds = new Set();
      liveReservations.forEach(res => {
        if (res.id === justCreatedId) return;
        const rStart = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
        const resDining = res.duration_minutes || diningDuration;
        const resCleanup = cleanupDuration;
        const resTotalDuration = resDining + resCleanup;
        const rEnd = new Date(rStart.getTime() + resTotalDuration * 60000);
        const overlaps = rStart < resEndTime && rEnd > resDate;

        if (overlaps) {
          if (Array.isArray(res.table_ids)) {
            res.table_ids.forEach(tid => bookedTableIds.add(tid));
          } else if (res.table_id) {
            bookedTableIds.add(res.table_id);
          }
        }
      });

      const eligibleTables = restaurantTables.filter(t => {
        const maxCap = t.maxCapacity || t.capacity || 0;
        const minCap = (t.minCapacity && t.minCapacity > 0) ? t.minCapacity : 1;
        const capacityOk = guests >= minCap && (maxCap === 0 || guests <= maxCap);
        const onlineOk = t.online !== false;
        const sessionOk = !t.sessions || t.sessions === 'Reservation' || t.sessions === 'Both' || t.sessions === 'reservation' || t.sessions === 'both';
        return capacityOk && onlineOk && sessionOk;
      });

      const hasFreeTables = eligibleTables.some(t => !bookedTableIds.has(t.id));
      const hasFreeCombination = combinations.some(combo =>
        guests >= (combo.minCapacity || 1) && guests <= (combo.maxCapacity || 999) &&
        (combo.tableIds || []).every(tid => !bookedTableIds.has(tid))
      );

      if (eligibleTables.length === 0 && combinations.filter(c => guests >= c.minCapacity && guests <= c.maxCapacity).length === 0) {
        setError('No tables available for this party size.');
        setSaving(false);
        return;
      }

      if (!hasFreeTables && !hasFreeCombination) {
        setError('All tables are booked for this time slot. Please choose a different time.');
        setSaving(false);
        return;
      }

      const assignment = autoAssignTable(guests, bookedTableIds);

      if (!assignment) {
        setError('No tables or combinations available for this party size.');
        setSaving(false);
        return;
      }

      const assignedTableIds = assignment.tableIds;
      const allAssignedFree = assignedTableIds.every(tid => !bookedTableIds.has(tid));

      if (!allAssignedFree) {
        setError('This time slot is fully booked. Please choose a different time.');
        setSlotAvailability(prev => ({ ...prev, [selectedTime]: false }));
        setSelectedTime('');
        setStep(1);
        setSaving(false);
        return;
      }

      const collectionName = restaurantData._collection || 'restaurants';

      const reservationData = {
        Booking_request:                      true,
        ServiceType_Reservation:              'dine-in',
        claimed_offer:                        '',
        claimed_offer_discount_percent:       0,
        claimed_offer_id:                     '',
        coupon_id:                            '',
        coupon_confirmed:                     false,
        created_at:                           new Date(),
        updated_at:                           new Date(),
        customer_name: `${form.firstName} ${form.lastName}`.trim(),
        customer_email:                       form.email,
        customer_phone:                       form.phone,
        customer_id:                          null,
        number_of_guests:                     guests,
        reservation_date:                     resDate,
        time:                                 resDate.toISOString(),
        duration_minutes:                     diningDuration,
        special_requests: settings?.enableOfferCode && offerCodeInput
          ? `${form.notes ? form.notes + '\n\n' : ''}Offer Applied: ${offerCodeInput}`
          : (form.notes || ''),
        offer_code_applied: (settings?.enableOfferCode && offerCodeInput) ? offerCodeInput : null,
        offer_campaign_id: (settings?.enableOfferCode && offerCodeInput && offerCodeSource === 'auto') ? urlCampaignId || null : null,
        offer_source: (settings?.enableOfferCode && offerCodeInput) ? offerCodeSource : null,
        customer_birthday:                    form.birthday || null,
        status:                               'confirmed',

        ...(assignment.isCombination ? {
          combination_id:                     assignment.combination.id,
          combination_name:                   assignment.combination.name,
          table_ids:                          assignment.tableIds,
          table_names:                        assignment.tableNames,
          table_id:                           assignment.tableIds[0],
          table_name:                         assignment.tableNames[0],
        } : {
          table_id:                           assignment.table.id,
          table_name:                         assignment.table.name || '',
          table_ids:                          assignment.tableIds,
          table_names:                        assignment.tableNames,
        }),

        restaurant_id:                        restaurantData.firestoreId,
        restaurant_collection:                collectionName,
        restaurant_name:                      displayName,
        restaurant_owner_id:                  config?.ownerId || restaurantData?.Owner_ID || null,
        restaurant_owner_email:               restaurantData?.Reservation_email || '',
        restaurant_lat:                       restaurantData?.lat ?? null,
        restaurant_lng:                       restaurantData?.lng ?? null,
        restaurant_location:                  restaurantData?.Location || '',
        source:                               'reservation_link',
        reservation_completed_points_awarded: false,
        selected_menu_items:                  selectedMenuItems,
      };

      const recentDuplicate = allReservations.find(res => {
        const timeDiff = new Date() - (res.created_at?.toDate?.() || new Date(res.created_at));
        const isSameSlot = res.reservation_date?.toDate?.().getTime() === resDate.getTime();
        const isSameCustomer = res.customer_email === form.email || res.customer_phone === form.phone;
        return timeDiff < 5000 && isSameSlot && isSameCustomer;
      });

      if (recentDuplicate) {
        setError('A reservation was just created. Please check your bookings.');
        setSaving(false);
        return;
      }

      const newReservation = await addDoc(collection(db, 'reservations'), reservationData);
      const createdId = newReservation.id;
      setJustCreatedId(createdId);
            
      if (settings?.enableOfferCode && offerCodeInput) {
        try {
          const statsRef = doc(db, 'crm_stats', restaurantData.firestoreId);
          const statsSnap = await getDoc(statsRef);
          const current = statsSnap.exists() ? (statsSnap.data().offerReservationsCreated || 0) : 0;
          await setDoc(statsRef, { offerReservationsCreated: current + 1 }, { merge: true });
        } catch (e) { console.warn('offer stat increment failed', e); }
      }
     // Send confirmation email
      try {
        const functions = getFunctions(undefined, 'asia-southeast1');  // ← ADD THE REGION HERE
        const sendEmailFn = httpsCallable(functions, 'sendEmail');
        await sendEmailFn({
          to: form.email,
          subject: `Reservation Confirmed – ${displayName}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#fe8a24;">Your reservation is confirmed! 🎉</h2>
              <p>Hi ${form.firstName},</p>
              <p>Your booking at <strong>${displayName}</strong> has been confirmed.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 0;color:#888;">Date</td><td><strong>${selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Time</td><td><strong>${getTimeLabel(selectedTime)}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Guests</td><td><strong>${guests}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">Table</td><td><strong>${assignment.isCombination ? assignment.combination.name : assignment.table.name}</strong></td></tr>
                ${form.notes ? `<tr><td style="padding:8px 0;color:#888;">Notes</td><td>${form.notes}</td></tr>` : ''}
              </table>
              ${selectedMenuItems.length > 0 ? `
                <p><strong>Pre-selected items:</strong></p>
                <ul>${selectedMenuItems.map(i => `<li>${i.name}${i.qty > 1 ? ` ×${i.qty}` : ''}</li>`).join('')}</ul>
              ` : ''}
              ${(settings?.contactEmail || settings?.contactPhone) ? `
                <div style="margin-top:24px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:8px;">
                  <p style="margin:0 0 8px;font-weight:bold;color:#fe8a24;font-size:13px;">📞 Restaurant Contact</p>
                  ${settings?.contactEmail ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">✉️ <a href="mailto:${settings.contactEmail}" style="color:#fe8a24;">${settings.contactEmail}</a></p>` : ''}
                  ${settings?.contactPhone ? `<p style="margin:0;font-size:13px;color:#555;">📱 <a href="tel:${settings.contactPhone}" style="color:#fe8a24;">${settings.contactPhone}</a></p>` : ''}
                </div>
              ` : ''}
              <p style="color:#888;font-size:12px;margin-top:24px;">
                Need to make changes? You can manage your reservation here:
              </p>
             <a href="https://booking.dinery.ai/manage-reservation/${createdId}"
                style="display:inline-block;margin-top:8px;padding:10px 20px;background:#fe8a24;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">
                Manage My Reservation
              </a>
            </div>
          `,
        });
        console.log('✅ Confirmation email sent successfully');
      } catch (emailError) {
        // Silent — booking is still confirmed, email failure is non-critical
        console.error('Confirmation email failed:', emailError);
      }

      await Promise.all(
        assignedTableIds.map(tableId =>
          updateDoc(
            doc(db, collectionName, restaurantData.firestoreId, 'tables', tableId),
            {
              current_status:            'reserved',
              reserved_by: `${form.firstName} ${form.lastName}`.trim(),
              reserved_date:             resDate,
              reserved_guests:           guests,
              reserved_source:           'reservation_link',
              reserved_duration_minutes: defaultDuration,
            }
          ).catch(() => {})
        )
      );

      setSaved(true);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setSaved(false);
    setStep(1);
    setSelectedDate(null);
    setSelectedTime('');
    setForm({ firstName: '', lastName: '', phone: '', email: '', company: '', notes: '' });
    setSelectedMenuItems([]);
    setJustCreatedId(null);
    setError('');
  };

  // ── Skeleton loading ──
  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      <div className="w-full max-w-5xl">
        <div className="text-center mb-10 animate-pulse">
          <div className="h-3 w-24 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="h-10 w-72 bg-white/15 rounded-2xl mx-auto mb-3" />
          <div className="h-4 w-48 bg-white/10 rounded-full mx-auto" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 h-64 bg-white/10 rounded-3xl animate-pulse" />
          <div className="lg:col-span-3 h-64 bg-white/10 rounded-3xl animate-pulse" />
        </div>
        <p className="text-center text-white/20 text-xs mt-8 animate-pulse">Loading reservation page…</p>
      </div>
    </div>
  );

  // ── Load error — show retry instead of blank/stuck screen ──
  if (loadError) return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-white/40 text-sm mb-6">Could not load the reservation page. Please check your connection.</p>
        <button
          onClick={() => { setLoadError(false); setLoading(true); setRetryCount(c => c + 1); }}
          className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
          style={{ backgroundColor: '#fe8a24' }}>
          Try again
        </button>
      </div>
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen bg-[#0f0c29] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
        <p className="text-white/50 text-sm">This reservation link is invalid or has been removed.</p>
      </div>
    </div>
  );

  // ── Config safety net — should never happen but prevents white screen ──
  if (!config) return null;

  return (
    <div className={'min-h-screen relative overflow-hidden ' + bgClass} style={bgStyle}>

      {config.backgroundMode === 'image' && config.backgroundImageUrl && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          style={{
            backgroundColor: `rgba(0,0,0,${config.overlayOpacity ?? 0.25})`,
          }}
        />
      )}

      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.03) 0%, transparent 50%)' }} />

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-16">
        <div className="w-full max-w-5xl">

          {config.logoUrl && (
            <div className="flex justify-center mb-6">
              <div className="overflow-hidden shadow-2xl"
                style={{
                  width: logoSizePx,
                  height: logoSizePx,
                  borderRadius: logoRadius,
                  border: '2px solid rgba(255,255,255,0.18)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  backgroundColor: 'transparent',
                }}>
                <img
                  src={config.logoUrl}
                  alt={displayName}
                  className="w-full h-full object-contain"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            </div>
          )}

          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.35em] mb-2" style={{ color: accent }}>
              {displayName}
            </p>
            {restaurantData?.Type && (
              <p className="text-white/25 text-xs mb-3 uppercase tracking-widest">{restaurantData.Type}</p>
            )}
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
              {config.welcomeMessage || 'Reserve your table'}
            </h1>
            <p className="text-white/45 text-base max-w-md mx-auto">{config.subMessage || 'Book your perfect dining experience'}</p>
          </div>

          {saved ? (
            <div className="max-w-lg mx-auto">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 text-center shadow-2xl overflow-hidden">
                <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, ' + accent + ', ' + accent + '99)' }} />
                <div className="p-8 md:p-10">
                  <p className="font-semibold mb-1" style={{ color: accent }}>
                    {form.firstName}, your booking at {displayName} is confirmed
                  </p>
                  <p className="text-white/45 text-sm mb-8">
                    A confirmation has been sent to your email.
                  </p>

                  <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-7">
                    <div className="px-4 py-2.5 border-b border-white/10">
                      <p className="text-white/35 text-[10px] font-bold uppercase tracking-widest">Booking Summary</p>
                    </div>
                    <div className="divide-y divide-white/5">
                      {[
                        { Icon: FiUsers,    label: guests + ' guest' + (guests > 1 ? 's' : ''), sub: 'Party size' },
                        { Icon: FiCalendar, label: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }), sub: 'Date' },
                        { Icon: FiClock, label: (() => {
                          if (!selectedTime) return 'Select a time';
                          const [h, m] = selectedTime.split(':').map(Number);
                          const startLabel = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                          if (!settings?.defaultReservationDuration) return startLabel;
                          const endDate = new Date(selectedDate);
                          endDate.setHours(h, m + getEffectiveDuration(guests), 0, 0);
                          const endLabel = `${String(endDate.getHours()).padStart(2,'0')}:${String(endDate.getMinutes()).padStart(2,'0')}`;
                          return `${startLabel} → ${endLabel}`;
                        })(), sub: 'Time' },
                        { Icon: FiMapPin,   label: displayName, sub: 'Restaurant' },
                      ].map(({ Icon, label, sub }, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3 text-left">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: accent + '22' }}>
                            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white/35 text-[10px] uppercase tracking-wider">{sub}</p>
                            <p className="text-white/85 text-sm font-semibold truncate">{label}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      onClick={resetForm}
                      className="flex-1 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98]"
                      style={{ backgroundColor: accent }}
                    >
                      Make Another Reservation
                    </button>

                    <button
                      onClick={() => {
                        const url = restaurantPageUrl || restaurantData?.restaurantPageUrl || window.location.href;
                        window.location.href = url;
                      }}
                      className="flex-1 py-4 rounded-2xl text-base font-semibold text-white transition-all duration-200 bg-white/10 hover:bg-white/20 border-2 border-white/20 hover:border-white/30 active:scale-[0.98]"
                    >
                      Exit Page
                    </button>
                  </div>

                  <p className="text-white/20 text-xs mt-4">A confirmation has been sent to your email</p>
                </div>
              </div>
            </div>
          ) : step === 3 ? null : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 lg:sticky lg:top-8 shadow-xl">
                  <h3 className="text-white font-black text-lg mb-5">Your booking</h3>

                  {step === 1 && <div className="mb-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-white/45 text-xs font-semibold uppercase tracking-wider">Guests</p>
                      <div className="flex items-center gap-2 bg-white/10 rounded-xl px-1 py-1">
                        <button
                          onClick={() => {
                            const minAllowed = settings?.minGuestsPerReservation || 1;
                            setGuests(g => Math.max(minAllowed, g - 1));
                          }}
                          disabled={guests <= (settings?.minGuestsPerReservation || 1)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold text-lg leading-none transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                          −
                        </button>
                        <span className="text-white font-black text-base w-6 text-center tabular-nums">{guests}</span>
                        <button
                          onClick={() => setGuests(g => Math.min(effectiveMax, g + 1))}
                          disabled={guests >= effectiveMax}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-lg leading-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: accent }}>
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {guestOptions.map(g => (
                        <button key={g} onClick={() => setGuests(g)}
                          className={'relative w-10 h-10 rounded-xl text-sm font-bold transition-all ' + (guests === g ? 'text-white shadow-lg scale-105' : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80')}
                          style={guests === g ? { backgroundColor: accent, boxShadow: '0 4px 14px ' + accent + '55' } : {}}>
                          {g}
                          {guests === g && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-white border-2"
                              style={{ borderColor: accent }} />
                          )}
                        </button>
                      ))}
                      {effectiveMax > 10 && (
                        <button
                          onClick={() => {
                            const v = parseInt(window.prompt('Enter number of guests (max ' + effectiveMax + '):')) || guests;
                            if (v > 0 && v <= effectiveMax) setGuests(v);
                          }}
                          className={'w-10 h-10 rounded-xl text-xs font-bold transition-all ' + (guests > 10 ? 'text-white shadow-lg' : 'bg-white/8 text-white/50 hover:bg-white/15 hover:text-white/80')}
                          style={guests > 10 ? { backgroundColor: accent } : {}}>
                          {guests > 10 ? guests : '···'}
                        </button>
                      )}
                    </div>
                    <p className="text-white/25 text-[10px] mt-2">
                      {guests === effectiveMax ? 'Maximum capacity reached' : `Up to ${effectiveMax} guests`}
                      {settings?.maxGuestsPerReservation && (
                        <span className="ml-2 text-white/40">
                          (limit: {settings.maxGuestsPerReservation})
                        </span>
                      )}
                    </p>
                  </div>}

                  <div className="space-y-2">
                    {[
                      { Icon: FiUsers,    label: guests + ' guest' + (guests > 1 ? 's' : '') },
                      { Icon: FiCalendar, label: selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Select a date', editable: !!selectedDate },
                      { Icon: FiMapPin,   label: displayName },
                      { Icon: FiClock,    label: getTimeLabel(selectedTime), editable: !!selectedTime },
                    ].map(({ Icon, label, editable }) => (
                      <div key={label} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
                          <span className="text-sm text-white/75 truncate">{label}</span>
                        </div>
                        {editable && step === 2 && (
                          <button onClick={() => setStep(1)} className="text-white/35 hover:text-white/65 transition-colors ml-2 flex-shrink-0">
                            <FiEdit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3">
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-xl">

                  {step === 1 && (
                    <>
                      <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-5">Select Date</p>
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); setSlotAvailability(null); }}
                        accentColor={accent}
                        openDayNames={openDayNames}
                        holidays={restaurantData?.customHolidays || []}
                      />

                      {selectedDate && (
                        <div className="mt-6">
                          {!isOpen ? (
                            <div className="bg-red-500/15 border border-red-500/25 rounded-2xl p-5 text-center">
                              <p className="text-red-300 text-sm font-bold mb-1">Closed on this day</p>
                              <p className="text-red-300/60 text-xs">Please choose a different date</p>
                            </div>
                          ) : timeSlots.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                              <p className="text-white/60 text-sm font-bold mb-1">No time slots available</p>
                              <p className="text-white/30 text-xs">Please contact us directly to book.</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-3">
                                Select Time
                                <span className="text-white/25 normal-case font-normal ml-1">
                                  ({effectiveOpenTime} – {effectiveCloseTime})
                                </span>
                              </p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {timeSlots.map(slot => {
                                  const checked = slotAvailability !== null;
                                  const isFull = checked && slotAvailability[slot.value] === false;
                                  const isAvailable = !isFull;
                                  return (
                                    <button
                                      key={slot.value}
                                      onClick={() => isAvailable && setSelectedTime(slot.value)}
                                      disabled={isFull || slotAvailability === null}
                                      className={'py-2.5 rounded-xl text-sm font-semibold transition-all ' + (
                                        slotAvailability === null
                                          ? 'bg-white/5 text-white/30 cursor-wait'
                                          : isFull
                                          ? 'bg-red-500/20 text-red-300 cursor-not-allowed border border-red-500/30'
                                          : selectedTime === slot.value
                                            ? 'text-white shadow-lg scale-105'
                                            : 'bg-white/10 text-white/65 hover:bg-white/15'
                                      )}
                                      style={!isFull && slotAvailability !== null && selectedTime === slot.value ? { backgroundColor: accent } : {}}>
                                      {slotAvailability === null ? (
                                        <span className="text-[10px]">…</span>
                                      ) : isFull ? (
                                        <div className="flex flex-col items-center">
                                          <span className="text-xs">{slot.label}</span>
                                          <span className="text-[10px] font-bold">FULL</span>
                                        </div>
                                      ) : (
                                        slot.label
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {selectedDate && selectedTime && isOpen && (
                        <button
                          onClick={() => {
                            const menuMinGuests = settings?.menuDisplayMinGuests || 1;
                            const shouldShowMenu = settings?.showMenuOnPublicPage && guests >= menuMinGuests;
                            if (shouldShowMenu) {
                              setStep(3);
                            } else {
                              setStep(2);
                            }
                          }}
                          className="mt-7 w-full py-4 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] shadow-xl"
                          style={{ backgroundColor: accent }}>
                          Continue →
                        </button>
                      )}
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setStep(1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                          <FiChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <h3 className="text-white font-black text-lg">Your details</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">First name <span style={{ color: accent }}>*</span></label>
                            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                              placeholder="John" />
                          </div>
                          <div>
                            <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Last name <span style={{ color: accent }}>*</span></label>
                            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                              placeholder="Doe" />
                          </div>
                        </div>

                        <div>
                          <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            Phone {config.requirePhone && <span style={{ color: accent }}>*</span>}
                          </label>
                          <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                            type="tel"
                            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                            placeholder="+47 123 456 789" />
                        </div>

                        <div>
                          <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            Email {config.requireEmail && <span style={{ color: accent }}>*</span>}
                          </label>
                          <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                            type="email"
                            className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                            placeholder="john@example.com" />
                        </div>

                        {config.showCompany && (
                          <div>
                            <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Company</label>
                            <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))}
                              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                              placeholder="Company name" />
                          </div>
                        )}

                        {config.showNotes && (
                          <div>
                            <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Special requests</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                              rows={3} maxLength={360}
                              className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                              placeholder="Dietary requirements, accessibility needs, celebrations..." />
                            <p className="text-white/25 text-xs text-right mt-1">{form.notes.length}/360</p>
                          </div>
                        )}

                        {settings?.showBirthdayField && (
                          <div className="rounded-2xl overflow-hidden border border-white/15"
                            style={{ background: 'linear-gradient(135deg, rgba(254,138,36,0.12), rgba(255,255,255,0.05))' }}>
                            <div className="px-4 pt-4 pb-3">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">🎂</span>
                                <p className="text-white/80 text-sm font-semibold">
                                  {settings.birthdayOfferMessage || 'Would you like a special offer for your birthday?'}
                                </p>
                              </div>
                              <p className="text-white/35 text-xs mb-3 ml-7">Optional — day and month only</p>
                              {(() => {
                                const parts = (form.birthday || '').split('-');
                                const bdMonth = parts.length === 2 ? parts[0] : '';
                                const bdDay   = parts.length === 2 ? parts[1] : '';
                                const MONTHS  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                                return (
                                  <>
                                    <div className="flex gap-2 ml-7">
                                      <div className="flex-1">
                                        <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1 block">Month</label>
                                        <select
                                          value={bdMonth}
                                          onChange={e => {
                                            const m = e.target.value;
                                            setForm(p => ({ ...p, birthday: m && bdDay ? `${m}-${bdDay}` : m ? `${m}-` : '' }));
                                          }}
                                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/40 transition-all"
                                          style={{ colorScheme: 'dark' }}>
                                          <option value="" className="bg-gray-800">— Month</option>
                                          {MONTHS.map((m, i) => (
                                            <option key={m} value={String(i + 1).padStart(2, '0')} className="bg-gray-800">{m}</option>
                                          ))}
                                        </select>
                                      </div>
                                      <div className="flex-1">
                                        <label className="text-white/40 text-[10px] font-semibold uppercase tracking-wider mb-1 block">Day</label>
                                        <select
                                          value={bdDay}
                                          onChange={e => {
                                            const d = e.target.value;
                                            setForm(p => ({ ...p, birthday: bdMonth && d ? `${bdMonth}-${d}` : d ? `-${d}` : '' }));
                                          }}
                                          className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/40 transition-all"
                                          style={{ colorScheme: 'dark' }}>
                                          <option value="" className="bg-gray-800">— Day</option>
                                          {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                            <option key={d} value={String(d).padStart(2, '0')} className="bg-gray-800">{d}</option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>
                                    {bdMonth && bdDay && (
                                      <div className="ml-7 mt-2 flex items-center justify-between">
                                        <span className="text-xs font-semibold" style={{ color: accent }}>
                                          🎉 Birthday: {MONTHS[parseInt(bdMonth) - 1]} {parseInt(bdDay)}
                                        </span>
                                        <button type="button" onClick={() => setForm(p => ({ ...p, birthday: '' }))}
                                          className="text-white/30 hover:text-white/60 text-xs transition-colors">
                                          Clear
                                        </button>
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                          )}

                        {settings?.enableOfferCode && (
                          <div>
                            <label className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                              {settings.offerCodeFieldLabel || 'Have an offer code?'}
                            </label>
                            <div className="relative">
                              <input
                                value={offerCodeInput}
                                onChange={e => {
                                  setOfferCodeInput(e.target.value.toUpperCase());
                                  setOfferCodeSource(e.target.value ? 'manual' : null);
                                }}
                                placeholder="e.g. WELCOME10"
                                className="w-full bg-white/10 border border-white/15 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/25 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all"
                              />
                              {offerCodeSource === 'auto' && offerCodeInput === urlOfferCode && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold px-2 py-1 rounded-full text-white"
                                  style={{ backgroundColor: accent }}>
                                  Applied
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        <label className="flex items-start gap-3 cursor-pointer group">
                          <input type="checkbox" checked={agreeNewsletter} onChange={e => setAgreeNewsletter(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded flex-shrink-0" style={{ accentColor: accent }} />
                          <span className="text-white/40 text-xs leading-relaxed group-hover:text-white/55 transition-colors">
                            I agree to receive newsletters in accordance with the{' '}
                            <span className="underline" style={{ color: accent }}>declaration of consent</span>.
                          </span>
                        </label>

                        <p className="text-white/25 text-xs">
                          By completing the booking you agree to our{' '}
                          <span className="underline cursor-pointer" style={{ color: accent }}>Terms & Conditions</span>
                        </p>

                        {error && (
                          <div className="p-3.5 bg-red-500/15 border border-red-500/25 rounded-xl text-red-300 text-sm font-medium">
                            {error}
                          </div>
                        )}

                        <button
                          onClick={handleSubmit}
                          disabled={saving}
                          className={`w-full py-4 rounded-2xl text-sm font-black text-white transition-all shadow-xl ${
                            saving
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:opacity-90 hover:scale-[1.01] active:scale-[0.99]'
                          }`}
                          style={{ backgroundColor: accent }}>
                          {saving ? (
                            <span className="flex items-center justify-center gap-2">
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Processing...
                            </span>
                          ) : (
                            'Make reservation'
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 3: GROUP MENU SELECTION ══ */}
          {!saved && step === 3 && (
            <div className="mt-6">
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 shadow-xl overflow-hidden mb-6">
                <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${accent}, ${accent}99)` }} />
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-2xl"
                      style={{ backgroundColor: accent + '22' }}>
                      🍽️
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-black text-xl mb-1">
                        {settings?.menuDisplayTitle || 'Group Menu Selection'}
                      </h3>
                      <p className="text-white/50 text-sm">
                        {settings?.groupMenuRequiredMessage || 'Please select your group menu to continue'}
                      </p>

                      {(() => {
                        const totalSelected = selectedMenuItems.reduce((s, i) => s + (i.qty || 1), 0);
                        const isRequired = settings?.requireGroupMenuSelection;
                        const pct = isRequired ? (totalSelected >= 1 ? 100 : 0) : 100;
                        const done = isRequired ? totalSelected >= 1 : true;
                        return (
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-white/50">
                                {isRequired
                                  ? `${totalSelected} of 1 item selected`
                                  : `${totalSelected} item${totalSelected !== 1 ? 's' : ''} added`
                                }
                              </span>
                              {done && (
                                <span className="text-xs font-bold text-green-400 flex items-center gap-1">
                                  <FiCheck className="w-3 h-3"/> Ready to confirm
                                </span>
                              )}
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${pct}%`, backgroundColor: done ? '#22c55e' : accent }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-white/10">
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <FiUsers className="w-3 h-3"/> {guests} guests
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <FiCalendar className="w-3 h-3"/> {selectedDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="flex items-center gap-1.5 bg-white/5 border border-white/15 text-white/60 text-xs font-semibold px-3 py-1.5 rounded-full">
                      <FiClock className="w-3 h-3"/> {getTimeLabel(selectedTime)}
                    </span>
                  </div>
                </div>
              </div>

              <PublicMenuDisplay
                restaurantId={restaurantData.firestoreId}
                collectionName={restaurantData._collection || 'restaurants'}
                guests={guests}
                accentColor={accent}
                lang="en"
                settings={{ ...settings, showMenuOnPublicPage: true }}
                onSelectionChange={setSelectedMenuItems}
              />

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    const holidays = restaurantData?.customHolidays || [];
                    const resDateCheck = new Date(selectedDate);
                    resDateCheck.setHours(0, 0, 0, 0);
                    const isHolidayBlocked = holidays.some(h => {
                      if (!h.startDate || !h.endDate) return false;
                      const start = new Date(h.startDate + 'T00:00:00');
                      const end = new Date(h.endDate + 'T23:59:59');
                      return resDateCheck >= start && resDateCheck <= end;
                    });
                    if (isHolidayBlocked) {
                      setError('This date is unavailable. The restaurant is closed during this period.');
                      return;
                    }
                    setError('');
                    if (!form.firstName && !form.lastName && !form.phone && !form.email) {
                      setStep(1);
                    } else {
                      setStep(2);
                    }
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold text-white/60 bg-white/10 hover:bg-white/15 transition-all border border-white/15">
                  <FiChevronLeft className="w-4 h-4"/>
                  {(!form.firstName && !form.lastName && !form.phone && !form.email) ? 'Back to date & time' : 'Back to guest details'}
                </button>
                <button
                  onClick={() => {
                    if (settings?.requireGroupMenuSelection) {
                      const totalSelected = selectedMenuItems.reduce((s, i) => s + (i.qty || 1), 0);
                      if (totalSelected < 1) {
                        setError(
                          settings?.groupMenuRequiredMessage ||
                          'Please select at least one menu item to continue'
                        );
                        return;
                      }
                    }
                    setError('');
                    handleSubmit();
                  }}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black text-white transition-all shadow-xl hover:opacity-90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: accent }}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                      Processing...
                    </span>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4"/>
                      Confirm Reservation
                    </>
                  )}
                </button>
              </div>

              {error && (
                <div className="mt-4 p-3.5 bg-red-500/15 border border-red-500/25 rounded-xl text-red-300 text-sm font-medium text-center">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}