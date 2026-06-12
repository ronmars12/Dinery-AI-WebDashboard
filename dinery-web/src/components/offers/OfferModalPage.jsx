import React, { useState, useRef } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc } from "firebase/firestore";

export default function OfferModalPage({ restaurant, userRole, onClose }) {
  const [offerName, setOfferName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [discountPercent, setDiscountPercent] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(false);

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const i18n = {
    en: {
      createOffer: 'Create Offer',
      active: 'Active',
      inactive: 'Inactive',
      percentOff: '{percent}% off',
      // labels
      offerName: 'Offer Name *',
      description: 'Description *',
      discountPercent: 'Discount Percent *',
      startDate: 'Start Date *',
      endDate: 'End Date *',
      activateImmediately: 'Activate immediately',
      offerImage: 'Offer Image *',
      // placeholders
      offerNamePh: 'E.g. Summer Special',
      descriptionPh: 'Describe the offer details...',
      selectDiscount: 'Select a discount',
      clickToUpload: 'Click to upload or drag and drop',
      maxSize: 'Max 5MB',
      removeImage: 'Remove image',
      cancel: 'Cancel',
      saving: 'Saving...',
      saveOffer: 'Save Offer',
      // validation / alerts
      enterOfferName: 'Please enter an offer name.',
      enterDescription: 'Please enter a description.',
      selectStartDate: 'Please select a start date.',
      selectEndDate: 'Please select an end date.',
      endBeforeStart: 'End date cannot be before start date.',
      selectDiscountPercent: 'Please select a discount percent.',
      uploadImage: 'Please upload an image.',
      offerAdded: 'Offer "{offer}" added for "{name}".',
      failedToSave: 'Failed to save offer: ',
    },
    fi: {
      createOffer: 'Luo tarjous',
      active: 'Aktiivinen',
      inactive: 'Ei aktiivinen',
      percentOff: '{percent}% alennus',
      offerName: 'Tarjouksen nimi *',
      description: 'Kuvaus *',
      discountPercent: 'Alennusprosentti *',
      startDate: 'Aloituspäivä *',
      endDate: 'Lopetuspäivä *',
      activateImmediately: 'Aktivoi heti',
      offerImage: 'Tarjouksen kuva *',
      offerNamePh: 'Esim. Kesäkampanja',
      descriptionPh: 'Kuvaile tarjouksen tiedot...',
      selectDiscount: 'Valitse alennus',
      clickToUpload: 'Napsauta ladataksesi tai vedä ja pudota',
      maxSize: 'Max 5 Mt',
      removeImage: 'Poista kuva',
      cancel: 'Peruuta',
      saving: 'Tallennetaan...',
      saveOffer: 'Tallenna tarjous',
      enterOfferName: 'Anna tarjouksen nimi.',
      enterDescription: 'Anna kuvaus.',
      selectStartDate: 'Valitse aloituspäivä.',
      selectEndDate: 'Valitse lopetuspäivä.',
      endBeforeStart: 'Loppupäivä ei voi olla ennen aloituspäivää.',
      selectDiscountPercent: 'Valitse alennusprosentti.',
      uploadImage: 'Lataa kuva.',
      offerAdded: 'Tarjous "{offer}" lisätty ravintolalle "{name}".',
      failedToSave: 'Tarjouksen tallennus epäonnistui: ',
    },
    no: {
      createOffer: 'Opprett tilbud',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      percentOff: '{percent}% rabatt',
      offerName: 'Tilbudsnavn *',
      description: 'Beskrivelse *',
      discountPercent: 'Rabattprosent *',
      startDate: 'Startdato *',
      endDate: 'Sluttdato *',
      activateImmediately: 'Aktiver umiddelbart',
      offerImage: 'Tilbudsbilde *',
      offerNamePh: 'F.eks. Sommertilbud',
      descriptionPh: 'Beskriv tilbudet...',
      selectDiscount: 'Velg rabatt',
      clickToUpload: 'Klikk for å laste opp eller dra og slipp',
      maxSize: 'Maks 5 MB',
      removeImage: 'Fjern bilde',
      cancel: 'Avbryt',
      saving: 'Lagrer...',
      saveOffer: 'Lagre tilbud',
      enterOfferName: 'Skriv inn et navn på tilbudet.',
      enterDescription: 'Skriv inn en beskrivelse.',
      selectStartDate: 'Velg startdato.',
      selectEndDate: 'Velg sluttdato.',
      endBeforeStart: 'Sluttdato kan ikke være før startdato.',
      selectDiscountPercent: 'Velg rabattprosent.',
      uploadImage: 'Last opp et bilde.',
      offerAdded: 'Tilbud "{offer}" lagt til for "{name}".',
      failedToSave: 'Klarte ikke å lagre tilbud: ',
    },
    sv: {
      createOffer: 'Skapa erbjudande',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      percentOff: '{percent}% rabatt',
      offerName: 'Erbjudandets namn *',
      description: 'Beskrivning *',
      discountPercent: 'Rabattprocent *',
      startDate: 'Startdatum *',
      endDate: 'Slutdatum *',
      activateImmediately: 'Aktivera direkt',
      offerImage: 'Erbjudandebild *',
      offerNamePh: 'T.ex. Sommarspecial',
      descriptionPh: 'Beskriv erbjudandet...',
      selectDiscount: 'Välj rabatt',
      clickToUpload: 'Klicka för att ladda upp eller dra och släpp',
      maxSize: 'Max 5 MB',
      removeImage: 'Ta bort bild',
      cancel: 'Avbryt',
      saving: 'Sparar...',
      saveOffer: 'Spara erbjudande',
      enterOfferName: 'Ange ett erbjudandenamn.',
      enterDescription: 'Ange en beskrivning.',
      selectStartDate: 'Välj startdatum.',
      selectEndDate: 'Välj slutdatum.',
      endBeforeStart: 'Slutdatum kan inte vara före startdatum.',
      selectDiscountPercent: 'Välj rabattprocent.',
      uploadImage: 'Ladda upp en bild.',
      offerAdded: 'Erbjudandet "{offer}" har lagts till för "{name}".',
      failedToSave: 'Det gick inte att spara erbjudandet: ',
    },
    de: {
      createOffer: 'Angebot erstellen',
      active: 'Aktiv',
      inactive: 'Inaktiv',
      percentOff: '{percent}% Rabatt',
      offerName: 'Angebotsname *',
      description: 'Beschreibung *',
      discountPercent: 'Rabattprozentsatz *',
      startDate: 'Startdatum *',
      endDate: 'Enddatum *',
      activateImmediately: 'Sofort aktivieren',
      offerImage: 'Angebotsbild *',
      offerNamePh: 'Z. B. Sommerspecial',
      descriptionPh: 'Beschreibe die Angebotsdetails...',
      selectDiscount: 'Rabatt auswählen',
      clickToUpload: 'Zum Hochladen klicken oder ziehen und ablegen',
      maxSize: 'Max 5 MB',
      removeImage: 'Bild entfernen',
      cancel: 'Abbrechen',
      saving: 'Speichern...',
      saveOffer: 'Angebot speichern',
      enterOfferName: 'Bitte einen Angebotsnamen eingeben.',
      enterDescription: 'Bitte eine Beschreibung eingeben.',
      selectStartDate: 'Bitte ein Startdatum auswählen.',
      selectEndDate: 'Bitte ein Enddatum auswählen.',
      endBeforeStart: 'Enddatum darf nicht vor dem Startdatum liegen.',
      selectDiscountPercent: 'Bitte einen Rabattprozentsatz auswählen.',
      uploadImage: 'Bitte ein Bild hochladen.',
      offerAdded: 'Angebot "{offer}" für "{name}" hinzugefügt.',
      failedToSave: 'Angebot konnte nicht gespeichert werden: ',
    },
  };
  const t = (k, vars = {}) => {
    const raw = (i18n[lang] && i18n[lang][k]) || i18n.en[k] || k;
    if (typeof raw !== 'string') return raw;
    return raw.replace(/\{(.*?)\}/g, (_, v) => (vars[v] != null ? String(vars[v]) : `{${v}}`));
  };
  // listen for broadcasted language changes
  React.useEffect(() => {
    const handler = (e) => { if (typeof e?.detail === 'string') setLang(e.detail); };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);
  // sync on mount / storage changes
  React.useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => { if (e.key === 'app_lang') setLang(e.newValue || 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fileInputRef = useRef(null);
  const storage = getStorage();
  const firestore = getFirestore();

  // Helper to generate offer ID: first 4 letters uppercase + 4 random digits
  const generateOfferId = (name) => {
    const prefix = name.trim().substring(0, 4).toUpperCase();
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return prefix + randomDigits;
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!offerName.trim()) {
      alert(t('enterOfferName'));
      return;
    }
    if (!description.trim()) {
      alert(t('enterDescription'));
      return;
    }
    if (!startDate) {
      alert(t('selectStartDate'));
      return;
    }
    if (!endDate) {
      alert(t('selectEndDate'));
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      alert(t('endBeforeStart'));
      return;
    }
    if (!discountPercent) {
      alert(t('selectDiscountPercent'));
      return;
    }
    if (!imageFile) {
      alert(t('uploadImage'));
      return;
    }

    setLoading(true);

    try {
      // Generate offer ID
      const offerId = generateOfferId(offerName);

      // Upload image to Firebase Storage
      const imageRef = ref(storage, `offers/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const uploadedImageUrl = await getDownloadURL(imageRef);

      // Prepare offer data
      const offerData = {
        offer_name: offerName,
        description,
        start_date: startDate,
        end_date: endDate,
        is_active: isActive,
        image: uploadedImageUrl,
        offer_id: offerId,
        discount_percent: Number(discountPercent),
        created_at: new Date().toISOString(),
      };
      
      const collectionName = userRole === 'tester' ? 'TestRestaurant' : 'restaurants';
      const offerDocRef = doc(firestore, `${collectionName}/${restaurant.id}/offer/${offerId}`);
      await setDoc(offerDocRef, offerData);

      alert(t('offerAdded', { offer: offerName, name: restaurant.name }));

      // Reset form and close
      setOfferName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setIsActive(true);
      setDiscountPercent("");
      setImageFile(null);
      setImagePreview("");
      onClose();
    } catch (error) {
      alert(t('failedToSave') + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackgroundClick = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackgroundClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-2xl font-semibold text-[#23272f]">
            {offerName || t('createOffer')}
          </h2>
          {typeof isActive === "boolean" && (
            <span className={`text-xs font-semibold ${isActive ? "text-green-600" : "text-red-600"}`}>
              {isActive ? t('active') : t('inactive')}
            </span>
          )}
          {typeof discountPercent === "number" && !Number.isNaN(discountPercent) && discountPercent !== "" && (
            <span className="text-xs font-semibold text-[#212620] bg-[#fe8922]/10 px-2 py-0.5 rounded-full">
              {t('percentOff', { percent: discountPercent })}
            </span>
          )}
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Offer Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('offerName')}
              </label>
              <input
                type="text"
                value={offerName}
                onChange={(e) => setOfferName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                placeholder={t('offerNamePh')}
                required
                disabled={loading}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('description')}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                placeholder={t('descriptionPh')}
                rows={3}
                required
                disabled={loading}
              />
            </div>

            {/* Discount Percent */}
            <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('discountPercent')}
            </label>
            <select
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
              required
              disabled={loading}
            >
              <option value="" disabled>{t('selectDiscount')}</option>
              {Array.from({ length: 18 }, (_, i) => 15 + i * 5).map((val) => (
                <option key={val} value={val}>
                  {val}%
                </option>
              ))}
            </select>
          </div>
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                required
                disabled={!startDate || loading}  // Disable until start date is selected
              />
            </div>
          </div>


            {/* Active Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label className="ml-2 text-sm text-gray-700">
                {t('activateImmediately')}
              </label>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('offerImage')}
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current.click()}
                className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer hover:border-orange-400 relative"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="mx-auto max-h-32 rounded-md object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview("");
                      }}
                      className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow hover:bg-gray-100"
                      aria-label={t('removeImage')}
                    >
                      <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                ) : (
                  <>
                    <svg
                      className="mx-auto h-8 w-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="mt-1 text-sm text-gray-600">
                      {t('clickToUpload')}
                    </p>
                    <p className="text-xs text-gray-400">{t('maxSize')}</p>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Form Buttons */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-[#23272f]/20 bg-white py-2 px-5 text-sm font-medium text-[#23272f] shadow-sm hover:bg-[#23272f]/5 hover:border-[#fe8a24]/50 transition-colors disabled:opacity-50"
                disabled={loading}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-[#fe8a24] hover:bg-[#e07d20] py-2 px-5 text-sm font-medium text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('saving')}
                  </>
                ) : (
                  t('saveOffer')
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
