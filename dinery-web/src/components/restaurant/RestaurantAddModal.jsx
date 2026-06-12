import React, { useState, useRef, useEffect } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { auth, firestore } from "../../firebase";
import { sendSignInLinkToEmail } from "firebase/auth";
import LocationPickerModal from './LocationPickerModal'; 
import { doc, getDoc } from "firebase/firestore";

// --- Reusable Large Orange Button ---
function LargeOrangeButton({ children, onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl transform hover:-translate-y-0.5"
      style={{ backgroundColor: "#e28743", boxShadow: "0 6px 16px 0 #0001" }}
    >
      {children}
    </button>
  );
}

// Helper for normalizing city/country key
function formatCityCountry(city, country) {
  const normalize = (str) =>
    (str || "")
      .toLowerCase()
      .trim()
      .replace(/ /g, "_")
      .replace(/[^\w_]/g, "");
  return `${normalize(city)}_${normalize(country)}`;
}

export default function RestaurantAddModal({
  form = {
    Location: "",
    name: "",
    organizationNumber: "",
    Contact_number: "",
    ContactPerson_number: "",
    Type: "",
    otherType: "",
    Web_link: "",
    serviceType: "",
    autoApproveReservations: {
      Monday: "",
      Tuesday: "",
      Wednesday: "",
      Thursday: "",
      Friday: "",
      Saturday: "",
      Sunday: "",
    },
    restaurant_activation: true,
    imageInputMethod: "upload",
    imageUrl: "",
    imageFile: null,
    lat: "",
    lng: "",
    isActive: true,
  },
  uploading = false,
  handleChange = () => {},
  handleFileChange = () => {},
  handleSubmit = () => {},
  closeModal = () => {},
  setForm = () => {},
  existingRestaurants = [],
}) {
  // --- Bot protection (reCAPTCHA), basic rate limit, and email verification ---
  const [captchaToken, setCaptchaToken] = useState("");
  const recaptchaRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [rateLimitMsg, setRateLimitMsg] = useState("");
  const [emailVerifyStatus, setEmailVerifyStatus] = useState({ sending:false, sent:false, error:"" });
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || ""; 
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Basic client-side rate limiter (5 submissions / 10 minutes per browser)
  const RATE_LIMIT_KEY = "restaurant_form_attempts";
  function checkRateLimit() {
    try {
      const now = Date.now();
      const windowMs = 10 * 60 * 1000; // 10 minutes
      const maxAttempts = 5;
      const raw = localStorage.getItem(RATE_LIMIT_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const recent = arr.filter((t) => now - t < windowMs);
      if (recent.length >= maxAttempts) {
            setRateLimitMsg(
          t('tooManyAttempts', { min: Math.ceil((windowMs - (now - recent[0]))/60000) })
        );
        return false;
      }
      recent.push(now);
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
      setRateLimitMsg("");
      return true;
    } catch (e) {
      return true; // if storage blocked, do not hard-fail
    }
  }

  // Submit wrapper to enforce rate limit and CAPTCHA before parent handleSubmit
  const internalHandleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (!checkRateLimit()) { setSubmitting(false); return; }

      // Require a solved CAPTCHA before submitting
      if (RECAPTCHA_SITE_KEY && !captchaToken) {
        alert("Please complete the CAPTCHA before submitting.");
        setSubmitting(false);
        return;
      }
      if (RECAPTCHA_SITE_KEY && !captchaToken && !recaptchaRef.current) {
        alert("Please complete the CAPTCHA before submitting.");
        setSubmitting(false);
        return;
      }

      // Pass token to parent in case server-side verification is used
      e.captchaToken = captchaToken;
      try { setForm((prev) => ({ ...prev, isActive: prev?.isActive ?? true })); } catch {}
      try {
        setForm((prev) => ({
          ...prev,
          restaurant_activation: prev?.restaurant_activation ?? true,
        }));
        // ensure this is also available on the submit event payload
        e.restaurant_activation = (e.restaurant_activation ?? true);
      }  catch {}
      // Read global AutoApprovedRestaurant flag and mirror to form.restaurant_activatation
      try {
        const globalRef = doc(firestore, 'AutoApprovedRestaurant', 'auto_approved_restaurant');
        const snap = await getDoc(globalRef);
        const autoApproved = snap.exists() ? !!snap.data().auto_approved_restaurant : false;
        try {
       setForm((prev) => ({
        ...prev,
        restaurant_activation: autoApproved,
      }));
      e.restaurant_activation = autoApproved;
      
      } catch {}
      } catch (err) {
        console.error('Failed to fetch global auto_approved_restaurant flag', err);
      }
      await handleSubmit({ ...e, restaurant_activation: e.restaurant_activation });
    } finally {
      setSubmitting(false);
    }
  };

  // Firebase Auth email-link verification for Reservation Email
  const actionCodeSettings = {
    url: window.location.origin + "/email-verified", 
    handleCodeInApp: true,
  };
  const sendVerificationToReservationEmail = async () => {
    const email = (form.Reservation_email || "").trim();
    if (!email) {
      setEmailVerifyStatus({ sending:false, sent:false, error:"Enter a Reservation Email first." });
      return;
    }
    setEmailVerifyStatus({ sending:true, sent:false, error:"" });
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem("restaurant_reservation_email_for_verify", email);
      setEmailVerifyStatus({ sending:false, sent:true, error:"" });
    } catch (err) {
      setEmailVerifyStatus({ sending:false, sent:false, error: err?.message || t('verificationFail') });
    }
  };

  const handleServiceTypeChange = (e) =>
    setForm((prev) => ({ ...prev, serviceType: e.target.value }));

  const handleMaxGuestChange = (day, value) => {
    setForm((prev) => ({
      ...prev,
      autoApproveReservations: {
        ...prev.autoApproveReservations,
        [day]: value,
      },
    }));
  };

  const [nearbyRestaurants, setNearbyRestaurants] = useState([]);

  // ---- Language / i18n ----
