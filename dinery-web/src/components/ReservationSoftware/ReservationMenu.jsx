// src/components/reservation-software/ReservationMenu.jsx
// Full menu management: categories → subcategories → items
// Multilingual (EN/NO/DA/SE/FI), allergens, attributes, pricing

import React, { useState, useEffect, useRef } from 'react';
import {
  getFirestore, collection, doc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import {
  FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronRight,
  FiChevronLeft, FiX, FiCheck, FiSearch, FiEye, FiEyeOff,
  FiCopy, FiMove, FiAlertCircle, FiTag, FiGrid, FiList,
} from 'react-icons/fi';

const db   = getFirestore();
const auth = getAuth();

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    menuManagement: 'Menu Management',
    categories: 'Categories',
    allItems: 'All Items',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    addItem: 'Add Item',
    editItem: 'Edit Item',
    addMenuItem: 'Add Menu Item',
    editMenuItem: 'Edit Menu Item',
    fillDetails: 'Fill in details for each language',
    language: 'Language:',
    category: 'Category',
    subcategory: 'Subcategory',
    none: '— None —',
    select: '— Select —',
    price: 'Price',
    active: 'Active',
    hidden: 'Hidden',
    minGuests: 'Min Guests',
    maxGuests: 'Max Guests',
    alwaysShow: '0 = always show',
    showWhenAtLeast: 'Show when party is at least this size',
    showWhenAtMost: 'Show when party is at most this size',
    itemName: 'Item Name',
    description: 'Description',
    allergens: 'Allergens',
    selectAllergens: 'Select all allergens present in this item.',
    selectedAllergens: 'Selected allergens:',
    attributes: 'Attributes',
    tagItem: 'Tag this item with dietary and service attributes.',
    selectedAttributes: 'Selected attributes:',
    saveItem: 'Save Item',
    saveCategory: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    delete: 'Delete',
    deleting: 'Deleting…',
    categoryAdded: 'Category added',
    categoryUpdated: 'Category updated',
    itemAdded: 'Item added',
    itemUpdated: 'Item updated',
    itemDeleted: 'Item deleted',
    categoryDeleted: 'Category deleted',
    deleteFailed: 'Delete failed',
    saveFailed: 'Failed to save',
    noItemsYet: 'No menu items yet',
    addFirstItem: 'Click "Add Item" to create your first menu item',
    addFirstItemBtn: 'Add First Item',
    search: 'Search…',
    total: 'total',
    activeCount: 'active',
    hiddenCount: 'hidden',
    categoriesCount: 'categories',
    confirmDelete: 'Delete {type}?',
    confirmDeleteMsg: '"{name}" will be permanently removed.',
    confirmDeleteCategoryMsg: ' All items in this category will also be deleted.',
    edit: 'Edit',
    show: 'Show',
    hide: 'Hide',
    subcategories: 'Subcategories',
    addSubcategory: 'Add subcategory…',
    addSubcategoryBtn: 'Add',
    color: 'Color',
    categoryActive: 'Category active',
    categoryHidden: 'Category hidden',
    guests: 'guests',
    upTo: 'up to',
    content: 'Content',
    back: 'Back',
    name: 'Name',
  },
  fi: {
    menuManagement: 'Ruokalistan hallinta',
    categories: 'Kategoriat',
    allItems: 'Kaikki tuotteet',
    addCategory: 'Lisää kategoria',
    editCategory: 'Muokkaa kategoriaa',
    addItem: 'Lisää tuote',
    editItem: 'Muokkaa tuotetta',
    addMenuItem: 'Lisää ruokalistan tuote',
    editMenuItem: 'Muokkaa ruokalistan tuotetta',
    fillDetails: 'Täytä tiedot jokaisella kielellä',
    language: 'Kieli:',
    category: 'Kategoria',
    subcategory: 'Alakategoria',
    none: '— Ei mitään —',
    select: '— Valitse —',
    price: 'Hinta',
    active: 'Aktiivinen',
    hidden: 'Piilotettu',
    minGuests: 'Min. vieraat',
    maxGuests: 'Max. vieraat',
    alwaysShow: '0 = näytä aina',
    showWhenAtLeast: 'Näytä kun seurue on vähintään tämän kokoinen',
    showWhenAtMost: 'Näytä kun seurue on enintään tämän kokoinen',
    itemName: 'Tuotteen nimi',
    description: 'Kuvaus',
    allergens: 'Allergeenit',
    selectAllergens: 'Valitse kaikki tässä tuotteessa olevat allergeenit.',
    selectedAllergens: 'Valitut allergeenit:',
    attributes: 'Ominaisuudet',
    tagItem: 'Merkitse tuote ruokavalio- ja palveluominaisuuksilla.',
    selectedAttributes: 'Valitut ominaisuudet:',
    saveItem: 'Tallenna tuote',
    saveCategory: 'Tallenna',
    saving: 'Tallennetaan…',
    cancel: 'Peruuta',
    delete: 'Poista',
    deleting: 'Poistetaan…',
    categoryAdded: 'Kategoria lisätty',
    categoryUpdated: 'Kategoria päivitetty',
    itemAdded: 'Tuote lisätty',
    itemUpdated: 'Tuote päivitetty',
    itemDeleted: 'Tuote poistettu',
    categoryDeleted: 'Kategoria poistettu',
    deleteFailed: 'Poisto epäonnistui',
    saveFailed: 'Tallennus epäonnistui',
    noItemsYet: 'Ei vielä ruokalistan tuotteita',
    addFirstItem: 'Napsauta "Lisää tuote" luodaksesi ensimmäisen tuotteen',
    addFirstItemBtn: 'Lisää ensimmäinen tuote',
    search: 'Hae…',
    total: 'yhteensä',
    activeCount: 'aktiivista',
    hiddenCount: 'piilotettua',
    categoriesCount: 'kategoriaa',
    confirmDelete: 'Poista {type}?',
    confirmDeleteMsg: '"{name}" poistetaan pysyvästi.',
    confirmDeleteCategoryMsg: ' Kaikki tämän kategorian tuotteet poistetaan myös.',
    edit: 'Muokkaa',
    show: 'Näytä',
    hide: 'Piilota',
    subcategories: 'Alakategoriat',
    addSubcategory: 'Lisää alakategoria…',
    addSubcategoryBtn: 'Lisää',
    color: 'Väri',
    categoryActive: 'Kategoria aktiivinen',
    categoryHidden: 'Kategoria piilotettu',
    guests: 'vierasta',
    upTo: 'enintään',
    content: 'Sisältö',
    back: 'Takaisin',
    name: 'Nimi',
  },
  no: {
    menuManagement: 'Menystyring',
    categories: 'Kategorier',
    allItems: 'Alle varer',
    addCategory: 'Legg til kategori',
    editCategory: 'Rediger kategori',
    addItem: 'Legg til vare',
    editItem: 'Rediger vare',
    addMenuItem: 'Legg til menyvare',
    editMenuItem: 'Rediger menyvare',
    fillDetails: 'Fyll inn detaljer for hvert språk',
    language: 'Språk:',
    category: 'Kategori',
    subcategory: 'Underkategori',
    none: '— Ingen —',
    select: '— Velg —',
    price: 'Pris',
    active: 'Aktiv',
    hidden: 'Skjult',
    minGuests: 'Min. gjester',
    maxGuests: 'Maks. gjester',
    alwaysShow: '0 = vis alltid',
    showWhenAtLeast: 'Vis når selskapet er minst denne størrelsen',
    showWhenAtMost: 'Vis når selskapet er maks denne størrelsen',
    itemName: 'Varenavn',
    description: 'Beskrivelse',
    allergens: 'Allergener',
    selectAllergens: 'Velg alle allergener som finnes i denne varen.',
    selectedAllergens: 'Valgte allergener:',
    attributes: 'Egenskaper',
    tagItem: 'Merk varen med diett- og serviceegenskaper.',
    selectedAttributes: 'Valgte egenskaper:',
    saveItem: 'Lagre vare',
    saveCategory: 'Lagre',
    saving: 'Lagrer…',
    cancel: 'Avbryt',
    delete: 'Slett',
    deleting: 'Sletter…',
    categoryAdded: 'Kategori lagt til',
    categoryUpdated: 'Kategori oppdatert',
    itemAdded: 'Vare lagt til',
    itemUpdated: 'Vare oppdatert',
    itemDeleted: 'Vare slettet',
    categoryDeleted: 'Kategori slettet',
    deleteFailed: 'Sletting mislyktes',
    saveFailed: 'Lagring mislyktes',
    noItemsYet: 'Ingen menyvarer ennå',
    addFirstItem: 'Klikk "Legg til vare" for å opprette din første menyvare',
    addFirstItemBtn: 'Legg til første vare',
    search: 'Søk…',
    total: 'totalt',
    activeCount: 'aktive',
    hiddenCount: 'skjulte',
    categoriesCount: 'kategorier',
    confirmDelete: 'Slett {type}?',
    confirmDeleteMsg: '"{name}" vil bli permanent fjernet.',
    confirmDeleteCategoryMsg: ' Alle varer i denne kategorien vil også bli slettet.',
    edit: 'Rediger',
    show: 'Vis',
    hide: 'Skjul',
    subcategories: 'Underkategorier',
    addSubcategory: 'Legg til underkategori…',
    addSubcategoryBtn: 'Legg til',
    color: 'Farge',
    categoryActive: 'Kategori aktiv',
    categoryHidden: 'Kategori skjult',
    guests: 'gjester',
    upTo: 'opp til',
    content: 'Innhold',
    back: 'Tilbake',
    name: 'Navn',
  },
  sv: {
    menuManagement: 'Menuhantering',
    categories: 'Kategorier',
    allItems: 'Alla artiklar',
    addCategory: 'Lägg till kategori',
    editCategory: 'Redigera kategori',
    addItem: 'Lägg till artikel',
    editItem: 'Redigera artikel',
    addMenuItem: 'Lägg till menyartikel',
    editMenuItem: 'Redigera menyartikel',
    fillDetails: 'Fyll i detaljer för varje språk',
    language: 'Språk:',
    category: 'Kategori',
    subcategory: 'Underkategori',
    none: '— Ingen —',
    select: '— Välj —',
    price: 'Pris',
    active: 'Aktiv',
    hidden: 'Dold',
    minGuests: 'Min. gäster',
    maxGuests: 'Max. gäster',
    alwaysShow: '0 = visa alltid',
    showWhenAtLeast: 'Visa när sällskapet är minst denna storlek',
    showWhenAtMost: 'Visa när sällskapet är max denna storlek',
    itemName: 'Artikelnamn',
    description: 'Beskrivning',
    allergens: 'Allergener',
    selectAllergens: 'Välj alla allergener som finns i denna artikel.',
    selectedAllergens: 'Valda allergener:',
    attributes: 'Egenskaper',
    tagItem: 'Märk artikeln med diet- och serviceegenskaper.',
    selectedAttributes: 'Valda egenskaper:',
    saveItem: 'Spara artikel',
    saveCategory: 'Spara',
    saving: 'Sparar…',
    cancel: 'Avbryt',
    delete: 'Ta bort',
    deleting: 'Tar bort…',
    categoryAdded: 'Kategori tillagd',
    categoryUpdated: 'Kategori uppdaterad',
    itemAdded: 'Artikel tillagd',
    itemUpdated: 'Artikel uppdaterad',
    itemDeleted: 'Artikel borttagen',
    categoryDeleted: 'Kategori borttagen',
    deleteFailed: 'Borttagning misslyckades',
    saveFailed: 'Spara misslyckades',
    noItemsYet: 'Inga menyartiklar ännu',
    addFirstItem: 'Klicka på "Lägg till artikel" för att skapa din första menyartikel',
    addFirstItemBtn: 'Lägg till första artikel',
    search: 'Sök…',
    total: 'totalt',
    activeCount: 'aktiva',
    hiddenCount: 'dolda',
    categoriesCount: 'kategorier',
    confirmDelete: 'Ta bort {type}?',
    confirmDeleteMsg: '"{name}" kommer att tas bort permanent.',
    confirmDeleteCategoryMsg: ' Alla artiklar i denna kategori kommer också att tas bort.',
    edit: 'Redigera',
    show: 'Visa',
    hide: 'Dölj',
    subcategories: 'Underkategorier',
    addSubcategory: 'Lägg till underkategori…',
    addSubcategoryBtn: 'Lägg till',
    color: 'Färg',
    categoryActive: 'Kategori aktiv',
    categoryHidden: 'Kategori dold',
    guests: 'gäster',
    upTo: 'upp till',
    content: 'Innehåll',
    back: 'Tillbaka',
    name: 'Namn',
  },
  de: {
    menuManagement: 'Menüverwaltung',
    categories: 'Kategorien',
    allItems: 'Alle Artikel',
    addCategory: 'Kategorie hinzufügen',
    editCategory: 'Kategorie bearbeiten',
    addItem: 'Artikel hinzufügen',
    editItem: 'Artikel bearbeiten',
    addMenuItem: 'Menüartikel hinzufügen',
    editMenuItem: 'Menüartikel bearbeiten',
    fillDetails: 'Details für jede Sprache ausfüllen',
    language: 'Sprache:',
    category: 'Kategorie',
    subcategory: 'Unterkategorie',
    none: '— Keine —',
    select: '— Auswählen —',
    price: 'Preis',
    active: 'Aktiv',
    hidden: 'Versteckt',
    minGuests: 'Min. Gäste',
    maxGuests: 'Max. Gäste',
    alwaysShow: '0 = immer anzeigen',
    showWhenAtLeast: 'Anzeigen wenn Gruppe mindestens diese Größe hat',
    showWhenAtMost: 'Anzeigen wenn Gruppe maximal diese Größe hat',
    itemName: 'Artikelname',
    description: 'Beschreibung',
    allergens: 'Allergene',
    selectAllergens: 'Wählen Sie alle Allergene aus, die in diesem Artikel enthalten sind.',
    selectedAllergens: 'Ausgewählte Allergene:',
    attributes: 'Eigenschaften',
    tagItem: 'Markieren Sie den Artikel mit Ernährungs- und Serviceeigenschaften.',
    selectedAttributes: 'Ausgewählte Eigenschaften:',
    saveItem: 'Artikel speichern',
    saveCategory: 'Speichern',
    saving: 'Speichere…',
    cancel: 'Abbrechen',
    delete: 'Löschen',
    deleting: 'Lösche…',
    categoryAdded: 'Kategorie hinzugefügt',
    categoryUpdated: 'Kategorie aktualisiert',
    itemAdded: 'Artikel hinzugefügt',
    itemUpdated: 'Artikel aktualisiert',
    itemDeleted: 'Artikel gelöscht',
    categoryDeleted: 'Kategorie gelöscht',
    deleteFailed: 'Löschen fehlgeschlagen',
    saveFailed: 'Speichern fehlgeschlagen',
    noItemsYet: 'Noch keine Menüartikel',
    addFirstItem: 'Klicken Sie auf "Artikel hinzufügen", um Ihren ersten Menüartikel zu erstellen',
    addFirstItemBtn: 'Ersten Artikel hinzufügen',
    search: 'Suchen…',
    total: 'gesamt',
    activeCount: 'aktiv',
    hiddenCount: 'versteckt',
    categoriesCount: 'Kategorien',
    confirmDelete: '{type} löschen?',
    confirmDeleteMsg: '"{name}" wird dauerhaft entfernt.',
    confirmDeleteCategoryMsg: ' Alle Artikel in dieser Kategorie werden ebenfalls gelöscht.',
    edit: 'Bearbeiten',
    show: 'Anzeigen',
    hide: 'Verstecken',
    subcategories: 'Unterkategorien',
    addSubcategory: 'Unterkategorie hinzufügen…',
    addSubcategoryBtn: 'Hinzufügen',
    color: 'Farbe',
    categoryActive: 'Kategorie aktiv',
    categoryHidden: 'Kategorie versteckt',
    guests: 'Gäste',
    upTo: 'bis zu',
    content: 'Inhalt',
    back: 'Zurück',
    name: 'Name',
  },
};

