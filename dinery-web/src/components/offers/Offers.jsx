import React, { useState, useEffect, useMemo } from "react";
import { getFirestore, collection, query, where, onSnapshot, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import OfferModalPage from "./OfferModalPage";
import OfferDetailPage from "./OfferDetailPage";

export default function Offers() {
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState({
    restaurants: true,
    offers: false,
  });
  const [viewMode, setViewMode] = useState("grid");
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [hideExpired, setHideExpired] = useState(true);
  const [userRole, setUserRole] = useState(null); 

  // ---- Language & i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const localeMap = { en: 'en-US', fi: 'fi-FI', no: 'nb-NO', sv: 'sv-SE', de: 'de-DE' };

  const i18n = {
    en: {
      offersManagement: 'Offers Management',
      tagline: 'MEALS, ONLY SMARTER',
      backToRestaurants: 'Back to Restaurants',
      switchToList: 'Switch to list view',
      switchToGrid: 'Switch to grid view',
      selectYourRestaurant: 'Select Your Restaurant',
      noRestaurantsFound: 'No restaurants found',
      needCreateRestaurant: 'You need to create a restaurant before managing offers.',
      noLocation: 'No location specified',
      offersFor: 'Offers for',
      managePromotions: 'Manage promotions and discounts for your restaurant',
      hideExpired: 'Hide expired',
      createOffer: 'Create Offer',
      currentOffers: 'Current Offers',
      noActiveOffers: 'No active offers',
      noOffersYet: 'No offers yet',
      turnOffHideExpired: 'Turn off “Hide expired” to view past offers.',
      createYourFirstOffer: 'Create your first promotional offer',
      active: 'Active',
      inactive: 'Inactive',
      expired: 'Expired',
      id: 'ID',
      offersSuffix: 'Offers',
    },
    fi: {
      offersManagement: 'Tarjousten hallinta',
      tagline: 'ATERIAT, ENTISTÄ ÄLYKKÄÄMMIN',
      backToRestaurants: 'Takaisin ravintoloihin',
      switchToList: 'Vaihda listanäkymään',
      switchToGrid: 'Vaihda ruudukkonäkymään',
      selectYourRestaurant: 'Valitse ravintola',
      noRestaurantsFound: 'Ravintoloita ei löytynyt',
      needCreateRestaurant: 'Luo ravintola ennen tarjousten hallintaa.',
      noLocation: 'Ei sijaintia',
      offersFor: 'Tarjoukset ravintolalle',
      managePromotions: 'Hallitse ravintolasi kampanjoita ja alennuksia',
      hideExpired: 'Piilota vanhentuneet',
      createOffer: 'Luo tarjous',
      currentOffers: 'Nykyiset tarjoukset',
      noActiveOffers: 'Ei aktiivisia tarjouksia',
      noOffersYet: 'Ei vielä tarjouksia',
      turnOffHideExpired: 'Poista Piilota vanhentuneet nähdäksesi vanhat tarjoukset.',
      createYourFirstOffer: 'Luo ensimmäinen tarjous',
      active: 'Aktiivinen',
      inactive: 'Ei aktiivinen',
      expired: 'Vanhentunut',
      id: 'Tunnus',
      offersSuffix: 'Tarjoukset',
    },
    no: {
      offersManagement: 'Tilbudshåndtering',
      tagline: 'MÅLTIDER, BARE SMARTERE',
      backToRestaurants: 'Tilbake til restauranter',
      switchToList: 'Bytt til listevisning',
      switchToGrid: 'Bytt til rutenettvisning',
      selectYourRestaurant: 'Velg restaurant',
      noRestaurantsFound: 'Ingen restauranter funnet',
      needCreateRestaurant: 'Du må opprette en restaurant før du kan håndtere tilbud.',
      noLocation: 'Ingen lokasjon',
      offersFor: 'Tilbud for',
      managePromotions: 'Administrer kampanjer og rabatter for restauranten',
      hideExpired: 'Skjul utløpte',
      createOffer: 'Opprett tilbud',
      currentOffers: 'Aktuelle tilbud',
      noActiveOffers: 'Ingen aktive tilbud',
      noOffersYet: 'Ingen tilbud ennå',
      turnOffHideExpired: 'Skru av «Skjul utløpte» for å se tidligere tilbud.',
      createYourFirstOffer: 'Opprett ditt første tilbud',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      expired: 'Utløpt',
      id: 'ID',
      offersSuffix: 'Tilbud',
    },
    sv: {
      offersManagement: 'Erbjudandehantering',
      tagline: 'MÅLTIDER, FAST SMARTARE',
      backToRestaurants: 'Tillbaka till restauranger',
      switchToList: 'Byt till listvy',
      switchToGrid: 'Byt till rutnätsvy',
      selectYourRestaurant: 'Välj restaurang',
      noRestaurantsFound: 'Inga restauranger hittades',
      needCreateRestaurant: 'Du måste skapa en restaurang innan du kan hantera erbjudanden.',
      noLocation: 'Ingen plats angiven',
      offersFor: 'Erbjudanden för',
      managePromotions: 'Hantera kampanjer och rabatter för din restaurang',
      hideExpired: 'Dölj utgångna',
      createOffer: 'Skapa erbjudande',
      currentOffers: 'Aktuella erbjudanden',
      noActiveOffers: 'Inga aktiva erbjudanden',
      noOffersYet: 'Inga erbjudanden ännu',
      turnOffHideExpired: 'Stäng av ”Dölj utgångna” för att visa tidigare erbjudanden.',
      createYourFirstOffer: 'Skapa ditt första erbjudande',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      expired: 'Utgången',
      id: 'ID',
      offersSuffix: 'Erbjudanden',
    },
    de: {
      offersManagement: 'Angebotsverwaltung',
      tagline: 'MAHLZEITEN, NUR SMARTER',
      backToRestaurants: 'Zurück zu Restaurants',
      switchToList: 'Zur Listenansicht wechseln',
      switchToGrid: 'Zur Rasteransicht wechseln',
      selectYourRestaurant: 'Wähle dein Restaurant',
      noRestaurantsFound: 'Keine Restaurants gefunden',
      needCreateRestaurant: 'Du musst ein Restaurant erstellen, bevor du Angebote verwaltest.',
      noLocation: 'Kein Standort angegeben',
      offersFor: 'Angebote für',
      managePromotions: 'Verwalte Aktionen und Rabatte für dein Restaurant',
      hideExpired: 'Abgelaufene ausblenden',
      createOffer: 'Angebot erstellen',
      currentOffers: 'Aktuelle Angebote',
      noActiveOffers: 'Keine aktiven Angebote',
      noOffersYet: 'Noch keine Angebote',
      turnOffHideExpired: 'Schalte „Abgelaufene ausblenden“ aus, um frühere Angebote zu sehen.',
      createYourFirstOffer: 'Erstelle dein erstes Angebot',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      expired: 'Abgelaufen',
      id: 'ID',
      offersSuffix: 'Angebote',
    },
  };

  const t = (k) => (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  // ---- Category translation for restaurant.Type ----
  const categoryMap = {
    'Cafés & Bakeries': { fi: 'Kahvilat ja leipomot', no: 'Kafeer og bakerier', sv: 'Caféer och bagerier', de: 'Cafés und Bäckereien' },
    'Brasseries & Trattorias': { fi: 'Brasserie- ja trattoria-ravintolat', no: 'Brasserier og trattorier', sv: 'Brasserier och trattorior', de: 'Brasserien und Trattorien' },
  };
  const translateCategory = (type, langCode) => {
    if (!type) return type;
    const entry = categoryMap[type];
    if (!entry) return type;
    return entry[langCode] || type;
  };

  const translatedRestaurants = useMemo(() => {
    return restaurants.map((r) => ({ ...r, _displayType: translateCategory(r.Type, lang) }));
  }, [restaurants, lang]);

  const auth = getAuth();
  const firestore = getFirestore();
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  // Fetch user role first
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setUserRole(null);
      return;
    }

    // Staff don't have a users doc
    if (isStaff) {
      setUserRole(staffRole || "staff");
      return;
    }

    const fetchUserRole = async () => {
      try {
        const userDocRef = doc(firestore, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setUserRole((userData.role || "").toLowerCase());
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
    };

    fetchUserRole();
  }, [auth, firestore, isStaff, staffRole]);

  // --- helpers: date handling / expired check ---
  const toDate = (v) => {
    if (!v) return null;
    if (typeof v === "object" && typeof v.toDate === "function") return v.toDate(); // Firestore Timestamp
    return new Date(v);
  };

  const isExpired = (offer) => {
    const end = toDate(offer.end_date);
    if (!end || isNaN(end)) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  };

useEffect(() => {
  const user = auth.currentUser;
  if (!user || (!isStaff && userRole === null)) {
    setLoading((prev) => ({ ...prev, restaurants: false }));
    return;
  }

  // ── Staff: load only their assigned restaurant ────────────────────
  if (isStaff) {
    getDoc(doc(firestore, "restaurants", staffRestaurantId)).then((snap) => {
      if (snap.exists()) {
        const restaurant = { id: snap.id, ...snap.data() };
        setRestaurants([restaurant]);
        setSelectedRestaurant(restaurant); // auto-select for staff
      }
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }).catch(() => setLoading((prev) => ({ ...prev, restaurants: false })));
    return;
  }

  // ── Owner: load all owned restaurants ────────────────────────────
  const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
  const restaurantsRef = collection(firestore, collectionName);
  const qRef = query(restaurantsRef, where("Owner_ID", "==", user.uid));

  const unsubscribe = onSnapshot(
    qRef,
    (snapshot) => {
      const ownedRestaurants = [];
      snapshot.forEach((doc) => {
        ownedRestaurants.push({ id: doc.id, ...doc.data() });
      });
      setRestaurants(ownedRestaurants);
      setLoading((prev) => ({ ...prev, restaurants: false }));
    },
    (error) => {
      alert("Failed to fetch restaurants: " + error.message);
      setLoading((prev) => ({ ...prev, restaurants: false }));
    }
  );

  return unsubscribe;
}, [auth, firestore, userRole, isStaff, staffRestaurantId]);

  // Fetch offers for selected restaurant
  useEffect(() => {
    if (!selectedRestaurant || userRole === null) {
      setOffers([]);
      return;
    }

    setLoading((prev) => ({ ...prev, offers: true }));

    // Determine collection based on role
    const collectionName = isStaff ? 'restaurants' : (userRole === 'tester' ? 'TestRestaurant' : 'restaurants');
    const offersRef = collection(firestore, `${collectionName}/${selectedRestaurant.id}/offer`);

    const unsubscribeOffers = onSnapshot(
      offersRef,
      (snapshot) => {
        const fetchedOffers = [];
        snapshot.forEach((doc) => {
          fetchedOffers.push({ id: doc.id, restaurantId: selectedRestaurant.id, ...doc.data() });
        });
        setOffers(fetchedOffers);
        setLoading((prev) => ({ ...prev, offers: false }));
      },
      (error) => {
        alert("Failed to fetch offers: " + error.message);
        setLoading((prev) => ({ ...prev, offers: false }));
      }
    );

    return unsubscribeOffers;
  }, [selectedRestaurant, firestore, userRole]);

  const handleAddOffer = () => {
    if (!selectedRestaurant) {
      alert("Please select a restaurant first");
      return;
    }
    setIsOfferModalOpen(true);
  };

  const handleOfferClick = (offer) => {
    setSelectedOffer(offer);
  };

  const handleCloseOfferDetail = () => {
    setSelectedOffer(null);
  };

  // Callback when offer is updated in OfferDetailPage
  const handleOfferUpdated = (updatedOffer) => {
    setOffers((prevOffers) =>
      prevOffers.map((o) => (o.id === updatedOffer.id ? updatedOffer : o))
    );
    setSelectedOffer(updatedOffer);
  };

  // Compute visible offers based on toggle + sort (active first, then nearest end date)
  const visibleOffers = offers
    .filter((o) => (hideExpired ? !isExpired(o) : true))
    .sort((a, b) => {
      const aExpired = isExpired(a);
      const bExpired = isExpired(b);
      if (aExpired !== bExpired) return aExpired ? 1 : -1;
      const aEnd = toDate(a.end_date)?.getTime() ?? Infinity;
      const bEnd = toDate(b.end_date)?.getTime() ?? Infinity;
      return aEnd - bEnd;
    });

  return (
    <div className="flex flex-col h-screen bg-[#F5FEFD]">
      {/* Header */}
      <header className="bg-[#F5FEFD] border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-[#212620]">
              {selectedRestaurant ? `${selectedRestaurant.name} ${t('offersSuffix')}` : t('offersManagement')}
            </h1>
            <p className="text-base font-semibold text-[#fe8922] uppercase tracking-wider mt-1">
              {t('tagline')}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {selectedRestaurant && (
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="text-sm text-[#fe8922] hover:text-[#22262c] font-semibold flex items-center transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                {t('backToRestaurants')}
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              title={viewMode === 'grid' ? t('switchToList') : t('switchToGrid')}
            >
              {viewMode === "grid" ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {!selectedRestaurant ? (
            <section>
              <h2 className="text-xl font-semibold text-[#212620] mb-6">{t('selectYourRestaurant')}</h2>

              {loading.restaurants ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#fe8922]"></div>
                </div>
              ) : translatedRestaurants.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-[#212620]">{t('noRestaurantsFound')}</h3>
                  <p className="mt-2 text-gray-500">
                    {t('needCreateRestaurant')}
                  </p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {translatedRestaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="bg-white rounded-xl shadow-md overflow-hidden transition-all transform hover:-translate-y-1 cursor-pointer border border-gray-200 hover:border-[#fe8922]/50"
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      <div className="h-48 bg-gray-100 overflow-hidden relative">
                        {restaurant.Image ? (
                          <img
                            src={restaurant.Image}
                            alt={restaurant.name}
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {restaurant.Type && (
                          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-[#212620] shadow-sm border border-gray-200">
                            {restaurant._displayType || restaurant.Type}
                          </span>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-[#212620] mb-2">{restaurant.name}</h3>
                        <div className="flex items-center text-sm text-gray-600">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-[#fe8922]"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {restaurant.Location || t('noLocation')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white shadow-md rounded-xl overflow-hidden border border-gray-200">
                  {translatedRestaurants.map((restaurant) => (
                    <div
                      key={restaurant.id}
                      className="p-5 border-b border-gray-200 last:border-b-0 transition-colors hover:bg-[#f8faf5] cursor-pointer"
                      onClick={() => setSelectedRestaurant(restaurant)}
                    >
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-12 w-12 rounded-md bg-gray-100 overflow-hidden mr-4">
                          {restaurant.Image ? (
                            <img
                              src={restaurant.Image}
                              alt={restaurant.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-[#212620] truncate">{restaurant.name}</h3>
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <svg
                              className="flex-shrink-0 mr-1.5 h-4 w-4 text-[#fe8922]"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {restaurant.Location || t('noLocation')}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#fe8922]/10 text-[#212620]">
                            {restaurant._displayType || restaurant.Type || "No type"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-[#212620]">{t('offersFor')} {selectedRestaurant.name}</h2>
                  <p className="mt-1 text-sm text-gray-600">{t('managePromotions')}</p>
                </div>

                <div className="flex items-center gap-3">
                  {/* NEW: Hide expired toggle */}
                  <label className="inline-flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-[#fe8922] focus:ring-[#fe8922]"
                    checked={hideExpired}
                    onChange={(e) => setHideExpired(e.target.checked)}
                  />
                  <span className="text-sm text-[#212620]">{t('hideExpired')}</span>
                </label>

                  <button
                    onClick={handleAddOffer}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#fe8922] hover:bg-[#e67e22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fe8922]"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {t('createOffer')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200 bg-[#f8faf5]">
                  <h3 className="text-lg font-medium text-[#212620]">{t('currentOffers')}</h3>
                </div>

                {loading.offers ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#fe8922]"></div>
                  </div>
                ) : visibleOffers.length === 0 ? (
                  <div className="px-6 py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    <h3 className="mt-2 text-lg font-medium text-[#212620]">
                      {hideExpired ? t('noActiveOffers') : t('noOffersYet')}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {hideExpired ? t('turnOffHideExpired') : t('createYourFirstOffer')}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-200">
                    {visibleOffers.map((offer) => {
                      const expired = isExpired(offer);
                      const start = toDate(offer.start_date);
                      const end = toDate(offer.end_date);
                      return (
                        <li
                          key={offer.id}
                          className={`p-4 rounded-md flex items-center space-x-4 cursor-pointer transition-colors ${
                            expired ? "opacity-70" : "hover:bg-[#f8faf5]"
                          }`}
                          onClick={() => handleOfferClick(offer)}
                        >
                          <div className="flex-shrink-0 w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                            {offer.image ? (
                              <img
                                src={offer.image}
                                alt={offer.offer_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-lg font-semibold text-[#212620]">{offer.offer_name}</h3>
                              <span className={`text-xs font-semibold ${offer.is_active ? "text-green-600" : "text-red-600"}`}>
                                {offer.is_active ? t('active') : t('inactive')}
                              </span>
                              {typeof offer.discount_percent === "number" && !Number.isNaN(offer.discount_percent) && (
                                <span className="text-xs font-semibold text-[#212620] bg-[#fe8922]/10 px-2 py-0.5 rounded-full">
                                  {offer.discount_percent}% off
                                </span>
                              )}
                              {expired && (
                                <span className="text-xs font-semibold text-gray-600">{t('expired')}</span>
                              )}
                            </div>

                            <p className="text-xs text-gray-400 font-mono select-all">{t('id')}: {offer.offer_id}</p>
                            <p className="text-sm text-gray-600 line-clamp-1">{offer.description}</p>

                            {typeof offer.discount_percent === "number" && !Number.isNaN(offer.discount_percent) && (
                              <p className="text-xs text-gray-700 mt-0.5">
                                Discount: {offer.discount_percent}%
                              </p>
                            )}

                            <div className="flex items-center mt-1 space-x-4">
                              <p className="text-xs text-gray-500">
                                {start ? start.toLocaleDateString(localeMap[lang] || 'en-US') : '—'} - {end ? end.toLocaleDateString(localeMap[lang] || 'en-US') : '—'}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          )}
        </div>
      </main>

      {/* Modals */}
      {isOfferModalOpen && (
          <OfferModalPage
            restaurant={selectedRestaurant}
            userRole={userRole}
            onClose={() => setIsOfferModalOpen(false)}
            onOfferAdded={() => setIsOfferModalOpen(false)}
          />
        )}
        {selectedOffer && (
          <OfferDetailPage
            offer={selectedOffer}
            userRole={userRole}
            onClose={handleCloseOfferDetail}
            onOfferUpdated={handleOfferUpdated}
          />
        )}
    </div>
  );
}