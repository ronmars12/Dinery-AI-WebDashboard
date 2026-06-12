import React, { useState, useEffect, useMemo } from "react";
import RestaurantAddModal from "./RestaurantAddModal";
import RestaurantDetailsModal from "./RestaurantDetailsModal";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  getDocs,
  getDoc,      
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
// ---- ADD THIS ----

export default function Restaurant() {
  const [restaurants, setRestaurants] = useState([]);
  const [realtimeRestaurants, setRealtimeRestaurants] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [form, setForm] = useState({
    name: "",
    Location: "",
    Contact_number: "",
    ContactPerson_name: "",
    ContactPerson_number: "",
    ContactPerson_email: "",
    Reservation_email: "",
    Type: "",
    otherType: "",
    Web_link: "",
    imageFile: null,
    Image: "",
    imageUrl: "",
    serviceType: "",
    organizationNumber: "",
    lat: "",
    lng: "",
    restaurant_activation: true,
  });

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [userRole, setUserRole] = useState(null); // Track user role

  const [restaurantOffers, setRestaurantOffers] = useState({});

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');

  const i18n = {
    en: {
      dashboard: 'Restaurant Dashboard',
      testerDashboard: 'Tester Dashboard', // ADD THIS
      tagline: 'MEALS, ONLY SMARTER',
      addNewRestaurant: 'Add New Restaurant',
      totalRestaurants: 'Total Restaurants',
      activeLocations: 'Active Locations',
      restaurantTypes: 'Restaurant Types',
      yourRestaurants: 'Your Restaurants',
      showing: 'Showing',
      restaurant_singular: 'restaurant',
      restaurant_plural: 'restaurants',
      emptyTitle: 'No restaurants added yet',
      emptyDesc: 'Get started by adding your first restaurant',
      addRestaurant: 'Add Restaurant',
      open: 'Open',
      closed: 'Closed',
      noOffer: 'No Offer Applied',
      toFinishHours: 'To finish: Add Operating Hours',
      toFinishActivation: 'To finish: Approve/Activate this Restaurant',
    },
    fi: {
      dashboard: 'Ravintolan hallintapaneeli',
      testerDashboard: 'Testaajan hallintapaneeli', // ADD THIS
      tagline: 'ATERIAT, ENTISTÄ ÄLYKKÄÄMMIN',
      addNewRestaurant: 'Lisää ravintola',
      totalRestaurants: 'Ravintoloita yhteensä',
      activeLocations: 'Aktiiviset sijainnit',
      restaurantTypes: 'Ravintolatyypit',
      yourRestaurants: 'Ravintolasi',
      showing: 'Näytetään',
      restaurant_singular: 'ravintola',
      restaurant_plural: 'ravintolaa',
      emptyTitle: 'Ei vielä ravintoloita',
      emptyDesc: 'Aloita lisäämällä ensimmäinen ravintola',
      addRestaurant: 'Lisää ravintola',
      open: 'Avoinna',
      closed: 'Suljettu',
      noOffer: 'Ei tarjousta lisätty',
      toFinishHours: 'Viimeistele: Lisää aukioloajat',
      toFinishActivation: 'Viimeistele: Hyväksy/Aktivoi ravintola',
    },
    no: {
      dashboard: 'Restaurantdashbord',
      testerDashboard: 'Tester dashbord', // ADD THIS
      tagline: 'MÅLTIDER, BARE SMARTERE',
      addNewRestaurant: 'Legg til ny restaurant',
      totalRestaurants: 'Totalt antall restauranter',
      activeLocations: 'Aktive lokasjoner',
      restaurantTypes: 'Restauranttyper',
      yourRestaurants: 'Dine restauranter',
      showing: 'Viser',
      restaurant_singular: 'restaurant',
      restaurant_plural: 'restauranter',
      emptyTitle: 'Ingen restauranter lagt til ennå',
      emptyDesc: 'Kom i gang ved å legge til din første restaurant',
      addRestaurant: 'Legg til restaurant',
      open: 'Åpen',
      closed: 'Stengt',
      noOffer: 'Ingen tilbud lagt til',
      toFinishHours: 'Fullfør: Legg til åpningstider',
      toFinishActivation: 'Fullfør: Godkjenn/Aktiver restaurant',
    },
    sv: {
      dashboard: 'Restaurangöversikt',
      testerDashboard: 'Testare översikt', // ADD THIS
      tagline: 'MÅLTIDER, FAST SMARTARE',
      addNewRestaurant: 'Lägg till ny restaurang',
      totalRestaurants: 'Totalt antal restauranger',
      activeLocations: 'Aktiva platser',
      restaurantTypes: 'Restaurangtyper',
      yourRestaurants: 'Dina restauranger',
      showing: 'Visar',
      restaurant_singular: 'restaurang',
      restaurant_plural: 'restauranger',
      emptyTitle: 'Inga restauranger tillagda ännu',
      emptyDesc: 'Kom igång genom att lägga till din första restaurang',
      addRestaurant: 'Lägg till restaurang',
      open: 'Öppen',
      closed: 'Stängd',
      noOffer: 'Inget erbjudande tillagt',
      toFinishHours: 'Slutför: Lägg till öppettider',
      toFinishActivation: 'Slutför: Godkänn/Aktivera restaurang',
    },
    de: {
      dashboard: 'Restaurant-Dashboard',
      testerDashboard: 'Tester-Dashboard', // ADD THIS
      tagline: 'MAHLZEITEN, NUR SMARTER',
      addNewRestaurant: 'Neues Restaurant hinzufügen',
      totalRestaurants: 'Gesamtzahl der Restaurants',
      activeLocations: 'Aktive Standorte',
      restaurantTypes: 'Restauranttypen',
      yourRestaurants: 'Deine Restaurants',
      showing: 'Anzeigen',
      restaurant_singular: 'Restaurant',
      restaurant_plural: 'Restaurants',
      emptyTitle: 'Noch keine Restaurants hinzugefügt',
      emptyDesc: 'Beginne, indem du dein erstes Restaurant hinzufügst',
      addRestaurant: 'Restaurant hinzufügen',
      open: 'Geöffnet',
      closed: 'Geschlossen',
      noOffer: 'Kein Angebot hinzugefügt',
      toFinishHours: 'Abschließen: Öffnungszeiten hinzufügen',
      toFinishActivation: 'Abschließen: Restaurant genehmigen/aktivieren',
    },
  };

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

  const t = (k) => (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;
  const auth = getAuth();
  const user = auth.currentUser;
  const firestore = getFirestore();
  const storage = getStorage();
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  const canManage         = !isStaff || staffRole === 'admin' || staffRole === 'manager';
  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

useEffect(() => {
  if (!user) {
    setUserRole(null);
    return;
  }

  // Staff don't have a users doc — set role from sessionStorage directly
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
}, [user, firestore, isStaff, staffRole]);

  useEffect(() => {
    if (!user) {
      setRestaurants([]);
      setFetching(false);
      return;
    }

    // ── Staff: skip userRole wait, load directly by restaurantId ─────
    if (isStaff) {
    setFetching(true);
      getDoc(doc(firestore, "restaurants", staffRestaurantId)).then((snap) => {
        if (snap.exists()) {
          setRestaurants([{ id: snap.id, ...snap.data() }]);
        } else {
          setRestaurants([]);
        }
        setFetching(false);
      }).catch(() => setFetching(false));
      return;
    }

    // ── Owner: load all owned restaurants ────────────────────────────
    const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
    const restaurantsRef = collection(firestore, collectionName);
    const q = query(restaurantsRef, where("Owner_ID", "==", user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() });
        });
        setRestaurants(loaded);
        setFetching(false);
      },
      (error) => {
        alert("Failed to fetch restaurants: " + error.message);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, userRole, isStaff, staffRestaurantId]);

    useEffect(() => {
    if (restaurants.length === 0 || userRole === null) {
      setRestaurantOffers({});
      return;
    }

    const fetchOffers = async () => {
      const offersMap = {};
      const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';

      for (const r of restaurants) {
        try {
          const offersRef = collection(firestore, collectionName, r.id, "offer");
          const offersSnap = await getDocs(offersRef);

          offersMap[r.id] = !offersSnap.empty;
        } catch (error) {
          console.error("Error fetching offers for restaurant", r.id, error);
          offersMap[r.id] = false;
        }
      }

      setRestaurantOffers(offersMap);
    };

    fetchOffers();
  }, [restaurants, firestore, userRole]); 
  // Added userRole dependency
  // ---------- 2. Fetch ALL restaurants (for select dropdown)
  // Prefer Firestore to avoid Realtime Database rules errors. If your DB rules require RTDB,
  // this gracefully falls back and still populates the dropdown from Firestore.
  useEffect(() => {
    let didCancel = false;
    async function fetchAllRestaurantsForDropdown() {
      try {
        const allSnap = await getDocs(collection(firestore, "restaurants"));
        const flat = allSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (!didCancel) setRealtimeRestaurants(flat);
      } catch (err) {
        console.warn("Failed to fetch all restaurants from Firestore:", err);
        if (!didCancel) setRealtimeRestaurants([]);
      }
    }
    fetchAllRestaurantsForDropdown();
    return () => { didCancel = true; };
  }, [firestore]);

  // -------- Modal handlers
  const openModal = () => {
    setForm({
      name: "",
      Location: "",
      Contact_number: "",
      ContactPerson_name: "",
      ContactPerson_number: "",
      ContactPerson_email: "",
      Reservation_email: "",
      Type: "",
      otherType: "",
      Web_link: "",
      imageFile: null,
      Image: "",
      imageUrl: "",
      serviceType: "",
      organizationNumber: "",
      lat: "",
      lng: "",
      restaurant_activation: true,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Handle top-level fields only
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setForm((prev) => ({ ...prev, imageFile: e.target.files[0] }));
    }
  };

  const uploadImageAndGetUrl = async () => {
    if (!form.imageFile) throw new Error("No image selected");
    const imageRef = ref(
      storage,
      `restaurant_images/${Date.now()}_${form.imageFile.name}`
    );
    await uploadBytes(imageRef, form.imageFile);
    return await getDownloadURL(imageRef);
  };

  const handleSubmit = async (e) => {
    e.preventDefault?.();
    const passedActivation =
      e && typeof e === "object" && "restaurant_activation" in e
        ? !!e.restaurant_activation
        : undefined;

    if (!form.name || !form.Location) {
      alert("Please fill in at least Name and Location.");
      return;
    }

    if (!user || userRole === null) {
      alert("You must be logged in.");
      return;
    }

    try {
      setLoading(true);

      let imageUrl = "";
      if (form.imageFile) {
        imageUrl = await uploadImageAndGetUrl();
      } else if (form.imageUrl) {
        imageUrl = form.imageUrl;
      } else {
        throw new Error("No image selected or URL provided");
      }

      const restaurantTypeToSave = form.Type === "" ? form.otherType : form.Type;
      const restaurantData = {
        name: form.name,
        Location: form.Location,
        Contact_number: form.Contact_number,
        ContactPerson_name: form.ContactPerson_name,
        ContactPerson_number: form.ContactPerson_number,
        ContactPerson_email: form.ContactPerson_email,
        Reservation_email: form.Reservation_email,
        Owner_ID: user.uid,
        Type: restaurantTypeToSave,
        Web_link: form.Web_link,
        Image: imageUrl,
        serviceType: form.serviceType,
        organizationNumber: form.organizationNumber,
        lat: form.lat,
        lng: form.lng,
        // Activation flags
        restaurant_activation: (passedActivation ?? form.restaurant_activation ?? true),
      };

      const docId = form.name.trim().replace(/_/g, " ");
      const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
      await setDoc(doc(firestore, collectionName, docId), restaurantData);

      setIsModalOpen(false);
    } catch (error) {
      alert("Error saving restaurant: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (restaurant) => {
    if (!restaurant?.id || userRole === null) return;
    
    const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
    const docRef = doc(firestore, collectionName, restaurant.id);
    try {
      await deleteDoc(docRef);
      setSelectedRestaurant(null);
      alert(`Removed restaurant "${restaurant.name}" successfully.`);
    } catch (error) {
      alert("Failed to remove restaurant: " + error.message);
    }
  };

  const handleEdit = async (id, updatedData) => {
    if (userRole === null) return;
    
    try {
      const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
      await updateDoc(doc(firestore, collectionName, id), updatedData);
      // keep the modal in sync optimistically until onSnapshot refreshes
      setSelectedRestaurant(prev => (prev && prev.id === id ? { ...prev, ...updatedData } : prev));
      alert("Restaurant updated successfully");
    } catch (err) {
      alert("Failed to update restaurant: " + err.message);
    }
  };

  // Stats
  const totalRestaurants = restaurants.length;
  const activeLocations = new Set(restaurants.map((r) => r.Location)).size;
  const restaurantTypes = new Set(
    restaurants.map((r) => r.Type).filter(Boolean)
  ).size;

  const translatedRestaurants = useMemo(() => {
    return restaurants.map((r) => ({
      ...r,
      _displayType: translateCategory(r.Type, lang),
    }));
  }, [restaurants, lang]);

  return (
    <div className="flex-1 overflow-auto p-6 bg-[#F5FEFD]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-[#23272f]">
              {userRole === 'tester' ? t('testerDashboard') : t('dashboard')}
            </h1>
            <p className="mt-2 text-[#fe8a24] font-medium">{t('tagline')}</p>
          </div>
          {canManage && (
            <button
              onClick={openModal}
              disabled={loading}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-3 font-medium shadow-md transition-all text-white ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-[#fe8a24] hover:bg-[#e07d20]"
              }`}
            >
              <PlusIcon className="h-5 w-5" />
              {t('addNewRestaurant')}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title={t('totalRestaurants')}
            value={totalRestaurants}
            icon={<RestaurantIcon className="h-6 w-6 text-[#fe8a24]" />}
            accentColor="bg-[#fe8a24]/10"
          />
          <StatCard
            title={t('activeLocations')}
            value={activeLocations}
            icon={<LocationMarkerIcon className="h-6 w-6 text-[#fe8a24]" />}
            accentColor="bg-[#fe8a24]/10"
          />
          <StatCard
            title={t('restaurantTypes')}
            value={restaurantTypes}
            icon={<TagIcon className="h-6 w-6 text-[#fe8a24]" />}
            accentColor="bg-[#fe8a24]/10"
          />
        </div>

        {/* Restaurant List */}
        <div className="bg-white rounded-xl shadow-sm border border-[#23272f]/10 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-[#23272f]">
              {t('yourRestaurants')}
            </h2>
            <div className="text-sm text-[#23272f]/80">
              {t('showing')} {restaurants.length} {restaurants.length === 1 ? t('restaurant_singular') : t('restaurant_plural')}
            </div>
          </div>

          {/* 🔹 Missing Hours Alert (shows if any restaurant lacks customHours) */}
          {restaurants.some(r => !Array.isArray(r.customHours) || r.customHours.length === 0) && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {t('toFinishHours')}
            </div>
          )}

          {/* 🔹 Not Activated Alert (shows if any restaurant has restaurant_activation !== true) */}
          {restaurants.some(r =>
            !(r?.restaurant_activation === true || r?.restaurant_activation === "true")
          ) && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {t('toFinishActivation')}
            </div>
          )}

          {fetching ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#fe8a24]"></div>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-24 w-24  text-[#23272f]/20">
                <RestaurantIcon className="h-full w-full" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-[#23272f]">
                {t('emptyTitle')}
              </h3>
              <p className="mt-1 text-[#23272f]/60">
                {t('emptyDesc')}
              </p>
              {canManage && (
              <button
                onClick={openModal}
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium shadow-sm transition-colors text-white bg-[#fe8a24] hover:bg-[#e07d20]"
              >
                <PlusIcon className="h-4 w-4" />
                {t('addRestaurant')}
              </button>
            )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {translatedRestaurants.map((r) => (
                <div
                  key={r.id}
                  onClick={() => setSelectedRestaurant(r)}
                  className="cursor-pointer"
                >
                  <RestaurantCard restaurant={r} hasOffer={!!restaurantOffers[r.id]} t={t} lang={lang} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Restaurant Modal */}
        {isModalOpen && (
          <RestaurantAddModal
            form={form}
            uploading={loading}
            handleChange={handleChange}
            handleFileChange={handleFileChange}
            handleSubmit={handleSubmit}
            closeModal={closeModal}
            setForm={setForm}
            existingRestaurants={realtimeRestaurants}
          />
        )}

        {/* Restaurant Details Modal */}
        {selectedRestaurant && (
          <RestaurantDetailsModal
            restaurant={selectedRestaurant}
            onClose={() => setSelectedRestaurant(null)}
            onRemove={handleRemove}
            onEdit={handleEdit}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, accentColor = "bg-[#fe8a24]/10" }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-[#23272f]/10 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${accentColor}`}>{icon}</div>
        <div>
          <p className="text-sm font-medium text-[#23272f]/80">{title}</p>
          <p className="mt-1 text-2xl font-bold text-[#23272f]">{value}</p>
        </div>
      </div>
    </div>
  );
}

const RestaurantCard = React.memo(({ restaurant, hasOffer, t, lang }) => {
  const openStatus = useMemo(() => {
    // Check if customHours exists and has data
    if (!restaurant.customHours || !Array.isArray(restaurant.customHours) || restaurant.customHours.length === 0) {
      return "Closed";
    }

    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currentDay = dayNames[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Find hours for current day
    for (const hourBlock of restaurant.customHours) {
      if (!hourBlock.days || !Array.isArray(hourBlock.days)) continue;
      
      const matchesDay = hourBlock.days.some(d => {
        const dayName = typeof d === 'string' ? d : (d.name || d.day || '');
        return dayName.toLowerCase() === currentDay.toLowerCase();
      });

      if (matchesDay && hourBlock.openTime && hourBlock.closeTime) {
        const [openHour, openMin] = hourBlock.openTime.split(':').map(Number);
        const [closeHour, closeMin] = hourBlock.closeTime.split(':').map(Number);
        
        const openMinutes = openHour * 60 + openMin;
        const closeMinutes = closeHour * 60 + closeMin;

        // Handle overnight hours (e.g., 22:00 - 02:00)
        if (closeMinutes < openMinutes) {
          return (currentMinutes >= openMinutes || currentMinutes <= closeMinutes) ? "Open" : "Closed";
        } else {
          return (currentMinutes >= openMinutes && currentMinutes <= closeMinutes) ? "Open" : "Closed";
        }
      }
    }

    return "Closed";
  }, [restaurant.customHours]);

  // 🔹 Highlight when there are no custom hours
  const hasCustomHours = Array.isArray(restaurant.customHours) && restaurant.customHours.length > 0;

  // 🔹 Activation flag (treat string "true" as true)
  const isActivated =
    restaurant?.restaurant_activation === true ||
    restaurant?.restaurant_activation === "true";

  return (
    <div
      className={`rounded-xl bg-white shadow-sm overflow-hidden hover:shadow-md transition-all hover:-translate-y-1 h-full flex flex-col cursor-pointer ${
        hasCustomHours ? "border border-[#23272f]/10" : "border-2 border-red-300 ring-2 ring-red-100"
      }`}
    >
      {/* Image Section */}
      <div className="relative h-48 overflow-hidden">
        {restaurant.Image ? (
          <img
            src={restaurant.Image}
            alt={restaurant.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-[#f4f8f3] flex items-center justify-center">
            <RestaurantIcon className="h-16 w-16 text-[#23272f]/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 items-start">
          {restaurant.Type && (
            <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-[#23272f] shadow-sm border border-[#23272f]/10 backdrop-blur-sm">
              {restaurant._displayType || restaurant.Type}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm border backdrop-blur-sm ${
              openStatus === "Open"
                ? "bg-green-100/90 text-green-800 border-green-300"
                : "bg-red-100/90 text-red-800 border-red-300"
            }`}
          >
            {openStatus === 'Open' ? t('open') : t('closed')}
          </span>
          {!hasOffer && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm border backdrop-blur-sm bg-yellow-100/90 text-yellow-800 border-yellow-300">
              {t('noOffer')}
            </span>
          )}
          {!hasCustomHours && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm border backdrop-blur-sm bg-red-100/95 text-red-800 border-red-300">
              {t('toFinishHours')}
            </span>
          )}
          {!isActivated && (
            <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm border backdrop-blur-sm bg-red-100/95 text-red-800 border-red-300">
              Not Activated
            </span>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Restaurant Name */}
        <h3 className="text-lg font-semibold text-[#23272f] mb-2 line-clamp-2">
          {restaurant.name}
        </h3>

        {/* Location */}
        <div className="flex items-start gap-2 mt-auto">
          <LocationMarkerIcon className="h-4 w-4 text-[#fe8a24] mt-0.5 flex-shrink-0" />
          <p className="text-sm text-[#23272f]/80">{restaurant.Location}</p>
        </div>

        {!hasCustomHours && (
          <div className="mt-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {t('toFinishHours')}
          </div>
        )}

        {!isActivated && (
          <div className="mt-3 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {t('toFinishActivation')}
          </div>
        )}
      </div>
    </div>
  );
});

// Icon components
function PlusIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
    </svg>
  );
}

function RestaurantIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
    </svg>
  );
}

function LocationMarkerIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function TagIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function PhoneIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function LinkIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}