// ─── Constants ──────────────────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en', label: 'EN', flag: '🇬🇧', name: 'English'    },
  { code: 'no', label: 'NO', flag: '🇳🇴', name: 'Norwegian'  },
  { code: 'da', label: 'DA', flag: '🇩🇰', name: 'Danish'     },
  { code: 'se', label: 'SE', flag: '🇸🇪', name: 'Swedish'    },
  { code: 'fi', label: 'FI', flag: '🇫🇮', name: 'Finnish'    },
];

const ALLERGENS = [
  { id: 'gluten',    label: 'Gluten',      icon: '🌾' },
  { id: 'shellfish', label: 'Shellfish',   icon: '🦐' },
  { id: 'eggs',      label: 'Eggs',        icon: '🥚' },
  { id: 'fish',      label: 'Fish',        icon: '🐟' },
  { id: 'peanuts',   label: 'Peanuts',     icon: '🥜' },
  { id: 'soy',       label: 'Soy',         icon: '🫘' },
  { id: 'milk',      label: 'Milk',        icon: '🥛' },
  { id: 'nuts',      label: 'Nuts',        icon: '🌰' },
  { id: 'celery',    label: 'Celery',      icon: '🥬' },
  { id: 'mustard',   label: 'Mustard',     icon: '🌭' },
  { id: 'sesame',    label: 'Sesame',      icon: '⚪' },
  { id: 'sulphites', label: 'Sulphites',   icon: '🍷' },
  { id: 'lupin',     label: 'Lupin',       icon: '🌼' },
  { id: 'molluscs',  label: 'Molluscs',    icon: '🦪' },
];