const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
const i18n = {
  en: {
    addNewRestaurant: 'Add New Restaurant',
    addRestaurantSubtitle: 'Fill in the details to add your restaurant',
    basicInfo: 'Basic Information',
    restaurantName: 'Restaurant Name',
    orgNumber: 'Organization Number',
    location: 'Location',
    selectRestaurantType: 'Select restaurant type',
    restaurantType: 'Restaurant Type',
    serviceType: 'Service Type',
    selectServiceType: 'Select service type',
    dineIn: 'Dine-in',
    takeOut: 'Take-out',
    both: 'Both',
    specifyRestaurantType: 'Specify Restaurant Type',
    websiteUrl: 'Website URL',
    contactInfo: 'Contact Information',
    contactNumber: 'Contact Number',
    contactPersonName: "Contact Person Name",
    contactPersonNumber: 'Contact Person Number',
    sameAsContactNumber: 'Same as Contact Number',
    contactPersonEmail: 'Contact Person Email',
    reservationEmail: 'Reservation Email',
    sendVerification: 'Send verification link',
    verificationSent: 'Verification email sent.',
    verificationFail: 'Failed to send verification email.',
    restaurantImage: 'Restaurant Image',
    uploadMethod: 'Upload Method',
    uploadMethodHint: '(JPEG, PNG or URL)',
    uploadImage: 'Upload Image',
    enterUrl: 'Enter URL',
    imageUrl: 'Image URL',
    uploadCta: 'Click to upload or drag and drop',
    uploadNote: 'PNG, JPG up to 5MB',
    imageNotAvailable: 'Image not available',
    captchaFill: 'Please complete the CAPTCHA before submitting.',
    captchaUnset: 'reCAPTCHA site key is not set. Add VITE_RECAPTCHA_SITE_KEY to your .env for bot protection.',
    captchaProtected: 'This form is protected by reCAPTCHA and the Google',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    getCurrentLocation: 'Get Current Location',
    cancel: 'Cancel',
    savingRestaurant: 'Saving Restaurant...',
    saveRestaurant: 'Save Restaurant',
    submitting: 'Submitting…',
    tooManyAttempts: 'Too many attempts. Please wait {min} min and try again.'
  },
  fi: {
    addNewRestaurant: 'Lisää ravintola',
    addRestaurantSubtitle: 'Täytä tiedot lisätäksesi ravintolasi',
    basicInfo: 'Perustiedot',
    restaurantName: 'Ravintolan nimi',
    orgNumber: 'Y-tunnus',
    location: 'Sijainti',
    selectRestaurantType: 'Valitse ravintolatyyppi',
    restaurantType: 'Ravintolatyyppi',
    serviceType: 'Palvelutyyppi',
    selectServiceType: 'Valitse palvelutyyppi',
    dineIn: 'Paikan päällä',
    takeOut: 'Nouto',
    both: 'Molemmat',
    specifyRestaurantType: 'Määritä ravintolatyyppi',
    websiteUrl: 'Verkkosivusto',
    contactInfo: 'Yhteystiedot',
    contactNumber: 'Puhelinnumero',
    contactPersonName: 'Yhteyshenkilön nimi',
    contactPersonNumber: 'Yhteyshenkilön numero',
    sameAsContactNumber: 'Sama kuin puhelinnumero',
    contactPersonEmail: 'Yhteyshenkilön sähköposti',
    reservationEmail: 'Varaussähköposti',
    sendVerification: 'Lähetä vahvistuslinkki',
    verificationSent: 'Vahvistusviesti lähetetty.',
    verificationFail: 'Vahvistusviestin lähetys epäonnistui.',
    restaurantImage: 'Ravintolan kuva',
    uploadMethod: 'Lataustapa',
    uploadMethodHint: '(JPEG, PNG tai URL)',
    uploadImage: 'Lataa kuva',
    enterUrl: 'Anna URL',
    imageUrl: 'Kuvan URL',
    uploadCta: 'Napsauta ladataksesi tai vedä ja pudota',
    uploadNote: 'PNG, JPG enintään 5 Mt',
    imageNotAvailable: 'Kuva ei saatavilla',
    captchaFill: 'Täytä CAPTCHA ennen lähetystä.',
    captchaUnset: '.env puuttuu VITE_RECAPTCHA_SITE_KEY',
    captchaProtected: 'Tämä lomake on suojattu reCAPTCHA:lla ja Googlen',
    privacyPolicy: 'Tietosuojakäytäntö',
    termsOfService: 'Käyttöehdot',
    getCurrentLocation: 'Hae nykyinen sijainti',
    cancel: 'Peruuta',
    savingRestaurant: 'Tallennetaan ravintolaa...',
    saveRestaurant: 'Tallenna ravintola',
    submitting: 'Lähetetään…',
    tooManyAttempts: 'Liian monta yritystä. Odota {min} min ja yritä uudelleen.'
  },
  no: {
    addNewRestaurant: 'Legg til restaurant',
    addRestaurantSubtitle: 'Fyll inn detaljene for å legge til restauranten',
    basicInfo: 'Grunnleggende informasjon',
    restaurantName: 'Restaurantnavn',
    orgNumber: 'Organisasjonsnummer',
    location: 'Lokasjon',
    selectRestaurantType: 'Velg restauranttype',
    restaurantType: 'Restauranttype',
    serviceType: 'Tjenestetype',
    selectServiceType: 'Velg tjenestetype',
    dineIn: 'Servering',
    takeOut: 'Take-away',
    both: 'Begge',
    specifyRestaurantType: 'Spesifiser restauranttype',
    websiteUrl: 'Nettadresse',
    contactInfo: 'Kontaktinformasjon',
    contactNumber: 'Telefonnummer',
    contactPersonName: 'Kontaktperson navn',
    contactPersonNumber: 'Kontaktperson nummer',
    sameAsContactNumber: 'Samme som telefonnummer',
    contactPersonEmail: 'Kontaktperson e‑post',
    reservationEmail: 'Reservasjons‑epost',
    sendVerification: 'Send verifikasjonslenke',
    verificationSent: 'Verifisering sendt.',
    verificationFail: 'Kunne ikke sende verifisering.',
    restaurantImage: 'Restaurantbilde',
    uploadMethod: 'Opplastingsmetode',
    uploadMethodHint: '(JPEG, PNG eller URL)',
    uploadImage: 'Last opp bilde',
    enterUrl: 'Skriv inn URL',
    imageUrl: 'Bilde-URL',
    uploadCta: 'Klikk for å laste opp eller dra og slipp',
    uploadNote: 'PNG, JPG opptil 5 MB',
    imageNotAvailable: 'Bilde ikke tilgjengelig',
    captchaFill: 'Fullfør CAPTCHA før innsending.',
    captchaUnset: 'VITE_RECAPTCHA_SITE_KEY mangler i .env',
    captchaProtected: 'Dette skjemaet er beskyttet av reCAPTCHA og Googles',
    privacyPolicy: 'Personvern',
    termsOfService: 'Vilkår',
    getCurrentLocation: 'Hent posisjon',
    cancel: 'Avbryt',
    savingRestaurant: 'Lagrer restaurant...',
    saveRestaurant: 'Lagre restaurant',
    submitting: 'Sender…',
    tooManyAttempts: 'For mange forsøk. Vent {min} min og prøv igjen.'
  },
  sv: {
    addNewRestaurant: 'Lägg till restaurang',
    addRestaurantSubtitle: 'Fyll i uppgifterna för att lägga till din restaurang',
    basicInfo: 'Grundläggande information',
    restaurantName: 'Restaurangens namn',
    orgNumber: 'Organisationsnummer',
    location: 'Plats',
    selectRestaurantType: 'Välj restaurangtyp',
    restaurantType: 'Restaurangtyp',
    serviceType: 'Tjänstetyp',
    selectServiceType: 'Välj tjänstetyp',
    dineIn: 'Äta på plats',
    takeOut: 'Avhämtning',
    both: 'Båda',
    specifyRestaurantType: 'Ange restaurangtyp',
    websiteUrl: 'Webbplats',
    contactInfo: 'Kontaktinformation',
    contactNumber: 'Telefonnummer',
    contactPersonName: 'Kontaktpersonens namn',
    contactPersonNumber: 'Kontaktpersonens nummer',
    sameAsContactNumber: 'Samma som telefonnummer',
    contactPersonEmail: 'Kontaktpersonens e‑post',
    reservationEmail: 'Boknings‑e‑post',
    sendVerification: 'Skicka verifieringslänk',
    verificationSent: 'Verifieringsmejl skickat.',
    verificationFail: 'Det gick inte att skicka verifieringsmejl.',
    restaurantImage: 'Restaurangbild',
    uploadMethod: 'Uppladdningsmetod',
    uploadMethodHint: '(JPEG, PNG eller URL)',
    uploadImage: 'Ladda upp bild',
    enterUrl: 'Ange URL',
    imageUrl: 'Bild‑URL',
    uploadCta: 'Klicka för att ladda upp eller dra och släpp',
    uploadNote: 'PNG, JPG upp till 5 MB',
    imageNotAvailable: 'Bild inte tillgänglig',
    captchaFill: 'Slutför CAPTCHA innan du skickar.',
    captchaUnset: 'VITE_RECAPTCHA_SITE_KEY saknas i .env',
    captchaProtected: 'Detta formulär skyddas av reCAPTCHA och Googles',
    privacyPolicy: 'Sekretesspolicy',
    termsOfService: 'Användarvillkor',
    getCurrentLocation: 'Hämta plats',
    cancel: 'Avbryt',
    savingRestaurant: 'Sparar restaurang...',
    saveRestaurant: 'Spara restaurang',
    submitting: 'Skickar…',
    tooManyAttempts: 'För många försök. Vänta {min} min och försök igen.'
  },
  de: {
    addNewRestaurant: 'Neues Restaurant hinzufügen',
    addRestaurantSubtitle: 'Gib die Details ein, um dein Restaurant hinzuzufügen',
    basicInfo: 'Grundlegende Informationen',
    restaurantName: 'Restaurantname',
    orgNumber: 'Organisationsnummer',
    location: 'Standort',
    selectRestaurantType: 'Restauranttyp auswählen',
    restaurantType: 'Restauranttyp',
    serviceType: 'Servicetyp',
    selectServiceType: 'Servicetyp auswählen',
    dineIn: 'Vor Ort',
    takeOut: 'Zum Mitnehmen',
    both: 'Beides',
    specifyRestaurantType: 'Restauranttyp angeben',
    websiteUrl: 'Webseite',
    contactInfo: 'Kontaktinformationen',
    contactNumber: 'Telefonnummer',
    contactPersonName: 'Name der Kontaktperson',
    contactPersonNumber: 'Telefon der Kontaktperson',
    sameAsContactNumber: 'Wie Telefonnummer',
    contactPersonEmail: 'E‑Mail der Kontaktperson',
    reservationEmail: 'Reservierungs‑E‑Mail',
    sendVerification: 'Bestätigungslink senden',
    verificationSent: 'Bestätigungs‑E‑Mail gesendet.',
    verificationFail: 'Bestätigungs‑E‑Mail konnte nicht gesendet werden.',
    restaurantImage: 'Restaurantbild',
    uploadMethod: 'Upload‑Methode',
    uploadMethodHint: '(JPEG, PNG oder URL)',
    uploadImage: 'Bild hochladen',
    enterUrl: 'URL eingeben',
    imageUrl: 'Bild‑URL',
    uploadCta: 'Klicken zum Hochladen oder per Drag & Drop',
    uploadNote: 'PNG, JPG bis 5 MB',
    imageNotAvailable: 'Bild nicht verfügbar',
    captchaFill: 'Bitte CAPTCHA vor dem Senden ausfüllen.',
    captchaUnset: 'VITE_RECAPTCHA_SITE_KEY fehlt in .env',
    captchaProtected: 'Dieses Formular ist durch reCAPTCHA und die Google',
    privacyPolicy: 'Datenschutzerklärung',
    termsOfService: 'Nutzungsbedingungen',
    getCurrentLocation: 'Aktuellen Standort abrufen',
    cancel: 'Abbrechen',
    savingRestaurant: 'Restaurant wird gespeichert...',
    saveRestaurant: 'Restaurant speichern',
    submitting: 'Senden…',
    tooManyAttempts: 'Zu viele Versuche. Bitte {min} Min. warten und erneut versuchen.'
  },
};
const t = (k, vars = {}) => {
  const raw = (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;
  if (typeof raw !== 'string') return raw;
  return raw.replace(/\{(.*?)\}/g, (_, v) => vars[v] ?? `{${v}}`);
};
useEffect(() => {
  const handler = (e) => {
    const code = e?.detail;
    if (typeof code === 'string') setLang(code);
  };
  window.addEventListener('app:setLanguage', handler);
  return () => window.removeEventListener('app:setLanguage', handler);
}, []);

useEffect(() => {
  // On mount, sync with the latest saved language
  const saved = localStorage.getItem('app_lang');
  if (saved) setLang(saved);
  // Also respond to cross-tab/local changes
  const onStorage = (e) => {
    if (e.key === 'app_lang') setLang(e.newValue || 'en');
  };
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}, []);

  const restaurantTypes = [
    "Others",
    "Brasseries & Trattorias",
    "Cafés & Bakeries",
    "Cocktail Bars",
    "Ethnic & Regional",
    "Food Halls",
    "Food Trucks",
    "French",
    "Gourmet Experiences",
    "Husmannskost",
    "Italian",
    "Japanese",
    "Middle Eastern",
    "New Nordic Cuisine",
    "Pubs & Clubs",
    "Seafood Specialties",
    "Spanish",
    "Vegetarian & Vegan",
    "Wine Bars",
  ];

  const handleTypeChange = (e) => {
    const value = e.target.value;
    if (value !== "Others") {
      setForm((prev) => ({ ...prev, Type: value, otherType: "" }));
    } else {
      setForm((prev) => ({ ...prev, Type: "", otherType: "" }));
    }
  };

  const handleOtherTypeChange = (e) => {
    setForm((prev) => ({ ...prev, otherType: e.target.value }));
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyCUASd5tq-_JzpWMPxAhkGtDWFDUCnmfK4`
          );
          const data = await response.json();
          if (data.status === "OK" && data.results.length > 0) {
            const address = data.results[0].formatted_address;
            setForm((prev) => ({
              ...prev,
              Location: address,
              lat: latitude,
              lng: longitude,
            }));
          } else {
            alert("No address found for your location.");
            setForm((prev) => ({
              ...prev,
              Location: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`,
              lat: latitude,
              lng: longitude,
            }));
          }
        } catch (error) {
          alert("Failed to get address: " + error.message);
          setForm((prev) => ({
            ...prev,
            Location: `Lat: ${latitude.toFixed(5)}, Lng: ${longitude.toFixed(5)}`,
            lat: latitude,
            lng: longitude,
          }));
        }
      },
      (error) => {
        alert("Unable to retrieve location: " + error.message);
      }
    );
  };

  // Geocode a free-typed address and set lat/lng
  const geocodeAddress = async (address) => {
    const query = (address || "").trim();
    if (!query) return;
    try {
      const resp = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query
        )}&key=AIzaSyCUASd5tq-_JzpWMPxAhkGtDWFDUCnmfK4`
      );
      const data = await resp.json();
      if (data.status === "OK" && data.results && data.results[0]) {
        const { lat, lng } = data.results[0].geometry.location;
        setForm((prev) => ({ ...prev, lat, lng }));
      }
    } catch (e) {
      console.error("Geocode error:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="relative w-full max-w-5xl rounded-2xl bg-white shadow-2xl max-h-[95vh] overflow-hidden border border-gray-100">
        {/* Header with solid orange */}
        <div className="relative px-8 py-6" style={{ backgroundColor: "#e28743" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-white">{t('addNewRestaurant')}</h3>
             <p className="text-orange-100 text-sm mt-1">{t('addRestaurantSubtitle')}</p>
            </div>
            <button
              onClick={closeModal}
              className="rounded-xl p-2 text-white/80 hover:text-white hover:bg:white/20 transition-all duration-200 backdrop-blur-sm"
              aria-label="Close modal"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </div>
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-12 -translate-x-12"></div>
        </div>

        {rateLimitMsg && (
          <div className="px-8 py-3 bg-red-50 text-red-700 text-sm">{rateLimitMsg}</div>
        )}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)]">
          <form onSubmit={internalHandleSubmit} className="p-8 space-y-8">
            {/* Basic Information Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-[#e28743] to-red-500 rounded-full"></div>
                <h4 className="text-xl font-semibold text-gray-800">{t('basicInfo')}</h4>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Restaurant Name */}
                <FormField
                  label={t('restaurantName')}
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t('restaurantName')}
                  icon={<RestaurantIcon />}
                />

                {/* Organization Number */}
                <FormField
                  label={t('orgNumber')}
                  id="organizationNumber"
                  name="organizationNumber"
                  type="text"
                  placeholder={t('orgNumber')}
                  value={form.organizationNumber || ""}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, organizationNumber: e.target.value }))
                  }
                />

            {/* Location with Get Location Button and Map Picker */}
            <div className="lg:col-span-2">
              <FormField
                label={t('location')}
                id="Location"
                name="Location"
                type="text"
                required
                value={form.Location}
                onChange={handleChange}
                onBlur={(e) => geocodeAddress(e.target.value)}
                placeholder={t('location')}
                icon={<LocationIcon />}
                rightElement={
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    {/* Get Current Location Button */}
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      className="rounded-lg bg-gradient-to-r from-[#e28743] to-red-500 hover:bg-[#c16f34] hover:from-[#c16f34] hover:to-red-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md"
                      title={t('getCurrentLocation')}
                    >
                      <PinLocationIcon className="h-4 w-4" />
                    </button>
                    
                    {/* Map Picker Button */}
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md flex items-center gap-1"
                      title="Pick location on map"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </button>
                  </div>
                }
              />
              
              {/* Display coordinates if available */}
              {(form.lat || form.lng) && (
                <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  <span className="font-mono">
                    Lat: {typeof form.lat === 'number' ? form.lat.toFixed(6) : form.lat || '—'}, 
                    Lng: {typeof form.lng === 'number' ? form.lng.toFixed(6) : form.lng || '—'}
                  </span>
                </div>
              )}
            </div>

            {/* Location Picker Modal */}
            {showLocationPicker && (
              <LocationPickerModal
                isOpen={showLocationPicker}
                onClose={() => setShowLocationPicker(false)}
                initialLocation={
                  form.lat && form.lng
                    ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) }
                    : null
                }
                initialAddress={form.Location || ''}
                onLocationSelected={(location, address) => {
                  setForm((prev) => ({
                    ...prev,
                    Location: address,
                    lat: location.lat,
                    lng: location.lng,
                  }));
                  setShowLocationPicker(false);
                }}
              />
            )}

                {/* Restaurant Type */}
                <div className="space-y-2">
                  <label htmlFor="Type" className="block text-sm font-semibold text-gray-700">
                    {t('restaurantType')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <CategoryIcon />
                    </div>
                    <select
                      id="Type"
                      name="Type"
                      value={form.Type || (form.otherType ? "Others" : "")}
                      onChange={handleTypeChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 appearance-none cursor-pointer focus:ring-4 focus:ring-[#e28743]/10"
                      style={{
                        borderColor:
                          form.Type || (form.otherType ? "Others" : "") ? "#e28743" : undefined,
                      }}
                    >
                     <option value="">{t('selectRestaurantType')}</option>
                      {restaurantTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Service Type */}
                <div className="space-y-2">
                  <label htmlFor="serviceType" className="block text-sm font-semibold text-gray-700">
                    {t('serviceType')}
                  </label>
                  <div className="relative">
                    <select
                      id="serviceType"
                      name="serviceType"
                      value={form.serviceType}
                      onChange={handleServiceTypeChange}
                      className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 appearance-none cursor-pointer focus:ring-4 focus:ring-[#e28743]/10"
                      style={{ borderColor: form.serviceType ? "#e28743" : undefined }}
                    >
                      <option value="">{t('selectServiceType')}</option>
                      <option value="dine">{t('dineIn')}</option>
                      <option value="take">{t('takeOut')}</option>
                      <option value="both">{t('both')}</option>
                    </select>
                    <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {/* Other Type input */}
                {form.Type === "" && form.otherType !== undefined && (
                  <FormField
                    label={t('specifyRestaurantType')}
                    id="otherType"
                    name="otherType"
                    type="text"
                    placeholder={t('specifyRestaurantType')}
                    value={form.otherType}
                    onChange={handleOtherTypeChange}
                    icon={<CategoryIcon />}
                  />
                )}

                {/* Website URL */}
                <FormField
                  label={t('websiteUrl')}
                  id="Web_link"
                  name="Web_link"
                  type="url"
                  placeholder="https://example.com"
                  value={form.Web_link}
                  onChange={handleChange}
                  icon={<WebIcon />}
                />

                {/* Contact Information Section */}
                <div className="lg:col-span-2 space-y-4 border-t border-b border-gray-200 pt-4 pb-4">
                  <h5 className="text-md font-semibold text-gray-700">{t('contactInfo')}</h5>
                  <div className="grid min-w-0 grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {/* Row 1: Contact Number, Contact Person Name */}
                    <FormField
                      label={t('contactNumber')}
                      id="Contact_number"
                      name="Contact_number"
                      type="tel"
                      value={form.Contact_number}
                      onChange={handleChange}
                      placeholder="+1 (555) 123-4567"
                      icon={<PhoneIcon />}
                    />
                    <FormField
                     label={t('contactPersonName')}
                      id="ContactPerson_name"
                      name="ContactPerson_name"
                      type="text"
                      value={form.ContactPerson_name || ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, ContactPerson_name: e.target.value }))
                      }
                      placeholder="Enter contact person's full name"
                      icon={<RestaurantIcon />}
                    />
                    {/* Row 2: Contact Person Number (with button), Contact Person Email */}
                    <div className="space-y-2">
                      <FormField
                        label={t('contactPersonNumber')}
                        id="ContactPerson_number"
                        name="ContactPerson_number"
                        type="tel"
                        value={form.ContactPerson_number || ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, ContactPerson_number: e.target.value }))
                        }
                        placeholder="+1 (555) 987-6543"
                        icon={<PhoneIcon />}
                      />
                      <button
                        type="button"
                        className="mt-1 text-xs text-[#e28743] hover:text-[#c16f34]"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            ContactPerson_number: prev.Contact_number,
                          }))
                        }
                      >{t('sameAsContactNumber')}
                      </button>
                    </div>
                    <FormField
                      label={t('contactPersonEmail')}
                      id="ContactPerson_email"
                      name="ContactPerson_email"
                      type="email"
                      value={form.ContactPerson_email || ""}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, ContacaddtPerson_email: e.target.value }))
                      }
                      placeholder="contact@example.com"
                      icon={<WebIcon />}
                    />
                    {/* Row 3: Reservation Email full width */}
                    <div className="lg:col-span-2">
                      <FormField
                        label={t('reservationEmail')}
                        id="Reservation_email"
                        name="Reservation_email"
                        type="email"
                        value={form.Reservation_email || ""}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, Reservation_email: e.target.value }))
                        }
                        placeholder="reservation@example.com"
                        icon={<WebIcon />}
                      />
                    </div>
                    <div className="lg:col-span-2 mt-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={sendVerificationToReservationEmail}
                          className="text-xs px-3 py-1 rounded-md border"
                          style={{ borderColor: "#e28743", color: "#e28743" }}
                          disabled={emailVerifyStatus.sending}
                        >
                         {emailVerifyStatus.sending ? t('submitting') : t('sendVerification')}
                        </button>
                        {emailVerifyStatus.sent && (
                          <span className="text-xs text-green-600">{t('verificationSent')}</span>
                        )}
                        {emailVerifyStatus.error && (
                          <span className="text-xs text-red-600">{emailVerifyStatus.error}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-gradient-to-b from-[#e28743] to-red-500 rounded-full"></div>
                <h4 className="text-xl font-semibold text-gray-800">{t('restaurantImage')}</h4>
              </div>

              <div
                className="bg-gradient-to-br from-[#e28743]/10 to-red-50 rounded-xl p-6 border"
                style={{ borderColor: "#e28743" }}
              >
                <div className="space-y-4">
                  <label className="block text-sm font-semibold text-gray-700">
                   {t('uploadMethod')}
                    <span className="ml-2 font-normal" style={{ color: "#e28743" }}>
                     {t('uploadMethodHint')}
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-0 bg-white rounded-xl p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imageInputMethod: "upload" }))}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        form.imageInputMethod !== "url"
                          ? "shadow-lg hover:bg-[#c16f34]"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                      style={
                        form.imageInputMethod !== "url"
                          ? { backgroundColor: "#e28743", color: "#fff" }
                          : undefined
                      }
                    >
                      <UploadIcon className="h-4 w-4" />
                      {t('uploadImage')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, imageInputMethod: "url" }))}
                      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
                        form.imageInputMethod === "url"
                          ? "shadow-lg hover:bg-[#c16f34]"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                      style={
                        form.imageInputMethod === "url"
                          ? { backgroundColor: "#e28743", color: "#fff" }
                          : undefined
                      }
                    >
                      <LinkIcon className="h-4 w-4" />
                     {t('enterUrl')}
                    </button>
                  </div>

                  {form.imageInputMethod !== "url" ? (
                    <div className="space-y-3">
                      <label className="block cursor-pointer group">
                        <div
                          className="rounded-xl border-2 border-dashed bg-white p-8 text-center transition-all duration-200 group-hover:bg-orange-50/50"
                          style={{ borderColor: "#e28743" }}
                        >
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            required={!form.imageUrl && !form.imageFile}
                            className="hidden"
                          />
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="p-4 rounded-full" style={{ backgroundColor: "#e28743", opacity: 0.2 }}>
                              <UploadIcon className="h-8 w-8" style={{ color: "#e28743", opacity: 1 }} />
                            </div>
                            <div>
                              <p className="text-lg font-semibold text-gray-700">
                                {form.imageFile ? form.imageFile.name : t('uploadCta')}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">{t('uploadNote')}</p>
                            </div>
                          </div>
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <FormField
                        label={t('imageUrl')}
                        id="imageUrl"
                        name="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={form.imageUrl}
                        onChange={(e) => setForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                        required={!form.imageFile}
                        icon={<LinkIcon />}
                      />
                    </div>
                  )}

                  {(form.imageUrl || form.imageFile) && (
                    <div className="relative">
                      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
                        <img
                          src={form.imageInputMethod === "url" ? form.imageUrl : URL.createObjectURL(form.imageFile)}
                          alt="Preview"
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23f3f4f6'/%3E%3Ctext x='50%' y='50%' font-family='sans-serif' font-size='12' fill='%23374151' text-anchor='middle' dominant-baseline='middle'%3E${encodeURIComponent(t('imageNotAvailable'))}%3C/text%3E%3C/svg%3E";
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              imageUrl: "",
                              imageFile: null,
                            }))
                          }
                          className="absolute top-3 right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg transition-all duration-200 hover:scale-110"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bot protection */}
            {RECAPTCHA_SITE_KEY ? (
              <div className="pt-2">
               <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={RECAPTCHA_SITE_KEY}
                  onChange={(tok) => setCaptchaToken(tok || "")}
                  onExpired={() => setCaptchaToken("")}
                  onError={() => setCaptchaToken("")}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {t('captchaProtected')}{" "}
                  <a className="underline" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">{t('privacyPolicy')}</a> and{" "}
                  <a className="underline" href="https://policies.google.com/terms" target="_blank" rel="noreferrer">{t('termsOfService')}</a> apply.
                </p>
              </div>
            ) : (
              <p className="text-xs text-amber-600">{t('captchaUnset')}</p>
            )}
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={closeModal}
                disabled={uploading || submitting}
                className="order-2 sm:order-1 rounded-xl border-2 bg-white hover:bg-gray-50 py-3 px-8 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 disabled:opacity-50 hover:border-gray-300"
                style={{ borderColor: "#e28743" }}
              >
                {t('cancel')}
              </button>
             <button
              type="submit"
              disabled={
                uploading ||
                submitting ||
                (RECAPTCHA_SITE_KEY && !captchaToken) || // ⛔ block until solved
                (!form.imageUrl && !form.imageFile)
              }
              className="order-1 sm:order-2 rounded-xl py-3 px-8 text-sm font-semibold text-white shadow-lg transition-all duration-200 disabled:opacity-50 hover:shadow-xl transform hover:-translate-y-0.5 disabled:hover:transform-none hover:bg-[#c16f34]"
              style={{ backgroundColor: "#e28743" }}
              title={RECAPTCHA_SITE_KEY && !captchaToken ? t('captchaFill') : undefined}
            >
                {uploading || submitting ? (
                  <span className="flex items-center justify-center gap-3">
                    <Spinner className="h-5 w-5 text-white" />
                    {submitting ? t('submitting') : t('savingRestaurant')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <SaveIcon className="h-5 w-5" />
                   {t('saveRestaurant')}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// --- Helper Components ---

function FormField({
  label,
  id,
  name,
  type,
  placeholder,
  required,
  value,
  onChange,
  onBlur,
  icon,
  rightElement,
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="relative">
        {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
        <input
          id={id}
          type={type}
          name={name}
          placeholder={placeholder}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full ${icon ? "pl-10" : "pl-4"} ${
            rightElement ? "pr-32" : "pr-4"
          } py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 focus:bg-white transition-all duration-200`}
        />
        {rightElement}
      </div>
    </div>
  );
}

// --- Icon Components ---

function Spinner({ className = "h-4 w-4", style }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      style={{ color: "#e28743", ...style }}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

function UploadIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

function XIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function PlusIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function XMarkIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LocationIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PinLocationIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 21s8-4.5 8-10a8 8 0 10-16 0c0 5.5 8 10 8 10z" />
    </svg>
  );
}

function RestaurantIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l5.5-3 5.5 3z" />
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

function CategoryIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function WebIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  );
}

function ClockIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CalendarIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function TrashIcon({ className = "h-4 w-4" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function LinkIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  );
}

function ChevronDownIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function SaveIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  );
}