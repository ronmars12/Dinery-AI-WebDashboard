import React, { useState, useEffect } from "react";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

export default function OfferDetailPage({ offer, userRole, onClose, onOfferUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    offer_name: offer.offer_name,
    description: offer.description,
    start_date: offer.start_date,
    end_date: offer.end_date,
    is_active: offer.is_active,
  });
  const [loading, setLoading] = useState(false);

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const localeMap = { en: 'en-US', fi: 'fi-FI', no: 'nb-NO', sv: 'sv-SE', de: 'de-DE' };

  const i18n = {
    en: {
      header: 'Offer Details',
      noImage: 'No image available',
      offerName: 'Offer Name*',
      offerNamePh: 'Enter offer name',
      description: 'Description*',
      descriptionPh: 'Enter detailed description',
      startDate: 'Start Date*',
      endDate: 'End Date*',
      startDateShort: 'Start Date',
      endDateShort: 'End Date',
      discountPercent: 'Discount Percent',
      activateNow: 'Activate this offer immediately',
      statusActive: 'Active',
      statusInactive: 'Inactive',
      cancel: 'Cancel',
      saveChanges: 'Save Changes',
      saving: 'Saving...',
      close: 'Close',
      editOffer: 'Edit Offer',
      activateOffer: 'Activate Offer',
      deactivateOffer: 'Deactivate Offer',
      updating: 'Updating...',
      // alerts
      errName: 'Offer name cannot be empty',
      errDesc: 'Description cannot be empty',
      errDates: 'Please select both start and end dates',
      errEndBeforeStart: 'End date cannot be before start date',
      saveOk: 'Offer updated successfully',
      saveFail: 'Failed to update offer: ',
      statusFail: 'Failed to update status: '
    },
    fi: {
      header: 'Tarjouksen tiedot',
      noImage: 'Ei kuvaa saatavilla',
      offerName: 'Tarjouksen nimi*',
      offerNamePh: 'Anna tarjouksen nimi',
      description: 'Kuvaus*',
      descriptionPh: 'Kirjoita tarkka kuvaus',
      startDate: 'Alkupäivä*',
      endDate: 'Loppupäivä*',
      startDateShort: 'Alkupäivä',
      endDateShort: 'Loppupäivä',
      discountPercent: 'Alennusprosentti',
      activateNow: 'Aktivoi tämä tarjous heti',
      statusActive: 'Aktiivinen',
      statusInactive: 'Ei aktiivinen',
      cancel: 'Peruuta',
      saveChanges: 'Tallenna muutokset',
      saving: 'Tallennetaan...',
      close: 'Sulje',
      editOffer: 'Muokkaa tarjousta',
      activateOffer: 'Aktivoi tarjous',
      deactivateOffer: 'Poista tarjous käytöstä',
      updating: 'Päivitetään...',
      errName: 'Tarjouksen nimi ei voi olla tyhjä',
      errDesc: 'Kuvaus ei voi olla tyhjä',
      errDates: 'Valitse sekä alku- että loppupäivä',
      errEndBeforeStart: 'Loppupäivä ei voi olla ennen alkupäivää',
      saveOk: 'Tarjous päivitetty',
      saveFail: 'Tarjouksen päivitys epäonnistui: ',
      statusFail: 'Tilapäivitys epäonnistui: '
    },
    no: {
      header: 'Tilbud detaljer',
      noImage: 'Ingen bilde tilgjengelig',
      offerName: 'Tilbudsnavn*',
      offerNamePh: 'Skriv inn tilbudsnavn',
      description: 'Beskrivelse*',
      descriptionPh: 'Skriv detaljert beskrivelse',
      startDate: 'Startdato*',
      endDate: 'Sluttdato*',
      startDateShort: 'Startdato',
      endDateShort: 'Sluttdato',
      discountPercent: 'Rabattprosent',
      activateNow: 'Aktiver dette tilbudet umiddelbart',
      statusActive: 'Aktiv',
      statusInactive: 'Inaktiv',
      cancel: 'Avbryt',
      saveChanges: 'Lagre endringer',
      saving: 'Lagrer...',
      close: 'Lukk',
      editOffer: 'Rediger tilbud',
      activateOffer: 'Aktiver tilbud',
      deactivateOffer: 'Deaktiver tilbud',
      updating: 'Oppdaterer...',
      errName: 'Tilbudsnavn kan ikke være tomt',
      errDesc: 'Beskrivelse kan ikke være tom',
      errDates: 'Velg både start- og sluttdato',
      errEndBeforeStart: 'Sluttdato kan ikke være før startdato',
      saveOk: 'Tilbud oppdatert',
      saveFail: 'Kunne ikke oppdatere tilbud: ',
      statusFail: 'Kunne ikke oppdatere status: '
    },
    sv: {
      header: 'Erbjudandedetaljer',
      noImage: 'Ingen bild tillgänglig',
      offerName: 'Erbjudandets namn*',
      offerNamePh: 'Ange erbjudandets namn',
      description: 'Beskrivning*',
      descriptionPh: 'Skriv en detaljerad beskrivning',
      startDate: 'Startdatum*',
      endDate: 'Slutdatum*',
      startDateShort: 'Startdatum',
      endDateShort: 'Slutdatum',
      discountPercent: 'Rabattprocent',
      activateNow: 'Aktivera detta erbjudande omedelbart',
      statusActive: 'Aktiv',
      statusInactive: 'Inaktiv',
      cancel: 'Avbryt',
      saveChanges: 'Spara ändringar',
      saving: 'Sparar...',
      close: 'Stäng',
      editOffer: 'Redigera erbjudande',
      activateOffer: 'Aktivera erbjudande',
      deactivateOffer: 'Inaktivera erbjudande',
      updating: 'Uppdaterar...',
      errName: 'Erbjudandets namn får inte vara tomt',
      errDesc: 'Beskrivningen får inte vara tom',
      errDates: 'Välj både start- och slutdatum',
      errEndBeforeStart: 'Slutdatum får inte vara före startdatum',
      saveOk: 'Erbjudande uppdaterat',
      saveFail: 'Det gick inte att uppdatera erbjudandet: ',
      statusFail: 'Det gick inte att uppdatera status: '
    },
    de: {
      header: 'Angebotsdetails',
      noImage: 'Kein Bild verfügbar',
      offerName: 'Angebotsname*',
      offerNamePh: 'Angebotsnamen eingeben',
      description: 'Beschreibung*',
      descriptionPh: 'Ausführliche Beschreibung eingeben',
      startDate: 'Startdatum*',
      endDate: 'Enddatum*',
      startDateShort: 'Startdatum',
      endDateShort: 'Enddatum',
      discountPercent: 'Rabattprozentsatz',
      activateNow: 'Dieses Angebot sofort aktivieren',
      statusActive: 'Aktiv',
      statusInactive: 'Inaktiv',
      cancel: 'Abbrechen',
      saveChanges: 'Änderungen speichern',
      saving: 'Speichern...',
      close: 'Schließen',
      editOffer: 'Angebot bearbeiten',
      activateOffer: 'Angebot aktivieren',
      deactivateOffer: 'Angebot deaktivieren',
      updating: 'Aktualisieren...',
      errName: 'Angebotsname darf nicht leer sein',
      errDesc: 'Beschreibung darf nicht leer sein',
      errDates: 'Bitte Start- und Enddatum auswählen',
      errEndBeforeStart: 'Enddatum darf nicht vor dem Startdatum liegen',
      saveOk: 'Angebot erfolgreich aktualisiert',
      saveFail: 'Aktualisieren fehlgeschlagen: ',
      statusFail: 'Statusaktualisierung fehlgeschlagen: '
    },
  };

  const t = (k) => (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;

  // Listen for broadcasted language changes
  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  // Sync on mount and when localStorage changes (cross-tab)
  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => {
      if (e.key === 'app_lang') setLang(e.newValue || 'en');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const firestore = getFirestore();

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    if (!formData.offer_name.trim()) {
      alert(t('errName'));
      return;
    }
    if (!formData.description.trim()) {
      alert(t('errDesc'));
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      alert(t('errDates'));
      return;
    }
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      alert(t('errEndBeforeStart'));
      return;
    }

    setLoading(true);

      try {
        const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
        const offerRef = doc(
          firestore,
          `${collectionName}/${offer.restaurantId}/offer/${offer.id}`
        );
        await updateDoc(offerRef, {
        offer_name: formData.offer_name,
        description: formData.description,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: formData.is_active,
      });

      setIsEditing(false);
      alert(t('saveOk'));

      // Notify parent of updated offer
      onOfferUpdated({ ...offer, ...formData });
    } catch (error) {
      alert(t('saveFail') + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActiveStatus = async () => {
    setLoading(true);
      try {
      const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
      const offerRef = doc(
        firestore,
        `${collectionName}/${offer.restaurantId}/offer/${offer.id}`
      );
      await updateDoc(offerRef, {
        is_active: !formData.is_active,
      });

      const updatedOffer = { ...offer, ...formData, is_active: !formData.is_active };
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }));
      onOfferUpdated(updatedOffer);
    } catch (error) {
      alert(t('statusFail') + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!offer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">{t('header')}</h2>
            <button
              onClick={() => !loading && onClose()}
              className="text-gray-400 hover:text-gray-500 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="Close details"
              disabled={loading}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6">
          {/* Offer Image */}
          <div className="relative rounded-lg overflow-hidden h-64 bg-gray-100 border border-gray-200">
            {offer.image ? (
              <img
                src={offer.image}
                alt={offer.offer_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                <svg
                  className="h-16 w-16 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-sm">{t('noImage')}</span>
              </div>
            )}
          </div>

          {/* Offer Details / Edit Form */}
          {isEditing ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('offerName')}
                  </label>
                  <input
                    name="offer_name"
                    type="text"
                    value={formData.offer_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    disabled={loading}
                    placeholder={t('offerNamePh')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('description')}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                    disabled={loading}
                    placeholder={t('descriptionPh')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('startDate')}
                    </label>
                    <input
                      name="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('endDate')}
                    </label>
                    <input
                      name="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <div className="flex items-center h-5">
                    <input
                      id="is_active"
                      name="is_active"
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded transition"
                      disabled={loading}
                    />
                  </div>
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    {t('activateNow')}
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="text-2xl font-bold text-gray-900">{offer.offer_name}</h3>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      offer.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {offer.is_active ? t('statusActive') : t('statusInactive')}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">{offer.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('startDateShort')}
                  </p>
                  <p className="text-gray-900 font-medium">
                    {new Date(offer.start_date).toLocaleDateString(localeMap[lang] || 'en-US', {
                      weekday: 'short',
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    {t('endDateShort')}
                  </p>
                  <p className="text-gray-900 font-medium">
                    {new Date(offer.end_date).toLocaleDateString(localeMap[lang] || 'en-US', {
                      weekday: 'short',
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {offer.discount_percent !== undefined && offer.discount_percent !== null && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      {t('discountPercent')}
                    </p>
                    <p className="text-gray-900 font-medium">
                      {offer.discount_percent}%
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                disabled={loading}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-5 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 text-sm font-medium disabled:opacity-70 transition-colors"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </span>
                ) : t('saveChanges')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                {t('close')}
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-5 py-2.5 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
                disabled={loading}
              >
                {t('editOffer')}
              </button>

              {/* Activate / Deactivate Button */}
              <button
                onClick={toggleActiveStatus}
                disabled={loading}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium text-white shadow-sm transition-colors ${
                  formData.is_active ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('updating')}
                  </span>
                ) : formData.is_active ? t('deactivateOffer') : t('activateOffer')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}