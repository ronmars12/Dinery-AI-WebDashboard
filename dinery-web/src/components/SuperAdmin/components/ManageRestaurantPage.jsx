import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { firestore } from "../../../firebase";
import { FiClock, FiMapPin, FiPhone, FiPlus, FiHelpCircle } from "react-icons/fi";
import { MdRestaurant } from "react-icons/md";

export default function ManageRestaurantPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [ownersMap, setOwnersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [showAutoApproveHelp, setShowAutoApproveHelp] = useState(false);

  // NEW: per-row busy state for restaurant_activation toggle
  const [activationBusyId, setActivationBusyId] = useState(null);

  // Modal state for viewing custom hours
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [hoursModalTitle, setHoursModalTitle] = useState("");
  const [hoursData, setHoursData] = useState([]);

  // 🔁 Global Auto-Approve switch state
  const [autoApproved, setAutoApproved] = useState(false);
  const [autoApprovedLoading, setAutoApprovedLoading] = useState(true);

  // 🔸 NEW: Pagination state (client-side)
  const [currentPage, setCurrentPage] = useState(1); // 1-indexed
  const pageSize = 6; // show 6 per page

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const i18n = {
    en: {
      restaurantManagement: 'Restaurant Management',
      restaurantManagementDesc: 'Manage all restaurants in your platform. Add, edit, or remove restaurants as needed.',
      searchRestaurants: 'Search restaurants...',
      autoApprove: 'Auto Approve',
      autoApproveHelp: 'This will auto-approve all registered restaurants automatically.',
      autoApproveToggleTitle: 'Toggle global auto approve for new restaurants',
      noRestaurantsFound: 'No restaurants found',
      tryDifferentSearch: 'Try a different search term',
      addFirstRestaurant: 'Add your first restaurant to get started',
      addRestaurant: 'Add Restaurant',
      viewCustomHours: 'View Custom Hours',
      approve: 'Approve',
      activate: 'Activate',
      deactivate: 'Deactivate',
      alreadyActive: 'Already active',
      activateRestaurantTitle: 'Activate restaurant',
      approveRegistrationTitle: 'Approve this restaurant registration',
      approveFirstBeforeDeactivating: 'Approve first before deactivating',
      alreadyInactive: 'Already inactive',
      inactiveBadge: 'Inactive',
      locationNotSpecified: 'Location not specified',
      owner: 'Owner',
      email: 'Email',
      orgShort: 'Org #:',
      showing: 'Showing',
      of: 'of',
      prev: 'Prev',
      next: 'Next',
      day: 'Day',
      maxGuests: 'Max Guests',
      autoApproved: 'Auto Approved',
      yes: 'Yes',
      no: 'No',
      noCustomHoursConfigured: 'No custom hours configured.',
      close: 'Close',
      unknownType: 'Unknown',
      contactPerson: 'Contact Person',
      Eng: 'Eng', Fin: 'Fin', Nor: 'Nor', Swed: 'Swed', Ger: 'Ger',
    },
    fi: {
      restaurantManagement: 'Ravintoloiden hallinta',
      restaurantManagementDesc: 'Hallitse alustasi ravintoloita. Lisää, muokkaa tai poista tarpeen mukaan.',
      searchRestaurants: 'Hae ravintoloita...',
      autoApprove: 'Automaattinen hyväksyntä',
      autoApproveHelp: 'Tämä hyväksyy kaikki rekisteröidyt ravintolat automaattisesti.',
      autoApproveToggleTitle: 'Vaihda uusien ravintoloiden automaattinen hyväksyntä',
      noRestaurantsFound: 'Ravintoloita ei löytynyt',
      tryDifferentSearch: 'Kokeile toista hakusanaa',
      addFirstRestaurant: 'Lisää ensimmäinen ravintola aloittaaksesi',
      addRestaurant: 'Lisää ravintola',
      viewCustomHours: 'Näytä mukautetut ajat',
      approve: 'Hyväksy',
      activate: 'Aktivoi',
      deactivate: 'Poista käytöstä',
      alreadyActive: 'Jo aktiivinen',
      activateRestaurantTitle: 'Aktivoi ravintola',
      approveRegistrationTitle: 'Hyväksy tämä ravintolan rekisteröinti',
      approveFirstBeforeDeactivating: 'Hyväksy ensin ennen käytöstä poistamista',
      alreadyInactive: 'Jo passiivinen',
      inactiveBadge: 'Ei aktiivinen',
      locationNotSpecified: 'Sijaintia ei määritetty',
      owner: 'Omistaja',
      email: 'Sähköposti',
      orgShort: 'Y‑tunnus:',
      showing: 'Näytetään',
      of: '/',
      prev: 'Edellinen',
      next: 'Seuraava',
      day: 'Päivä',
      maxGuests: 'Asiakasraja',
      autoApproved: 'Automaattisesti hyväksytty',
      yes: 'Kyllä',
      no: 'Ei',
      noCustomHoursConfigured: 'Mukautettuja aikoja ei ole määritetty.',
      close: 'Sulje',
      unknownType: 'Tuntematon',
      contactPerson: 'Yhteyshenkilö',
      Eng: 'Eng', Fin: 'Fin', Nor: 'Nor', Swed: 'Swed', Ger: 'Ger',
    },
    no: {
      restaurantManagement: 'Restaurantadministrasjon',
      restaurantManagementDesc: 'Administrer restauranter på plattformen. Legg til, rediger eller fjern ved behov.',
      searchRestaurants: 'Søk restauranter...',
      autoApprove: 'Automatisk godkjenning',
      autoApproveHelp: 'Dette vil automatisk godkjenne alle registrerte restauranter.',
      autoApproveToggleTitle: 'Slå av/på auto-godkjenning for nye restauranter',
      noRestaurantsFound: 'Ingen restauranter funnet',
      tryDifferentSearch: 'Prøv et annet søk',
      addFirstRestaurant: 'Legg til din første restaurant for å komme i gang',
      addRestaurant: 'Legg til restaurant',
      viewCustomHours: 'Vis egendefinerte tider',
      approve: 'Godkjenn',
      activate: 'Aktiver',
      deactivate: 'Deaktiver',
      alreadyActive: 'Allerede aktiv',
      activateRestaurantTitle: 'Aktiver restaurant',
      approveRegistrationTitle: 'Godkjenn denne restaurantregistreringen',
      approveFirstBeforeDeactivating: 'Godkjenn først før deaktivering',
      alreadyInactive: 'Allerede inaktiv',
      inactiveBadge: 'Inaktiv',
      locationNotSpecified: 'Sted ikke angitt',
      owner: 'Eier',
      email: 'E‑post',
      orgShort: 'Org #:',
      showing: 'Viser',
      of: 'av',
      prev: 'Forrige',
      next: 'Neste',
      day: 'Dag',
      maxGuests: 'Maks gjester',
      autoApproved: 'Auto-godkjent',
      yes: 'Ja',
      no: 'Nei',
      noCustomHoursConfigured: 'Ingen egendefinerte tider konfigurert.',
      close: 'Lukk',
      unknownType: 'Ukjent',
      contactPerson: 'Kontaktperson',
      Eng: 'Eng', Fin: 'Fin', Nor: 'Nor', Swed: 'Swed', Ger: 'Ger',
    },
    sv: {
      restaurantManagement: 'Restauranghantering',
      restaurantManagementDesc: 'Hantera restauranger på plattformen. Lägg till, redigera eller ta bort vid behov.',
      searchRestaurants: 'Sök restauranger...',
      autoApprove: 'Automatiskt godkännande',
      autoApproveHelp: 'Detta godkänner automatiskt alla registrerade restauranger.',
      autoApproveToggleTitle: 'Växla automatiskt godkännande för nya restauranger',
      noRestaurantsFound: 'Inga restauranger hittades',
      tryDifferentSearch: 'Prova en annan sökterm',
      addFirstRestaurant: 'Lägg till din första restaurang för att komma igång',
      addRestaurant: 'Lägg till restaurang',
      viewCustomHours: 'Visa anpassade tider',
      approve: 'Godkänn',
      activate: 'Aktivera',
      deactivate: 'Inaktivera',
      alreadyActive: 'Redan aktiv',
      activateRestaurantTitle: 'Aktivera restaurang',
      approveRegistrationTitle: 'Godkänn den här restaurangregistreringen',
      approveFirstBeforeDeactivating: 'Godkänn först innan inaktivering',
      alreadyInactive: 'Redan inaktiv',
      inactiveBadge: 'Inaktiv',
      locationNotSpecified: 'Plats ej angiven',
      owner: 'Ägare',
      email: 'E‑post',
      orgShort: 'Org #:',
      showing: 'Visar',
      of: 'av',
      prev: 'Föregående',
      next: 'Nästa',
      day: 'Dag',
      maxGuests: 'Max gäster',
      autoApproved: 'Automatiskt godkänd',
      yes: 'Ja',
      no: 'Nej',
      noCustomHoursConfigured: 'Inga anpassade tider konfigurerade.',
      close: 'Stäng',
      unknownType: 'Okänt',
      contactPerson: 'Kontaktperson',
      Eng: 'Eng', Fin: 'Fin', Nor: 'Nor', Swed: 'Swed', Ger: 'Ger',
    },
    de: {
      restaurantManagement: 'Restaurantverwaltung',
      restaurantManagementDesc: 'Verwalten Sie Restaurants auf Ihrer Plattform. Fügen Sie hinzu, bearbeiten oder entfernen Sie.',
      searchRestaurants: 'Restaurants suchen...',
      autoApprove: 'Automatische Freigabe',
      autoApproveHelp: 'Dadurch werden alle registrierten Restaurants automatisch freigegeben.',
      autoApproveToggleTitle: 'Automatische Freigabe für neue Restaurants umschalten',
      noRestaurantsFound: 'Keine Restaurants gefunden',
      tryDifferentSearch: 'Versuche einen anderen Suchbegriff',
      addFirstRestaurant: 'Fügen Sie Ihr erstes Restaurant hinzu, um zu starten',
      addRestaurant: 'Restaurant hinzufügen',
      viewCustomHours: 'Benutzerdefinierte Zeiten anzeigen',
      approve: 'Genehmigen',
      activate: 'Aktivieren',
      deactivate: 'Deaktivieren',
      alreadyActive: 'Bereits aktiv',
      activateRestaurantTitle: 'Restaurant aktivieren',
      approveRegistrationTitle: 'Diese Restaurantregistrierung genehmigen',
      approveFirstBeforeDeactivating: 'Erst genehmigen, dann deaktivieren',
      alreadyInactive: 'Bereits inaktiv',
      inactiveBadge: 'Inaktiv',
      locationNotSpecified: 'Standort nicht angegeben',
      owner: 'Inhaber',
      email: 'E‑Mail',
      orgShort: 'Org #:',
      showing: 'Anzeigen',
      of: 'von',
      prev: 'Zurück',
      next: 'Weiter',
      day: 'Tag',
      maxGuests: 'Max. Gäste',
      autoApproved: 'Automatisch genehmigt',
      yes: 'Ja',
      no: 'Nein',
      noCustomHoursConfigured: 'Keine benutzerdefinierten Zeiten konfiguriert.',
      close: 'Schließen',
      unknownType: 'Unbekannt',
      contactPerson: 'Ansprechpartner',
      Eng: 'Eng', Fin: 'Fin', Nor: 'Nor', Swed: 'Swed', Ger: 'Ger',
    },
  };
  const t = (k) => (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;
  useEffect(() => {
    const handler = (e) => { if (typeof e?.detail === 'string') setLang(e.detail); };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => { if (e.key === 'app_lang') setLang(e.newValue || 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(firestore, "restaurants"));
        const restos = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setRestaurants(restos);

        const uniqueOwnerIds = [...new Set(restos.map((r) => r.Owner_ID).filter(Boolean))];
        const ownersData = {};
        for (const ownerId of uniqueOwnerIds) {
          const ownerDoc = await getDoc(doc(firestore, "users", ownerId));
          if (ownerDoc.exists()) {
            ownersData[ownerId] = ownerDoc.data();
          }
        }
        setOwnersMap(ownersData);
      } catch (error) {
        console.error("Error fetching restaurants or owners:", error);
      } finally {
        setLoading(false);
      }

      // 🔁 Fetch global auto_approved_restaurant flag
      try {
        const globalRef = doc(firestore, "AutoApprovedRestaurant", "auto_approved_restaurant");
        const snap = await getDoc(globalRef);
        if (snap.exists()) {
          setAutoApproved(!!snap.data().auto_approved_restaurant);
        }
      } catch (err) {
        console.error("Failed to fetch global auto_approved_restaurant flag", err);
      } finally {
        setAutoApprovedLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // 🔸 NEW: Reset to first page when list or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, restaurants.length]);

  const applyToggle = async (resto) => {
    if (!resto?.id) return;
    const nextState = !(resto?.isActive === true || resto?.isActive === "true");
    try {
      setBusyId(resto.id);
      await updateDoc(doc(firestore, "restaurants", resto.id), {
        isActive: nextState,
        updatedAt: serverTimestamp(),
      });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === resto.id ? { ...r, isActive: nextState } : r))
      );
    } catch (e) {
      console.error("Failed to toggle restaurant active state", e);
    } finally {
      setBusyId(null);
    }
  };

  // ✅ Approve first if not yet approved; else just set isActive: true
  const activateRestaurant = async (resto) => {
    if (!resto?.id) return;
    try {
      setBusyId(resto.id);

      const isApproved =
        resto?.restaurant_activation === true ||
        resto?.restaurant_activation === "true";

      if (!isApproved) {
        // First-time approval: write restaurant_activation: true
        await updateDoc(doc(firestore, "restaurants", resto.id), {
          restaurant_activation: true,
          updatedAt: serverTimestamp(),
        });
        setRestaurants((prev) =>
          prev.map((r) =>
            r.id === resto.id ? { ...r, restaurant_activation: true } : r
          )
        );
      } else {
        // Already approved → ensure it's active
        await updateDoc(doc(firestore, "restaurants", resto.id), {
          isActive: true,
          updatedAt: serverTimestamp(),
        });
        setRestaurants((prev) =>
          prev.map((r) => (r.id === resto.id ? { ...r, isActive: true } : r))
        );
      }
    } catch (e) {
      console.error("Failed to activate/approve restaurant", e);
    } finally {
      setBusyId(null);
    }
  };

  // 🔁 Toggle handler for the global Auto Approve flag
  const toggleGlobalAutoApprove = async () => {
    try {
      const next = !autoApproved;
      setAutoApproved(next);
      await setDoc(
        doc(firestore, "AutoApprovedRestaurant", "auto_approved_restaurant"),
        { auto_approved_restaurant: next }
      );
    } catch (err) {
      console.error("Failed to update auto_approved_restaurant flag", err);
    }
  };

  // NEW: Toggle handler for per-restaurant restaurant_activation field
  const toggleRestaurantActivation = async (resto) => {
    if (!resto?.id) return;
    const current = resto?.restaurant_activation === true || resto?.restaurant_activation === "true";
    const next = !current;
    try {
      setActivationBusyId(resto.id);
      await updateDoc(doc(firestore, "restaurants", resto.id), {
        restaurant_activation: next,
        updatedAt: serverTimestamp(),
      });
      setRestaurants((prev) =>
        prev.map((r) => (r.id === resto.id ? { ...r, restaurant_activation: next } : r))
      );
    } catch (err) {
      console.error("Failed to update restaurant_activation", err);
    } finally {
      setActivationBusyId(null);
    }
  };

  const openHoursModal = (resto) => {
    if (!resto) return;
    const ch = resto.customHours;
    let days = [];
    if (Array.isArray(ch)) {
      days = Array.isArray(ch[0]?.days) ? ch[0].days : [];
    } else if (ch && typeof ch === 'object') {
      days = Array.isArray(ch.days) ? ch.days : [];
    }
    setHoursData(days);
    setHoursModalTitle(resto.name || resto.id || "Custom Hours");
    setHoursModalOpen(true);
  };

  const closeHoursModal = () => {
    setHoursModalOpen(false);
    setHoursData([]);
    setHoursModalTitle("");
  };

  // ---------- Filtering + Pagination ----------
  const filteredRestaurants = restaurants.filter(
    (resto) =>
      resto.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      resto.Location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🔸 NEW: pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pagedRestaurants = filteredRestaurants.slice(startIdx, endIdx);

  const goToPage = (p) => setCurrentPage(Math.min(Math.max(1, p), totalPages));
  const prevPage = () => goToPage(safeCurrentPage - 1);
  const nextPage = () => goToPage(safeCurrentPage + 1);

  // 🔸 NEW: compact page number range (1 … n) around current page
  const getPageNumbers = () => {
    const pages = [];
    const window = 1; // how many pages to show left/right of current
    const from = Math.max(1, safeCurrentPage - window);
    const to = Math.min(totalPages, safeCurrentPage + window);
    // Always include first & last with ellipses when needed
    if (from > 1) pages.push(1);
    if (from > 2) pages.push("…");
    for (let i = from; i <= to; i++) pages.push(i);
    if (to < totalPages - 1) pages.push("…");
    if (to < totalPages) pages.push(totalPages);
    return pages;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#fe8318]">{t('restaurantManagement')}</h1>
          <p className="text-sm text-slate-500 font-medium">{t('restaurantManagementDesc')}</p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="relative flex-grow md:w-64">
            <input
              type="text"
              placeholder={t('searchRestaurants')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <FiMapPin className="h-5 w-5" />
            </div>
          </div>

          {/* 🔁 Global Auto Approve Switch */}
          <div className="flex items-center gap-2 ml-4">
            <label htmlFor="autoApproveSwitch" className="text-sm text-gray-600 flex items-center gap-1">
              <span>{t('autoApprove')}</span>
              <span className="relative inline-flex">
                <button
                  type="button"
                  aria-label="Auto Approve help"
                  aria-describedby="autoApproveHelpTip"
                  className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  tabIndex={0}
                  onMouseEnter={() => setShowAutoApproveHelp(true)}
                  onMouseLeave={() => setShowAutoApproveHelp(false)}
                  onFocus={() => setShowAutoApproveHelp(true)}
                  onBlur={() => setShowAutoApproveHelp(false)}
                  onClick={() => setShowAutoApproveHelp((v) => !v)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowAutoApproveHelp((v) => !v);
                    }
                  }}
                >
                  <FiHelpCircle className="h-4 w-4" />
                </button>

                {showAutoApproveHelp && (
                  <div
                    id="autoApproveHelpTip"
                    role="tooltip"
                    className="absolute z-20 -top-2 left-6 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg"
                  >
                    {t('autoApproveHelp')}
                    <div className="absolute left-2 top-full h-2 w-2 rotate-45 bg-gray-900" />
                  </div>
                )}
              </span>
            </label>
            <button
              id="autoApproveSwitch"
              onClick={toggleGlobalAutoApprove}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                autoApproved ? "bg-green-500" : "bg-gray-300"
              }`}
              disabled={autoApprovedLoading}
              title={t('autoApproveToggleTitle')}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  autoApproved ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRestaurants.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center border border-gray-100">
          <FiMapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">{t('noRestaurantsFound')}</h3>
          <p className="mt-1 text-gray-500">
            {searchTerm ? t('tryDifferentSearch') : t('addFirstRestaurant')}
          </p>
          <button
            className="mt-4 inline-flex items-center px-4 py-2 bg-[#fe8a24] text-white rounded-lg shadow hover:bg-[#e07715] transition"
            onClick={() => alert("Add new restaurant form/modal here")}
          >
            <FiPlus className="mr-2" />
            {t('addRestaurant')}
          </button>
        </div>
      )}

      {/* Restaurant Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!loading &&
          pagedRestaurants.map((resto) => {
            const owner = resto.Owner_ID ? ownersMap[resto.Owner_ID] : null;
            const active = resto?.isActive === true || resto?.isActive === "true";

            // Determine if there are any days with auto_approved === false
            const daysArr = Array.isArray(resto.customHours)
              ? (resto.customHours[0]?.days || [])
              : (resto.customHours?.days || []);
            const canEnableAutoApprove = daysArr && daysArr.length > 0 && daysArr.some((d) => d?.auto_approved === false);

            // current approved-registration flag (coerce possible string)
            const approvedRegistration =
              resto?.restaurant_activation === true || resto?.restaurant_activation === "true";

            return (
              <div
                key={resto.id}
                className={`relative bg-white rounded-xl transition-shadow duration-300 hover:shadow-md border border-transparent ring-1 ring-offset-2 ring-offset-white ${
                  active ? 'ring-green-400/70 shadow-green-100' : 'ring-red-400/70 shadow-red-100'
                }`}
              >
                <div
                  className={`${
                    active
                      ? 'bg-gradient-to-r from-green-400 via-emerald-400 to-green-300'
                      : 'bg-gradient-to-r from-red-400 via-rose-400 to-red-300'
                  } h-1 w-full rounded-t-xl`}
                />
                <div className="h-36 bg-gray-200 relative overflow-hidden">
                  <div className={`pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-[140%] blur-2xl ${active ? 'bg-green-300/10' : 'bg-red-300/10'}`} />
                  {resto.Image ? (
                    <img
                      src={resto.Image}
                      alt={resto.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-orange-100 to-yellow-100">
                      <MdRestaurant className="text-5xl text-orange-300" />
                    </div>
                  )}
                  <span
                    className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      resto.Type
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {resto.Type || t('unknownType')}
                  </span>
                  {!active && (
                    <span className="absolute bottom-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-800 text-white/90">{t('inactiveBadge')}</span>
                  )}
                  {busyId === resto.id && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] grid place-items-center">
                      <div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-semibold text-gray-900">{resto.name}</h3>
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center text-gray-600 text-sm">
                      <FiMapPin className="mr-2 text-orange-500" />
                      <span>{resto.Location || t('locationNotSpecified')}</span>
                    </div>

                    {resto.Contact_number && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <FiPhone className="mr-2 text-orange-500" />
                        <span>{resto.Contact_number}</span>
                      </div>
                    )}

                    {/* ✅ Added Contact Person Number */}
                    {resto.ContactPerson_number && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <FiPhone className="mr-2 text-orange-500" />
                        <span>{t('contactPerson')}: {resto.ContactPerson_number}</span>
                      </div>
                    )}

                    {/* ✅ Added Organization Number */}
                    {resto.organizationNumber && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <FiPhone className="mr-2 text-orange-500" />
                        <span>{t('orgShort')} {resto.organizationNumber}</span>
                      </div>
                    )}

                    {resto.openTime && resto.closeTime && (
                      <div className="flex items-center text-gray-600 text-sm">
                        <FiClock className="mr-2 text-orange-500" />
                        <span>
                          {resto.openTime} - {resto.closeTime}
                        </span>
                      </div>
                    )}

                    {owner && (
                      <div className="mt-2 p-2 bg-gray-100 rounded-md text-xs text-gray-700">
                        <p>
                          <strong>{t('owner')}:</strong> {owner.first_name} {owner.last_name}
                        </p>
                        <p>
                          <strong>{t('email')}:</strong> {owner.email}
                        </p>
                      </div>
                    )}
                  </div>

                  {resto.Type && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full">
                        {resto.Type}
                      </span>
                    </div>
                  )}
                </div>

                <div className="px-4 pb-4">
                  <div className="mt-4 flex justify-end gap-2">
                    {/* View Custom Hours */}
                    <button
                      onClick={() => openHoursModal(resto)}
                      className="inline-flex items-center px-3 py-1.5 text-sm rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                      title={t('viewCustomHours')}
                    >
                      {t('viewCustomHours')}
                    </button>

                    {/* ✅ Activate: Approves first if needed, else activates */}
                    <button
                      onClick={() => activateRestaurant(resto)}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed ${
                        approvedRegistration && active
                          ? 'border-gray-200 text-gray-400 hover:bg-transparent'
                          : 'border-green-200 text-green-700 hover:bg-green-50'
                      }`}
                      disabled={busyId === resto.id || (approvedRegistration ? active : false)}
                      title={
                        !approvedRegistration
                          ? t('approveRegistrationTitle')
                          : active
                          ? t('alreadyActive')
                          : t('activateRestaurantTitle')
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        {busyId === resto.id ? (
                          <span className="h-4 w-4 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                        ) : null}
                        {approvedRegistration ? t('activate') : t('approve')}
                      </span>
                    </button>

                    {/* ✅ Deactivate: only if approved AND currently active */}
                    <button
                      onClick={() => applyToggle(resto)}
                      className={`inline-flex items-center px-3 py-1.5 text-sm rounded-md border disabled:opacity-50 disabled:cursor-not-allowed ${
                        active
                          ? 'border-red-200 text-red-700 hover:bg-red-50'
                          : 'border-gray-200 text-gray-400 hover:bg-transparent'
                      }`}
                      disabled={busyId === resto.id || !approvedRegistration || !active}
                      title={
                        !approvedRegistration
                          ? t('approveFirstBeforeDeactivating')
                          : !active
                          ? t('alreadyInactive')
                          : t('deactivate')
                      }
                    >
                      <span className="inline-flex items-center gap-2">
                        {busyId === resto.id && active ? (
                          <span className="h-4 w-4 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
                        ) : null}
                        {t('deactivate')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

      {/* 🔸 NEW: Pagination footer */}
      {!loading && filteredRestaurants.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            {t('showing')} <span className="font-medium">{filteredRestaurants.length === 0 ? 0 : startIdx + 1}</span>–<span className="font-medium">{Math.min(endIdx, filteredRestaurants.length)}</span> {t('of')} <span className="font-semibold">{filteredRestaurants.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={safeCurrentPage <= 1}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              {t('prev')}
            </button>

            {getPageNumbers().map((p, idx) =>
              p === "…" ? (
                <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`min-w-[38px] px-3 py-1.5 rounded-md border text-sm ${
                    p === safeCurrentPage
                      ? "border-orange-500 text-orange-600 font-semibold"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {p}
                </button>
              )
            )}

            <button
              onClick={nextPage}
              disabled={safeCurrentPage >= totalPages}
              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 disabled:opacity-50 hover:bg-slate-50"
            >
              {t('next')}
            </button>
          </div>
        </div>
      )}

      {hoursModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeHoursModal} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{hoursModalTitle}</h2>
              <button onClick={closeHoursModal} className="text-slate-500 hover:text-slate-700">✕</button>
            </div>
            <div className="p-5 max-h-[70vh] overflow-auto">
              {hoursData && hoursData.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-600">
                      <th className="py-2 pr-2">{t('day')}</th>
                      <th className="py-2 pr-2">{t('maxGuests')}</th>
                      <th className="py-2 pr-2">{t('autoApproved')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hoursData.map((d, idx) => (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="py-2 pr-2">{d?.name || '-'}</td>
                        <td className="py-2 pr-2">{typeof d?.maxGuests === 'number' ? d.maxGuests : '-'}</td>
                        <td className="py-2 pr-2">
                          {d?.auto_approved === true ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">{t('yes')}</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">{t('no')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-slate-600 text-sm">{t('noCustomHoursConfigured')}</div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-slate-200 text-right">
              <button onClick={closeHoursModal} className="inline-flex items-center px-4 py-2 rounded-md bg-slate-800 text-white hover:bg-slate-700">{t('close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}