const ATTRIBUTES = [
  { id: 'vegan',      label: 'Vegan',       icon: '🌱', color: '#16a34a' },
  { id: 'vegetarian', label: 'Vegetarian',  icon: '🥗', color: '#15803d' },
  { id: 'gluten_free',label: 'Gluten Free', icon: '🚫🌾', color: '#d97706' },
  { id: 'spicy',      label: 'Spicy',       icon: '🌶️', color: '#dc2626' },
  { id: 'halal',      label: 'Halal',       icon: '☪️', color: '#2563eb' },
  { id: 'kosher',     label: 'Kosher',      icon: '✡️', color: '#7c3aed' },
  { id: 'organic',    label: 'Organic',     icon: '🌿', color: '#059669' },
  { id: 'popular',    label: 'Popular',     icon: '⭐', color: '#f59e0b' },
  { id: 'new',        label: 'New',         icon: '🆕', color: '#3b82f6' },
  { id: 'kids',       label: "Kids'",       icon: '👶', color: '#ec4899' },
];

const emptyTranslations = () => Object.fromEntries(LANGUAGES.map(l => [l.code, '']));

const emptyItem = () => ({
  name:         emptyTranslations(),
  description:  emptyTranslations(),
  price:        '',
  category:     '',
  subcategory:  '',
  allergens:    [],
  attributes:   [],
  active:       true,
  sortOrder:    0,
  imageUrl:     '',
  minCapacity:  0,
  maxCapacity:  0,
});
const emptyCategory = () => ({
  name:       emptyTranslations(),
  sortOrder:  0,
  active:     true,
  color:      '#fe8a24',
});

