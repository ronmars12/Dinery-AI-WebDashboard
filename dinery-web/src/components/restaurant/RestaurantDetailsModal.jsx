import React, { useState, useEffect } from "react";
import LocationPickerModal from './LocationPickerModal';

// Helper to format time (HH:mm) to h:mm AM/PM
function formatTime(timeStr) {
  if (!timeStr) return "--:--";
  const [hour, min] = timeStr.split(":");
  let h = parseInt(hour, 10);
  if (isNaN(h)) return "--:--";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

// Helper: support both string days ("Monday") and object days ({ name: "Monday", ... })
function formatDayLabel(day) {
  if (!day) return "";
  if (typeof day === "object") {
    return day.name || day.day || "";
  }
  return String(day);
}

// Ensure each day becomes an object with { name, maxGuests }
function toDayObj(day, defaultMax = 0) {
  if (!day) return null;
  if (typeof day === "object") {
    return {
      name: day.name || day.day || "",
      maxGuests: Number.isFinite(day.maxGuests) ? day.maxGuests : defaultMax,
    };
  }
  return { name: String(day), maxGuests: defaultMax };
}

// If you want a single number for display, pick first day's maxGuests (fallback 0)
function getRowMaxGuests(row) {
  const days = Array.isArray(row?.days) ? row.days : [];
  const first = days[0];
  if (!first) return 0;
  return Number.isFinite(first.maxGuests) ? first.maxGuests : 0;
}

export default function RestaurantDetailsModal({ restaurant, onClose, onRemove, onEdit }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedRestaurant, setEditedRestaurant] = useState(restaurant);

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const i18n = {
    en: {
      untitled: 'Untitled',
      now: 'Now',
      open: 'Open',
      closed: 'Closed',
      noImage: 'No image available',
      notSpecified: 'Not specified',
      // sections
      location: 'Location',
      orgNumber: 'Organization Number',
      serviceType: 'Service Type',
      dineIn: 'Dine-in',
      takeOut: 'Take-out',
      both: 'Both',
      closedDates: 'Closed Dates',
      noClosedDatesYet: 'No closed dates yet.',
      endDateAfterStart: 'End date must be after start date.',
      addClosedDate: 'Add Closed Date',
      contactNumber: 'Contact Number',
      contactPerson: 'Contact Person',
      contactPersonName: 'Contact Person Name',
      contactPersonEmail: 'Contact Person Email',
      reservationEmail: 'Reservation Email',
      website: 'Website',
      visitWebsite: 'Visit Website',
      operatingHours: 'Operating Hours',
      customHours: 'Custom Hours',
      selectDays: 'Select Days',
      openTime: 'Open Time',
      closeTime: 'Close Time',
      addHours: 'Add Hours',
      addedCustomHours: 'Added Custom Hours',
      guests: '{count} guests',
      opens: 'Opens:',
      closes: 'Closes:',
      setOperatingTimes: 'Set your Operating Times',
      save: 'Save',
      cancel: 'Cancel',
      editRestaurant: 'Edit Restaurant',
      removeRestaurant: 'Remove Restaurant',
      close: 'Close',
      // confirm modal
      confirmRemoval: 'Confirm Removal',
      confirmRemovalDesc: 'Are you sure you want to remove {name}? This action cannot be undone.',
      confirm: 'Confirm',
      // titles / tooltips
      removeClosedDate: 'Remove closed date',
      remove: 'Remove',
      dayAlreadyAdded: '{day} already added',
      selectDay: 'Select {day}',
      // alerts
      removedSuccessfully: 'Removed "{name}" successfully.',
      removeFailed: 'Failed to remove restaurant: ',
      updateError: 'Error updating restaurant: ',
    },
    fi: {
      untitled: 'Nimetön',
      now: 'Nyt',
      open: 'Auki',
      closed: 'Suljettu',
      noImage: 'Ei kuvaa saatavilla',
      notSpecified: 'Ei määritetty',
      location: 'Sijainti',
      orgNumber: 'Y-tunnus',
      serviceType: 'Palvelutyyppi',
      dineIn: 'Paikan päällä',
      takeOut: 'Nouto',
      both: 'Molemmat',
      closedDates: 'Suljetut päivät',
      noClosedDatesYet: 'Ei suljettuja päiviä.',
      endDateAfterStart: 'Loppupäivän on oltava aloituspäivän jälkeen.',
      addClosedDate: 'Lisää suljettu päivä',
      contactNumber: 'Puhelinnumero',
      contactPerson: 'Yhteyshenkilö',
      contactPersonName: 'Yhteyshenkilön nimi',
      contactPersonEmail: 'Yhteyshenkilön sähköposti',
      reservationEmail: 'Varaussähköposti',
      website: 'Verkkosivusto',
      visitWebsite: 'Vieraile sivustolla',
      operatingHours: 'Aukioloajat',
      customHours: 'Mukautetut ajat',
      selectDays: 'Valitse päivät',
      openTime: 'Aukeamisaika',
      closeTime: 'Sulkemisaika',
      addHours: 'Lisää ajat',
      addedCustomHours: 'Lisätyt mukautetut ajat',
      guests: '{count} asiakasta',
      opens: 'Avautuu:',
      closes: 'Sulkeutuu:',
      setOperatingTimes: 'Aseta aukioloaikasi',
      save: 'Tallenna',
      cancel: 'Peruuta',
      editRestaurant: 'Muokkaa ravintolaa',
      removeRestaurant: 'Poista ravintola',
      close: 'Sulje',
      confirmRemoval: 'Vahvista poistaminen',
      confirmRemovalDesc: 'Haluatko varmasti poistaa kohteen {name}? Toimintoa ei voi perua.',
      confirm: 'Vahvista',
      removeClosedDate: 'Poista suljettu päivä',
      remove: 'Poista',
      dayAlreadyAdded: '{day} on jo lisätty',
      selectDay: 'Valitse {day}',
      removedSuccessfully: 'Poistettu "{name}" onnistuneesti.',
      removeFailed: 'Ravintolan poistaminen epäonnistui: ',
      updateError: 'Virhe päivitettäessä: ',
    },
    no: {
      untitled: 'Uten tittel',
      now: 'Nå',
      open: 'Åpen',
      closed: 'Stengt',
      noImage: 'Ingen bilde tilgjengelig',
      notSpecified: 'Ikke spesifisert',
      location: 'Lokasjon',
      orgNumber: 'Organisasjonsnummer',
      serviceType: 'Tjenestetype',
      dineIn: 'Servering',
      takeOut: 'Take-away',
      both: 'Begge',
      closedDates: 'Stengte datoer',
      noClosedDatesYet: 'Ingen stengte datoer enda.',
      endDateAfterStart: 'Sluttdato må være etter startdato.',
      addClosedDate: 'Legg til stengt dato',
      contactNumber: 'Telefonnummer',
      contactPerson: 'Kontaktperson',
      contactPersonName: 'Kontaktperson navn',
      contactPersonEmail: 'Kontaktperson e-post',
      reservationEmail: 'Reservasjons-epost',
      website: 'Nettsted',
      visitWebsite: 'Besøk nettsted',
      operatingHours: 'Åpningstider',
      customHours: 'Egendefinerte tider',
      selectDays: 'Velg dager',
      openTime: 'Åpningstid',
      closeTime: 'Stengetid',
      addHours: 'Legg til tider',
      addedCustomHours: 'Lagrede egendefinerte tider',
      guests: '{count} gjester',
      opens: 'Åpner:',
      closes: 'Stenger:',
      setOperatingTimes: 'Sett åpningstidene dine',
      save: 'Lagre',
      cancel: 'Avbryt',
      editRestaurant: 'Rediger restaurant',
      removeRestaurant: 'Fjern restaurant',
      close: 'Lukk',
      confirmRemoval: 'Bekreft fjerning',
      confirmRemovalDesc: 'Er du sikker på at du vil fjerne {name}? Dette kan ikke angres.',
      confirm: 'Bekreft',
      removeClosedDate: 'Fjern stengt dato',
      remove: 'Fjern',
      dayAlreadyAdded: '{day} er allerede lagt til',
      selectDay: 'Velg {day}',
      removedSuccessfully: 'Fjernet "{name}".',
      removeFailed: 'Kunne ikke fjerne restaurant: ',
      updateError: 'Feil ved oppdatering: ',
    },
    sv: {
      untitled: 'Utan titel',
      now: 'Nu',
      open: 'Öppen',
      closed: 'Stängd',
      noImage: 'Ingen bild tillgänglig',
      notSpecified: 'Ej angivet',
      location: 'Plats',
      orgNumber: 'Organisationsnummer',
      serviceType: 'Tjänstetyp',
      dineIn: 'Äta på plats',
      takeOut: 'Avhämtning',
      both: 'Båda',
      closedDates: 'Stängda datum',
      noClosedDatesYet: 'Inga stängda datum ännu.',
      endDateAfterStart: 'Slutdatum måste vara efter startdatum.',
      addClosedDate: 'Lägg till stängt datum',
      contactNumber: 'Telefonnummer',
      contactPerson: 'Kontaktperson',
      contactPersonName: 'Kontaktpersonens namn',
      contactPersonEmail: 'Kontaktpersonens e-post',
      reservationEmail: 'Boknings-e-post',
      website: 'Webbplats',
      visitWebsite: 'Besök webbplats',
      operatingHours: 'Öppettider',
      customHours: 'Anpassade tider',
      selectDays: 'Välj dagar',
      openTime: 'Öppningstid',
      closeTime: 'Stängningstid',
      addHours: 'Lägg till tider',
      addedCustomHours: 'Tillagda anpassade tider',
      guests: '{count} gäster',
      opens: 'Öppnar:',
      closes: 'Stänger:',
      setOperatingTimes: 'Ställ in dina öppettider',
      save: 'Spara',
      cancel: 'Avbryt',
      editRestaurant: 'Redigera restaurang',
      removeRestaurant: 'Ta bort restaurang',
      close: 'Stäng',
      confirmRemoval: 'Bekräfta borttagning',
      confirmRemovalDesc: 'Är du säker på att du vill ta bort {name}? Detta kan inte ångras.',
      confirm: 'Bekräfta',
      removeClosedDate: 'Ta bort stängt datum',
      remove: 'Ta bort',
      dayAlreadyAdded: '{day} har redan lagts till',
      selectDay: 'Välj {day}',
      removedSuccessfully: '"{name}" togs bort.',
      removeFailed: 'Det gick inte att ta bort restaurangen: ',
      updateError: 'Fel vid uppdatering: ',
    },
    de: {
      untitled: 'Ohne Titel',
      now: 'Jetzt',
      open: 'Geöffnet',
      closed: 'Geschlossen',
      noImage: 'Kein Bild verfügbar',
      notSpecified: 'Nicht angegeben',
      location: 'Standort',
      orgNumber: 'Organisationsnummer',
      serviceType: 'Servicetyp',
      dineIn: 'Vor Ort',
      takeOut: 'Zum Mitnehmen',
      both: 'Beides',
      closedDates: 'Geschlossene Tage',
      noClosedDatesYet: 'Noch keine geschlossenen Tage.',
      endDateAfterStart: 'Enddatum muss nach dem Startdatum liegen.',
      addClosedDate: 'Geschlossenen Tag hinzufügen',
      contactNumber: 'Telefonnummer',
      contactPerson: 'Ansprechpartner',
      contactPersonName: 'Name der Kontaktperson',
      contactPersonEmail: 'E-Mail der Kontaktperson',
      reservationEmail: 'Reservierungs-E-Mail',
      website: 'Webseite',
      visitWebsite: 'Webseite besuchen',
      operatingHours: 'Öffnungszeiten',
      customHours: 'Benutzerdefinierte Zeiten',
      selectDays: 'Tage auswählen',
      openTime: 'Öffnungszeit',
      closeTime: 'Schließzeit',
      addHours: 'Zeiten hinzufügen',
      addedCustomHours: 'Hinzugefügte benutzerdefinierte Zeiten',
      guests: '{count} Gäste',
      opens: 'Öffnet:',
      closes: 'Schließt:',
      setOperatingTimes: 'Lege deine Öffnungszeiten fest',
      save: 'Speichern',
      cancel: 'Abbrechen',
      editRestaurant: 'Restaurant bearbeiten',
      removeRestaurant: 'Restaurant entfernen',
      close: 'Schließen',
      confirmRemoval: 'Entfernen bestätigen',
      confirmRemovalDesc: 'Möchtest du {name} wirklich entfernen? Dies kann nicht rückgängig gemacht werden.',
      confirm: 'Bestätigen',
      removeClosedDate: 'Geschlossenen Tag entfernen',
      remove: 'Entfernen',
      dayAlreadyAdded: '{day} bereits hinzugefügt',
      selectDay: 'Wähle {day}',
      removedSuccessfully: '"{name}" wurde entfernt.',
      removeFailed: 'Restaurant konnte nicht entfernt werden: ',
      updateError: 'Fehler beim Aktualisieren: ',
    },
  };
  const t = (k, vars = {}) => {
    const raw = (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;
    if (typeof raw !== 'string') return raw;
    return raw.replace(/\{(.*?)\}/g, (_, v) => (vars[v] != null ? String(vars[v]) : `{${v}}`));
  };
  // listen for broadcasted language changes
  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);
  // sync on mount and when localStorage changes
  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => {
      if (e.key === 'app_lang') setLang(e.newValue || 'en');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    setEditedRestaurant({
      ...restaurant,
      customHolidays: Array.isArray(restaurant?.customHolidays)
        ? [...restaurant.customHolidays]
        : [],
      // normalize existing customHours so days are objects with name & maxGuests
      customHours: Array.isArray(restaurant?.customHours)
        ? restaurant.customHours.map(ch => ({
            openTime: ch?.openTime || "",
            closeTime: ch?.closeTime || "",
            days: Array.isArray(ch?.days)
              ? ch.days.map(d => toDayObj(d, 0)).filter(Boolean)
              : [],
          }))
        : [],
    });
  }, [restaurant]);

  // Days of week for multi-select
  const weekDays = [
    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
  ];
  const [showCustomHours, setShowCustomHours] = useState(false);
  const [customDays, setCustomDays] = useState([]);
  const [customOpen, setCustomOpen] = useState("");
  const [customClose, setCustomClose] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const addHolidayRow = () => {
    setEditedRestaurant(prev => ({
      ...prev,
      customHolidays: [...(prev.customHolidays || []), { startDate: "", endDate: "" }],
    }));
  };

  const removeHolidayRow = (idx) => {
    setEditedRestaurant(prev => ({
      ...prev,
      customHolidays: (prev.customHolidays || []).filter((_, i) => i !== idx),
    }));
  };

  // Defensive: Auto-close if restaurant is missing/null/undefined
  useEffect(() => {
    if (!restaurant) onClose?.();
  }, [restaurant, onClose]);

  // Open status if using customHours
  const getOpenStatus = () => {
    // If no customHours, fallback to basic openTime/closeTime
    if (!restaurant?.customHours?.length) {
      if (!restaurant?.openTime || !restaurant?.closeTime) return "Closed";
      const now = new Date();
      const [openHour, openMinute] = (restaurant.openTime || "").split(":").map(Number);
      const [closeHour, closeMinute] = (restaurant.closeTime || "").split(":").map(Number);
      const openTime = new Date(now), closeTime = new Date(now);
      openTime.setHours(openHour || 0, openMinute || 0, 0, 0);
      closeTime.setHours(closeHour || 0, closeMinute || 0, 0, 0);
      if (closeTime <= openTime) {
        return now >= openTime || now <= closeTime ? "Open" : "Closed";
      } else {
        return now >= openTime && now <= closeTime ? "Open" : "Closed";
      }
    }
    // Custom hours check (is any period open now)
    const now = new Date();
    const nowDay = now.toLocaleDateString("en-US", { weekday: "long" });
    const nowTime = now.getHours() * 60 + now.getMinutes();
    for (const custom of restaurant.customHours) {
      const dayNames = (custom.days || []).map(d => formatDayLabel(d));
      if (dayNames.includes(nowDay)) {
        const [openH, openM] = (custom.openTime || "").split(":").map(Number);
        const [closeH, closeM] = (custom.closeTime || "").split(":").map(Number);
        if (isNaN(openH) || isNaN(openM) || isNaN(closeH) || isNaN(closeM)) continue;
        const openMinutes = openH * 60 + openM;
        const closeMinutes = closeH * 60 + closeM;
        if (closeMinutes <= openMinutes) {
          if (nowTime >= openMinutes || nowTime <= closeMinutes) return "Open";
        } else {
          if (nowTime >= openMinutes && nowTime <= closeMinutes) return "Open";
        }
      }
    }
    return "Closed";
  };

  const openStatus = getOpenStatus();
  const hasCustomHours =
    Boolean(editedRestaurant?.customHours?.length || restaurant?.customHours?.length);

  // Remove handlers
  const handleRemoveClick = () => setShowConfirm(true);
  const handleConfirmRemove = async () => {
    setIsDeleting(true);
    try {
      await onRemove?.(restaurant);
      setShowConfirm(false);
      alert(t('removedSuccessfully', { name: restaurant?.name || '' }));
      onClose();
    } catch (error) {
      alert(t('removeFailed') + error.message);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleCancelRemove = () => setShowConfirm(false);

  // Handle Edit submit: persist via parent onEdit (updates Firestore)
  const handleEditSubmit = async (editedData) => {
    try {
      if (!restaurant?.id) throw new Error("Missing restaurant id");

      // sanitize holidays
      const sanitizedHolidays = (editedData.customHolidays || []).filter(
        (h) => h && h.startDate && h.endDate
      );

      // force maxGuests = 0 for every custom hour
      const sanitizedHours = (editedData.customHours || []).map(ch => ({
        openTime: ch?.openTime || "",
        closeTime: ch?.closeTime || "",
        days: (Array.isArray(ch?.days) ? ch.days : []).map(d => ({
          name: typeof d === "object" ? (d.name || d.day || "") : String(d),
          maxGuests: Number.isFinite(d?.maxGuests) ? d.maxGuests : 0,
        })),
      }));

      const payload = {
        name: editedData.name ?? restaurant.name,
        Location: editedData.Location ?? restaurant.Location,
        lat: editedData.lat ?? restaurant.lat,     
        lng: editedData.lng ?? restaurant.lng,       
        organizationNumber: editedData.organizationNumber ?? restaurant.organizationNumber,
        serviceType: editedData.serviceType ?? restaurant.serviceType,
        Contact_number: editedData.Contact_number ?? restaurant.Contact_number,
        ContactPerson_number: editedData.ContactPerson_number ?? restaurant.ContactPerson_number,
        Web_link: editedData.Web_link ?? restaurant.Web_link,
        Reservation_email: editedData.Reservation_email ?? restaurant.Reservation_email,
        ContactPerson_email: editedData.ContactPerson_email ?? restaurant.ContactPerson_email,
        ContactPerson_name: editedData.ContactPerson_name ?? restaurant.ContactPerson_name,
        customHours: sanitizedHours,
        customHolidays: sanitizedHolidays,
      };

      // Remove undefined keys to avoid overwriting with undefined
      Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

      if (typeof onEdit === 'function') {
        await onEdit(restaurant.id, payload);
      }
    } catch (err) {
      alert(t('updateError') + (err?.message || err));
      throw err;
    }
  };

  // Days already used in any customHours entry (handle strings or objects)
  const usedDays = new Set(
    (editedRestaurant?.customHours || [])
      .flatMap(ch => Array.isArray(ch?.days) ? ch.days : [])
      .map(d => (typeof d === "object" ? (d.name || d.day || "") : String(d)))
      .filter(Boolean)
  );

  if (!restaurant) return null;

  return (
    <>
      {/* Main Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-lg transition-opacity duration-300 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="restaurant-details-title"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-100">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                {editMode ? (
                  <input
                    className="border rounded px-2 py-1 w-full text-xl font-bold mb-3"
                    value={editedRestaurant.name}
                    onChange={e => setEditedRestaurant({ ...editedRestaurant, name: e.target.value })}
                  />
                ) : (
                  <h2 id="restaurant-details-title" className="text-3xl font-bold text-gray-900 mb-3">
                    {restaurant.name || t('untitled')}
                  </h2>
                )}
                {(restaurant.Type || restaurant.otherType) && (
                  <span className="inline-block px-4 py-2 rounded-full bg-[#fe8a24]/10 text-[#fe8a24] text-sm font-medium">
                    {restaurant.Type || restaurant.otherType}
                  </span>
                )}
              </div>
              <div className="ml-6 flex items-center space-x-4">
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    openStatus === "Open" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {t(openStatus.toLowerCase())} {t('now')}
                </span>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="px-8 py-6">
            {/* Main Image */}
            {restaurant.Image ? (
              <div className="relative h-80 w-full rounded-xl overflow-hidden mb-8 shadow-lg">
                <img
                  src={restaurant.Image}
                  alt={restaurant.name || ""}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                />
              </div>
            ) : (
              <div className="h-80 w-full rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center mb-8 border-2 border-dashed border-gray-200">
                <div className="text-center">
                  <svg className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <p className="text-gray-500 font-medium">{t('noImage')}</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-8">
              {/* Location */}
              <div className="group">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('location')}</h3>
                <div className="flex items-start space-x-3">
                  <svg className="h-5 w-5 text-[#fe8a24] mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="flex-1">
                    {editMode ? (
                      <div className="space-y-3">
                        {/* Address input with map picker button */}
                        <div className="flex gap-2">
                          <input
                            className="border rounded px-2 py-1 flex-1"
                            placeholder="Address"
                            value={editedRestaurant.Location || ''}
                            onChange={e => setEditedRestaurant({ ...editedRestaurant, Location: e.target.value })}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLocationPicker(true)}
                            className="px-3 py-2 bg-[#fe8a24] text-white rounded hover:bg-[#e07d20] transition-colors flex items-center gap-2 whitespace-nowrap"
                            title="Pick location on map"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            Map
                          </button>
                        </div>
                        
                        {/* Coordinates inputs */}
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="number"
                            step="0.000001"
                            className="border rounded px-2 py-1 w-full text-sm"
                            placeholder="Latitude"
                            value={editedRestaurant.lat || ''}
                            onChange={e => setEditedRestaurant({ 
                              ...editedRestaurant, 
                              lat: e.target.value ? parseFloat(e.target.value) : null 
                            })}
                          />
                          <input
                            type="number"
                            step="0.000001"
                            className="border rounded px-2 py-1 w-full text-sm"
                            placeholder="Longitude"
                            value={editedRestaurant.lng || ''}
                            onChange={e => setEditedRestaurant({ 
                              ...editedRestaurant, 
                              lng: e.target.value ? parseFloat(e.target.value) : null 
                            })}
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Use the map button to visually select location, or enter coordinates manually
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {restaurant.Location || t('notSpecified')}
                        </p>
                        {/* Display Coordinates */}
                        {(restaurant.lat || restaurant.lng) && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                            </svg>
                            <span className="font-mono">
                              {restaurant.lat && typeof restaurant.lat === 'number' 
                                ? restaurant.lat.toFixed(6) 
                                : restaurant.lat || '—'}
                              {', '}
                              {restaurant.lng && typeof restaurant.lng === 'number'
                                ? restaurant.lng.toFixed(6)
                                : restaurant.lng || '—'}
                            </span>
                            <button
                              onClick={() => {
                                const coords = `${restaurant.lat}, ${restaurant.lng}`;
                                navigator.clipboard.writeText(coords);
                                alert('Coordinates copied to clipboard!');
                              }}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Copy coordinates"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Location Picker Modal */}
              {showLocationPicker && (
                <LocationPickerModal
                  isOpen={showLocationPicker}
                  onClose={() => setShowLocationPicker(false)}
                  initialLocation={
                    editedRestaurant.lat && editedRestaurant.lng
                      ? { lat: editedRestaurant.lat, lng: editedRestaurant.lng }
                      : null
                  }
                  initialAddress={editedRestaurant.Location || ''}
                  onLocationSelected={(location, address) => {
                    setEditedRestaurant({
                      ...editedRestaurant,
                      lat: location.lat,
                      lng: location.lng,
                      Location: address,
                    });
                  }}
                />
              )}
                
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('orgNumber')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.organizationNumber}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, organizationNumber: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium leading-relaxed">{restaurant.organizationNumber || t('notSpecified')}</p>
                    )}
                  </div>
                </div>

                {/* Service Type */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('serviceType')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.serviceType}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, serviceType: e.target.value })}
                      >
                        <option value="">{t('notSpecified')}</option>
                        <option value="dine">{t('dineIn')}</option>
                        <option value="take">{t('takeOut')}</option>
                        <option value="both">{t('both')}</option>
                      </select>
                    ) : (
                      <p className="text-gray-900 font-medium leading-relaxed">{restaurant.serviceType || t('notSpecified')}</p>
                    )}
                  </div>
                </div>

                {/* Custom Holidays */}
                {(editMode || (editedRestaurant.customHolidays && editedRestaurant.customHolidays.length > 0)) && (
                  <div className="group">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                      {t('closedDates')}
                    </h3>

                    {editMode ? (
                      <div className="space-y-3">
                        {(editedRestaurant.customHolidays || []).length === 0 && (
                          <p className="text-gray-500">{t('noClosedDatesYet')}</p>
                        )}

                        {(editedRestaurant.customHolidays || []).map((holiday, idx) => {
                          const invalid =
                            holiday.startDate && holiday.endDate && holiday.endDate < holiday.startDate;
                          return (
                            <div key={idx} className="flex items-center gap-2">
                              <div className="w-5 h-5 flex-shrink-0"></div>
                              <div className="relative">
                                <input
                                  type="date"
                                  className={`border rounded px-2 py-1 ${invalid ? "border-red-400" : ""}`}
                                  value={holiday.startDate || ""}
                                  onChange={e => {
                                    const updated = [...(editedRestaurant.customHolidays || [])];
                                    updated[idx] = { ...updated[idx], startDate: e.target.value };
                                    setEditedRestaurant({ ...editedRestaurant, customHolidays: updated });
                                  }}
                                  onBlur={() => {
                                    // Force blur to close the date picker
                                    document.activeElement?.blur();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.target.blur();
                                    }
                                  }}
                                />
                              </div>
                              <div className="relative">
                                <input
                                  type="date"
                                  className={`border rounded px-2 py-1 ${invalid ? "border-red-400" : ""}`}
                                  value={holiday.endDate || ""}
                                  min={holiday.startDate || undefined}
                                  onChange={e => {
                                    const updated = [...(editedRestaurant.customHolidays || [])];
                                    updated[idx] = { ...updated[idx], endDate: e.target.value };
                                    setEditedRestaurant({ ...editedRestaurant, customHolidays: updated });
                                  }}
                                  onBlur={() => {
                                    document.activeElement?.blur();
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                      e.target.blur();
                                    }
                                  }}
                                  disabled={!holiday.startDate}
                                />
                              </div>
                              <button
                                type="button"
                                className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                                title={t('removeClosedDate')}
                                onClick={() => removeHolidayRow(idx)}
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                              {invalid && (
                                <span className="text-xs text-red-500 ml-2">{t('endDateAfterStart')}</span>
                              )}
                            </div>
                          );
                        })}

                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={addHolidayRow}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold border border-[#e28743] text-[#e28743] bg-white hover:bg-[#fff3e8] hover:shadow-sm transition-all"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {t('addClosedDate')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {(editedRestaurant.customHolidays || []).map((holiday, idx) => (
                          <div key={idx} className="flex items-center space-x-3">
                            <span className="w-2 h-2 bg-red-400 rounded-full flex-shrink-0 ml-1.5"></span>
                            <span className="text-gray-900 font-medium leading-relaxed">
                              {holiday.startDate} to {holiday.endDate}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-8">
                {/* Contact Number */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('contactNumber')}</h3>
                  {editMode ? (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.Contact_number}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, Contact_number: e.target.value })}
                      />
                    </div>
                  ) : restaurant.Contact_number ? (
                    <div className="flex items-center space-x-3">
                      <svg className="h-5 w-5 text-[#fe8a24] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <p className="text-gray-900 font-medium leading-relaxed">{restaurant.Contact_number}</p>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 flex-shrink-0"></div>
                      <p className="text-gray-500 leading-relaxed">{t('notSpecified')}</p>
                    </div>
                  )}
                </div>

                {/* Contact Person Number */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('contactPerson')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.ContactPerson_number}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, ContactPerson_number: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium leading-relaxed">{restaurant.ContactPerson_number || t('notSpecified')}</p>
                    )}
                  </div>
                </div>

                {/* Contact Person Name */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('contactPersonName')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.ContactPerson_name || ""}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, ContactPerson_name: e.target.value })}
                      />
                    ) : (
                      <p className="text-gray-900 font-medium leading-relaxed">{restaurant.ContactPerson_name || t('notSpecified')}</p>
                    )}
                  </div>
                </div>

                {/* Contact Person Email */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('contactPersonEmail')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <input
                        type="email"
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.ContactPerson_email || ""}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, ContactPerson_email: e.target.value })}
                      />
                    ) : restaurant.ContactPerson_email ? (
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {restaurant.ContactPerson_email}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 flex-shrink-0"></div>
                        <p className="text-gray-500 leading-relaxed">{t('notSpecified')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reservation Email */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('reservationEmail')}</h3>
                  <div className="flex items-start space-x-3">
                    <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                    {editMode ? (
                      <input
                        type="email"
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.Reservation_email || ""}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, Reservation_email: e.target.value })}
                      />
                    ) : restaurant.Reservation_email ? (
                      <div className="flex items-start space-x-3">
                        <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                        <p className="text-gray-900 font-medium leading-relaxed">
                          {restaurant.Reservation_email}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 flex-shrink-0"></div>
                        <p className="text-gray-500 leading-relaxed">{t('notSpecified')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Website */}
                <div className="group">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('website')}</h3>
                  {editMode ? (
                    <div className="flex items-start space-x-3">
                      <div className="w-5 h-5 mt-1 flex-shrink-0"></div>
                      <input
                        className="border rounded px-2 py-1 w-full"
                        value={editedRestaurant.Web_link}
                        onChange={e => setEditedRestaurant({ ...editedRestaurant, Web_link: e.target.value })}
                      />
                    </div>
                  ) : restaurant.Web_link ? (
                    <div className="flex items-center space-x-3">
                      <svg className="h-5 w-5 text-[#fe8a24] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                      </svg>
                      <a
                        href={restaurant.Web_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#fe8a24] hover:text-[#e07d20] transition-colors font-medium hover:underline leading-relaxed"
                      >
                        {t('visitWebsite')}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 flex-shrink-0"></div>
                      <p className="text-gray-500 leading-relaxed">{t('notSpecified')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Operating Hours */}
              {restaurant.customHours && restaurant.customHours.length > 0 ? (
                <div className="group lg:col-span-2">
                  <h3 id="operating-hours" className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('operatingHours')}</h3>

                  {editMode ? (
                    <>
                      {showCustomHours && (
                        <div className="mt-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                          <h5 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('customHours')}
                          </h5>

                          {/* Select Days */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('selectDays')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                              {weekDays.map(day => {
                                const isUsed = usedDays.has(day);
                                const isChecked = customDays.includes(day);

                                return (
                                  <label key={day} className={`group cursor-pointer ${isUsed ? 'pointer-events-none' : ''}`}>
                                    <input
                                      type="checkbox"
                                      className="sr-only"
                                      disabled={isUsed}
                                      checked={isChecked}
                                      onChange={e => {
                                        if (isUsed) return;
                                        setCustomDays(prev => (e.target.checked ? [...prev, day] : prev.filter(d => d !== day)));
                                      }}
                                    />
                                    <div
                                      className={`
                                        text-center py-3 px-2 rounded-xl border-2 transition-all duration-200 text-sm font-medium
                                        ${isUsed
                                          ? 'border-gray-200 bg-gray-100 text-gray-400 opacity-60'
                                          : isChecked
                                            ? 'shadow-lg transform scale-105'
                                            : 'border-gray-200 bg-gray-50 text-gray-600 group-hover:border-orange-300 group-hover:bg-orange-50'}
                                      `}
                                      style={!isUsed && isChecked ? { borderColor: '#e28743', backgroundColor: '#e28743', color: '#fff' } : undefined}
                                      title={isUsed ? t('dayAlreadyAdded', { day }) : t('selectDay', { day })}
                                    >
                                      {day.slice(0, 3)}
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Inputs: open, close, add */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="customOpen" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('openTime')}
                              </label>
                              <input
                                id="customOpen"
                                type="time"
                                className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 focus:ring-4 focus:ring-[#e28743]/10"
                                style={{ borderColor: customOpen ? '#e28743' : undefined }}
                                value={customOpen}
                                onChange={e => setCustomOpen(e.target.value)}
                              />
                            </div>
                            <div>
                              <label htmlFor="customClose" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('closeTime')}
                              </label>
                              <input
                                id="customClose"
                                type="time"
                                className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 focus:ring-4 focus:ring-[#e28743]/10"
                                style={{ borderColor: customClose ? '#e28743' : undefined }}
                                value={customClose}
                                onChange={e => setCustomClose(e.target.value)}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl hover:bg-[#c16f34]"
                                style={{ backgroundColor: '#e28743' }}
                                disabled={
                                  !customOpen ||
                                  !customClose ||
                                  customDays.length === 0 ||
                                  customDays.some(d => usedDays.has(d))
                                }
                                onClick={() => {
                                  const deduped = customDays.filter(d => !usedDays.has(d));
                                  if (deduped.length === 0) return;

                                  setEditedRestaurant(prev => ({
                                    ...prev,
                                    customHours: [
                                      ...(prev.customHours || []),
                                      {
                                        days: deduped.map(d => ({ name: d, maxGuests: 0 })),
                                        openTime: customOpen,
                                        closeTime: customClose,
                                      },
                                    ],
                                  }));
                                  setCustomDays([]);
                                  setCustomOpen("");
                                  setCustomClose("");
                                  if (!showCustomHours) setShowCustomHours(true);
                                }}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('addHours')}
                              </button>
                            </div>
                          </div>

                          {/* Added Custom Hours List */}
                          {editedRestaurant.customHours && editedRestaurant.customHours.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 mt-6">
                              <h6 className="text-sm font-semibold text-gray-700 mb-3">{t('addedCustomHours')}</h6>
                              <div className="space-y-2">
                                {editedRestaurant.customHours.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <svg className="h-4 w-4" style={{ color: '#e28743' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div>
                                        <span className="font-semibold text-gray-800">{(item.days || []).map(formatDayLabel).join(", ")}</span>
                                        <span className="mx-2 text-gray-400">·</span>
                                        <span className="text-gray-600">{item.openTime} - {item.closeTime}</span>
                                        <span className="mx-2 text-gray-400">·</span>
                                        <span className="text-orange-600 font-bold">{t('guests', { count: Number(item.maxGuests ?? 0) })}</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                      onClick={() =>
                                        setEditedRestaurant(prev => ({
                                          ...prev,
                                          customHours: prev.customHours.filter((_, i) => i !== idx)
                                        }))
                                      }
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Inline editor table */}
                      <div className="mt-6">
                        <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold mb-2 px-2 bg-white border border-[#ffe5cf] rounded-lg" style={{minHeight: '42px'}}>
                          <div className="min-w-[70px] flex-1">{t('selectDays')}</div>
                          <div className="w-[90px] text-center">{t('openTime')}</div>
                          <div className="w-[90px] text-center">{t('closeTime')}</div>
                          <div className="w-[70px] text-center">{t('guests', { count: 0 }).replace(/\d+\s*/, '')}</div>
                          <div className="w-10" />
                        </div>
                        <div className="flex flex-col gap-2">
                          {editedRestaurant.customHours.map((c, idx) => (
                            <div key={idx} className="flex items-center gap-3 border border-[#ffe5cf] bg-white rounded-lg px-3 py-2" style={{minHeight: '44px'}}>
                                <div className="flex-1 min-w-[70px]">
                                  <div className="flex flex-wrap gap-1">
                                    {weekDays.map(day => {
                                      const rowDayNames = (c.days || []).map(d => formatDayLabel(d));
                                      const isChecked = rowDayNames.includes(day);
                                      const usedElsewhere = usedDays.has(day) && !isChecked;

                                      return (
                                        <button
                                          type="button"
                                          key={day}
                                          disabled={usedElsewhere}
                                          title={usedElsewhere ? t('dayAlreadyAdded', { day }) : day}
                                          onClick={() => {
                                            const updated = [...editedRestaurant.customHours];
                                            const currentDays = Array.isArray(updated[idx].days) ? updated[idx].days : [];
                                            const currentNames = currentDays.map(d => formatDayLabel(d));
                                            const newDays = currentNames.includes(day)
                                              ? currentDays.filter(d => formatDayLabel(d) !== day)
                                              : [...currentDays, { name: day, maxGuests: 0 }];
                                            updated[idx] = { ...updated[idx], days: newDays };
                                            setEditedRestaurant({ ...editedRestaurant, customHours: updated });
                                          }}
                                          className={`text-xs px-2 py-1 rounded-md border transition-colors ${
                                            isChecked
                                              ? 'text-white'
                                              : usedElsewhere
                                                ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed'
                                                : 'border-gray-300 bg-white text-gray-600 hover:border-[#e28743] hover:bg-orange-50'
                                          }`}
                                          style={isChecked ? { borderColor: '#e28743', backgroundColor: '#e28743' } : undefined}
                                        >
                                          {day.slice(0, 3)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              <input
                                type="time"
                                className="border border-gray-300 rounded px-2 py-1 w-[90px] focus:outline-none focus:border-[#e28743] transition-colors"
                                value={c.openTime}
                                onChange={e => {
                                  const updated = [...editedRestaurant.customHours];
                                  updated[idx].openTime = e.target.value;
                                  setEditedRestaurant({ ...editedRestaurant, customHours: updated });
                                }}
                              />
                              <input
                                type="time"
                                className="border border-gray-300 rounded px-2 py-1 w-[90px] focus:outline-none focus:border-[#e28743] transition-colors"
                                value={c.closeTime}
                                onChange={e => {
                                  const updated = [...editedRestaurant.customHours];
                                  updated[idx].closeTime = e.target.value;
                                  setEditedRestaurant({ ...editedRestaurant, customHours: updated });
                                }}
                              />
                              {/* Display fixed 0 instead of an input */}
                              <div className="text-xs text-gray-500 w-[70px] text-center">
                                {Number(c.maxGuests ?? 0)}
                              </div>
                              <button
                                type="button"
                                className="p-1 rounded hover:bg-red-100 transition-colors text-gray-400 hover:text-red-600"
                                title={t('remove')}
                                onClick={() => {
                                  const updated = [...editedRestaurant.customHours];
                                  updated.splice(idx, 1);
                                  setEditedRestaurant({ ...editedRestaurant, customHours: updated });
                                }}
                                style={{height: '32px', width: '32px'}}
                              >
                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Read view
                    <div className="space-y-3">
                      {restaurant.customHours.map((c, idx) => (
                        <div key={idx} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
                          <span className="font-semibold text-gray-900 min-w-0 flex-1 truncate">
                            {(c.days || []).map(formatDayLabel).join(", ")}
                          </span>
                          <span className="text-gray-700 font-medium ml-4 flex-shrink-0">
                            {formatTime(c.openTime)} - {formatTime(c.closeTime)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                // No customHours yet (fallback)
                <div className="group lg:col-span-2">
                  <h3 id="operating-hours" className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{t('operatingHours')}</h3>
                  {editMode ? (
                    <>
                      {showCustomHours && (
                        <div className="mt-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                          <h5 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {t('customHours')}
                          </h5>

                          {/* Select Days */}
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('selectDays')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                              {weekDays.map(day => (
                                <label key={day} className="group cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="sr-only"
                                    checked={customDays.includes(day)}
                                    onChange={e => {
                                      setCustomDays(prev => e.target.checked ? [...prev, day] : prev.filter(d => d !== day));
                                    }}
                                  />
                                  <div
                                    className={`
                                      text-center py-3 px-2 rounded-xl border-2 transition-all duration-200 text-sm font-medium
                                      ${customDays.includes(day) 
                                        ? 'shadow-lg transform scale-105'
                                        : 'border-gray-200 bg-gray-50 text-gray-600 group-hover:border-orange-300 group-hover:bg-orange-50'
                                      }
                                    `}
                                    style={
                                      customDays.includes(day)
                                        ? { borderColor: '#e28743', backgroundColor: '#e28743', color: '#fff' }
                                        : undefined
                                    }
                                  >
                                    {day.slice(0, 3)}
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Inputs: open, close, add */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                              <label htmlFor="customOpen2" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('openTime')}
                              </label>
                              <input
                                id="customOpen2"
                                type="time"
                                className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 focus:ring-4 focus:ring-[#e28743]/10"
                                style={{ borderColor: customOpen ? '#e28743' : undefined }}
                                value={customOpen}
                                onChange={e => setCustomOpen(e.target.value)}
                              />
                            </div>
                            <div>
                              <label htmlFor="customClose2" className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('closeTime')}
                              </label>
                              <input
                                id="customClose2"
                                type="time"
                                className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:bg-white transition-all duration-200 focus:ring-4 focus:ring-[#e28743]/10"
                                style={{ borderColor: customClose ? '#e28743' : undefined }}
                                value={customClose}
                                onChange={e => setCustomClose(e.target.value)}
                              />
                            </div>
                            <div className="flex items-end">
                              <button
                                type="button"
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl hover:bg-[#c16f34]"
                                style={{ backgroundColor: '#e28743' }}
                                disabled={
                                  !customOpen ||
                                  !customClose ||
                                  customDays.length === 0 ||
                                  customDays.some(d => usedDays.has(d))
                                }
                                onClick={() => {
                                  const deduped = customDays.filter(d => !usedDays.has(d));
                                  if (deduped.length === 0) return;

                                  setEditedRestaurant(prev => ({
                                    ...prev,
                                    customHours: [
                                      ...(prev.customHours || []),
                                      {
                                        days: deduped.map(d => ({ name: d, maxGuests: 0 })),
                                        openTime: customOpen,
                                        closeTime: customClose,
                                      },
                                    ],
                                  }));
                                  setCustomDays([]);
                                  setCustomOpen("");
                                  setCustomClose("");
                                  if (!showCustomHours) setShowCustomHours(true);
                                }}
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                {t('addHours')}
                              </button>
                            </div>
                          </div>

                          {/* Added Custom Hours List */}
                          {editedRestaurant.customHours && editedRestaurant.customHours.length > 0 && (
                            <div className="bg-gray-50 rounded-xl p-4 mt-6">
                              <h6 className="text-sm font-semibold text-gray-700 mb-3">{t('addedCustomHours')}</h6>
                              <div className="space-y-2">
                                {editedRestaurant.customHours.map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 shadow-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <svg className="h-4 w-4" style={{ color: '#e28743' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <div>
                                        <span className="font-semibold text-gray-800">
                                          {(item.days || []).map(formatDayLabel).join(", ")}
                                        </span>
                                        <span className="mx-2 text-gray-400">·</span>
                                        <span className="text-gray-600">{item.openTime} - {item.closeTime}</span>
                                        <span className="mx-2 text-gray-400">·</span>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                                      onClick={() =>
                                        setEditedRestaurant(prev => ({
                                          ...prev,
                                          customHours: prev.customHours.filter((_, i) => i !== idx)
                                        }))
                                      }
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fallback basic open/close (no customHours created yet) */}
                      {!showCustomHours && (
                        <div className="space-y-3 border border-gray-100 rounded-lg px-4 py-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{t('opens')}</span>
                            <span className="text-gray-900 font-semibold">{formatTime(restaurant.openTime)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-gray-700">{t('closes')}</span>
                            <span className="text-gray-900 font-semibold">{formatTime(restaurant.closeTime)}</span>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-3 border border-gray-100 rounded-lg px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{t('opens')}</span>
                        <span className="text-gray-900 font-semibold">{formatTime(restaurant.openTime)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-700">{t('closes')}</span>
                        <span className="text-gray-900 font-semibold">{formatTime(restaurant.closeTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 rounded-b-xl">
            {/* Only show when there are NO custom hours yet */}
            {!hasCustomHours && (
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    if (!editMode) setEditMode(true);
                    setShowCustomHours(true);
                    requestAnimationFrame(() => {
                      document.getElementById("operating-hours")?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      });
                    });
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold border border-[#e28743] text-[#e28743] bg-white hover:bg-[#fff3e8] hover:shadow-md transform hover:-translate-y-0.5 transition-all"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {t('setOperatingTimes')}
                </button>
              </div>
            )}

            {/* Existing buttons */}
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              {editMode ? (
                <>
                  <button
                    onClick={async () => {
                      await handleEditSubmit(editedRestaurant);
                      setEditMode(false);
                    }}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#e28743] hover:bg-[#c16f34] hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e28743] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mr-0 sm:mr-4"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {t('save')}
                  </button>

                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditedRestaurant({
                        ...restaurant,
                        customHolidays: Array.isArray(restaurant?.customHolidays)
                          ? [...restaurant.customHolidays]
                          : [],
                        customHours: Array.isArray(restaurant?.customHours)
                          ? restaurant.customHours.map(ch => ({
                              ...ch,
                              maxGuests: Number(ch?.maxGuests ?? 0),
                            }))
                          : [],
                        Reservation_email: restaurant?.Reservation_email || "",
                        ContactPerson_email: restaurant?.ContactPerson_email || "",
                        ContactPerson_name: restaurant?.ContactPerson_name || "",
                      });
                    }}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fe8a24] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {t('cancel')}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-[#e28743] hover:bg-[#c16f34] hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#e28743] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mr-0 sm:mr-4"
                  >
                    <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L7.5 21H3v-4.5L16.732 3.732z"/>
                    </svg>
                    {t('editRestaurant')}
                  </button>

                  {/* Remove Restaurant - hidden in editMode */}
                  <button
                    onClick={handleRemoveClick}
                    disabled={isDeleting}
                    className={`flex-1 flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white transition-all ${
                      isDeleting 
                        ? "bg-red-400 cursor-not-allowed" 
                        : "bg-red-600 hover:bg-red-700 hover:shadow-md transform hover:-translate-y-0.5"
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                  >
                    {isDeleting ? (
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                    {t('removeRestaurant')}
                  </button>

                  {/* Close Button - hidden in editMode */}
                  <button
                    onClick={onClose}
                    disabled={isDeleting}
                    className="flex-1 flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 hover:shadow-md transform hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fe8a24] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {t('close')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          onClick={() => !isDeleting && setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl border border-gray-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5C3.962 18.333 4.924 20 6.464 20z" />
                </svg>
              </div>
              <h3 id="confirm-title" className="text-xl font-bold text-gray-900 mb-2">
                {t('confirmRemoval')}
              </h3>
              <p id="confirm-desc" className="text-gray-600 leading-relaxed">
                {t('confirmRemovalDesc', { name: restaurant.name || '' })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleCancelRemove}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#fe8a24] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmRemove}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                  </svg>
                )}
                {t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}