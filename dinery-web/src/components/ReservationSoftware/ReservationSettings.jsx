// ReservationSettings.jsx - Updated with text-only tabs
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, getDocs, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { FiCheck, FiX, FiSave, FiClock, FiCalendar, FiUsers, FiBell, FiMonitor, FiSettings, FiSliders, FiMenu, FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';

const db = getFirestore();

// ── Menu Category Panel ────────────────────────────────────────────────────
const MenuCategoryPanel = ({ restaurantId, collectionName }) => {
  const [categories, setCategories] = useState([]);
  const [itemCounts, setItemCounts]  = useState({});
  const [loading, setLoading]        = useState(true);
  const [expanded, setExpanded]      = useState({});

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [catSnap, itemSnap] = await Promise.all([
          getDocs(collection(db, collectionName, restaurantId, 'menuCategories')),
          getDocs(collection(db, collectionName, restaurantId, 'menuItems')),
        ]);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
        const counts = {};
        itemSnap.docs.forEach(d => {
          const cat = d.data().category;
          if (cat) counts[cat] = (counts[cat] || 0) + 1;
        });
        setCategories(cats);
        setItemCounts(counts);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [restaurantId, collectionName]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (categories.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <span className="text-4xl mb-3">🍽️</span>
      <p className="text-sm font-semibold text-gray-600">No menu categories yet</p>
      <p className="text-xs text-gray-400 mt-1">Open the Menu manager to create your first category</p>
    </div>
  );

  const totalItems = Object.values(itemCounts).reduce((s,n) => s+n, 0);

  return (
    <div>
      {/* Summary bar */}
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-4 overflow-x-auto">
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">{categories.length}</p>
          <p className="text-[10px] text-gray-400 uppercase">Categories</p>
        </div>
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">{totalItems}</p>
          <p className="text-[10px] text-gray-400 uppercase">Items</p>
        </div>
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-green-600">
            {categories.filter(c => c.active !== false).length}
          </p>
          <p className="text-[10px] text-gray-400 uppercase">Active</p>
        </div>
      </div>

      {/* Category list */}
      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {categories.map(cat => {
          const count = itemCounts[cat.id] || 0;
          const subs  = cat.subcategories || [];
          const isOpen = expanded[cat.id];
          return (
            <div key={cat.id}>
              <div
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => subs.length > 0 && setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
              >
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color || '#fe8a24' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                    {cat.name?.en || 'Unnamed'}
                  </p>
                  {subs.length > 0 && (
                    <span className="text-[10px] sm:text-xs text-gray-400">{subs.length} subcategories</span>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {count} items
                  </span>
                  <span className={`text-[8px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.5 rounded-full ${
                    cat.active !== false
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {cat.active !== false ? 'on' : 'off'}
                  </span>
                  {subs.length > 0 && (
                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
              {isOpen && subs.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 sm:gap-3 pl-6 sm:pl-10 pr-3 sm:pr-4 py-1 sm:py-1.5 bg-gray-50/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 flex-1 truncate">{sub.name?.en || sub.id}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Menu Panel (self-contained inside Settings) ────────────────────────────
const MENU_LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English'   },
  { code: 'no', flag: '🇳🇴', label: 'NO', name: 'Norwegian' },
  { code: 'da', flag: '🇩🇰', label: 'DA', name: 'Danish'    },
  { code: 'se', flag: '🇸🇪', label: 'SE', name: 'Swedish'   },
  { code: 'fi', flag: '🇫🇮', label: 'FI', name: 'Finnish'   },
];

const MENU_ALLERGENS = [
  { id: 'gluten',    label: 'Gluten',    icon: '🌾' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { id: 'eggs',      label: 'Eggs',      icon: '🥚' },
  { id: 'fish',      label: 'Fish',      icon: '🐟' },
  { id: 'peanuts',   label: 'Peanuts',   icon: '🥜' },
  { id: 'soy',       label: 'Soy',       icon: '🫘' },
  { id: 'milk',      label: 'Milk',      icon: '🥛' },
  { id: 'nuts',      label: 'Nuts',      icon: '🌰' },
  { id: 'celery',    label: 'Celery',    icon: '🥬' },
  { id: 'mustard',   label: 'Mustard',   icon: '🌭' },
  { id: 'sesame',    label: 'Sesame',    icon: '⚪' },
  { id: 'sulphites', label: 'Sulphites', icon: '🍷' },
  { id: 'lupin',     label: 'Lupin',     icon: '🌼' },
  { id: 'molluscs',  label: 'Molluscs',  icon: '🦪' },
];

const MENU_ATTRIBUTES = [
  { id: 'vegan',       label: 'Vegan',       icon: '🌱', color: '#16a34a' },
  { id: 'vegetarian',  label: 'Vegetarian',  icon: '🥗', color: '#15803d' },
  { id: 'gluten_free', label: 'Gluten Free', icon: '🚫', color: '#d97706' },
  { id: 'spicy',       label: 'Spicy',       icon: '🌶️', color: '#dc2626' },
  { id: 'halal',       label: 'Halal',       icon: '☪️',  color: '#2563eb' },
  { id: 'kosher',      label: 'Kosher',      icon: '✡️',  color: '#7c3aed' },
  { id: 'organic',     label: 'Organic',     icon: '🌿', color: '#059669' },
  { id: 'popular',     label: 'Popular',     icon: '⭐', color: '#f59e0b' },
  { id: 'new',         label: 'New',         icon: '🆕', color: '#3b82f6' },
  { id: 'kids',        label: "Kids'",       icon: '👶', color: '#ec4899' },
];

const emptyLangs  = () => Object.fromEntries(MENU_LANGUAGES.map(l => [l.code, '']));
const emptyItem   = (catId = '') => ({
  name: emptyLangs(), description: emptyLangs(),
  price: '', category: catId, subcategory: '',
  allergens: [], attributes: [], active: true, sortOrder: 0,
});
const emptyCategory = () => ({
  name: emptyLangs(), sortOrder: 0, active: true,
  color: '#fe8a24', subcategories: [],
});

const MenuPanel = ({ restaurantId, collectionName }) => {
  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]   = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [saving,     setSaving]      = useState(false);
  const [toast,      setToast]       = useState(null);

  const [selectedCat,  setSelectedCat]  = useState(null);
  const [viewLang,     setViewLang]     = useState('en');
  const [searchQ,      setSearchQ]      = useState('');
  const [sortBy,       setSortBy]       = useState('sortOrder');

  // Modals
  const [itemModal,   setItemModal]   = useState(null);
  const [catModal,    setCatModal]    = useState(null);
  const [deleteConf,  setDeleteConf]  = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cs, is] = await Promise.all([
          getDocs(collection(db, collectionName, restaurantId, 'menuCategories')),
          getDocs(collection(db, collectionName, restaurantId, 'menuItems')),
        ]);
        const cats  = cs.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
        const items = is.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
        setCategories(cats);
        setMenuItems(items);
        if (cats.length > 0) setSelectedCat(cats[0].id);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [restaurantId, collectionName]);

  const saveCat = async (form) => {
    setSaving(true);
    try {
      if (catModal === 'add') {
        const ref = await addDoc(collection(db, collectionName, restaurantId, 'menuCategories'),
          { ...form, sortOrder: categories.length, createdAt: new Date() });
        setCategories(p => [...p, { id: ref.id, ...form }]);
        setSelectedCat(ref.id);
        showToast('Category added');
      } else {
        await updateDoc(doc(db, collectionName, restaurantId, 'menuCategories', catModal.id), form);
        setCategories(p => p.map(c => c.id === catModal.id ? { ...c, ...form } : c));
        showToast('Category updated');
      }
      setCatModal(null);
    } catch(e) { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const saveItem = async (form) => {
    setSaving(true);
    try {
    if (itemModal === 'add') {
            const catItems = menuItems.filter(i => i.category === form.category);
            const maxOrder = catItems.length > 0 ? Math.max(...catItems.map(i => i.sortOrder || 0)) + 1 : 0;
            const ref = await addDoc(collection(db, collectionName, restaurantId, 'menuItems'),
              { ...form, sortOrder: maxOrder, createdAt: new Date() });
        setMenuItems(p => [...p, { id: ref.id, ...form }]);
        showToast('Item added');
      } else {
        await updateDoc(doc(db, collectionName, restaurantId, 'menuItems', itemModal.id), form);
        setMenuItems(p => p.map(i => i.id === itemModal.id ? { ...i, ...form } : i));
        showToast('Item updated');
      }
      setItemModal(null);
    } catch(e) { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      if (deleteConf.type === 'item') {
        await deleteDoc(doc(db, collectionName, restaurantId, 'menuItems', deleteConf.id));
        setMenuItems(p => p.filter(i => i.id !== deleteConf.id));
      } else {
        await deleteDoc(doc(db, collectionName, restaurantId, 'menuCategories', deleteConf.id));
        setCategories(p => p.filter(c => c.id !== deleteConf.id));
        setMenuItems(p => p.filter(i => i.category !== deleteConf.id));
        if (selectedCat === deleteConf.id) setSelectedCat(null);
      }
      showToast('Deleted');
      setDeleteConf(null);
    } catch(e) { showToast('Failed', 'error'); }
    finally { setSaving(false); }
  };

  const filteredItems = menuItems
    .filter(i => {
      if (selectedCat && i.category !== selectedCat) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        return Object.values(i.name||{}).join(' ').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name?.en || '').localeCompare(b.name?.en || '');
      if (sortBy === 'price') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const handleDragStart = (e, index) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('dragIndex', String(index));
    };

    const handleDrop = async (e, dropIndex) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));
      if (isNaN(dragIndex) || dragIndex === dropIndex) return;
      const reordered = [...filteredItems];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      const updates = reordered.map((item, i) => ({ ...item, sortOrder: i }));
      setMenuItems(prev => {
        const ids = new Set(updates.map(u => u.id));
        return [...prev.filter(i => !ids.has(i.id)), ...updates]
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      });
      await Promise.all(
        updates.map(item =>
          updateDoc(doc(db, collectionName, restaurantId, 'menuItems', item.id), { sortOrder: item.sortOrder })
        )
      ).catch(err => { console.error(err); showToast('Failed to reorder', 'error'); });
      showToast('Order saved');
    };

    if (loading) return (
      <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0" style={{ minHeight: '500px', height: '100%' }}>

      {/* ── Left sidebar ── */}
      <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
          <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">📁 Categories</span>
          <button onClick={() => setCatModal('add')}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#fe8a24] text-white flex items-center justify-center hover:bg-[#ff9d47] transition-all shadow-sm">
            <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 max-h-64 md:max-h-none">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
              !selectedCat ? 'bg-[#fe8a24]/10 text-[#fe8a24] border-r-2 border-[#fe8a24]' : 'text-gray-700 hover:bg-gray-100'
            }`}>
            <span>📋 All Items</span>
            <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full font-semibold">{menuItems.length}</span>
          </button>
          {categories.map(cat => {
            const count = menuItems.filter(i => i.category === cat.id).length;
            const isSel = selectedCat === cat.id;
            return (
              <div key={cat.id}
                className={`group flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition-colors ${
                  isSel ? 'bg-white border-r-2 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={isSel ? { borderRightColor: cat.color || '#fe8a24' } : {}}
                onClick={() => setSelectedCat(cat.id)}>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: cat.color || '#fe8a24' }} />
                  <span className="text-xs sm:text-sm font-semibold truncate">{cat.name?.[viewLang] || cat.name?.en || 'Unnamed'}</span>
                  {!cat.active && <span className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-200 px-1 rounded">off</span>}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-0.5 rounded-full">{count}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 sm:gap-1">
                    <button onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                      className="p-0.5 sm:p-1 rounded hover:bg-white text-gray-500 hover:text-[#fe8a24] transition-colors">
                      <FiEdit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConf({ type: 'category', id: cat.id, name: cat.name?.en || 'this' }); }}
                      className="p-0.5 sm:p-1 rounded hover:bg-white text-gray-500 hover:text-red-500 transition-colors">
                      <FiTrash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: items ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-200 flex items-center gap-2 sm:gap-3 flex-wrap flex-shrink-0 bg-white">
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex-1 sm:flex-initial">
            <FiSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search menu items…"
              className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none w-20 sm:w-32 placeholder:text-xs sm:placeholder:text-sm" />
            {searchQ && <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600"><FiX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>}
          </div>
          
          {/* Lang switcher - scrollable on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1 overflow-x-auto">
            {MENU_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setViewLang(l.code)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                  viewLang === l.code ? 'bg-[#fe8a24] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            {[['sortOrder','⠿ Order'],['name','A–Z'],['price','Price']].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                  sortBy === key ? 'bg-[#fe8a24] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setItemModal('add')}
            className="ml-auto flex items-center gap-1 sm:gap-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all shadow-sm">
            <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">Add Item</span>
          </button>
        </div>

        {/* Items list - responsive grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 sm:mb-4 text-3xl sm:text-4xl shadow-inner">🍽️</div>
              <p className="text-sm sm:text-base font-semibold text-gray-600">No menu items yet</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">Click "Add Item" to create your first menu item</p>
              <button onClick={() => setItemModal('add')}
                className="mt-3 sm:mt-4 flex items-center gap-2 bg-[#fe8a24] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#ff9d47] transition-all shadow-md">
                <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add First Item
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row - hidden on mobile */}
              <div className={`hidden md:grid px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-lg ${sortBy === 'sortOrder' ? 'pl-8' : ''}`}
                style={{ gridTemplateColumns: '1fr 100px 180px 180px 100px' }}>
                <span>🍽️ Item Name</span>
                <span>💰 Price</span>
                <span>⚠️ Allergens</span>
                <span>🏷️ Attributes</span>
                <span>⚡ Actions</span>
              </div>
              
              {filteredItems.map(item => {
                const cat = categories.find(c => c.id === item.category);
                const name = item.name?.[viewLang] || item.name?.en || 'Unnamed';
                const desc = item.description?.[viewLang] || item.description?.en || '';
                return (
                <div key={item.id}
                    draggable={sortBy === 'sortOrder'}
                    onDragStart={(e) => handleDragStart(e, filteredItems.indexOf(item))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, filteredItems.indexOf(item))}
                    className={`relative grid grid-cols-1 md:grid-cols-[1fr,100px,180px,180px,100px] items-start md:items-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer group gap-2 ${
                      item.active ? 'bg-white border-gray-200 hover:border-[#fe8a24]/40' : 'bg-gray-50 border-gray-200 opacity-60'
                    } ${sortBy === 'sortOrder' ? 'pl-6 sm:pl-8' : ''}`}
                    onClick={() => setItemModal(item)}>
                    {sortBy === 'sortOrder' && (
                      <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none text-lg leading-none">⠿</div>
                    )}
                    
                    {/* Name + desc */}
                    <div className="min-w-0 pr-1 sm:pr-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {cat && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: cat.color || '#fe8a24' }} />}
                        <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{name}</span>
                        {!item.active && <span className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-200 px-1 sm:px-1.5 py-0.5 rounded">hidden</span>}
                      </div>
                      {desc && <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5 sm:mt-1 ml-1 sm:ml-3">{desc}</p>}
                    </div>

                    {/* Price */}
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {item.price ? `${item.price} NOK` : <span className="text-gray-300 text-xs sm:text-sm">—</span>}
                    </div>

                    {/* Allergens */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {(item.allergens||[]).slice(0, 3).map(id => {
                        const a = MENU_ALLERGENS.find(x=>x.id===id);
                        return a ? <span key={id} className="text-[8px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">{a.icon} {a.label}</span> : null;
                      })}
                      {(item.allergens||[]).length > 3 && (
                        <span className="text-[8px] sm:text-xs font-semibold text-gray-500 bg-gray-100 px-1 sm:px-2 py-0.5 rounded-full">
                          +{item.allergens.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Attributes */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {(item.attributes||[]).slice(0, 2).map(id => {
                        const a = MENU_ATTRIBUTES.find(x=>x.id===id);
                        return a ? <span key={id} className="text-[8px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full font-semibold" style={{ background: a.color+'20', color: a.color }}>{a.icon} {a.label}</span> : null;
                      })}
                      {(item.attributes||[]).length > 2 && (
                        <span className="text-[8px] sm:text-xs font-semibold text-gray-500 bg-gray-100 px-1 sm:px-2 py-0.5 rounded-full">
                          +{item.attributes.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end md:justify-start" onClick={e=>e.stopPropagation()}>
                      <button onClick={() => setItemModal(item)} 
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#fe8a24] transition-colors">
                        <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => setDeleteConf({ type: 'item', id: item.id, name })} 
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - responsive */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-gray-600 flex-nowrap">
            <span className="font-semibold hidden xs:inline">📊 Summary:</span>
            <span><span className="font-bold text-gray-800">{menuItems.length}</span> total</span>
            <span className="text-green-700"><span className="font-bold text-green-600">{menuItems.filter(i=>i.active).length}</span> active</span>
            <span className="text-gray-500 hidden sm:inline"><span className="font-bold">{menuItems.filter(i=>!i.active).length}</span> hidden</span>
            <span className="text-blue-700 hidden md:inline"><span className="font-bold">{categories.length}</span> categories</span>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold text-white max-w-[90vw] text-center ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConf && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConf(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-11/12 sm:w-96 mx-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 text-center mb-2">Delete {deleteConf.type}?</h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-5">"{deleteConf.name}" will be permanently removed.</p>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => setDeleteConf(null)} className="flex-1 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={confirmDelete} disabled={saving} className="flex-1 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category modal ── */}
      {catModal && (
        <MenuCatModal
          category={catModal === 'add' ? null : catModal}
          onSave={saveCat}
          onClose={() => setCatModal(null)}
          saving={saving}
          viewLang={viewLang}
        />
      )}

      {/* ── Item modal ── */}
      {itemModal && (
        <MenuItemModal
          item={itemModal === 'add' ? null : itemModal}
          categories={categories}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
          saving={saving}
          defaultCat={selectedCat}
        />
      )}
    </div>
  );
};

// ── Category modal ───────────────────────────────────────────────────────────
const MenuCatModal = ({ category, onSave, onClose, saving, viewLang }) => {
  const [form, setForm] = useState(category || emptyCategory());
  const [activeLang, setActiveLang] = useState('en');
  const [newSub, setNewSub] = useState('');
  const COLORS = ['#fe8a24','#ef4444','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#64748b','#1e293b'];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900">{category ? 'Edit Category' : 'Add Category'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><FiX className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">Color</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {COLORS.map(col => (
                <button key={col} onClick={() => setForm(p=>({...p,color:col}))}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-all ${form.color===col?'ring-2 ring-offset-1 ring-gray-400 scale-110':'hover:scale-105'}`}
                  style={{ background: col }} />
              ))}
              <label><input type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))} className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-gray-200 cursor-pointer" /></label>
            </div>
          </div>
          {/* Lang tabs */}
          <div className="flex gap-0.5 sm:gap-1 flex-wrap">
            {MENU_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setActiveLang(l.code)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold ${activeLang===l.code?'bg-[#fe8a24] text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          {/* Name per lang */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category Name</label>
            {MENU_LANGUAGES.filter(l => l.code === activeLang).map(l => (
              <div key={l.code} className="flex items-center gap-2">
                <span className="text-xs sm:text-sm flex-shrink-0">{l.flag}</span>
                <input type="text" value={form.name[l.code]||''} onChange={e=>setForm(p=>({...p,name:{...p.name,[l.code]:e.target.value}}))}
                  placeholder={`Name in ${l.name}…`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
              </div>
            ))}
          </div>
          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(p=>({...p,active:!p.active}))}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.active?'bg-green-500':'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active?'translate-x-5':'translate-x-0.5'}`} />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">{form.active ? 'Active' : 'Hidden'}</span>
          </label>
          {/* Subcategories */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subcategories</label>
            <div className="space-y-1 mb-2">
              {(form.subcategories||[]).map(sub => (
                <div key={sub.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
                  <span className="flex-1 text-[10px] sm:text-xs text-gray-700 truncate">{sub.name?.en||sub.id}</span>
                  <button onClick={() => setForm(p=>({...p,subcategories:(p.subcategories||[]).filter(s=>s.id!==sub.id)}))}
                    className="text-gray-400 hover:text-red-500"><FiX className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSub} onChange={e=>setNewSub(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&newSub.trim()){setForm(p=>({...p,subcategories:[...(p.subcategories||[]),{id:Date.now().toString(),name:{...Object.fromEntries(MENU_LANGUAGES.map(l=>[l.code,''])),en:newSub.trim()},active:true}]}));setNewSub('');}}}
                placeholder="Add subcategory…"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#fe8a24]" />
              <button onClick={()=>{if(newSub.trim()){setForm(p=>({...p,subcategories:[...(p.subcategories||[]),{id:Date.now().toString(),name:{...Object.fromEntries(MENU_LANGUAGES.map(l=>[l.code,''])),en:newSub.trim()},active:true}]}));setNewSub('');}}}
                className="px-3 py-1.5 bg-[#fe8a24] text-white rounded-lg text-xs font-semibold hover:bg-[#ff9d47] whitespace-nowrap">Add</button>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#fe8a24] text-white rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-[#ff9d47]">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-4 h-4" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Item modal ───────────────────────────────────────────────────────────────
const MenuItemModal = ({ item, categories, onSave, onClose, saving, defaultCat }) => {
  const [form, setForm] = useState(item || emptyItem(defaultCat || ''));
  const [activeLang, setActiveLang] = useState('en');
  const [tab, setTab] = useState('basic');

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleArr = (k,v) => setForm(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const subcats = categories.find(c=>c.id===form.category)?.subcategories||[];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900">{item ? 'Edit Item' : 'Add Item'}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><FiX className="w-4 h-4" /></button>
        </div>
        {/* Lang tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-5 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {MENU_LANGUAGES.map(l=>(
            <button key={l.code} onClick={()=>setActiveLang(l.code)}
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold whitespace-nowrap ${activeLang===l.code?'bg-[#fe8a24] text-white':'bg-white border border-gray-200 text-gray-500 hover:border-[#fe8a24]'}`}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-3 sm:px-5 overflow-x-auto">
          {[['basic','Content'],['allergens','Allergens'],['attributes','Attributes']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab===k?'border-[#fe8a24] text-[#fe8a24]':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {tab === 'basic' && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select value={form.category} onChange={e=>set('category',e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]">
                  <option value="">— Select —</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name?.en||c.id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subcategory</label>
                <select value={form.subcategory} onChange={e=>set('subcategory',e.target.value)} disabled={subcats.length===0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] disabled:bg-gray-50">
                  <option value="">— None —</option>
                  {subcats.map(s=><option key={s.id} value={s.id}>{s.name?.en||s.id}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Price</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={()=>set('active',!form.active)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${form.active?'bg-green-500':'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active?'translate-x-5':'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700">{form.active?'Active':'Hidden'}</span>
                </label>
              </div>
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Item Name</label>
              {MENU_LANGUAGES.filter(l=>l.code===activeLang).map(l=>(
                <div key={l.code} className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm">{l.flag}</span>
                  <input value={form.name[l.code]||''} onChange={e=>set('name',{...form.name,[l.code]:e.target.value})}
                    placeholder={`Name in ${l.name}…`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
                </div>
              ))}
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              {MENU_LANGUAGES.filter(l=>l.code===activeLang).map(l=>(
                <div key={l.code} className="flex items-start gap-2">
                  <span className="text-xs sm:text-sm mt-2">{l.flag}</span>
                  <textarea value={form.description[l.code]||''} onChange={e=>set('description',{...form.description,[l.code]:e.target.value})}
                    rows={3} placeholder={`Description in ${l.name}…`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] resize-none" />
                </div>
              ))}
            </div>
          </>}

          {tab === 'allergens' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">Select allergens present in this item.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {MENU_ALLERGENS.map(a=>{
                  const active = form.allergens.includes(a.id);
                  return (
                    <button key={a.id} onClick={()=>toggleArr('allergens',a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${active?'border-amber-400 bg-amber-50 text-amber-800':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      <span>{a.icon}</span><span>{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 ml-auto text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'attributes' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">Tag dietary and service attributes.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {MENU_ATTRIBUTES.map(a=>{
                  const active = form.attributes.includes(a.id);
                  return (
                    <button key={a.id} onClick={()=>toggleArr('attributes',a.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all"
                      style={{ borderColor: active?a.color:'#e5e7eb', background: active?a.color+'15':'white', color: active?a.color:'#4b5563' }}>
                      <span>{a.icon}</span><span>{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 ml-auto" style={{color:a.color}} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={saving}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#fe8a24] text-white rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-[#ff9d47]">
            {saving?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<FiCheck className="w-4 h-4"/>}
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
};

const ReservationSettings = ({ selectedRestaurant, onClose }) => {
  const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
    use24HourFormat: false,
    defaultReservationDuration: 90,
    tableCleanupTime: 15,
    timeSlotInterval: 15,
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2,
    requireName: true,
    requireEmail: true,
    requirePhone: true,
    showCompany: false,
    showNotes: true,
    maxGuestsOnline: 20,
    dayIntervals: {},
    blockedTimeSlots: {},
    requireTableAssignment: true,
    allowOverbooking: false,
    autoAssignTables: true,
    maxGuestsPerReservation: 20,
    minGuestsPerReservation: 1,
    sendConfirmationEmail: true,
    sendReminderEmail: true,
    reminderHoursBefore: 24,
    timeBarShowsStartOfHour: true,
    highlightCurrentTime: true,
    showTableCapacityWarnings: true,
    allowWalkInsWithoutTable: false,
    blockFullTimeSlots: true,
    showMenuOnPublicPage: false,
    menuDisplayMinGuests: 1,
    menuDisplayTitle: 'Our Menu',
    menuDisplaySubtitle: 'Browse our menu selection for your party',
    requireGroupMenuSelection: false,
    groupMenuMinGuests: 8,
    groupMenuRequiredMessage: 'Please select your group menu to continue',
    groupMenuItemsPerPerson: 0,
    thankYouMessage: 'Thank you for your reservation!',
    restaurantPageUrl: '',
    showBirthdayField: false,
    birthdayOfferMessage: 'Would you like a special offer for your birthday?',
    useGuestBasedDuration: false,
    guestDurationRules: [
      { minGuests: 1,  maxGuests: 2,  duration: 90  },
      { minGuests: 3,  maxGuests: 5,  duration: 120 },
      { minGuests: 6,  maxGuests: 8,  duration: 135 },
      { minGuests: 9,  maxGuests: 99, duration: 165 },
    ],
    // ── Offer / Campaign Code ──
    enableOfferCode: false,
    offerCodeFieldLabel: 'Have an offer code?',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [loadingRestaurantData, setLoadingRestaurantData] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedRestaurant?.id) return;
      try {
        const collectionName = selectedRestaurant?._collection || 'restaurants';
        const docRef = doc(db, collectionName, selectedRestaurant.id, 'reservationSettings', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({ ...prev, ...data }));
          console.log('✅ Loaded reservation settings:', {
            collection: collectionName,
            restaurantId: selectedRestaurant.id,
            hasDayIntervals: !!data.dayIntervals,
            hasBlockedSlots: !!data.blockedTimeSlots
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [selectedRestaurant]);

  useEffect(() => {
  const loadMaxCapacity = async () => {
    if (!selectedRestaurant?.id) return;
    try {
      const col = selectedRestaurant?._collection || 'restaurants';
      const tablesSnap = await getDocs(
        collection(db, col, selectedRestaurant.id, 'tables')
      );
      const combosSnap = await getDocs(
        collection(db, col, selectedRestaurant.id, 'tableCombinations')
      );

      const tables = tablesSnap.docs.map(d => d.data());
      const combos = combosSnap.docs.map(d => d.data());

      // Total capacity = sum of all individual table capacities
      const totalTableCap = tables.reduce((s, t) => s + (t.maxCapacity || t.capacity || 0), 0);

      // Largest combo capacity
      const maxComboCap = combos.reduce((s, c) => Math.max(s, c.maxCapacity || 0), 0);

      const maxCap = Math.max(totalTableCap, maxComboCap);

      if (maxCap > 0) {
        setSettings(prev => ({ 
          ...prev, 
          maxGuestsPerReservation: maxCap  // always sync with actual table capacity
        }));
    }
    } catch (e) {
      console.error('Failed to load table capacity:', e);
    }
  };
  loadMaxCapacity();
}, [selectedRestaurant?.id]);

  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!selectedRestaurant?.id) {
        setLoadingRestaurantData(false);
        return;
      }
      
      setLoadingRestaurantData(true);
      
      try {
        const collectionName = selectedRestaurant?._collection || 'restaurants';
        const docRef = doc(db, collectionName, selectedRestaurant.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRestaurantData({ 
            ...data, 
            id: selectedRestaurant.id,
            _collection: collectionName 
          });
        } else {
          setRestaurantData(selectedRestaurant);
        }
      } catch (err) {
        console.error('Error loading restaurant data:', err);
        setRestaurantData(selectedRestaurant);
      } finally {
        setLoadingRestaurantData(false);
      }
    };
    
    loadRestaurantData();
  }, [selectedRestaurant]);

  const handleSave = async () => {
    if (!selectedRestaurant?.id) {
      alert('No restaurant selected');
      return;
    }

    try {
      setSaving(true);
      const collectionName = selectedRestaurant?._collection || 'restaurants';
      const restaurantId = selectedRestaurant?.id || selectedRestaurant?.docId;
      
      console.log('💾 Saving settings to:', {
        collection: collectionName,
        restaurantId: restaurantId,
        path: `${collectionName}/${restaurantId}/reservationSettings/config`
      });
      
      // ✅ Save ALL settings (including blockedTimeSlots)
      await setDoc(
        doc(db, collectionName, restaurantId, 'reservationSettings', 'config'),
        {
          ...settings,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      
      console.log('✅ All settings saved successfully:', {
        dayIntervals: Object.keys(settings.dayIntervals || {}).length,
        blockedTimeSlots: Object.keys(settings.blockedTimeSlots || {}).length
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('❌ Save error:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Updated tabs - using text labels only, no icons
  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'booking', label: 'Booking' },
    { id: 'menu',    label: 'Menu' },
    { id: 'tables',  label: 'Tables' },
    { id: 'hours',   label: 'Hours' },
    { id: 'opening_hours', label: 'Time Slots' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'display', label: 'Display' },
  ];

  // Responsive tabs - shorter labels on mobile
  const getTabs = () => {
    const isMobile = window.innerWidth < 640;
    return tabs.map(tab => ({
      ...tab,
      label: isMobile && tab.id === 'opening_hours' ? 'Slots' : 
             isMobile && tab.id === 'notifications' ? 'Alerts' :
             isMobile && tab.id === 'display' ? 'View' :
             isMobile && tab.id === 'tables' ? 'Seats' :
             isMobile && tab.id === 'booking' ? 'Book' :
             tab.label
    }));
  };

  const SettingToggle = ({ label, description, settingKey }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setSettings(prev => ({ ...prev, [settingKey]: !prev[settingKey] }))}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          settings[settingKey] ? 'bg-[#fe8a24]' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          settings[settingKey] ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

const SettingNumber = ({ label, description, settingKey, min, max, unit, step = 1 }) => {
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  const change = (dir) => {
    setSettings(prev => {
      const current = prev[settingKey] || min;
      const next = current + dir * step;
      return { ...prev, [settingKey]: Math.min(max, Math.max(min, next)) };
    });
  };

  const startPress = (dir) => {
    change(dir);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => change(dir), 80);
    }, 400);
  };

  const stopPress = () => {
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onMouseDown={() => startPress(-1)}
            onMouseUp={stopPress}
            onMouseLeave={stopPress}
            onTouchStart={() => startPress(-1)}
            onTouchEnd={stopPress}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm sm:text-base transition-colors select-none border-r border-gray-200"
          >−</button>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={settings[settingKey]}
            onChange={(e) => setSettings(prev => ({ ...prev, [settingKey]: parseInt(e.target.value) || min }))}
            className="w-12 sm:w-16 px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 border-0"
          />
          <button
            onMouseDown={() => startPress(1)}
            onMouseUp={stopPress}
            onMouseLeave={stopPress}
            onTouchStart={() => startPress(1)}
            onTouchEnd={stopPress}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm sm:text-base transition-colors select-none border-l border-gray-200"
          >+</button>
        </div>
        {unit && <span className="text-xs text-gray-500 min-w-[30px] sm:min-w-[40px]">{unit}</span>}
      </div>
    </div>
  );
};

  const SettingSelect = ({ label, description, settingKey, options }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <select
        value={settings[settingKey]}
        onChange={(e) => setSettings(prev => ({ ...prev, [settingKey]: parseInt(e.target.value) }))}
        className="px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

const renderGeneralTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label="24-Hour Time Format"
        description="Display times in 24-hour format"
        settingKey="use24HourFormat"
      />
      <SettingNumber
        label="Dining Duration"
        description="Default time for dining"
        settingKey="defaultReservationDuration"
        min={30}
        max={240}
        unit="min"
        step={15}
      />
      <SettingNumber
        label="Table Cleanup"
        description="Time between reservations"
        settingKey="tableCleanupTime"
        min={0}
        max={60}
        unit="min"
      />
<div className="bg-orange-50 rounded-lg p-3 mt-2">
        <p className="text-xs text-gray-600">Total slot time</p>
        <p className="text-lg font-bold text-[#fe8a24]">
          {settings.defaultReservationDuration + settings.tableCleanupTime} min
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Dining + Cleanup
        </p>
      </div>

      {/* Guest-based duration */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <SettingToggle
          label="Guest-Based Duration"
          description="Set different dining durations based on party size"
          settingKey="useGuestBasedDuration"
        />
        {settings.useGuestBasedDuration && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500 mb-3">Define duration (minutes) per guest range. Ranges are evaluated top to bottom — first match wins.</p>
            {(settings.guestDurationRules || [
              { minGuests: 1,  maxGuests: 2,  duration: 90  },
              { minGuests: 3,  maxGuests: 5,  duration: 120 },
              { minGuests: 6,  maxGuests: 8,  duration: 135 },
              { minGuests: 9,  maxGuests: 99, duration: 165 },
            ]).map((rule, idx) => {
              const rules = settings.guestDurationRules || [
                { minGuests: 1,  maxGuests: 2,  duration: 90  },
                { minGuests: 3,  maxGuests: 5,  duration: 120 },
                { minGuests: 6,  maxGuests: 8,  duration: 135 },
                { minGuests: 9,  maxGuests: 99, duration: 165 },
              ];
              const updateRule = (field, value) => {
                const updated = rules.map((r, i) => i === idx ? { ...r, [field]: parseInt(value) || 0 } : r);
                setSettings(prev => ({ ...prev, guestDurationRules: updated }));
              };
              const removeRule = () => {
                const updated = rules.filter((_, i) => i !== idx);
                setSettings(prev => ({ ...prev, guestDurationRules: updated }));
              };
              const hrs = Math.floor(rule.duration / 60);
              const mins = rule.duration % 60;
              return (
                <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-gray-400 text-sm">👤</span>
                    <input
                      type="number" min="1" max="99" value={rule.minGuests}
                      onChange={e => updateRule('minGuests', e.target.value)}
                      className="w-10 sm:w-12 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-400">–</span>
                    <input
                      type="number" min="1" max="99" value={rule.maxGuests}
                      onChange={e => updateRule('maxGuests', e.target.value)}
                      className="w-10 sm:w-12 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-400 hidden sm:inline">guests</span>
                  </div>
                  <span className="text-gray-300 mx-1">→</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                    <span className="text-gray-400 text-sm">🕐</span>
                    <input
                      type="number" min="15" max="480" step="15" value={rule.duration}
                      onChange={e => updateRule('duration', e.target.value)}
                      className="w-14 sm:w-16 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-500">
                      min {hrs > 0 ? `(${hrs}h${mins > 0 ? ` ${mins}m` : ''})` : ''}
                    </span>
                  </div>
                  <button
                    onClick={removeRule}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => {
                const rules = settings.guestDurationRules || [];
                setSettings(prev => ({
                  ...prev,
                  guestDurationRules: [...rules, { minGuests: 1, maxGuests: 10, duration: 120 }]
                }));
              }}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-[#fe8a24] hover:text-[#fe8a24] transition-colors flex items-center justify-center gap-1.5"
            >
              <FiPlus className="w-3.5 h-3.5" /> Add Rule
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1 overflow-x-auto">
              <p className="text-xs text-blue-700 mb-2">
                💡 When enabled, the matching rule overrides the default dining duration above. Cleanup time is still added on top.
              </p>
              <p className="text-xs font-semibold text-blue-800 mb-2">Preview by party size:</p>
              <div className="flex flex-wrap gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10,12].map(g => {
                  const rules = settings.guestDurationRules || [];
                  const match = rules.find(r => g >= (r.minGuests||1) && g <= (r.maxGuests||99));
                  const dur = match ? match.duration : (settings.defaultReservationDuration || 120);
                  const hrs = Math.floor(dur / 60);
                  const mins = dur % 60;
                  const label = hrs > 0 ? `${hrs}h${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
                  const hasMatch = !!match;
                  return (
                    <div key={g} className={`flex flex-col items-center px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs ${
                      hasMatch ? 'bg-white border-blue-300' : 'bg-gray-50 border-gray-200 opacity-50'
                    }`}>
                      <span className="font-bold text-gray-700">{g} pax</span>
                      <span className={`font-semibold ${hasMatch ? 'text-[#fe8a24]' : 'text-gray-400'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <SettingNumber
        label="Advance Booking"
        description="Max days in advance"
        settingKey="maxAdvanceBookingDays"
        min={1}
        max={365}
        unit="days"
      />
      <SettingNumber
        label="Min Notice"
        description="Hours before booking"
        settingKey="minAdvanceBookingHours"
        min={0}
        max={48}
        unit="hrs"
      />
    </div>
);


  const renderBookingTab = () => (
  <div className="space-y-4">
    <div className="bg-blue-50 rounded-lg p-3 mb-2">
      <p className="text-xs font-medium text-blue-800">Public booking page settings</p>
      <p className="text-xs text-blue-600 mt-1">Control what customers see and need to provide</p>
    </div>

    {/* Restaurant Contact Info */}
    <div className="mb-4 pb-4 border-b border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        📞 Contact Info
      </p>
      <p className="text-xs text-gray-400 mb-3">Used in confirmation emails sent to customers</p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Contact Email</label>
          <input
            type="email"
            value={settings.contactEmail || ''}
            onChange={e => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="restaurant@example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">Contact Phone</label>
          <input
            type="tel"
            value={settings.contactPhone || ''}
            onChange={e => setSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
            placeholder="+47 123 456 789"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      </div>
    </div>

    <SettingToggle
      label="Require Full Name"
      description="Make full name mandatory"
      settingKey="requireName"
    />

    <SettingToggle
      label="Require Email"
      description="Make email mandatory"
      settingKey="requireEmail"
    />
    <SettingToggle
      label="Require Phone"
      description="Make phone mandatory"
      settingKey="requirePhone"
    />
    <SettingToggle
      label="Show Company Field"
      description="Display company field"
      settingKey="showCompany"
    />
    <SettingToggle
      label="Show Notes Field"
      description="Allow special requests"
      settingKey="showNotes"
    />
    <SettingNumber
      label="Max Party Size"
      description="Maximum guests per online booking"
      settingKey="maxGuestsOnline"
      min={1}
      max={50}
      unit="guests"
    />
    <SettingNumber
      label="Min Party Size"
      description="Minimum guests allowed"
      settingKey="minGuestsPerReservation"
      min={1}
      max={10}
      unit="guests"
    />
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">Max Party Size</p>
        <p className="text-xs text-gray-500 mt-0.5">Overall maximum — based on largest table</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold text-gray-700 w-12 sm:w-16 text-center">
            {(() => {
              const col = selectedRestaurant?._collection || 'restaurants';
              return settings.maxGuestsPerReservation || '—';
            })()}
          </span>
        </div>
        <span className="text-xs text-gray-500 min-w-[30px] sm:min-w-[40px]">guests</span>
      </div>
    </div>
    <SettingToggle
      label="Block Full Slots"
      description="Prevent bookings when full"
      settingKey="blockFullTimeSlots"
    />
   <SettingToggle
      label="Allow Walk-ins"
      description="Walk-ins without table assignment"
      settingKey="allowWalkInsWithoutTable"
    />

    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎂 Birthday Offer
      </p>
      <SettingToggle
        label="Show Birthday Field"
        description="Ask customers for their birthday"
        settingKey="showBirthdayField"
      />
      {settings.showBirthdayField && (
        <div className="py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-800 mb-1">Birthday Offer Message</p>
          <p className="text-xs text-gray-500 mb-2">Shown above the birthday date picker</p>
          <input
            type="text"
            value={settings.birthdayOfferMessage || ''}
            onChange={e => setSettings(prev => ({ ...prev, birthdayOfferMessage: e.target.value }))}
            placeholder="Would you like a special offer for your birthday?"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      )}
    </div>

    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🍽️ Menu on Booking Page
      </p>
      <SettingToggle
        label="Show Menu on Public Page"
        description="Display your menu below the booking form"
        settingKey="showMenuOnPublicPage"
      />
      {settings.showMenuOnPublicPage && (
        <>
          <SettingNumber
            label="Min Guests to Show Menu"
            description="Menu only appears when party size reaches this number"
            settingKey="menuDisplayMinGuests"
            min={1}
            max={50}
            unit="guests"
          />
          <SettingToggle
            label="Require Group Menu Selection"
            description="Force customers to select a menu item before confirming"
            settingKey="requireGroupMenuSelection"
          />
          {settings.requireGroupMenuSelection && (
            <div className="py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800 mb-1">Requirement Message</p>
              <p className="text-xs text-gray-500 mb-2">Shown when group menu selection is required</p>
              <input
                type="text"
                value={settings.groupMenuRequiredMessage || ''}
                onChange={e => setSettings(prev => ({ ...prev, groupMenuRequiredMessage: e.target.value }))}
                placeholder="Please select your group menu to continue"
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
              />
            </div>
          )}
          <div className="py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 mb-1">Menu Section Title</p>
            <p className="text-xs text-gray-500 mb-2">Heading shown above the menu</p>
            <input
              type="text"
              value={settings.menuDisplayTitle || ''}
              onChange={e => setSettings(prev => ({ ...prev, menuDisplayTitle: e.target.value }))}
              placeholder="Our Menu"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
            />
          </div>
          <div className="py-3">
            <p className="text-sm font-medium text-gray-800 mb-1">Menu Section Subtitle</p>
            <p className="text-xs text-gray-500 mb-2">Shown below the title</p>
            <input
              type="text"
              value={settings.menuDisplaySubtitle || ''}
              onChange={e => setSettings(prev => ({ ...prev, menuDisplaySubtitle: e.target.value }))}
              placeholder="Browse our menu selection for your party"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
            />
          </div>
        </>
      )}
    </div>

    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎉 Reservation Success Page
      </p>
      
      <div className="py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-800 mb-1">Thank You Message</p>
        <p className="text-xs text-gray-500 mb-2">Shown after a successful reservation</p>
        <input
          type="text"
          value={settings.thankYouMessage || ''}
          onChange={e => setSettings(prev => ({ ...prev, thankYouMessage: e.target.value }))}
          placeholder="Thank you for your reservation!"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
        />
      </div>
      
<div className="py-3">
        <p className="text-sm font-medium text-gray-800 mb-1">Restaurant Page URL</p>
        <p className="text-xs text-gray-500 mb-2">Link shown on success page to return to your website</p>
        <input
          type="url"
          value={settings.restaurantPageUrl || ''}
          onChange={e => setSettings(prev => ({ ...prev, restaurantPageUrl: e.target.value }))}
          placeholder="https://your-restaurant.com"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
        />
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎟️ Offer / Campaign Code
      </p>
      <p className="text-xs text-gray-400 mb-3">
        One unified code field for every marketing channel — CRM thank-you emails, Facebook,
        Instagram, Google Ads, flyers/QR codes, or the Dinery App. Links can pre-fill it
        automatically; guests can also type a code in manually.
      </p>
      <SettingToggle
        label="Enable Offer Code Field"
        description="Show an offer code field on the public reservation page"
        settingKey="enableOfferCode"
      />
      {settings.enableOfferCode && (
        <div className="py-3">
          <p className="text-sm font-medium text-gray-800 mb-1">Field Label</p>
          <p className="text-xs text-gray-500 mb-2">Shown above the offer code input</p>
          <input
            type="text"
            value={settings.offerCodeFieldLabel || ''}
            onChange={e => setSettings(prev => ({ ...prev, offerCodeFieldLabel: e.target.value }))}
            placeholder="Have an offer code?"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      )}
    </div>
  </div>
);  

  const renderTablesTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label="Require Table Assignment"
        description="Block if no suitable table"
        settingKey="requireTableAssignment"
      />
      <SettingToggle
        label="Auto-Assign Tables"
        description="Automatic table assignment"
        settingKey="autoAssignTables"
      />
      <SettingToggle
        label="Allow Overbooking"
        description="Allow over capacity (not recommended)"
        settingKey="allowOverbooking"
      />
      <SettingToggle
        label="Show Capacity Warnings"
        description="Alert when party exceeds capacity"
        settingKey="showTableCapacityWarnings"
      />
    </div>
  );

  const renderHoursTab = () => (
    <div className="space-y-4">
      {loadingRestaurantData ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading hours...</p>
        </div>
      ) : (
        (() => {
          const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const dayHoursMap = {};
          (restaurantData?.customHours || []).forEach(slot => {
            slot.days?.forEach(d => {
              if (d.name) {
                dayHoursMap[d.name] = {
                  openTime: slot.openTime || '10:00',
                  closeTime: slot.closeTime || '22:00'
                };
              }
            });
          });
          
          return ALL_DAYS.map((dayName) => {
            const hours = dayHoursMap[dayName];
            const isClosed = !hours;
            const daySettings = settings?.dayIntervals?.[dayName] || { interval: settings?.timeSlotInterval || 30, startOffset: 0, endOffset: 0 };
            
            return (
              <div key={dayName} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{dayName}</h4>
                    <p className="text-xs text-gray-500">
                      {isClosed ? 'Closed' : `${hours.openTime} - ${hours.closeTime}`}
                    </p>
                  </div>
                  {!isClosed && (
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <select
                      value={daySettings?.interval || settings?.timeSlotInterval || 30}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, interval: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                    </select>
                    <p className="text-[10px] text-gray-400 text-left sm:text-right max-w-[200px] leading-tight">
                      Slot Interval: how often time slots are displayed
                    </p>
                  </div>
                  )}
                </div>
                
                {!isClosed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <select
                      value={daySettings.startOffset || 0}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, startOffset: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    >
                      <option value={0}>No start buffer</option>
                      <option value={15}>+15 min buffer</option>
                      <option value={30}>+30 min buffer</option>
                      <option value={60}>+60 min buffer</option>
                    </select>
                    <select
                      value={daySettings.endOffset || 0}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, endOffset: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    >
                      <option value={0}>No end buffer</option>
                      <option value={15}>-15 min buffer</option>
                      <option value={30}>-30 min buffer</option>
                      <option value={60}>-60 min buffer</option>
                    </select>
                  </div>
                )}
                
                {isClosed && (
                  <div className="mt-2 text-center text-xs text-gray-400 bg-gray-50 rounded-lg py-2">
                    Not accepting bookings
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
      
      {(!restaurantData?.customHours || restaurantData.customHours.length === 0) && !loadingRestaurantData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs font-medium text-yellow-800">⚠️ No operating hours set</p>
          <p className="text-xs text-yellow-700 mt-1">
            Please configure restaurant hours in main settings first
          </p>
        </div>
      )}
    </div>
  );

  // ✅ NEW TAB: Opening Hours with Time Slot Toggle Grid
  const renderOpeningHoursTab = () => {
    // Generate time slots for a given day
    const generateTimeSlots = (openTime, closeTime, interval = 15) => {
      const slots = [];
      if (!openTime || !closeTime) return slots;
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      let closeMinutes = closeH * 60 + closeM;
      
      // Handle past-midnight
      if (closeMinutes <= openMinutes) {
        closeMinutes += 24 * 60;
      }
      
      for (let m = openMinutes; m < closeMinutes; m += interval) {
        const actualMin = m % (24 * 60);
        const h = Math.floor(actualMin / 60);
        const min = actualMin % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        slots.push(timeStr);
      }
      
      return slots;
    };
    
    // Toggle a specific time slot on/off
    const toggleTimeSlot = (dayName, timeStr) => {
      const blocked = settings.blockedTimeSlots || {};
      const dayBlocked = blocked[dayName] || [];
      
      let newDayBlocked;
      if (dayBlocked.includes(timeStr)) {
        // Remove from blocked list (turn ON)
        newDayBlocked = dayBlocked.filter(t => t !== timeStr);
      } else {
        // Add to blocked list (turn OFF)
        newDayBlocked = [...dayBlocked, timeStr];
      }
      
      const newBlocked = {
        ...blocked,
        [dayName]: newDayBlocked
      };
      
      setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-4">
          <h3 className="text-sm font-bold text-orange-900 mb-1">🕐 Individual Time Slot Control</h3>
          <p className="text-xs text-orange-700">
            Toggle specific time slots on/off for each day. Green = available, Red = blocked.
          </p>
        </div>

        {loadingRestaurantData ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading hours...</p>
          </div>
        ) : (
          (() => {
            const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayHoursMap = {};
            
            (restaurantData?.customHours || []).forEach(slot => {
              slot.days?.forEach(d => {
                if (d.name && !d.closed) {
                  dayHoursMap[d.name] = {
                    openTime: slot.openTime || '10:00',
                    closeTime: slot.closeTime || '22:00'
                  };
                }
              });
            });
            
            return ALL_DAYS.map((dayName) => {
              const hours = dayHoursMap[dayName];
              const isClosed = !hours;
              const daySettings = settings?.dayIntervals?.[dayName] || { interval: 30, startOffset: 0, endOffset: 0 };
              
              // Generate time slots for this day
              const interval = daySettings?.interval || settings?.timeSlotInterval || 30;
              const startOffset = daySettings?.startOffset || 0;
              const endOffset = daySettings?.endOffset || 0;
              const [oH, oM] = hours.openTime.split(':').map(Number);
              const [cH, cM] = hours.closeTime.split(':').map(Number);
              const effOpenMin = oH * 60 + oM + startOffset;
              const effCloseMin = cH * 60 + cM - endOffset;
              const effOpenTime = `${String(Math.floor(effOpenMin/60)).padStart(2,'0')}:${String(effOpenMin%60).padStart(2,'0')}`;
              const effCloseTime = `${String(Math.floor(effCloseMin/60)).padStart(2,'0')}:${String(effCloseMin%60).padStart(2,'0')}`;
              const timeSlots = !isClosed ? generateTimeSlots(effOpenTime, effCloseTime, interval) : [];
              const blockedSlots = settings.blockedTimeSlots?.[dayName] || [];
              
              return (
                <div 
                  key={dayName} 
                  className={`bg-white rounded-lg border-2 transition-all ${
                    isClosed 
                      ? 'border-gray-200 bg-gray-50/50 p-3 sm:p-4' 
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm sm:text-base ${isClosed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {dayName}
                        </h4>
                        <p className={`text-xs mt-1 ${isClosed ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isClosed ? 'Closed - No bookings accepted' : `Restaurant hours: ${hours.openTime} - ${hours.closeTime}${startOffset || endOffset ? ` (bookings: ${effOpenTime} - ${effCloseTime})` : ''}`}
                        </p>
                      </div>
                      
                      {/* Time interval info */}
                      {!isClosed && (
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-gray-700">
                            {interval} min slots
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {timeSlots.length} total slots
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* ✅ TIME SLOT GRID WITH ON/OFF TOGGLES */}
                  {!isClosed && timeSlots.length > 0 && (
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          📅 Available Time Slots
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-green-700 font-medium">
                            ✓ {timeSlots.length - blockedSlots.length} Available
                          </span>
                          <span className="text-xs text-red-700 font-medium">
                            ✕ {blockedSlots.length} Blocked
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 sm:gap-1.5 max-h-80 overflow-y-auto p-1">
                        {timeSlots.map(timeStr => {
                          const isBlocked = blockedSlots.includes(timeStr);
                          const [h, m] = timeStr.split(':').map(Number);
                          const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          
                          return (
                            <button
                              key={timeStr}
                              onClick={() => toggleTimeSlot(dayName, timeStr)}
                              className={`relative px-1.5 sm:px-2 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold rounded-lg border-2 transition-all shadow-sm hover:shadow-md ${
                                isBlocked
                                  ? 'bg-red-50 border-red-300 text-red-500 line-through hover:bg-red-100'
                                  : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                              }`}
                              title={isBlocked ? 'Click to enable this slot' : 'Click to disable this slot'}
                            >
                              {display}
                              {isBlocked && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center shadow">
                                  <span className="text-white text-[7px] sm:text-[9px] font-bold">✕</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      {/* Quick actions */}
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => {
                            const newBlocked = { ...settings.blockedTimeSlots };
                            newBlocked[dayName] = [];
                            setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
                          }}
                          className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border-2 border-green-300 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                          ✓ Enable All Slots
                        </button>
                        <button
                          onClick={() => {
                            const newBlocked = { ...settings.blockedTimeSlots };
                            newBlocked[dayName] = [...timeSlots];
                            setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
                          }}
                          className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border-2 border-red-300 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                          ✕ Disable All Slots
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Closed state */}
                  {isClosed && (
                    <div className="text-center text-xs text-gray-400 bg-gray-100 rounded-lg py-4">
                      ⚠️ Restaurant is closed on {dayName}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
        
        {(!restaurantData?.customHours || restaurantData.customHours.length === 0) && !loadingRestaurantData && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <p className="text-sm font-bold text-yellow-900 mb-1">⚠️ No operating hours configured</p>
            <p className="text-xs text-yellow-700">
              Please set your restaurant's operating hours in the main settings before configuring time slot availability.
            </p>
          </div>
        )}
        
        {/* Info box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs font-bold text-blue-900 mb-2">💡 How this works</p>
          <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
            <li><span className="font-bold text-green-700">Green slots</span> are available for customer bookings</li>
            <li><span className="font-bold text-red-700">Red crossed slots</span> are blocked and won't appear on booking pages</li>
            <li>Click any time slot to toggle it between available and blocked</li>
            <li>Use "Enable All" or "Disable All" for quick batch changes</li>
            <li>Time slots are based on the interval setting in the "Hours" tab (15/30/60 min)</li>
            <li>Don't forget to click <span className="font-bold text-orange-600">"Save Changes"</span> at the bottom!</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label="Confirmation Email"
        description="Send when booking confirmed"
        settingKey="sendConfirmationEmail"
      />
      <SettingToggle
        label="Reminder Email"
        description="Send before reservation"
        settingKey="sendReminderEmail"
      />
      <SettingNumber
        label="Reminder Time"
        description="Hours before reservation"
        settingKey="reminderHoursBefore"
        min={1}
        max={168}
        unit="hrs"
      />
    </div>
  );

const renderDisplayTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label="Time Bar Start of Hour"
        description="Show hour labels at beginning"
        settingKey="timeBarShowsStartOfHour"
      />
      <SettingToggle
        label="Highlight Current Time"
        description="Show current time indicator"
        settingKey="highlightCurrentTime"
      />
    </div>
  );

  const renderMenuTab = () => (
    <MenuPanel
      restaurantId={selectedRestaurant?.id}
      collectionName={selectedRestaurant?._collection || 'restaurants'}
    />
  );

  // Check if mobile for responsive tabs
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-orange-50 to-white">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">Reservation Settings</h2>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 truncate max-w-[150px] sm:max-w-none">{selectedRestaurant?.name}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 hover:bg-white rounded-full transition-colors flex-shrink-0"
          >
            <FiX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs - Responsive scrolling - TEXT ONLY */}
        <div className="border-b border-gray-200 px-2 sm:px-6 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 sm:gap-1 min-w-max">
            {getTabs().map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-[#fe8a24]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe8a24] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'booking' && renderBookingTab()}
          {activeTab === 'tables' && renderTablesTab()}
          {activeTab === 'hours' && renderHoursTab()}
          {activeTab === 'opening_hours' && renderOpeningHoursTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'display' && renderDisplayTab()}
          {activeTab === 'menu'    && renderMenuTab()}
        </div>

        {/* Footer - Responsive buttons */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 flex-shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-[#fe8a24] hover:bg-[#ff9d47] text-white shadow-sm hover:shadow'
            } disabled:opacity-50`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationSettings;