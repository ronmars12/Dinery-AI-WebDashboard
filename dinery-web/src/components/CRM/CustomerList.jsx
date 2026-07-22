import React, { useState, useEffect, useMemo } from "react";
import { firestore } from "../../firebase";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, limit, startAfter, writeBatch, getCountFromServer } from "firebase/firestore";

function formatDate(ts) {
  if (!ts) return "—";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function CustomerList({ restaurantId, collectionName = "restaurants", t = (s) => s }) {
const PAGE_SIZE = 50;

  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("recent"); // recent | name | oldest
  const [editingGuest, setEditingGuest] = useState(null);
  const [editForm, setEditForm] = useState({ customerName: "", customerEmail: "", customerPhone: "" });
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [totalCount, setTotalCount] = useState(null);
  const [selectAllMode, setSelectAllMode] = useState(false);
  const latestCursorRef = React.useRef(null);

  const effectiveRestaurantId = restaurantId;
  const effectiveCollectionName = collectionName;

  useEffect(() => {
    if (!effectiveRestaurantId) return;
    getCountFromServer(collection(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity"))
      .then((snap) => setTotalCount(snap.data().count))
      .catch((e) => console.error("Failed to get guest count:", e));
  }, [effectiveRestaurantId, effectiveCollectionName]);

  useEffect(() => {
    if (search) setSelectAllMode(false);
  }, [search]);

  // Server-side ordering so we can paginate. Note: guests missing this field
  // won't appear under "recent"/"oldest" sort — see caveat above.
  const orderField = sortBy === "name" ? "customerName" : "lastCompletedVisit";
  const orderDir = sortBy === "oldest" ? "asc" : "desc"; // "name" and "recent" both read fine as desc/asc below

  const loadPage = (isFirstPage, cursorDoc, pageSize = PAGE_SIZE) => {
    if (!effectiveRestaurantId) return;
    if (isFirstPage) setLoading(true); else if (pageSize === PAGE_SIZE) setLoadingMore(true);

    const dir = sortBy === "name" ? "asc" : orderDir;
    const base = [
      collection(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity"),
      orderBy(orderField, dir),
    ];
    const q = cursorDoc
      ? query(...base, startAfter(cursorDoc), limit(pageSize))
      : query(...base, limit(pageSize));

    return getDocs(q)
      .then((snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setGuests((prev) => (isFirstPage ? rows : [...prev, ...rows]));
        const newCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
        setLastDoc(newCursor);
        latestCursorRef.current = newCursor;
        setHasMore(snap.docs.length === pageSize);
        return snap.docs.length === pageSize;
      })
      .catch((e) => { console.error("Failed to load guest list:", e); return false; })
      .finally(() => { setLoading(false); setLoadingMore(false); });
  };

  // Loads every remaining page in sequence, so the full list ends up in `guests`.
  const loadAllRemaining = async () => {
    setLoadingAll(true);
    let cursor = lastDoc;
    let more = hasMore;
    try {
      while (more) {
        // eslint-disable-next-line no-await-in-loop
        more = await loadPage(false, cursor, 500);
        // grab the freshest cursor after state updates by re-reading lastDoc via closure workaround:
        // since setLastDoc is async, we instead track it locally through a side channel below.
        cursor = latestCursorRef.current;
      }
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (!effectiveRestaurantId) return;
    setGuests([]);
    setLastDoc(null);
    setHasMore(true);
    setSelectAllMode(false);
    loadPage(true, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveRestaurantId, effectiveCollectionName, sortBy]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guests;
    return guests.filter((g) =>
      (g.customerName || "").toLowerCase().includes(q) ||
      (g.customerEmail || "").toLowerCase().includes(q) ||
      (g.customerPhone || "").toLowerCase().includes(q)
    );
  }, [guests, search]);
  const startEdit = (g) => {
    setEditingGuest(g);
    setEditForm({
      customerName: g.customerName || "",
      customerEmail: g.customerEmail || "",
      customerPhone: g.customerPhone || "",
    });
  };

const saveEdit = async () => {
    if (!editingGuest) return;
    setSaving(true);
    try {
      await updateDoc(doc(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity", editingGuest.id), {
        customerName: editForm.customerName.trim(),
        customerEmail: editForm.customerEmail.trim().toLowerCase(),
        customerPhone: editForm.customerPhone.trim(),
      });
      setGuests((prev) => prev.map((g) => (g.id === editingGuest.id ? { ...g, ...editForm } : g)));
      setEditingGuest(null);
    } catch (e) {
      console.error("Failed to update guest:", e);
      alert("Failed to save changes: " + e.message);
    } finally {
      setSaving(false);
    }
  };

const handleDelete = async (guestId) => {
    if (!window.confirm("Remove this guest from your customer list? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity", guestId));
      setGuests((prev) => prev.filter((g) => g.id !== guestId));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(guestId); return next; });
    } catch (e) {
      console.error("Failed to delete guest:", e);
      alert("Failed to delete: " + e.message);
    }
  };

  const toggleSelect = (guestId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) next.delete(guestId);
      else next.add(guestId);
      return next;
    });
  };

  const allVisibleSelected = filtered.length > 0 && filtered.every((g) => selectedIds.has(g.id));
  const someVisibleSelected = filtered.some((g) => selectedIds.has(g.id));

  const toggleSelectAll = () => {
    if (allVisibleSelected) setSelectAllMode(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filtered.forEach((g) => next.delete(g.id));
      } else {
        filtered.forEach((g) => next.add(g.id));
      }
      return next;
    });
  };

  const deleteAllGuests = async () => {
    const PAGE = 500; 
    let cursor = null;
    while (true) {
      const base = [
        collection(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity"),
        orderBy("__name__"),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(PAGE),
      ];
      const snap = await getDocs(query(...base));
      if (snap.empty) break;
      const batch = writeBatch(firestore);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      if (snap.docs.length < PAGE) break;
      cursor = snap.docs[snap.docs.length - 1];
    }
  };

  const handleBulkDelete = async () => {
    const count = selectAllMode ? totalCount : selectedIds.size;
    if (!count) return;
    if (!window.confirm(`Remove ${count} guest${count > 1 ? "s" : ""} from your customer list? This cannot be undone.`)) return;
    setBulkDeleting(true);
    try {
      if (selectAllMode) {
        await deleteAllGuests();
        setGuests([]);
        setLastDoc(null);
        setHasMore(false);
        setTotalCount(0);
      } else {
        const ids = Array.from(selectedIds);
        const CHUNK = 500;
        for (let i = 0; i < ids.length; i += CHUNK) {
          const batch = writeBatch(firestore);
          ids.slice(i, i + CHUNK).forEach((id) => {
            batch.delete(doc(firestore, effectiveCollectionName, effectiveRestaurantId, "guestActivity", id));
          });
          await batch.commit();
        }
        setGuests((prev) => prev.filter((g) => !selectedIds.has(g.id)));
        setTotalCount((c) => (c == null ? c : Math.max(0, c - ids.length)));
      }
      setSelectedIds(new Set());
      setSelectAllMode(false);
    } catch (e) {
      console.error("Bulk delete failed:", e);
      alert("Some guests could not be deleted: " + e.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#fe8a24]" />
      </div>
    );
  }

return (
    <div className="space-y-4">
      {/* Search + sort */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11a6 6 0 11-12 0 6 6 0 0112 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone…"
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]">
          <option value="recent">Most recent visit</option>
          <option value="oldest">Oldest visit</option>
          <option value="name">Name (A–Z)</option>
        </select>
        <span className="text-xs text-gray-400 font-medium">{filtered.length} of {totalCount ?? guests.length} guests</span>
        {(selectedIds.size > 0 || selectAllMode) && (
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeleting}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {bulkDeleting ? "Removing…" : `Delete ${selectAllMode ? totalCount : selectedIds.size} selected`}
          </button>
        )}
      </div>
      {allVisibleSelected && hasMore && !search && !selectAllMode && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-[#fe8a24]">
          <span>All {guests.length} loaded guests are selected.</span>
          <button onClick={() => setSelectAllMode(true)} className="font-semibold underline">
            Select all {totalCount ?? "…"} guests instead
          </button>
        </div>
      )}
      {selectAllMode && (
        <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-4 py-2 text-xs text-[#fe8a24]">
          <span>All {totalCount} guests in your customer list are selected.</span>
          <button onClick={() => setSelectAllMode(false)} className="font-semibold underline">
            Clear selection
          </button>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-gray-400 bg-gray-50 rounded-xl border border-gray-100">
          {guests.length === 0 ? "No guests yet. Import a customer list to get started." : "No guests match your search."}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="max-h-[720px] overflow-y-auto">
            <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected; }}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 accent-[#fe8a24] cursor-pointer"
                    />
                  </th>
                  <th className="text-left font-semibold text-gray-500 uppercase text-xs px-4 py-2.5">Name</th>
                  <th className="text-left font-semibold text-gray-500 uppercase text-xs px-4 py-2.5">Email</th>
                  <th className="text-left font-semibold text-gray-500 uppercase text-xs px-4 py-2.5">Phone</th>
                  <th className="text-left font-semibold text-gray-500 uppercase text-xs px-4 py-2.5">Last Visit</th>
                  <th className="text-right font-semibold text-gray-500 uppercase text-xs px-4 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((g) => (
                  <tr key={g.id} className={`hover:bg-gray-50/60 ${selectedIds.has(g.id) ? "bg-orange-50/40" : ""}`}>
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(g.id)}
                        onChange={() => toggleSelect(g.id)}
                        className="h-4 w-4 accent-[#fe8a24] cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{g.customerName || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{g.customerEmail || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{g.customerPhone || "—"}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatDate(g.lastCompletedVisit)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(g)} className="text-gray-300 hover:text-[#fe8a24] transition-colors p-1.5" title="Edit">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(g.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1.5" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasMore && (
            <div className="flex justify-center gap-2 py-3 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => loadPage(false, lastDoc)}
                disabled={loadingMore || loadingAll}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-[#fe8a24] bg-white border border-orange-200 rounded-lg hover:bg-orange-50 hover:border-[#fe8a24] transition-colors disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-[#fe8a24] inline-block" />
                    Loading…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                    Load {PAGE_SIZE} more
                  </>
                )}
              </button>
              <button
                onClick={loadAllRemaining}
                disabled={loadingMore || loadingAll}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                {loadingAll ? (
                  <>
                    <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400 inline-block" />
                    Loading all…
                  </>
                ) : (
                  <>View all {totalCount ?? ""} guests</>
                )}
              </button>
            </div>
          )}
        </div>
      )}
      {search && hasMore && (
        <p className="text-xs text-amber-600 -mt-2">
          Search only covers the {guests.length} guests loaded so far — load more to widen it.
        </p>
      )}  

      {/* Edit modal */}
      {editingGuest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setEditingGuest(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Edit Guest</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input
                  value={editForm.customerName}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  value={editForm.customerEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerEmail: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <input
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerPhone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setEditingGuest(null)} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold border-2 border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-bold text-white bg-[#fe8a24] hover:bg-[#e07a1f] disabled:opacity-50">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}