// ─── Allergen badge ──────────────────────────────────────────────────────────
const AllergenBadge = ({ id, small }) => {
  const a = ALLERGENS.find(x => x.id === id);
  if (!a) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${
      small ? 'text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5' : 'text-xs px-1.5 sm:px-2 py-0.5'
    } bg-amber-100 text-amber-800 border border-amber-200`}>
      {a.icon} {!small && a.label}
    </span>
  );
};

const AttributeBadge = ({ id, small }) => {
  const a = ATTRIBUTES.find(x => x.id === id);
  if (!a) return null;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-semibold ${
      small ? 'text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5' : 'text-xs px-1.5 sm:px-2 py-0.5'
    }`} style={{ background: a.color + '20', color: a.color, border: `1px solid ${a.color}40` }}>
      {a.icon} {!small && a.label}
    </span>
  );
};

// ─── Multilingual input ──────────────────────────────────────────────────────
const MultiLangInput = ({ label, value, onChange, multiline, activeLang, t }) => {
  return (
    <div>
      {label && <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>}
      <div className="space-y-1.5">
        {LANGUAGES.map(lang => (
          <div key={lang.code} className={`flex items-start gap-2 ${activeLang !== 'all' && activeLang !== lang.code ? 'hidden' : ''}`}>
            <span className="flex-shrink-0 mt-1 text-xs font-bold text-gray-400 w-5 sm:w-6 text-center">{lang.flag}</span>
            {multiline ? (
              <textarea
                value={value[lang.code] || ''}
                onChange={e => onChange({ ...value, [lang.code]: e.target.value })}
                rows={2}
                placeholder={`${label || t('text')} in ${lang.name}…`}
                className="flex-1 border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] resize-none transition-colors"
              />
            ) : (
              <input
                type="text"
                value={value[lang.code] || ''}
                onChange={e => onChange({ ...value, [lang.code]: e.target.value })}
                placeholder={`${label || t('text')} in ${lang.name}…`}
                className="flex-1 border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] transition-colors"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Item Form Modal ─────────────────────────────────────────────────────────
const ItemModal = ({ item, categories, onSave, onClose, saving, t }) => {
  const [form, setForm]         = useState(item || emptyItem());
  const [activeLang, setActiveLang] = useState('en');
  const [tab, setTab]           = useState('basic');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));
  const toggleArr = (key, val) => setForm(p => ({
    ...p,
    [key]: p[key].includes(val) ? p[key].filter(x => x !== val) : [...p[key], val],
  }));

  const subcats = categories.find(c => c.id === form.category)?.subcategories || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0 gap-2">
          <div className="min-w-0">
            <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
              {item ? t('editMenuItem') : t('addMenuItem')}
            </h3>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{t('fillDetails')}</p>
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-500 flex-shrink-0">
            <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Lang tabs - scrollable */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          <span className="text-[10px] sm:text-xs text-gray-400 mr-1 sm:mr-2 flex-shrink-0">{t('language')}</span>
          <button onClick={() => setActiveLang('all')}
            className={`text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${activeLang === 'all' ? 'bg-[#fe8a24] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#fe8a24]'}`}>
            All
          </button>
          {LANGUAGES.map(l => (
            <button key={l.code} onClick={() => setActiveLang(l.code)}
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${activeLang === l.code ? 'bg-[#fe8a24] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#fe8a24]'}`}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-gray-100 flex-shrink-0 px-3 sm:px-6 overflow-x-auto">
          {[['basic', t('content')],['allergens', t('allergens')],['attributes', t('attributes')]].map(([k,l]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === k ? 'border-[#fe8a24] text-[#fe8a24]' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>{l}</button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5">
          {tab === 'basic' && (
            <>
              {/* Category + Subcategory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">{t('category')}</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]">
                    <option value="">{t('select')}</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name?.en || c.id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">{t('subcategory')}</label>
                  <select value={form.subcategory} onChange={e => set('subcategory', e.target.value)}
                    disabled={subcats.length === 0}
                    className="w-full border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">{t('none')}</option>
                    {subcats.map(s => (
                      <option key={s.id} value={s.id}>{s.name?.en || s.id}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price + Active */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1">{t('price')}</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="0.01" value={form.price}
                      onChange={e => set('price', e.target.value)}
                      placeholder="0.00"
                      className="flex-1 border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
                    <span className="text-xs sm:text-sm text-gray-400 font-medium">,-</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div onClick={() => set('active', !form.active)}
                      className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}>
                      <div className={`absolute top-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <span className="text-xs sm:text-sm text-gray-700">{form.active ? t('active') : t('hidden')}</span>
                  </label>
                </div>
              </div>

              {/* Guest capacity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">👥 {t('minGuests')}</label>
                  <input type="number" min="0" max="999" value={form.minCapacity || ''}
                    onChange={e => set('minCapacity', parseInt(e.target.value) || 0)}
                    placeholder={t('alwaysShow')}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#fe8a24] focus:ring-2 focus:ring-[#fe8a24]/20 transition-all" />
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('showWhenAtLeast')}</p>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1 sm:mb-2">👥 {t('maxGuests')}</label>
                  <input type="number" min="0" max="999" value={form.maxCapacity || ''}
                    onChange={e => set('maxCapacity', parseInt(e.target.value) || 0)}
                    placeholder={t('alwaysShow')}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base focus:outline-none focus:border-[#fe8a24] focus:ring-2 focus:ring-[#fe8a24]/20 transition-all" />
                  <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('showWhenAtMost')}</p>
                </div>
              </div>

              {/* Name */}
              <MultiLangInput label={`📛 ${t('itemName')}`} value={form.name} onChange={v => set('name', v)} activeLang={activeLang} t={t} />

              {/* Description */}
              <MultiLangInput label={t('description')} value={form.description} onChange={v => set('description', v)} multiline activeLang={activeLang} t={t} />
            </>
          )}

          {tab === 'allergens' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{t('selectAllergens')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {ALLERGENS.map(a => {
                  const active = form.allergens.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleArr('allergens', a.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border-2 text-[10px] sm:text-sm font-medium transition-all ${
                        active ? 'border-amber-400 bg-amber-50 text-amber-800' : 'border-gray-200 text-gray-600 hover:border-amber-300'
                      }`}>
                      <span className="text-xs sm:text-base">{a.icon}</span>
                      <span className="truncate">{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-auto text-amber-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
              {form.allergens.length > 0 && (
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-[10px] sm:text-xs font-semibold text-amber-700 mb-1.5 sm:mb-2">{t('selectedAllergens')}</p>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {form.allergens.map(id => <AllergenBadge key={id} id={id} />)}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'attributes' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">{t('tagItem')}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                {ATTRIBUTES.map(a => {
                  const active = form.attributes.includes(a.id);
                  return (
                    <button key={a.id} onClick={() => toggleArr('attributes', a.id)}
                      className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl border-2 text-[10px] sm:text-sm font-medium transition-all`}
                      style={{
                        borderColor: active ? a.color : '#e5e7eb',
                        background: active ? a.color + '15' : 'white',
                        color: active ? a.color : '#4b5563',
                      }}>
                      <span className="text-xs sm:text-base">{a.icon}</span>
                      <span className="truncate">{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-auto flex-shrink-0" style={{ color: a.color }} />}
                    </button>
                  );
                })}
              </div>
              {form.attributes.length > 0 && (
                <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">{t('selectedAttributes')}</p>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    {form.attributes.map(id => <AttributeBadge key={id} id={id} />)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="text-[10px] sm:text-xs text-gray-400 truncate">
            {form.category && `${categories.find(c=>c.id===form.category)?.name?.en || ''}`}
            {form.subcategory && ` › ${categories.find(c=>c.id===form.category)?.subcategories?.find(s=>s.id===form.subcategory)?.name?.en || ''}`}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={onClose} className="px-3 sm:px-5 py-1.5 sm:py-2 border border-gray-200 text-gray-600 rounded-lg text-[10px] sm:text-sm hover:bg-gray-50">
              {t('cancel')}
            </button>
            <button onClick={() => onSave(form)} disabled={saving}
              className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-lg text-[10px] sm:text-sm font-semibold disabled:opacity-50 transition-colors">
              {saving ? <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" />}
              {saving ? t('saving') : t('saveItem')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Category Form Modal ─────────────────────────────────────────────────────
const CategoryModal = ({ category, onSave, onClose, saving, t }) => {
  const [form, setForm] = useState(category || emptyCategory());
  const [activeLang, setActiveLang] = useState('en');
  const [newSubName, setNewSubName] = useState('');

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const addSubcategory = () => {
    if (!newSubName.trim()) return;
    const sub = { id: Date.now().toString(), name: { ...emptyTranslations(), en: newSubName.trim() }, active: true };
    setForm(p => ({ ...p, subcategories: [...(p.subcategories || []), sub] }));
    setNewSubName('');
  };

  const removeSubcategory = (id) => {
    setForm(p => ({ ...p, subcategories: (p.subcategories || []).filter(s => s.id !== id) }));
  };

  const COLORS = ['#fe8a24','#ef4444','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#64748b','#1e293b'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm sm:text-lg font-bold text-gray-900">{category ? t('editCategory') : t('addCategory')}</h3>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-500"><FiX className="w-4 h-4 sm:w-5 sm:h-5" /></button>
        </div>

        {/* Lang selector */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-6 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {['all', ...LANGUAGES.map(l => l.code)].map(code => {
            const lang = LANGUAGES.find(l => l.code === code);
            return (
              <button key={code} onClick={() => setActiveLang(code)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-lg font-semibold transition-all whitespace-nowrap ${activeLang === code ? 'bg-[#fe8a24] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#fe8a24]'}`}>
                {code === 'all' ? 'All' : `${lang?.flag} ${lang?.label}`}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4 sm:space-y-5">
          {/* Color */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">{t('color')}</label>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {COLORS.map(col => (
                <button key={col} onClick={() => set('color', col)}
                  className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg transition-all ${form.color === col ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: col }} />
              ))}
              <label className="cursor-pointer">
                <input type="color" value={form.color} onChange={e => set('color', e.target.value)}
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border border-gray-200 cursor-pointer" />
              </label>
            </div>
          </div>

          {/* Name */}
          <MultiLangInput label={t('name')} value={form.name} onChange={v => set('name', v)} activeLang={activeLang} t={t} />

          {/* Active toggle */}
          <label className="flex items-center gap-2 sm:gap-3 cursor-pointer">
            <div onClick={() => set('active', !form.active)}
              className={`w-10 sm:w-11 h-5 sm:h-6 rounded-full transition-colors relative ${form.active ? 'bg-green-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-4 sm:w-5 h-4 sm:h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-5 sm:translate-x-5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">{form.active ? t('categoryActive') : t('categoryHidden')}</span>
          </label>

          {/* Subcategories */}
          <div>
            <label className="block text-[10px] sm:text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">{t('subcategories')}</label>
            <div className="space-y-1 sm:space-y-1.5 mb-2">
              {(form.subcategories || []).map(sub => (
                <div key={sub.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                  <span className="flex-1 text-xs sm:text-sm text-gray-700 truncate">{sub.name?.en || sub.id}</span>
                  <button onClick={() => removeSubcategory(sub.id)} className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                    <FiX className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input type="text" value={newSubName} onChange={e => setNewSubName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSubcategory()}
                placeholder={t('addSubcategory')}
                className="flex-1 border border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
              <button onClick={addSubcategory} disabled={!newSubName.trim()}
                className="px-2 sm:px-3 py-1.5 sm:py-2 bg-[#fe8a24] text-white rounded-lg text-[10px] sm:text-sm font-semibold disabled:opacity-40 hover:bg-[#ff9d47] transition-colors whitespace-nowrap">
                {t('addSubcategoryBtn')}
              </button>
            </div>
          </div>
        </div>

        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 flex items-center justify-end gap-2 sm:gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-5 py-1.5 sm:py-2 border border-gray-200 text-gray-600 rounded-lg text-[10px] sm:text-sm hover:bg-gray-50">{t('cancel')}</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-lg text-[10px] sm:text-sm font-semibold disabled:opacity-50 transition-colors">
            {saving ? <span className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" />}
            {saving ? t('saving') : t('saveCategory')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ReservationMenu({ selectedRestaurant, onClose }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  // ── Translation helper ────────────────────────────────────────────────────────
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  // ── Listen for language changes ──────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [categories, setCategories]   = useState([]);
  const [menuItems,  setMenuItems]    = useState([]);
  const [loading,    setLoading]      = useState(true);
  const [saving,     setSaving]       = useState(false);
  const [toast,      setToast]        = useState(null);

  // UI state
  const [selectedCat,    setSelectedCat]    = useState(null);
  const [selectedSubcat, setSelectedSubcat] = useState(null);
  const [searchQ,        setSearchQ]        = useState('');
  const [viewLang,       setViewLang]       = useState('en');
  const [viewLayout,     setViewLayout]     = useState('list');
  const [expandedCats,   setExpandedCats]   = useState({});

  // Modal state
  const [itemModal,   setItemModal]   = useState(null);
  const [catModal,    setCatModal]    = useState(null);
  const [deleteConf,  setDeleteConf]  = useState(null);

  const rid = selectedRestaurant?.id;
  const col = selectedRestaurant?._collection || 'restaurants';

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!rid) return;
    setLoading(true);

    const loadAll = async () => {
      try {
        console.log('🍽️ ReservationMenu loading from:', `${col}/${rid}/menuCategories`);
        const [catSnap, itemSnap] = await Promise.all([
          getDocs(collection(db, col, rid, 'menuCategories')),
          getDocs(collection(db, col, rid, 'menuItems')),
        ]);
        console.log('✅ Loaded:', catSnap.size, 'categories,', itemSnap.size, 'items');
        const cats  = catSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const items = itemSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        setCategories(cats);
        setMenuItems(items);
        if (cats.length > 0) setSelectedCat(cats[0].id);
        setExpandedCats({ [cats[0]?.id]: true });
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    loadAll();
  }, [rid]);

  // ── Save category ─────────────────────────────────────────────────────────
  const saveCategory = async (form) => {
    setSaving(true);
    try {
      const data = {
        ...form,
        updatedAt: serverTimestamp(),
      };
      if (catModal === 'add') {
        data.createdAt = serverTimestamp();
        data.sortOrder = categories.length;
        console.log('💾 Saving category to:', `${col}/${rid}/menuCategories`);
        const ref = await addDoc(collection(db, col, rid, 'menuCategories'), data);
        setCategories(p => [...p, { id: ref.id, ...data }]);
        showToast(t('categoryAdded'));
      } else {
        await updateDoc(doc(db, col, rid, 'menuCategories', catModal.id), data);
        setCategories(p => p.map(c => c.id === catModal.id ? { ...c, ...data } : c));
        showToast(t('categoryUpdated'));
      }
      setCatModal(null);
    } catch(e) { showToast(t('saveFailed'), 'error'); console.error(e); }
    finally { setSaving(false); }
  };

  // ── Save item ─────────────────────────────────────────────────────────────
  const saveItem = async (form) => {
    setSaving(true);
    try {
      const data = { ...form, updatedAt: serverTimestamp() };
      if (itemModal === 'add') {
        data.createdAt = serverTimestamp();
        data.sortOrder = menuItems.filter(i => i.category === form.category).length;
        console.log('💾 Saving item to:', `${col}/${rid}/menuItems`);
        const ref = await addDoc(collection(db, col, rid, 'menuItems'), data);
        setMenuItems(p => [...p, { id: ref.id, ...data }]);
        showToast(t('itemAdded'));
      } else {
        await updateDoc(doc(db, col, rid, 'menuItems', itemModal.id), data);
        setMenuItems(p => p.map(i => i.id === itemModal.id ? { ...i, ...data } : i));
        showToast(t('itemUpdated'));
      }
      setItemModal(null);
    } catch(e) { showToast(t('saveFailed'), 'error'); console.error(e); }
    finally { setSaving(false); }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteConf) return;
    setSaving(true);
    try {
      if (deleteConf.type === 'item') {
        await deleteDoc(doc(db, col, rid, 'menuItems', deleteConf.id));
        setMenuItems(p => p.filter(i => i.id !== deleteConf.id));
        showToast(t('itemDeleted'));
      } else {
        await deleteDoc(doc(db, col, rid, 'menuCategories', deleteConf.id));
        setCategories(p => p.filter(c => c.id !== deleteConf.id));
        setMenuItems(p => p.filter(i => i.category !== deleteConf.id));
        if (selectedCat === deleteConf.id) setSelectedCat(null);
        showToast(t('categoryDeleted'));
      }
      setDeleteConf(null);
    } catch(e) { showToast(t('deleteFailed'), 'error'); }
    finally { setSaving(false); }
  };

  // ── Toggle item active ────────────────────────────────────────────────────
  const toggleItemActive = async (item) => {
    try {
      await updateDoc(doc(db, col, rid, 'menuItems', item.id), { active: !item.active });
      setMenuItems(p => p.map(i => i.id === item.id ? { ...i, active: !i.active } : i));
    } catch(e) { console.error(e); }
  };

  // ── Filtered items ────────────────────────────────────────────────────────
  const filteredItems = menuItems.filter(item => {
    if (selectedCat && item.category !== selectedCat) return false;
    if (selectedSubcat && item.subcategory !== selectedSubcat) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const name = Object.values(item.name || {}).join(' ').toLowerCase();
      const desc = Object.values(item.description || {}).join(' ').toLowerCase();
      if (!name.includes(q) && !desc.includes(q)) return false;
    }
    return true;
  });

  const activeCat = categories.find(c => c.id === selectedCat);
  const activeSubcats = activeCat?.subcategories || [];

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-gray-50">
      <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-[#fe8a24]" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-1 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[98vh] sm:h-[90vh] flex flex-col overflow-hidden">

        {/* ── Top header ── */}
        <div className="flex flex-wrap items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0 gap-2"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#fe8a24] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-base sm:text-xl">🍽️</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-lg font-bold text-white truncate">{t('menuManagement')}</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 truncate">{selectedRestaurant?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Language switcher - scrollable on mobile */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-white/10 rounded-lg p-0.5 sm:p-1 overflow-x-auto max-w-[120px] sm:max-w-none">
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => setViewLang(l.code)}
                  className={`text-[8px] sm:text-xs px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-md font-semibold transition-all whitespace-nowrap ${viewLang === l.code ? 'bg-[#fe8a24] text-white' : 'text-slate-300 hover:text-white'}`}>
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors">
              <FiX className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden min-h-0">

          {/* ── Left sidebar: Categories ── */}
          <div className="w-full sm:w-60 flex-shrink-0 border-b sm:border-b-0 sm:border-r border-gray-200 flex flex-col bg-gray-50 max-h-[200px] sm:max-h-none">
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider">{t('categories')}</span>
              <button onClick={() => setCatModal('add')}
                className="w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-[#fe8a24] text-white flex items-center justify-center hover:bg-[#ff9d47] transition-colors" title={t('addCategory')}>
                <FiPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-1 sm:py-2">
              {/* All items option */}
              <button
                onClick={() => { setSelectedCat(null); setSelectedSubcat(null); }}
                className={`w-full text-left px-3 sm:px-4 py-1.5 sm:py-2.5 text-[10px] sm:text-sm font-semibold transition-colors flex items-center justify-between ${
                  !selectedCat ? 'bg-[#fe8a24]/10 text-[#fe8a24]' : 'text-gray-600 hover:bg-gray-100'
                }`}>
                <span>{t('allItems')}</span>
                <span className="text-[8px] sm:text-xs bg-gray-200 text-gray-600 px-1 sm:px-1.5 py-0.5 rounded-full">{menuItems.length}</span>
              </button>

              {categories.map(cat => {
                const count = menuItems.filter(i => i.category === cat.id).length;
                const isSelected = selectedCat === cat.id;
                const isExpanded = expandedCats[cat.id];
                const hasSubs = (cat.subcategories || []).length > 0;

                return (
                  <div key={cat.id}>
                    <div
                      className={`group flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-white border-r-2 text-gray-900' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      style={isSelected ? { borderRightColor: cat.color || '#fe8a24' } : {}}
                      onClick={() => { setSelectedCat(cat.id); setSelectedSubcat(null); }}
                    >
                      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                        {hasSubs && (
                          <button onClick={e => { e.stopPropagation(); setExpandedCats(p => ({ ...p, [cat.id]: !p[cat.id] })); }}
                            className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            {isExpanded ? <FiChevronDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : <FiChevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                          </button>
                        )}
                        {!hasSubs && <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || '#fe8a24' }} />}
                        <span className="text-[10px] sm:text-sm font-semibold truncate">{cat.name?.[viewLang] || cat.name?.en || 'Unnamed'}</span>
                        {!cat.active && <FiEyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />}
                      </div>
                      <div className="flex items-center gap-0.5 sm:gap-1">
                        <span className="text-[8px] sm:text-xs text-gray-400">{count}</span>
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                          <button onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                            className="p-0.5 hover:text-[#fe8a24] text-gray-400 transition-colors" title={t('edit')}>
                            <FiEdit2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); setDeleteConf({ type: 'category', id: cat.id, name: cat.name?.en || 'this category' }); }}
                            className="p-0.5 hover:text-red-500 text-gray-400 transition-colors" title={t('delete')}>
                            <FiTrash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Subcategories */}
                    {isExpanded && hasSubs && (cat.subcategories || []).map(sub => (
                      <button key={sub.id}
                        onClick={() => { setSelectedCat(cat.id); setSelectedSubcat(sub.id); }}
                        className={`w-full text-left pl-6 sm:pl-10 pr-3 sm:pr-4 py-1 sm:py-2 text-[10px] sm:text-sm transition-colors flex items-center justify-between ${
                          selectedSubcat === sub.id ? 'text-[#fe8a24] bg-orange-50' : 'text-gray-500 hover:bg-gray-100'
                        }`}>
                        <span className="truncate">{sub.name?.[viewLang] || sub.name?.en}</span>
                        <span className="text-[8px] sm:text-xs text-gray-400">
                          {menuItems.filter(i => i.subcategory === sub.id).length}
                        </span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Main content: Items ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

            {/* Items toolbar */}
            <div className="px-2 sm:px-5 py-2 sm:py-3 border-b border-gray-200 flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 bg-white">
              {/* Breadcrumb */}
              <div className="flex items-center gap-0.5 sm:gap-1 text-[10px] sm:text-sm font-semibold text-gray-700 min-w-0 flex-1">
                {activeCat ? (
                  <>
                    <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0" style={{ background: activeCat.color || '#fe8a24' }} />
                    <span className="truncate">{activeCat.name?.[viewLang] || activeCat.name?.en}</span>
                    {selectedSubcat && (
                      <>
                        <span className="text-gray-400 mx-0.5 sm:mx-1">›</span>
                        <span className="truncate text-gray-500">
                          {activeSubcats.find(s => s.id === selectedSubcat)?.name?.[viewLang] || ''}
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  <span>{t('allItems')}</span>
                )}
                <span className="ml-1 sm:ml-2 text-[8px] sm:text-xs font-normal text-gray-400 bg-gray-100 px-1 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                  {filteredItems.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-auto">
                {/* Search */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-1.5 sm:px-3 py-1 sm:py-1.5">
                  <FiSearch className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400" />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                    placeholder={t('search')}
                    className="bg-transparent text-[10px] sm:text-sm text-gray-700 focus:outline-none w-16 sm:w-36 placeholder-gray-400" />
                  {searchQ && <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600"><FiX className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>}
                </div>

                {/* Layout toggle */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button onClick={() => setViewLayout('list')}
                    className={`p-1 sm:p-1.5 ${viewLayout === 'list' ? 'bg-[#fe8a24] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <FiList className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                  <button onClick={() => setViewLayout('grid')}
                    className={`p-1 sm:p-1.5 ${viewLayout === 'grid' ? 'bg-[#fe8a24] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                    <FiGrid className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>

                {/* Add item */}
                <button onClick={() => setItemModal('add')}
                  className="flex items-center gap-1 sm:gap-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-colors">
                  <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">{t('addItem')}</span>
                </button>
              </div>
            </div>

            {/* Items list/grid */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-4">
              {filteredItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 sm:mb-4 text-2xl sm:text-3xl">🍽️</div>
                  <p className="text-xs sm:text-base text-gray-600 font-semibold">{t('noItemsYet')}</p>
                  <p className="text-[10px] sm:text-sm text-gray-400 mt-1">{t('addFirstItem')}</p>
                  <button onClick={() => setItemModal('add')}
                    className="mt-3 sm:mt-4 flex items-center gap-2 bg-[#fe8a24] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-semibold hover:bg-[#ff9d47] transition-colors">
                    <FiPlus className="w-3 h-3 sm:w-4 sm:h-4" /> {t('addFirstItemBtn')}
                  </button>
                </div>
              ) : viewLayout === 'list' ? (
                // ── List view ──
                <div className="space-y-1.5">
                  {/* Header row - hidden on mobile */}
                  <div className="hidden sm:grid px-4 py-2 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider"
                    style={{ gridTemplateColumns: '1fr 80px 160px 160px auto' }}>
                    <span>{t('name')}</span>
                    <span>{t('price')}</span>
                    <span>{t('allergens')}</span>
                    <span>{t('attributes')}</span>
                    <span></span>
                  </div>
                  {filteredItems.map(item => {
                    const cat = categories.find(c => c.id === item.category);
                    const nameStr = item.name?.[viewLang] || item.name?.en || 'Unnamed';
                    const descStr = item.description?.[viewLang] || item.description?.en || '';
                    return (
                      <div key={item.id}
                        className={`grid grid-cols-1 sm:grid-cols-[1fr,80px,160px,160px,auto] items-start sm:items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border transition-all hover:shadow-sm cursor-pointer group gap-1.5 sm:gap-0 ${
                          item.active ? 'bg-white border-gray-200 hover:border-[#fe8a24]/30' : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                        onClick={() => setItemModal(item)}
                      >
                        {/* Name + desc */}
                        <div className="min-w-0 pr-0 sm:pr-3">
                          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            {cat && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" style={{ background: cat.color || '#fe8a24' }} />}
                            <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{nameStr}</span>
                            {!item.active && <FiEyeOff className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-gray-400 flex-shrink-0" />}
                          </div>
                          {descStr && <p className="text-[10px] sm:text-sm text-gray-500 truncate mt-0.5 sm:mt-1 ml-1 sm:ml-3">{descStr}</p>}
                          {(item.minCapacity > 0 || item.maxCapacity > 0) && (
                            <p className="text-[8px] sm:text-xs text-blue-500 mt-0.5 ml-1 sm:ml-3">
                              👥 {item.minCapacity > 0 && item.maxCapacity > 0
                                ? `${item.minCapacity}–${item.maxCapacity} ${t('guests')}`
                                : item.minCapacity > 0
                                ? `${item.minCapacity}+ ${t('guests')}`
                                : `${t('upTo')} ${item.maxCapacity} ${t('guests')}`}
                            </p>
                          )}
                        </div>

                        {/* Price */}
                        <div className="text-xs sm:text-sm font-bold text-gray-800">
                          {item.price ? `${item.price},-` : <span className="text-gray-300">—</span>}
                        </div>

                        {/* Allergens */}
                        <div className="flex flex-wrap gap-0.5 sm:gap-1">
                          {(item.allergens || []).slice(0, 4).map(id => <AllergenBadge key={id} id={id} small />)}
                          {(item.allergens || []).length > 4 && (
                            <span className="text-[8px] sm:text-[10px] text-gray-400">+{item.allergens.length - 4}</span>
                          )}
                        </div>

                        {/* Attributes */}
                        <div className="flex flex-wrap gap-0.5 sm:gap-1">
                          {(item.attributes || []).slice(0, 3).map(id => <AttributeBadge key={id} id={id} small />)}
                          {(item.attributes || []).length > 3 && (
                            <span className="text-[8px] sm:text-[10px] text-gray-400">+{item.attributes.length - 3}</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity justify-end sm:justify-start" onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleItemActive(item)} title={item.active ? t('hide') : t('show')}
                            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            {item.active ? <FiEye className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <FiEyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                          </button>
                          <button onClick={() => setItemModal(item)}
                            className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#fe8a24] transition-colors" title={t('edit')}>
                            <FiEdit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                          <button onClick={() => setDeleteConf({ type: 'item', id: item.id, name: nameStr })}
                            className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title={t('delete')}>
                            <FiTrash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // ── Grid view ──
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredItems.map(item => {
                    const cat = categories.find(c => c.id === item.category);
                    const nameStr = item.name?.[viewLang] || item.name?.en || 'Unnamed';
                    const descStr = item.description?.[viewLang] || item.description?.en || '';
                    return (
                      <div key={item.id}
                        className={`rounded-xl border overflow-hidden group cursor-pointer hover:shadow-md transition-all ${
                          item.active ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                        }`}
                        onClick={() => setItemModal(item)}
                      >
                        {/* Color bar */}
                        <div className="h-1 sm:h-1.5" style={{ background: cat?.color || '#fe8a24' }} />
                        <div className="p-2 sm:p-4">
                          <div className="flex items-start justify-between gap-1 sm:gap-2 mb-1">
                            <p className="text-[10px] sm:text-sm font-bold text-gray-900 leading-tight truncate">{nameStr}</p>
                            <span className="text-[10px] sm:text-sm font-bold text-[#fe8a24] flex-shrink-0">
                              {item.price ? `${item.price},-` : ''}
                            </span>
                          </div>
                          {descStr && <p className="text-[8px] sm:text-xs text-gray-400 line-clamp-2 mb-1.5 sm:mb-2">{descStr}</p>}
                          <div className="flex flex-wrap gap-0.5 sm:gap-1 mt-auto">
                            {(item.attributes || []).slice(0, 2).map(id => <AttributeBadge key={id} id={id} small />)}
                            {(item.allergens || []).slice(0, 2).map(id => <AllergenBadge key={id} id={id} small />)}
                            {((item.attributes || []).length + (item.allergens || []).length) > 4 && (
                              <span className="text-[8px] sm:text-[10px] text-gray-400">+...</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 mt-1.5 sm:mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setItemModal(item)}
                              className="flex-1 text-[8px] sm:text-xs py-0.5 sm:py-1 bg-gray-100 hover:bg-[#fe8a24] hover:text-white text-gray-600 rounded-lg transition-colors font-medium">
                              {t('edit')}
                            </button>
                            <button onClick={() => setDeleteConf({ type: 'item', id: item.id, name: nameStr })}
                              className="p-0.5 sm:p-1 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title={t('delete')}>
                              <FiTrash2 className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer stats */}
            <div className="px-2 sm:px-5 py-1.5 sm:py-2 border-t border-gray-100 flex flex-wrap items-center gap-2 sm:gap-4 bg-gray-50 flex-shrink-0">
              <span className="text-[8px] sm:text-xs text-gray-400 flex-wrap">
                <span className="font-semibold text-gray-600">{menuItems.length}</span> {t('total')} ·{' '}
                <span className="font-semibold text-green-600">{menuItems.filter(i=>i.active).length}</span> {t('activeCount')} ·{' '}
                <span className="font-semibold text-gray-400">{menuItems.filter(i=>!i.active).length}</span> {t('hiddenCount')}
              </span>
              <span className="text-[8px] sm:text-xs text-gray-400">
                <span className="font-semibold text-gray-600">{categories.length}</span> {t('categoriesCount')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2 sm:py-3 rounded-2xl shadow-2xl text-[10px] sm:text-sm font-semibold max-w-[90vw] ${
          toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
        }`}>
          {toast.type === 'error' ? <FiAlertCircle className="w-3 h-3 sm:w-4 sm:h-4" /> : <FiCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />}
          <span className="truncate">{toast.msg}</span>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteConf && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConf(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-11/12 max-w-sm mx-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <FiTrash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 text-center mb-1">
              {t('confirmDelete').replace('{type}', deleteConf.type === 'item' ? t('item') : t('category'))}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-5">
              {t('confirmDeleteMsg').replace('{name}', deleteConf.name)}
              {deleteConf.type === 'category' && t('confirmDeleteCategoryMsg')}
            </p>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => setDeleteConf(null)}
                className="flex-1 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-600 hover:bg-gray-50">
                {t('cancel')}
              </button>
              <button onClick={confirmDelete} disabled={saving}
                className="flex-1 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category Modal ── */}
      {catModal && (
        <CategoryModal
          category={catModal === 'add' ? null : catModal}
          onSave={saveCategory}
          onClose={() => setCatModal(null)}
          saving={saving}
          t={t}
        />
      )}

      {/* ── Item Modal ── */}
      {itemModal && (
        <ItemModal
          item={itemModal === 'add' ? null : itemModal}
          categories={categories}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
          saving={saving}
          t={t}
        />
      )}
    </div>
  );
}