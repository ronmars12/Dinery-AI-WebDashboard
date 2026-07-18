import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, query, where, doc, getDoc, setDoc, addDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { firestore, auth, storage } from '../../firebase';
import {
  FiUsers, FiCalendar, FiClock, FiMapPin,
  FiChevronLeft, FiChevronRight, FiCheck, FiEdit2,
  FiCopy, FiExternalLink, FiUpload, FiX, FiImage,
  FiSearch, FiChevronDown,
} from 'react-icons/fi';

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // Page titles
    reservationLink: 'Reservation Link',
    selectRestaurant: 'Select a restaurant to set up its booking page',
    yourReservationLink: 'Your Reservation Link',
    shareWithCustomers: 'Share this link with your customers',
    previewPage: 'Preview Page',
    getLink: 'Get Link',
    backToEditor: 'Back to Editor',
    // Restaurant selector
    searchRestaurants: 'Search restaurants...',
    loadingRestaurants: 'Loading your restaurants...',
    noRestaurantsFound: 'No restaurants found',
    tryDifferentSearch: 'Try a different search term',
    noRestaurantsLinked: 'No restaurants are linked to your account yet',
    active: 'Active',
    // Config page
    customizeBookingPage: 'Customize your public booking page',
    save: 'Save',
    saved: 'Saved!',
    saving: 'Saving...',
    images: 'Images',
    logoAndBackground: 'Logo and background photo',
    restaurantLogo: 'Restaurant Logo',
    remove: 'Remove',
    change: 'Change',
    uploadLogo: 'Upload logo',
    pngJpgMax5MB: 'PNG, JPG · Max 5MB',
    shape: 'Shape',
    circle: 'Circle',
    rounded: 'Round',
    square: 'Square',
    size: 'Size',
    backgroundImage: 'Background Image',
    uploadBackground: 'Upload background',
    pngJpgMax10MB: 'PNG, JPG · Max 10MB',
    darkOverlay: 'Dark overlay',
    light: 'Light',
    dark: 'Dark',
    branding: 'Branding',
    welcomeHeading: 'Welcome Heading',
    subHeading: 'Sub-heading',
    accentColor: 'Accent Color',
    background: 'Background',
    usingUploadedPhoto: 'Using uploaded photo. Remove it above to switch to a gradient.',
    bookingOptionsMoved: 'Booking Options Moved',
    bookingOptionsDescription: 'Time intervals, start/end buffers, and other booking settings are now configured in Reservation Settings (accessed from the calendar page).',
    bookingOptionsNote: 'This allows you to set different booking intervals for each day of the week with custom start and end buffers.',
    formFields: 'Form Fields',
    requireEmail: 'Require Email',
    requirePhone: 'Require Phone',
    showCompanyField: 'Show Company Field',
    showNotesField: 'Show Notes Field',
    use24HourFormat: 'Use 24-Hour Time Format',
    livePreview: 'Live Preview',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    closedOnThisDay: 'Closed on this day',
    loadingAvailability: 'Loading availability...',
    noTimeSlotsAvailable: 'No time slots available',
    contactUsDirectly: 'Please contact us directly to book.',
    continue: 'Continue →',
    // Link page
    publicBookingPage: 'Public Booking Page',
    shareLink: 'Share this link so guests can book directly from any device.',
    copy: 'Copy',
    copied: 'Copied!',
    mobileReady: 'Mobile Ready',
    worksOnAllDevices: 'Works on all devices',
    instantBooking: 'Instant Booking',
    savedToDashboard: 'Saved to your dashboard',
    fullyBranded: 'Fully Branded',
    yourColorsAndName: 'Your colors and name',
    allTracked: 'All Tracked',
    appearsInCalendar: 'Appears in your calendar',
    // Preview page
    youreBooked: "You're booked!",
    reservationConfirmed: 'your reservation has been confirmed.',
    makeAnotherReservation: 'Make Another Reservation',
    summary: 'Summary',
    guests: 'guests',
    enterContactDetails: 'Enter your contact details',
    firstName: 'First name',
    lastName: 'Last name',
    phone: 'Phone',
    email: 'Email',
    company: 'Company',
    notes: 'Notes',
    dietaryRequirements: 'Dietary requirements, special occasions...',
    haveOfferCode: 'Have an offer code?',
    agreeToNewsletters: 'I agree to receive newsletters in accordance with the declaration of consent.',
    byCompletingBooking: 'By completing this booking you agree to our Terms',
    makeReservation: 'Make reservation',
    // Toast messages
    pleaseEnterName: 'Please enter your name',
    phoneRequired: 'Phone number is required',
    emailRequired: 'Email address is required',
    timeSlotFullyBooked: 'This time slot is fully booked. Please choose a different time.',
    offerCodeReachedLimit: 'This offer code has reached its usage limit.',
    offerCodeAlreadyUsed: 'You have already used this offer code.',
    failedToSaveReservation: 'Failed to save reservation: ',
    // Access restricted
    accessRestricted: 'Access Restricted',
    accessRestrictedMessage: 'Only Admin and Manager roles can access the Reservation Link page. Contact your manager for access.',
    // Change restaurant
    changeRestaurant: 'Change restaurant',
    // Booking summary
    selectADate: 'Select a date',
    selectATime: 'Select a time',
    // Time slot
    moreSlots: 'more slots on full page',
    // Offer code
    offerCodePlaceholder: 'e.g. WELCOME10',
    // Reservation settings note
    reservationSettingsNote: 'Time intervals, start/end buffers, and other booking settings are now configured in Reservation Settings.',
  },
  fi: {
    reservationLink: 'Varauslinkki',
    selectRestaurant: 'Valitse ravintola, jonka varaussivu haluat määrittää',
    yourReservationLink: 'Varauslinkkisi',
    shareWithCustomers: 'Jaa tämä linkki asiakkaille',
    previewPage: 'Esikatselu',
    getLink: 'Hae linkki',
    backToEditor: 'Takaisin muokkaukseen',
    searchRestaurants: 'Hae ravintoloita...',
    loadingRestaurants: 'Ladataan ravintoloitasi...',
    noRestaurantsFound: 'Ravintoloita ei löytynyt',
    tryDifferentSearch: 'Kokeile toista hakusanaa',
    noRestaurantsLinked: 'Tililläsi ei ole vielä ravintoloita',
    active: 'Aktiivinen',
    customizeBookingPage: 'Muokkaa julkista varaussivuasi',
    save: 'Tallenna',
    saved: 'Tallennettu!',
    saving: 'Tallennetaan...',
    images: 'Kuvat',
    logoAndBackground: 'Logo ja taustakuva',
    restaurantLogo: 'Ravintolan logo',
    remove: 'Poista',
    change: 'Vaihda',
    uploadLogo: 'Lataa logo',
    pngJpgMax5MB: 'PNG, JPG · Max 5MB',
    shape: 'Muoto',
    circle: 'Ympyrä',
    rounded: 'Pyöristetty',
    square: 'Neliö',
    size: 'Koko',
    backgroundImage: 'Taustakuva',
    uploadBackground: 'Lataa tausta',
    pngJpgMax10MB: 'PNG, JPG · Max 10MB',
    darkOverlay: 'Tumma peite',
    light: 'Vaalea',
    dark: 'Tumma',
    branding: 'Brändäys',
    welcomeHeading: 'Tervetuloa-otsikko',
    subHeading: 'Alaotsikko',
    accentColor: 'Korostusväri',
    background: 'Tausta',
    usingUploadedPhoto: 'Käytetään ladattua kuvaa. Poista se yllä vaihtaaksesi gradienttiin.',
    bookingOptionsMoved: 'Varausten asetukset siirretty',
    bookingOptionsDescription: 'Aikavälit, aloitus- ja lopetuspuskurit sekä muut varausasetukset on nyt määritetty Varausasetuksissa (saatavilla kalenterisivulta).',
    bookingOptionsNote: 'Tämä mahdollistaa erilaisten varausvälien asettamisen jokaiselle viikonpäivälle mukautetuilla aloitus- ja lopetuspuskureilla.',
    formFields: 'Lomakkeen kentät',
    requireEmail: 'Vaadi sähköposti',
    requirePhone: 'Vaadi puhelin',
    showCompanyField: 'Näytä yrityskenttä',
    showNotesField: 'Näytä muistiinpanokenttä',
    use24HourFormat: 'Käytä 24 tunnin aikamuotoa',
    livePreview: 'Esikatselu',
    selectDate: 'Valitse päivä',
    selectTime: 'Valitse aika',
    closedOnThisDay: 'Suljettu tänä päivänä',
    loadingAvailability: 'Ladataan saatavuutta...',
    noTimeSlotsAvailable: 'Ei vapaita aikavälejä',
    contactUsDirectly: 'Ota yhteyttä suoraan tehdäksesi varauksen.',
    continue: 'Jatka →',
    publicBookingPage: 'Julkinen varaussivu',
    shareLink: 'Jaa tämä linkki, jotta asiakkaat voivat varata suoraan miltä tahansa laitteelta.',
    copy: 'Kopioi',
    copied: 'Kopioitu!',
    mobileReady: 'Mobiilivalmis',
    worksOnAllDevices: 'Toimii kaikilla laitteilla',
    instantBooking: 'Välitön varaus',
    savedToDashboard: 'Tallennettu kojelautaasi',
    fullyBranded: 'Täysin brändätty',
    yourColorsAndName: 'Sinun värit ja nimesi',
    allTracked: 'Kaikki seurannassa',
    appearsInCalendar: 'Näkyy kalenterissasi',
    youreBooked: 'Varaus vahvistettu!',
    reservationConfirmed: 'varauksesi on vahvistettu.',
    makeAnotherReservation: 'Tee toinen varaus',
    summary: 'Yhteenveto',
    guests: 'vierasta',
    enterContactDetails: 'Syötä yhteystietosi',
    firstName: 'Etunimi',
    lastName: 'Sukunimi',
    phone: 'Puhelin',
    email: 'Sähköposti',
    company: 'Yritys',
    notes: 'Muistiinpanot',
    dietaryRequirements: 'Ruokavaliovaatimukset, erityistilaisuudet...',
    haveOfferCode: 'Onko sinulla tarjouskoodi?',
    agreeToNewsletters: 'Hyväksyn uutiskirjeiden vastaanottamisen suostumusilmoituksen mukaisesti.',
    byCompletingBooking: 'Tekemällä tämän varauksen hyväksyt Ehdot',
    makeReservation: 'Tee varaus',
    pleaseEnterName: 'Syötä nimesi',
    phoneRequired: 'Puhelinnumero vaaditaan',
    emailRequired: 'Sähköpostiosoite vaaditaan',
    timeSlotFullyBooked: 'Tämä aikaväli on täysin varattu. Valitse toinen aika.',
    offerCodeReachedLimit: 'Tämä tarjouskoodi on saavuttanut käyttörajansa.',
    offerCodeAlreadyUsed: 'Olet jo käyttänyt tämän tarjouskoodin.',
    failedToSaveReservation: 'Varauksen tallennus epäonnistui: ',
    accessRestricted: 'Pääsy rajoitettu',
    accessRestrictedMessage: 'Vain Admin- ja Manager-roolit voivat käyttää Varauslinkki-sivua. Ota yhteyttä esihenkilöösi saadaksesi pääsyn.',
    changeRestaurant: 'Vaihda ravintolaa',
    selectADate: 'Valitse päivä',
    selectATime: 'Valitse aika',
    moreSlots: 'lisää aikaväliä',
    offerCodePlaceholder: 'esim. TERVETULOA10',
    reservationSettingsNote: 'Aikavälit, aloitus- ja lopetuspuskurit sekä muut varausasetukset on nyt määritetty Varausasetuksissa.',
  },
  no: {
    reservationLink: 'Bestillingslenke',
    selectRestaurant: 'Velg en restaurant for å sette opp bestillingssiden',
    yourReservationLink: 'Din bestillingslenke',
    shareWithCustomers: 'Del denne lenken med kundene dine',
    previewPage: 'Forhåndsvisning',
    getLink: 'Hent lenke',
    backToEditor: 'Tilbake til redigering',
    searchRestaurants: 'Søk restauranter...',
    loadingRestaurants: 'Laster restaurantene dine...',
    noRestaurantsFound: 'Ingen restauranter funnet',
    tryDifferentSearch: 'Prøv et annet søkeord',
    noRestaurantsLinked: 'Ingen restauranter er knyttet til kontoen din ennå',
    active: 'Aktiv',
    customizeBookingPage: 'Tilpass din offentlige bestillingsside',
    save: 'Lagre',
    saved: 'Lagret!',
    saving: 'Lagrer...',
    images: 'Bilder',
    logoAndBackground: 'Logo og bakgrunnsbilde',
    restaurantLogo: 'Restaurantlogo',
    remove: 'Fjern',
    change: 'Endre',
    uploadLogo: 'Last opp logo',
    pngJpgMax5MB: 'PNG, JPG · Maks 5MB',
    shape: 'Form',
    circle: 'Sirkel',
    rounded: 'Avrundet',
    square: 'Firkant',
    size: 'Størrelse',
    backgroundImage: 'Bakgrunnsbilde',
    uploadBackground: 'Last opp bakgrunn',
    pngJpgMax10MB: 'PNG, JPG · Maks 10MB',
    darkOverlay: 'Mørkt overlegg',
    light: 'Lys',
    dark: 'Mørk',
    branding: 'Merkevarebygging',
    welcomeHeading: 'Velkomstoverskrift',
    subHeading: 'Underoverskrift',
    accentColor: 'Aksentfarge',
    background: 'Bakgrunn',
    usingUploadedPhoto: 'Bruker opplastet bilde. Fjern det over for å bytte til gradient.',
    bookingOptionsMoved: 'Bestillingsalternativer flyttet',
    bookingOptionsDescription: 'Tidsintervaller, start-/sluttbuffere og andre bestillingsinnstillinger konfigureres nå i Bestillingsinnstillinger (tilgjengelig fra kalendersiden).',
    bookingOptionsNote: 'Dette lar deg sette forskjellige bestillingsintervaller for hver ukedag med tilpassede start- og sluttbuffere.',
    formFields: 'Skjemafelt',
    requireEmail: 'Krev e-post',
    requirePhone: 'Krev telefon',
    showCompanyField: 'Vis bedriftsfelt',
    showNotesField: 'Vis notatfelt',
    use24HourFormat: 'Bruk 24-timers format',
    livePreview: 'Forhåndsvisning',
    selectDate: 'Velg dato',
    selectTime: 'Velg tid',
    closedOnThisDay: 'Stengt på denne dagen',
    loadingAvailability: 'Laster tilgjengelighet...',
    noTimeSlotsAvailable: 'Ingen tilgjengelige tidspor',
    contactUsDirectly: 'Kontakt oss direkte for å booke.',
    continue: 'Fortsett →',
    publicBookingPage: 'Offentlig bestillingsside',
    shareLink: 'Del denne lenken så gjester kan booke direkte fra hvilken som helst enhet.',
    copy: 'Kopier',
    copied: 'Kopiert!',
    mobileReady: 'Mobilklar',
    worksOnAllDevices: 'Fungerer på alle enheter',
    instantBooking: 'Umiddelbar bestilling',
    savedToDashboard: 'Lagret i dashbordet ditt',
    fullyBranded: 'Fullt merkevarebygget',
    yourColorsAndName: 'Dine farger og navn',
    allTracked: 'Alt spores',
    appearsInCalendar: 'Vises i kalenderen din',
    youreBooked: 'Du er booket!',
    reservationConfirmed: 'reservasjonen din er bekreftet.',
    makeAnotherReservation: 'Gjør en ny reservasjon',
    summary: 'Sammendrag',
    guests: 'gjester',
    enterContactDetails: 'Skriv inn kontaktopplysningene dine',
    firstName: 'Fornavn',
    lastName: 'Etternavn',
    phone: 'Telefon',
    email: 'E-post',
    company: 'Bedrift',
    notes: 'Notater',
    dietaryRequirements: 'Kostholdskrav, spesielle anledninger...',
    haveOfferCode: 'Har du en tilbudskode?',
    agreeToNewsletters: 'Jeg samtykker til å motta nyhetsbrev i samsvar med samtykkeerklæringen.',
    byCompletingBooking: 'Ved å gjennomføre denne bestillingen godtar du Vilkårene',
    makeReservation: 'Gjør reservasjon',
    pleaseEnterName: 'Vennligst skriv inn navnet ditt',
    phoneRequired: 'Telefonnummer er påkrevd',
    emailRequired: 'E-postadresse er påkrevd',
    timeSlotFullyBooked: 'Dette tidspunktet er fullbooket. Vennligst velg et annet tidspunkt.',
    offerCodeReachedLimit: 'Denne tilbudskoden har nådd bruksgrensen.',
    offerCodeAlreadyUsed: 'Du har allerede brukt denne tilbudskoden.',
    failedToSaveReservation: 'Kunne ikke lagre reservasjon: ',
    accessRestricted: 'Tilgang begrenset',
    accessRestrictedMessage: 'Kun Admin- og Manager-roller har tilgang til Bestillingslenke-siden. Kontakt lederen din for tilgang.',
    changeRestaurant: 'Bytt restaurant',
    selectADate: 'Velg en dato',
    selectATime: 'Velg en tid',
    moreSlots: 'flere spor på full side',
    offerCodePlaceholder: 'f.eks. VELKOMMEN10',
    reservationSettingsNote: 'Tidsintervaller, start-/sluttbuffere og andre bestillingsinnstillinger konfigureres nå i Bestillingsinnstillinger.',
  },
  sv: {
    reservationLink: 'Bokningslänk',
    selectRestaurant: 'Välj en restaurang för att ställa in dess bokningssida',
    yourReservationLink: 'Din bokningslänk',
    shareWithCustomers: 'Dela den här länken med dina kunder',
    previewPage: 'Förhandsgranska',
    getLink: 'Hämta länk',
    backToEditor: 'Tillbaka till redigering',
    searchRestaurants: 'Sök restauranger...',
    loadingRestaurants: 'Laddar dina restauranger...',
    noRestaurantsFound: 'Inga restauranger hittades',
    tryDifferentSearch: 'Prova ett annat sökord',
    noRestaurantsLinked: 'Inga restauranger är kopplade till ditt konto ännu',
    active: 'Aktiv',
    customizeBookingPage: 'Anpassa din offentliga bokningssida',
    save: 'Spara',
    saved: 'Sparad!',
    saving: 'Sparar...',
    images: 'Bilder',
    logoAndBackground: 'Logotyp och bakgrundsbild',
    restaurantLogo: 'Restauranglogotyp',
    remove: 'Ta bort',
    change: 'Ändra',
    uploadLogo: 'Ladda upp logotyp',
    pngJpgMax5MB: 'PNG, JPG · Max 5MB',
    shape: 'Form',
    circle: 'Cirkel',
    rounded: 'Rundad',
    square: 'Fyrkant',
    size: 'Storlek',
    backgroundImage: 'Bakgrundsbild',
    uploadBackground: 'Ladda upp bakgrund',
    pngJpgMax10MB: 'PNG, JPG · Max 10MB',
    darkOverlay: 'Mörkt överlägg',
    light: 'Ljus',
    dark: 'Mörk',
    branding: 'Varumärke',
    welcomeHeading: 'Välkomstrubrik',
    subHeading: 'Underrubrik',
    accentColor: 'Accentfärg',
    background: 'Bakgrund',
    usingUploadedPhoto: 'Använder uppladdad bild. Ta bort den ovan för att byta till gradient.',
    bookingOptionsMoved: 'Bokningsalternativ flyttade',
    bookingOptionsDescription: 'Tidsintervall, start-/slutbuffrar och andra bokningsinställningar konfigureras nu i Bokningsinställningar (tillgängligt från kalendersidan).',
    bookingOptionsNote: 'Detta låter dig ställa in olika bokningsintervall för varje veckodag med anpassade start- och slutbuffrar.',
    formFields: 'Formulärfält',
    requireEmail: 'Kräv e-post',
    requirePhone: 'Kräv telefon',
    showCompanyField: 'Visa företagsfält',
    showNotesField: 'Visa anteckningsfält',
    use24HourFormat: 'Använd 24-timmarsformat',
    livePreview: 'Liveförhandsvisning',
    selectDate: 'Välj datum',
    selectTime: 'Välj tid',
    closedOnThisDay: 'Stängt på denna dag',
    loadingAvailability: 'Laddar tillgänglighet...',
    noTimeSlotsAvailable: 'Inga tillgängliga tider',
    contactUsDirectly: 'Kontakta oss direkt för att boka.',
    continue: 'Fortsätt →',
    publicBookingPage: 'Offentlig bokningssida',
    shareLink: 'Dela den här länken så att gäster kan boka direkt från vilken enhet som helst.',
    copy: 'Kopiera',
    copied: 'Kopierad!',
    mobileReady: 'Mobilredo',
    worksOnAllDevices: 'Fungerar på alla enheter',
    instantBooking: 'Omedelbar bokning',
    savedToDashboard: 'Sparad i din instrumentpanel',
    fullyBranded: 'Fullt varumärkesanpassad',
    yourColorsAndName: 'Dina färger och namn',
    allTracked: 'Allt spåras',
    appearsInCalendar: 'Syns i din kalender',
    youreBooked: 'Du är bokad!',
    reservationConfirmed: 'din bokning har bekräftats.',
    makeAnotherReservation: 'Gör en ny bokning',
    summary: 'Sammanfattning',
    guests: 'gäster',
    enterContactDetails: 'Ange dina kontaktuppgifter',
    firstName: 'Förnamn',
    lastName: 'Efternamn',
    phone: 'Telefon',
    email: 'E-post',
    company: 'Företag',
    notes: 'Anteckningar',
    dietaryRequirements: 'Kostkrav, speciella tillfällen...',
    haveOfferCode: 'Har du en erbjudandekod?',
    agreeToNewsletters: 'Jag samtycker till att ta emot nyhetsbrev i enlighet med samtyckesförklaringen.',
    byCompletingBooking: 'Genom att slutföra denna bokning godkänner du Villkor',
    makeReservation: 'Gör bokning',
    pleaseEnterName: 'Ange ditt namn',
    phoneRequired: 'Telefonnummer krävs',
    emailRequired: 'E-postadress krävs',
    timeSlotFullyBooked: 'Denna tid är fullbokad. Vänligen välj en annan tid.',
    offerCodeReachedLimit: 'Denna erbjudandekod har nått sin användningsgräns.',
    offerCodeAlreadyUsed: 'Du har redan använt denna erbjudandekod.',
    failedToSaveReservation: 'Kunde inte spara bokning: ',
    accessRestricted: 'Åtkomst begränsad',
    accessRestrictedMessage: 'Endast Admin- och Manager-roller kan komma åt Bokningslänk-sidan. Kontakta din chef för åtkomst.',
    changeRestaurant: 'Byt restaurang',
    selectADate: 'Välj ett datum',
    selectATime: 'Välj en tid',
    moreSlots: 'fler tider på full sida',
    offerCodePlaceholder: 't.ex. VÄLKOMMEN10',
    reservationSettingsNote: 'Tidsintervall, start-/slutbuffrar och andra bokningsinställningar konfigureras nu i Bokningsinställningar.',
  },
  de: {
    reservationLink: 'Buchungslink',
    selectRestaurant: 'Wählen Sie ein Restaurant, um dessen Buchungsseite einzurichten',
    yourReservationLink: 'Ihr Buchungslink',
    shareWithCustomers: 'Teilen Sie diesen Link mit Ihren Kunden',
    previewPage: 'Vorschau',
    getLink: 'Link abrufen',
    backToEditor: 'Zurück zum Editor',
    searchRestaurants: 'Restaurants suchen...',
    loadingRestaurants: 'Lade Ihre Restaurants...',
    noRestaurantsFound: 'Keine Restaurants gefunden',
    tryDifferentSearch: 'Versuchen Sie einen anderen Suchbegriff',
    noRestaurantsLinked: 'Es sind noch keine Restaurants mit Ihrem Konto verknüpft',
    active: 'Aktiv',
    customizeBookingPage: 'Passen Sie Ihre öffentliche Buchungsseite an',
    save: 'Speichern',
    saved: 'Gespeichert!',
    saving: 'Speichere...',
    images: 'Bilder',
    logoAndBackground: 'Logo und Hintergrundbild',
    restaurantLogo: 'Restaurant-Logo',
    remove: 'Entfernen',
    change: 'Ändern',
    uploadLogo: 'Logo hochladen',
    pngJpgMax5MB: 'PNG, JPG · Max 5MB',
    shape: 'Form',
    circle: 'Kreis',
    rounded: 'Abgerundet',
    square: 'Quadrat',
    size: 'Größe',
    backgroundImage: 'Hintergrundbild',
    uploadBackground: 'Hintergrund hochladen',
    pngJpgMax10MB: 'PNG, JPG · Max 10MB',
    darkOverlay: 'Dunkle Überlagerung',
    light: 'Hell',
    dark: 'Dunkel',
    branding: 'Markenbildung',
    welcomeHeading: 'Begrüßungsüberschrift',
    subHeading: 'Unterüberschrift',
    accentColor: 'Akzentfarbe',
    background: 'Hintergrund',
    usingUploadedPhoto: 'Verwendet hochgeladenes Bild. Entfernen Sie es oben, um zu einem Farbverlauf zu wechseln.',
    bookingOptionsMoved: 'Buchungsoptionen verschoben',
    bookingOptionsDescription: 'Zeitintervalle, Start-/Endpuffer und andere Buchungseinstellungen werden jetzt in den Buchungseinstellungen konfiguriert (über die Kalenderseite zugänglich).',
    bookingOptionsNote: 'Dies ermöglicht es Ihnen, verschiedene Buchungsintervalle für jeden Wochentag mit benutzerdefinierten Start- und Endpuffern festzulegen.',
    formFields: 'Formularfelder',
    requireEmail: 'E-Mail erforderlich',
    requirePhone: 'Telefon erforderlich',
    showCompanyField: 'Firmenfeld anzeigen',
    showNotesField: 'Notizfeld anzeigen',
    use24HourFormat: '24-Stunden-Format verwenden',
    livePreview: 'Live-Vorschau',
    selectDate: 'Datum auswählen',
    selectTime: 'Uhrzeit auswählen',
    closedOnThisDay: 'An diesem Tag geschlossen',
    loadingAvailability: 'Lade Verfügbarkeit...',
    noTimeSlotsAvailable: 'Keine verfügbaren Zeitslots',
    contactUsDirectly: 'Bitte kontaktieren Sie uns direkt, um zu buchen.',
    continue: 'Weiter →',
    publicBookingPage: 'Öffentliche Buchungsseite',
    shareLink: 'Teilen Sie diesen Link, damit Gäste direkt von jedem Gerät aus buchen können.',
    copy: 'Kopieren',
    copied: 'Kopiert!',
    mobileReady: 'Mobil bereit',
    worksOnAllDevices: 'Funktioniert auf allen Geräten',
    instantBooking: 'Sofortige Buchung',
    savedToDashboard: 'In Ihrem Dashboard gespeichert',
    fullyBranded: 'Vollständig gebrandet',
    yourColorsAndName: 'Ihre Farben und Ihr Name',
    allTracked: 'Alles nachverfolgbar',
    appearsInCalendar: 'Erscheint in Ihrem Kalender',
    youreBooked: 'Sie sind gebucht!',
    reservationConfirmed: 'Ihre Reservierung wurde bestätigt.',
    makeAnotherReservation: 'Eine weitere Reservierung vornehmen',
    summary: 'Zusammenfassung',
    guests: 'Gäste',
    enterContactDetails: 'Geben Sie Ihre Kontaktdaten ein',
    firstName: 'Vorname',
    lastName: 'Nachname',
    phone: 'Telefon',
    email: 'E-Mail',
    company: 'Firma',
    notes: 'Notizen',
    dietaryRequirements: 'Ernährungsanforderungen, besondere Anlässe...',
    haveOfferCode: 'Haben Sie einen Angebotscode?',
    agreeToNewsletters: 'Ich stimme dem Erhalt von Newslettern gemäß der Einwilligungserklärung zu.',
    byCompletingBooking: 'Mit Abschluss dieser Buchung stimmen Sie den AGB zu',
    makeReservation: 'Reservierung vornehmen',
    pleaseEnterName: 'Bitte geben Sie Ihren Namen ein',
    phoneRequired: 'Telefonnummer ist erforderlich',
    emailRequired: 'E-Mail-Adresse ist erforderlich',
    timeSlotFullyBooked: 'Dieser Zeitslot ist ausgebucht. Bitte wählen Sie eine andere Uhrzeit.',
    offerCodeReachedLimit: 'Dieser Angebotscode hat sein Nutzungslimit erreicht.',
    offerCodeAlreadyUsed: 'Sie haben diesen Angebotscode bereits verwendet.',
    failedToSaveReservation: 'Reservierung konnte nicht gespeichert werden: ',
    accessRestricted: 'Zugriff eingeschränkt',
    accessRestrictedMessage: 'Nur Admin- und Manager-Rollen können auf die Buchungslink-Seite zugreifen. Kontaktieren Sie Ihren Vorgesetzten für Zugang.',
    changeRestaurant: 'Restaurant wechseln',
    selectADate: 'Wählen Sie ein Datum',
    selectATime: 'Wählen Sie eine Uhrzeit',
    moreSlots: 'weitere Slots auf der vollständigen Seite',
    offerCodePlaceholder: 'z.B. WILLKOMMEN10',
    reservationSettingsNote: 'Zeitintervalle, Start-/Endpuffer und andere Buchungseinstellungen werden jetzt in den Buchungseinstellungen konfiguriert.',
  },
};

const COUNTRY_CODES = [
  { code: '+1', flag: '🇺🇸', label: 'US' },
  { code: '+44', flag: '🇬🇧', label: 'UK' },
  { code: '+61', flag: '🇦🇺', label: 'AU' },
  { code: '+64', flag: '🇳🇿', label: 'NZ' },
  { code: '+63', flag: '🇵🇭', label: 'PH' },
  { code: '+49', flag: '🇩🇪', label: 'DE' },
  { code: '+33', flag: '🇫🇷', label: 'FR' },
  { code: '+39', flag: '🇮🇹', label: 'IT' },
  { code: '+34', flag: '🇪🇸', label: 'ES' },
  { code: '+358', flag: '🇫🇮', label: 'FI' },
  { code: '+47', flag: '🇳🇴', label: 'NO' },
  { code: '+46', flag: '🇸🇪', label: 'SE' },
  { code: '+81', flag: '🇯🇵', label: 'JP' },
  { code: '+86', flag: '🇨🇳', label: 'CN' },
  { code: '+91', flag: '🇮🇳', label: 'IN' },
];

const generateTimeSlots = (openTime = '10:00', closeTime = '22:00', interval = 30, use24Hour = false) => {
  const slots = [];
  if (!openTime || !closeTime) return slots;
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;
  if (cMin <= oMin) cMin += 24 * 60;
  const endMin = Math.min(cMin, oMin + 18 * 60);
  for (let m = oMin; m < endMin; m += interval) {
    const actualMin = m % (24 * 60);
    const h = Math.floor(actualMin / 60);
    const min = actualMin % 60;
    const value = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    
    let label;
    if (use24Hour) {
      label = value;
    } else {
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const ampm = h < 12 ? 'AM' : 'PM';
      label = `${h12}:${String(min).padStart(2,'0')} ${ampm}`;
    }
    
    slots.push({ value, label });
  }
  return slots;
};

function useImageUpload(restaurantId, folder) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const upload = async (file) => {
    if (!file || !restaurantId) return null;
    setUploading(true); setProgress(0);
    try {
      const ext = file.name.split('.').pop();
      const path = `reservation_pages/${restaurantId}/${folder}_${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      return await new Promise((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on('state_changed',
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          async () => resolve(await getDownloadURL(task.snapshot.ref))
        );
      });
    } finally { setUploading(false); }
  };
  return { upload, uploading, progress };
}

const ALL_DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const getOpenDayNames = (customHours) => {
  if (!customHours || !Array.isArray(customHours) || customHours.length === 0) {
    return new Set(ALL_DAYS);
  }
  const open = new Set();
  for (const slot of customHours) {
    if (!slot.days || !Array.isArray(slot.days)) continue;
    for (const d of slot.days) { if (d.name) open.add(d.name); }
  }
  return open.size > 0 ? open : new Set(ALL_DAYS);
};

const MiniCalendar = ({ selectedDate, onDateSelect, accentColor = '#fe8a24', openDayNames, t }) => {
  const [view, setView] = useState(new Date());
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const mName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const hasClosed = openDayNames && openDayNames.size < 7;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setView(new Date(yr, mo - 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronLeft className="w-4 h-4 text-white/70" />
        </button>
        <span className="text-sm font-bold text-white">{mName}</span>
        <button onClick={() => setView(new Date(yr, mo + 1, 1))} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
          <FiChevronRight className="w-4 h-4 text-white/70" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-2">
        {days.map((d, i) => {
          const fullDay = ALL_DAYS[i];
          const isClosed = openDayNames && !openDayNames.has(fullDay);
          return (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${isClosed ? 'text-white/20' : 'text-white/40'}`}>
              {d}
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const td = new Date(yr, mo, day); td.setHours(0, 0, 0, 0);
          const isPast = td < today;
          const dayFullName = ALL_DAYS[td.getDay()];
          const isClosed = openDayNames && !openDayNames.has(dayFullName);
          const isDisabled = isPast || isClosed;
          const isSel = selectedDate && td.toDateString() === selectedDate.toDateString();
          const isToday = td.toDateString() === today.toDateString();
          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onDateSelect(td)}
              title={isClosed && !isPast ? t('closedOnThisDay') : undefined}
              className={[
                'aspect-square flex items-center justify-center text-xs font-medium rounded-lg transition-all relative',
                isDisabled ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-white/10',
                isClosed && !isPast ? 'text-white/20' : '',
                isPast ? 'text-white/15' : '',
                !isSel && !isDisabled ? 'text-white/80' : '',
              ].join(' ')}
              style={
                isSel
                  ? { backgroundColor: accentColor, color: 'white', fontWeight: 'bold' }
                  : isToday && !isDisabled
                  ? { outline: '1px solid ' + accentColor + '80', color: accentColor }
                  : {}
              }
            >
              {day}
              {isClosed && !isPast && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/20" />
              )}
            </button>
          );
        })}
      </div>
      {hasClosed && (
        <p className="text-white/25 text-[10px] text-center mt-3">{t('dimmedDatesUnavailable')}</p>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
//  RESTAURANT SELECTOR SCREEN
// ════════════════════════════════════════════════════════════════════
const RestaurantSelector = ({ onSelect }) => {
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

  const db = firestore;
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
      const load = async () => {
        try {
          const currentUser = auth.currentUser;
          if (!currentUser) { setLoading(false); return; }

          const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
          const isStaff = !!staffRestaurantId;

          if (isStaff) {
            const snap = await getDoc(doc(db, 'restaurants', staffRestaurantId));
          if (snap.exists()) {
            const restaurant = { docId: snap.id, ...snap.data(), _collection: 'restaurants' };
            setRestaurants([restaurant]);
            onSelect(restaurant);
          }
          setLoading(false);
          return;
          }

          const q1 = query(
            collection(db, 'restaurants'),
            where('Owner_ID', '==', currentUser.uid)
          );
          const q2 = query(
            collection(db, 'TestRestaurant'),
            where('Owner_ID', '==', currentUser.uid)
          );
          const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

          const list = [
            ...snap1.docs.map(d => ({ docId: d.id, ...d.data(), _collection: 'restaurants' })),
            ...snap2.docs.map(d => ({ docId: d.id, ...d.data(), _collection: 'TestRestaurant' })),
          ];
          setRestaurants(list);
        } catch (err) {
          console.error('Failed to load restaurants:', err);
        } finally {
          setLoading(false);
        }
      };
    load();
  }, []);

  const filtered = restaurants.filter(r =>
    (r.name || r.docId || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-5 shadow-sm flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">{t('reservationLink')}</h1>
        <p className="text-gray-500 text-sm mt-0.5">{t('selectRestaurant')}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative mb-5">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('searchRestaurants')}
              className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#fe8a24] bg-white"
            />
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <div className="w-10 h-10 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-sm font-medium">{t('loadingRestaurants')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🍽️</div>
              <p className="text-base font-semibold text-gray-500">{t('noRestaurantsFound')}</p>
              <p className="text-sm mt-1">
                {search ? t('tryDifferentSearch') : t('noRestaurantsLinked')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(restaurant => (
                <button
                  key={restaurant.docId}
                  onClick={() => onSelect(restaurant)}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-[#fe8a24] hover:shadow-md transition-all p-4 flex items-center gap-4 text-left group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-200">
                    {restaurant.Image ? (
                      <img src={restaurant.Image} alt={restaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900 text-base truncate">{restaurant.name || restaurant.docId}</p>
                      {restaurant.restaurant_activation && (
                        <span className="flex-shrink-0 text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{t('active')}</span>
                      )}
                    </div>
                    {restaurant.Type && (
                      <p className="text-xs text-[#fe8a24] font-semibold mb-1">{restaurant.Type}</p>
                    )}
                    {restaurant.Location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FiMapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{restaurant.Location}</span>
                      </div>
                    )}
                    {restaurant.Reservation_email && (
                      <p className="text-xs text-gray-400 truncate mt-0.5">{restaurant.Reservation_email}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#fe8a24] flex items-center justify-center transition-colors">
                    <FiChevronDown className="w-4 h-4 text-gray-400 group-hover:text-white -rotate-90 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════
const ReservationLinkPage = ({ selectedRestaurant: propRestaurant }) => {
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

  const db = firestore;
  const staffRole = sessionStorage.getItem("staffRole");
  const isStaff   = !!sessionStorage.getItem("staffRestaurantId");
  const canAccess = !isStaff || staffRole === 'admin' || staffRole === 'manager';
  const [activeRestaurant, setActiveRestaurant] = useState(propRestaurant || null);
  const [tablesLoaded, setTablesLoaded] = useState(false);
  const [allReservations, setAllReservations] = useState([]);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [slotAvailability, setSlotAvailability] = useState({});

  useEffect(() => {
    if (propRestaurant) setActiveRestaurant(propRestaurant);
  }, [propRestaurant]);

  const [pageMode, setPageMode] = useState('config');

const [config, setConfig] = useState({
    restaurantName:     '',
    use24HourFormat:    false,
    backgroundType:     'gradient',
    backgroundColor:    '#1a1a2e',
    backgroundGradient: 'from-[#0f0c29] via-[#302b63] to-[#24243e]',
    backgroundMode:     'gradient',
    backgroundImageUrl: '',
    overlayOpacity:     0.5,
    logoUrl:            '',
    logoShape:          'circle',
    logoSize:           'md',
    accentColor:        '#fe8a24',
    welcomeMessage:     'Reserve your table',
    subMessage:         'Book your perfect dining experience',
    showNotes:          true,
    showCompany:        false,
    requireEmail:       true,
    requirePhone:       true,
  });

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [phoneCode, setPhoneCode] = useState('+63');
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', company: '', notes: '' });
  const [agreeNewsletter, setAgreeNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [reservationSettings, setReservationSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [offerCodeInput, setOfferCodeInput] = useState('');
  const [crmAvgRevenue, setCrmAvgRevenue] = useState(0);

  const restaurantId = activeRestaurant?.docId || activeRestaurant?.id || activeRestaurant?.name || null;

  const logoUpload = useImageUpload(restaurantId, 'logo');
  const bgUpload   = useImageUpload(restaurantId, 'background');
  const logoInputRef = useRef();
  const bgInputRef   = useRef();

  useEffect(() => {
    if (!activeRestaurant) return;
    setConfig(prev => ({
      ...prev,
      restaurantName: activeRestaurant.name || activeRestaurant.docId || '',
    }));
  }, [activeRestaurant]);

  useEffect(() => {
    const load = async () => {
      if (!restaurantId) return;
      console.log('[ReservationLink] Loading config for:', restaurantId);
      try {
        let snap = await getDoc(doc(db, 'restaurants', restaurantId, 'reservationConfig', 'config'));
        if (!snap.exists()) {
          snap = await getDoc(doc(db, 'TestRestaurant', restaurantId, 'reservationConfig', 'config'));
        }
        if (snap.exists()) {
          console.log('[ReservationLink] Found saved config:', snap.data());
          setConfig(prev => ({ ...prev, ...snap.data() }));
        } else {
          console.log('[ReservationLink] No saved config yet for:', restaurantId);
        }
      } catch (err) {
        console.error('[ReservationLink] Load config error:', err);
      }
    };
    load();
  }, [restaurantId]);

  useEffect(() => {
    const loadTablesAndReservations = async () => {
      if (!restaurantId || !activeRestaurant) return;
      
      const collectionName = activeRestaurant._collection || 'restaurants';
      
      try {
        const tablesSnap = await getDocs(collection(db, collectionName, restaurantId, 'tables'));
        const tablesData = tablesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRestaurantTables(tablesData);
        setTablesLoaded(true);
        
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('restaurant_id', '==', restaurantId),
          where('status', 'in', ['pending', 'confirmed'])
        );
        const reservationsSnap = await getDocs(reservationsQuery);
        const reservationsData = reservationsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllReservations(reservationsData);
        
        console.log(`📊 Loaded ${tablesData.length} tables and ${reservationsData.length} reservations`);
      } catch (err) {
        console.error('Error loading tables/reservations:', err);
      }
    };
    
    loadTablesAndReservations();
  }, [restaurantId, activeRestaurant]);

  useEffect(() => {
    if (!restaurantId) return;
    getDoc(doc(db, activeRestaurant?._collection || 'restaurants', restaurantId, 'crm_settings', 'config'))
      .then((snap) => {
        if (snap.exists()) {
          const v = parseFloat(snap.data().avgRevenuePerGuest);
          setCrmAvgRevenue(isNaN(v) ? 0 : v);
        }
      })
      .catch(() => {});
  }, [restaurantId]);

  useEffect(() => {
    const loadReservationSettings = async () => {
      if (!restaurantId || !activeRestaurant) {
        setLoadingSettings(false);
        return;
      }
      
      setLoadingSettings(true);
      
      try {
        const collectionName = activeRestaurant._collection || 'restaurants';
        const docRef = doc(db, collectionName, restaurantId, 'reservationSettings', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setReservationSettings(docSnap.data());
          console.log('✅ Loaded reservation settings:', docSnap.data());
        } else {
          console.log('ℹ️ No reservation settings found, using defaults');
          setReservationSettings({});
        }
      } catch (err) {
        console.error('❌ Error loading reservation settings:', err);
        setReservationSettings({});
      } finally {
        setLoadingSettings(false);
      }
    };
    
    loadReservationSettings();
  }, [restaurantId, activeRestaurant]);

  useEffect(() => {
    if (!selectedDate || !restaurantId || !tablesLoaded || restaurantTables.length === 0) {
      return;
    }
    
    const availability = {};
    const defaultDuration = 120;
    
    const customHours = activeRestaurant?.customHours || [];
    let previewOpenTime = '10:00';
    let previewCloseTime = '22:00';
    
    if (customHours.length > 0 && selectedDate) {
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      for (const slot of customHours) {
        if (!slot.days) continue;
        const found = slot.days.find(d => d.name === dayName);
        if (found) {
          previewOpenTime = slot.openTime || '10:00';
          previewCloseTime = slot.closeTime || '22:00';
          break;
        }
      }
    }
    
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
      const daySettings = reservationSettings?.dayIntervals?.[dayName];
      const dayInterval = daySettings?.interval || 30;
      
      const startOffset = daySettings?.startOffset || 0;
      const endOffset = daySettings?.endOffset || 0;
      
      const [openHour, openMin] = previewOpenTime.split(':').map(Number);
      const [closeHour, closeMin] = previewCloseTime.split(':').map(Number);
      const effectiveOpenMin = openHour * 60 + openMin + startOffset;
      const effectiveCloseMin = closeHour * 60 + closeMin - endOffset;
      const effectiveOpenTime = `${String(Math.floor(effectiveOpenMin / 60)).padStart(2, '0')}:${String(effectiveOpenMin % 60).padStart(2, '0')}`;
      const effectiveCloseTime = `${String(Math.floor(effectiveCloseMin / 60)).padStart(2, '0')}:${String(effectiveCloseMin % 60).padStart(2, '0')}`;
      
      const allSlots = generateTimeSlots(effectiveOpenTime, effectiveCloseTime, dayInterval, config.use24HourFormat);
      
      for (const slot of allSlots) {
      const slotDateTime = new Date(selectedDate);
      const [hours, minutes] = slot.value.split(':');
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      const slotEndTime = new Date(slotDateTime.getTime() + defaultDuration * 60000);
      
      const suitableTables = restaurantTables.filter(t => 
        t.online === true &&
        (t.sessions === 'Reservation' || t.sessions === 'Both') &&
        guests >= (t.minCapacity || 0) &&
        guests <= (t.maxCapacity || 999)
      );
      
      if (suitableTables.length === 0) {
        availability[slot.value] = false;
        continue;
      }
      
      const bookedTableIds = new Set();
      
      allReservations.forEach(res => {
        const resDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
        const resDuration = res.duration_minutes || 120;
        const resEndTime = new Date(resDate.getTime() + resDuration * 60000);
        
        if (resDate < slotEndTime && resEndTime > slotDateTime) {
          if (res.table_ids && Array.isArray(res.table_ids)) {
            res.table_ids.forEach(tid => bookedTableIds.add(tid));
          } else if (res.table_id) {
            bookedTableIds.add(res.table_id);
          }
        }
      });
      
      const hasAvailableTable = suitableTables.some(t => !bookedTableIds.has(t.id));
      availability[slot.value] = hasAvailableTable;
    }
    
    setSlotAvailability(availability);
  }, [selectedDate, guests, restaurantId, restaurantTables, allReservations, config.timeInterval, config.use24HourFormat, activeRestaurant, tablesLoaded]);

  const previewCustomHours = activeRestaurant?.customHours || [];
  const previewOpenDayNames = getOpenDayNames(previewCustomHours);
  const previewDayName = selectedDate
    ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' })
    : null;
  let previewOpenTime  = '10:00';
  let previewCloseTime = '22:00';
  let previewIsOpen    = true;
  if (previewCustomHours.length > 0 && previewDayName) {
    let foundDay = false;
    for (const slot of previewCustomHours) {
      if (!slot.days) continue;
      const found = slot.days.find(d => d.name === previewDayName);
      if (found) {
        previewOpenTime  = slot.openTime  || '10:00';
        previewCloseTime = slot.closeTime || '22:00';
        foundDay = true;
        break;
      }
    }
    if (!foundDay) previewIsOpen = false;
  }
  
const generateTimeSlotsForSelectedDate = () => {
    if (!selectedDate) return [];
    
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = reservationSettings?.dayIntervals?.[dayName];
    const dayInterval = daySettings?.interval || 30;
    const startOffset = daySettings?.startOffset || 0;
    const endOffset = daySettings?.endOffset || 0;
    
    const [openHour, openMin] = previewOpenTime.split(':').map(Number);
    const [closeHour, closeMin] = previewCloseTime.split(':').map(Number);
    const effectiveOpenMin = openHour * 60 + openMin + startOffset;
    const effectiveCloseMin = closeHour * 60 + closeMin - endOffset;
    const effectiveOpenTime = `${String(Math.floor(effectiveOpenMin / 60)).padStart(2, '0')}:${String(effectiveOpenMin % 60).padStart(2, '0')}`;
    const effectiveCloseTime = `${String(Math.floor(effectiveCloseMin / 60)).padStart(2, '0')}:${String(effectiveCloseMin % 60).padStart(2, '0')}`;
    
    const allSlots = generateTimeSlots(effectiveOpenTime, effectiveCloseTime, dayInterval, config.use24HourFormat);
    
    const blockedSlots = reservationSettings?.blockedTimeSlots?.[dayName] || [];
    const availableSlots = allSlots.filter(slot => !blockedSlots.includes(slot.value));
    
    console.log(`🕐 Preview time slots for ${dayName}:`, {
      total: allSlots.length,
      blocked: blockedSlots.length,
      available: availableSlots.length,
      blockedTimes: blockedSlots
    });
    
    return availableSlots;
  };
  
  const allTimeSlots = generateTimeSlotsForSelectedDate();
  
  const timeSlots = allTimeSlots.filter(slot => {
    if (slotAvailability[slot.value] === false) {
      return false;
    }
    return true;
  });
  
  const maxGuests = reservationSettings?.maxGuestsOnline || reservationSettings?.maxGuestsPerReservation || 20;
  const guestOptions = Array.from({ length: Math.min(maxGuests, 10) }, (_, i) => i + 1);
  
  const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5173';
    }
    return 'https://dineryai.netlify.app';
  };

  const reservationUrl = `${getBaseUrl()}/reserve/${encodeURIComponent(restaurantId || 'demo')}`;

  const saveConfig = async (updates) => {
    if (!restaurantId) {
      console.warn('[ReservationLink] saveConfig: no restaurantId', activeRestaurant);
      alert('No restaurant selected or restaurant ID not found.');
      return;
    }
    
    const collectionName = activeRestaurant?._collection || 'restaurants';
    const path = `${collectionName}/${restaurantId}/reservationConfig/config`;
    console.log('[ReservationLink] Saving to:', path, updates);
    try {
      await setDoc(
        doc(db, collectionName, restaurantId, 'reservationConfig', 'config'),
        {
          ...updates,
          restaurantId,
          restaurantName: activeRestaurant?.name || config.restaurantName,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      console.log('[ReservationLink] Saved successfully');
    } catch (err) {
      console.error('[ReservationLink] Save error:', err);
      alert('Failed to save: ' + err.message);
    }
  };

  const handleSaveAll = async () => {
    setConfigSaving(true);
    await saveConfig(config);
    setConfigSaving(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
  };

  const handleLogoFile = async (file) => {
    if (!file) return;
    const url = await logoUpload.upload(file);
    if (url) {
      setConfig(p => ({ ...p, logoUrl: url }));
      await saveConfig({ logoUrl: url });
    }
  };

  const handleBgFile = async (file) => {
    if (!file) return;
    const url = await bgUpload.upload(file);
    if (url) {
      setConfig(p => ({ ...p, backgroundImageUrl: url, backgroundMode: 'image' }));
      await saveConfig({ backgroundImageUrl: url, backgroundMode: 'image' });
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(reservationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveReservation = async () => {
    if (!form.firstName || !form.lastName) { setToast(t('pleaseEnterName')); return; }
    if (config.requirePhone && !form.phone)  { setToast(t('phoneRequired')); return; }
    if (config.requireEmail && !form.email)  { setToast(t('emailRequired')); return; }

    try {
      setSaving(true);

      const currentUser  = auth.currentUser;
      const collectionName = activeRestaurant?._collection || 'restaurants';

      const resDate = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      resDate.setHours(h, m, 0, 0);

      const diningDuration  = reservationSettings?.defaultReservationDuration || 90;
      const cleanupDuration = reservationSettings?.tableCleanupTime || 0;
      const totalDuration   = diningDuration + cleanupDuration;
      const resEndTime      = new Date(resDate.getTime() + totalDuration * 60000);

      const liveSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('restaurant_id', '==', restaurantId),
        where('status', 'in', ['pending', 'confirmed'])
      ));

      const bookedTableIds = new Set();
      liveSnap.docs.forEach(d => {
        const res    = d.data();
        const rStart = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
        const rEnd   = new Date(rStart.getTime() + ((res.duration_minutes || diningDuration) + cleanupDuration) * 60000);
        if (rStart < resEndTime && rEnd > resDate) {
          if (Array.isArray(res.table_ids)) res.table_ids.forEach(tid => bookedTableIds.add(tid));
          else if (res.table_id) bookedTableIds.add(res.table_id);
        }
      });

      const eligible = restaurantTables
        .filter(t =>
          t.online === true &&
          (t.sessions === 'Reservation' || t.sessions === 'Both') &&
          guests >= (t.minCapacity || 0) &&
          guests <= (t.maxCapacity || 999) &&
          !bookedTableIds.has(t.id)
        )
        .sort((a, b) => {
          const pa = a.priority ?? 999, pb = b.priority ?? 999;
          if (pa !== pb) return pa - pb;
          return (a.maxCapacity || 999) - (b.maxCapacity || 999);
        });

      if (restaurantTables.length > 0 && eligible.length === 0) {
        setToast(t('timeSlotFullyBooked'));
        setSaving(false);
        return;
      }

const assignedTable = eligible[0] || null;

      let validatedOffer = null;
      if (reservationSettings?.enableOfferCode && offerCodeInput) {
        try {
          const offersSnap = await getDocs(query(
            collection(db, collectionName, restaurantId, 'offer'),
            where('offer_id', '==', offerCodeInput)
          ));
          if (!offersSnap.empty) {
            const offerDoc = offersSnap.docs[0];
            const offerData = { id: offerDoc.id, ...offerDoc.data() };

            if (offerData.usage_limit_type === 'max_uses' &&
                (offerData.times_redeemed || 0) >= (offerData.max_uses || 0)) {
              setToast(t('offerCodeReachedLimit'));
              setSaving(false);
              return;
            }

            if (offerData.usage_limit_type === 'one_per_guest' && form.email) {
              const priorUse = await getDocs(query(
                collection(db, 'reservations'),
                where('restaurant_id', '==', restaurantId),
                where('offer_code_applied', '==', offerCodeInput),
                where('customer_email', '==', form.email)
              ));
              if (!priorUse.empty) {
                setToast(t('offerCodeAlreadyUsed'));
                setSaving(false);
                return;
              }
            }
            validatedOffer = offerData;
          }
        } catch (e) {
          console.warn('Offer validation failed:', e);
        }
      }

      let estimatedRevenue = null;
      if (validatedOffer && crmAvgRevenue > 0) {
        const baseRevenue = guests * crmAvgRevenue;
        const discountPct = parseFloat(validatedOffer.discount_percent) || 0;
        estimatedRevenue = Math.round(baseRevenue * (1 - discountPct / 100));
      }

      const newRes = await addDoc(collection(db, 'reservations'), {
        offer_code_applied: (reservationSettings?.enableOfferCode && offerCodeInput) ? offerCodeInput : null,
        offer_doc_id: validatedOffer?.id || null,
        offer_source: (reservationSettings?.enableOfferCode && offerCodeInput) ? 'manual' : null,
        estimated_revenue: estimatedRevenue,
        customer_name:    `${form.firstName} ${form.lastName}`.trim(),
        customer_email:   form.email,
        customer_phone:   `${phoneCode}${form.phone}`,
        number_of_guests: guests,
        reservation_date: resDate,
        from_time:        selectedTime,
        to_time:          '',
        duration_minutes: diningDuration,
        ServiceType_Reservation: 'dine-in',
        status:           'confirmed',
        special_requests: form.notes,
        company:          form.company,
        restaurant_id:    restaurantId || null,
        restaurant_name:  activeRestaurant?.name || config.restaurantName,
        restaurant_collection: collectionName,
        restaurant_owner_id: currentUser?.uid || null,
        is_walkin:        false,
        table_id:         assignedTable?.id   || null,
        table_name:       assignedTable?.name || '',
        table_ids:        assignedTable ? [assignedTable.id]   : [],
        table_names:      assignedTable ? [assignedTable.name] : [],
        agree_newsletter: agreeNewsletter,
        source:           'reservation_link',
        created_at:       new Date(),
        updated_at:       new Date(),
        coupon_confirmed: false,
        reservation_completed_points_awarded: false,
      });

      if (reservationSettings?.enableOfferCode && offerCodeInput) {
        try {
          const statsRef = doc(db, collectionName, restaurantId, 'crm_stats', 'config');
          const statsSnap = await getDoc(statsRef);
          const currentCount = statsSnap.exists() ? (statsSnap.data().offerReservationsCreated || 0) : 0;
          const currentRevenue = statsSnap.exists() ? (statsSnap.data().estimatedRevenue || 0) : 0;
          await setDoc(statsRef, {
            offerReservationsCreated: currentCount + 1,
            estimatedRevenue: currentRevenue + (estimatedRevenue || 0),
          }, { merge: true });
        } catch (e) { console.warn('offer stat increment failed', e); }
      }

      if (validatedOffer) {
        try {
          await updateDoc(
            doc(db, collectionName, restaurantId, 'offer', validatedOffer.id),
            { times_redeemed: (validatedOffer.times_redeemed || 0) + 1 }
          );
        } catch (e) { console.warn('offer times_redeemed increment failed', e); }
      }

      if (assignedTable) {
        await updateDoc(
          doc(db, collectionName, restaurantId, 'tables', assignedTable.id),
          {
            current_status:            'reserved',
            reserved_by:               `${form.firstName} ${form.lastName}`.trim(),
            reserved_date:             resDate,
            reserved_guests:           guests,
            reserved_source:           'reservation_link',
            reserved_duration_minutes: totalDuration,
          }
        ).catch(e => console.warn('Could not update table status:', e));
      }

      setSaved(true);
    } catch (err) {
      setToast(t('failedToSaveReservation') + err.message);
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const gradientOptions = [
    { label: 'Night',    value: 'from-[#0f0c29] via-[#302b63] to-[#24243e]' },
    { label: 'Ember',    value: 'from-[#1a0000] via-[#3d0000] to-[#1a0a00]' },
    { label: 'Forest',   value: 'from-[#0a1628] via-[#0d2137] to-[#0a1628]' },
    { label: 'Dusk',     value: 'from-[#1c1c2e] via-[#2d1b69] to-[#11998e]' },
    { label: 'Midnight', value: 'from-[#000000] via-[#130f40] to-[#000000]' },
    { label: 'Wine',     value: 'from-[#2c0036] via-[#4a0050] to-[#1a0020]' },
  ];

  const previewBgClass = config.backgroundImageUrl
    ? ''
    : `bg-gradient-to-br ${config.backgroundGradient}`;

  const previewBgStyle = config.backgroundImageUrl
    ? {
        backgroundImage: `url("${config.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }
    : {};
  const logoSizePx     = config.logoSize === 'sm' ? 52 : config.logoSize === 'lg' ? 96 : 72;
  const logoRadius     = config.logoShape === 'circle' ? '50%' : config.logoShape === 'rounded' ? '18px' : '6px';
  const previewLogoSz  = config.logoSize === 'sm' ? 36 : config.logoSize === 'lg' ? 56 : 44;

  if (!canAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">{t('accessRestricted')}</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          {t('accessRestrictedMessage')}
        </p>
      </div>
    );
  }

  if (!activeRestaurant) {
    return <RestaurantSelector onSelect={(r) => setActiveRestaurant(r)} />;
  }

  // ════════════════════════════════════════════════════════════════════
  //  CONFIG PAGE
  // ════════════════════════════════════════════════════════════════════
  if (pageMode === 'config') {
    return (
      <div className="h-full flex flex-col bg-gray-50 overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-4 flex items-center justify-between shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setActiveRestaurant(null)}
              className="flex-shrink-0 p-2 hover:bg-gray-100 rounded-xl transition-colors"
              title={t('changeRestaurant')}
            >
              <FiChevronLeft className="w-5 h-5 text-gray-500" />
            </button>

            <button
              onClick={() => setActiveRestaurant(null)}
              className="flex items-center gap-2.5 bg-gray-100 hover:bg-[#fe8a24]/10 border-2 border-transparent hover:border-[#fe8a24]/30 rounded-xl px-3 py-2 transition-all group min-w-0"
            >
              {activeRestaurant.Image ? (
                <img src={activeRestaurant.Image} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-[#fe8a24]/20 flex items-center justify-center text-base flex-shrink-0">🍽️</div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate leading-tight">{activeRestaurant.name}</p>
                {activeRestaurant.Type && <p className="text-[10px] text-gray-400 truncate leading-tight">{activeRestaurant.Type}</p>}
              </div>
              <span className="text-[10px] font-semibold text-[#fe8a24] flex-shrink-0 group-hover:underline">{t('changeRestaurant')}</span>
            </button>

            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{t('reservationLink')}</h1>
              <p className="text-gray-400 text-xs">{t('customizeBookingPage')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSaveAll}
              disabled={configSaving}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                configSaved
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {configSaving ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : configSaved ? (
                <FiCheck className="w-4 h-4" />
              ) : null}
              {configSaving ? t('saving') : configSaved ? t('saved') : t('save')}
            </button>
            <button onClick={() => setPageMode('preview')}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors">
              <FiExternalLink className="w-4 h-4" /> {t('previewPage')}
            </button>
            <button onClick={() => setPageMode('link')}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-xl text-sm font-semibold transition-colors">
              <FiCopy className="w-4 h-4" /> {t('getLink')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">

              {/* ── IMAGES ── */}
              <div className="bg-white rounded-2xl border-2 border-[#fe8a24]/30 shadow-sm overflow-hidden">
                <div className="bg-[#fe8a24]/5 px-5 py-4 border-b border-[#fe8a24]/20 flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-[#fe8a24]" />
                  <h3 className="font-bold text-gray-800 text-sm">{t('images')}</h3>
                  <span className="text-xs text-gray-400 ml-1">{t('logoAndBackground')}</span>
                </div>
                <div className="p-5 grid grid-cols-2 gap-4">

                  {/* LOGO */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">{t('restaurantLogo')}</span>
                      {config.logoUrl && (
                        <button onClick={() => { setConfig(p => ({ ...p, logoUrl: '' })); saveConfig({ logoUrl: '' }); }}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                          <FiX className="w-2.5 h-2.5" /> {t('remove')}
                        </button>
                      )}
                    </div>
                    {config.logoUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => logoInputRef.current.click()}>
                        <div className="w-full h-32 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center border-2 border-gray-200">
                          <img src={config.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain p-3" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 shadow">
                            <FiUpload className="w-3 h-3" /> {t('change')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => logoInputRef.current.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-[#fe8a24] bg-gray-50 hover:bg-[#fe8a24]/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                        {logoUpload.uploading ? (
                          <>
                            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-[#fe8a24]">{logoUpload.progress}%</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-gray-200 group-hover:bg-[#fe8a24]/20 rounded-full flex items-center justify-center transition-colors">
                              <FiUpload className="w-5 h-5 text-gray-400 group-hover:text-[#fe8a24]" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-500 group-hover:text-[#fe8a24]">{t('uploadLogo')}</p>
                              <p className="text-[10px] text-gray-400">{t('pngJpgMax5MB')}</p>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { handleLogoFile(e.target.files[0]); e.target.value = ''; }} />
                    {config.logoUrl && (
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">{t('shape')}</p>
                          <div className="flex gap-1">
                            {[{v:'circle',l:t('circle')},{v:'rounded',l:t('rounded')},{v:'square',l:t('square')}].map(o => (
                              <button key={o.v} onClick={() => setConfig(p => ({ ...p, logoShape: o.v }))}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${config.logoShape === o.v ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 mb-1">{t('size')}</p>
                          <div className="flex gap-1">
                            {[{v:'sm',l:'S'},{v:'md',l:'M'},{v:'lg',l:'L'}].map(o => (
                              <button key={o.v} onClick={() => setConfig(p => ({ ...p, logoSize: o.v }))}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-semibold transition-all ${config.logoSize === o.v ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {o.l}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* BACKGROUND IMAGE */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">{t('backgroundImage')}</span>
                      {config.backgroundImageUrl && (
                        <button onClick={() => { setConfig(p => ({ ...p, backgroundImageUrl: '', backgroundMode: 'gradient' })); saveConfig({ backgroundImageUrl: '', backgroundMode: 'gradient' }); }}
                          className="text-[10px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                          <FiX className="w-2.5 h-2.5" /> {t('remove')}
                        </button>
                      )}
                    </div>
                    {config.backgroundImageUrl ? (
                      <div className="relative group cursor-pointer" onClick={() => bgInputRef.current.click()}>
                        <div className="w-full h-32 rounded-xl overflow-hidden border-2 border-gray-200">
                          <img src={config.backgroundImageUrl} alt="Background" className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-xs font-semibold text-gray-700 shadow">
                            <FiUpload className="w-3 h-3" /> {t('change')}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => bgInputRef.current.click()}
                        className="w-full h-32 border-2 border-dashed border-gray-300 hover:border-[#fe8a24] bg-gray-50 hover:bg-[#fe8a24]/5 rounded-xl flex flex-col items-center justify-center gap-2 transition-all group">
                        {bgUpload.uploading ? (
                          <>
                            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs font-semibold text-[#fe8a24]">{bgUpload.progress}%</span>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-gray-200 group-hover:bg-[#fe8a24]/20 rounded-full flex items-center justify-center transition-colors">
                              <FiImage className="w-5 h-5 text-gray-400 group-hover:text-[#fe8a24]" />
                            </div>
                            <div className="text-center">
                              <p className="text-xs font-semibold text-gray-500 group-hover:text-[#fe8a24]">{t('uploadBackground')}</p>
                              <p className="text-[10px] text-gray-400">{t('pngJpgMax10MB')}</p>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                    <input ref={bgInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => { handleBgFile(e.target.files[0]); e.target.value = ''; }} />
                    {config.backgroundImageUrl && (
                      <div className="mt-2">
                        <p className="text-[10px] font-semibold text-gray-500 mb-1">
                          {t('darkOverlay')}: {Math.round((config.overlayOpacity ?? 0) * 100)}%
                        </p>
                        <input type="range" min={0} max={1} step={0.05} value={config.overlayOpacity}
                          onChange={e => {
                            const value = parseFloat(e.target.value);
                            setConfig(p => ({ ...p, overlayOpacity: value }));
                            saveConfig({ overlayOpacity: value });
                          }}
                          className="w-full accent-[#fe8a24]" />
                        <div className="flex justify-between text-[9px] text-gray-400">
                          <span>{t('light')}</span><span>{t('dark')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── BRANDING ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">{t('branding')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{t('welcomeHeading')}</label>
                    <input value={config.welcomeMessage} onChange={e => setConfig(p => ({ ...p, welcomeMessage: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#fe8a24]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{t('subHeading')}</label>
                    <input value={config.subMessage} onChange={e => setConfig(p => ({ ...p, subMessage: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#fe8a24]" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">{t('accentColor')}</label>
                    <div className="flex items-center gap-3">
                      <input type="color" value={config.accentColor} onChange={e => setConfig(p => ({ ...p, accentColor: e.target.value }))}
                        className="w-10 h-10 rounded-lg border-2 border-gray-200 cursor-pointer" />
                      <span className="text-sm text-gray-600 font-mono">{config.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── BACKGROUND GRADIENT ── */}
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-1 text-sm uppercase tracking-wider">{t('background')}</h3>
                {config.backgroundImageUrl ? (
                  <p className="text-xs text-gray-400 mt-2">{t('usingUploadedPhoto')}</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {gradientOptions.map(g => (
                      <button key={g.label}
                        onClick={() => setConfig(p => ({ ...p, backgroundGradient: g.value, backgroundMode: 'gradient' }))}
                        className={`h-14 rounded-xl bg-gradient-to-br ${g.value} text-white text-xs font-bold flex items-end p-2 transition-all ${
                          config.backgroundGradient === g.value && config.backgroundMode !== 'image' ? 'ring-2 ring-[#fe8a24] scale-105' : 'opacity-70 hover:opacity-100'
                        }`}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-lg">ℹ️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1 text-sm">{t('bookingOptionsMoved')}</h3>
                    <p className="text-xs text-blue-700 leading-relaxed mb-2">
                      {t('bookingOptionsDescription')}
                    </p>
                    <p className="text-xs text-blue-600">
                      {t('bookingOptionsNote')}
                    </p>
                  </div>
                </div>
              </div>               
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">{t('formFields')}</h3>
                <div className="space-y-3">
                  {[
                    { key: 'requireEmail', label: t('requireEmail') },
                    { key: 'requirePhone', label: t('requirePhone') },
                    { key: 'showCompany',  label: t('showCompanyField') },
                    { key: 'showNotes',    label: t('showNotesField') },
                    { key: 'use24HourFormat', label: t('use24HourFormat') },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-gray-700">{label}</span>
                      <div onClick={() => setConfig(p => ({ ...p, [key]: !p[key] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative ${config[key] ? 'bg-[#fe8a24]' : 'bg-gray-200'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── LIVE PREVIEW ── */}
            <div className="lg:sticky lg:top-0">
              <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{t('livePreview')}</p>
                <div className={`rounded-xl overflow-hidden relative ${previewBgClass}`} style={{ ...previewBgStyle, minHeight: 480 }}>
                  {config.backgroundImageUrl && (
                    <div
                      className="absolute inset-0 rounded-xl pointer-events-none"
                      style={{
                        backgroundColor: `rgba(0,0,0,${config.overlayOpacity ?? 0.25})`,
                      }}
                    />
                  )}
                  <div className="relative z-10 p-4 flex flex-col items-center">
                    {config.logoUrl && (
                      <div className="mb-3 overflow-hidden shadow-lg flex-shrink-0"
                        style={{ width: previewLogoSz, height: previewLogoSz, borderRadius: logoRadius, border: '2px solid rgba(255,255,255,0.2)' }}>
                        <img src={config.logoUrl} alt="logo" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="text-center mb-4">
                      <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-1">{config.restaurantName}</p>
                      <h2 className="text-xl font-bold text-white">{config.welcomeMessage}</h2>
                      <p className="text-white/60 text-xs mt-1">{config.subMessage}</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-3 w-full">
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); }}
                        accentColor={config.accentColor}
                        openDayNames={previewOpenDayNames}
                        t={t}
                      />
                    </div>
                    {selectedDate && (
                      <div className="mt-3 w-full">
                        {!previewIsOpen ? (
                          <div className="bg-red-500/15 border border-red-500/25 rounded-xl p-3 text-center">
                            <p className="text-red-300 text-xs font-bold">{t('closedOnThisDay')}</p>
                          </div>
                        ) : !tablesLoaded ? (
                          <div className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-white/60 text-sm">{t('loadingAvailability')}</p>
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                            <p className="text-white/60 text-xs font-bold">{t('noTimeSlotsAvailable')}</p>
                          </div>
                        ) : (
                          <>
                            <p className="text-white/45 text-[10px] font-semibold uppercase tracking-wider mb-2">
                              {t('selectTime')}
                              <span className="text-white/25 normal-case font-normal ml-1">({previewOpenTime} – {previewCloseTime})</span>
                            </p>
                            <div className="grid grid-cols-3 gap-1.5">
                              {timeSlots.slice(0, 9).map(slot => (
                                <button key={slot.value} onClick={() => setSelectedTime(slot.value)}
                                  className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedTime === slot.value ? 'text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                                  style={selectedTime === slot.value ? { backgroundColor: config.accentColor } : {}}>
                                  {slot.label}
                                </button>
                              ))}
                            </div>
                            {timeSlots.length > 9 && (
                              <p className="text-white/30 text-[10px] text-center mt-1.5">+{timeSlots.length - 9} {t('moreSlots')}</p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  GET LINK PAGE
  // ════════════════════════════════════════════════════════════════════
  if (pageMode === 'link') {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="bg-white border-b-4 border-[#fe8a24] px-6 py-5 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setPageMode('config')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <FiChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('yourReservationLink')}</h1>
              <p className="text-gray-500 text-sm">{t('shareWithCustomers')}</p>
            </div>
          </div>
          <button onClick={() => setPageMode('preview')} className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-semibold transition-colors">
            <FiExternalLink className="w-4 h-4" /> {t('previewPage')}
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
              {activeRestaurant.Image
                ? <img src={activeRestaurant.Image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                : <div className="w-12 h-12 rounded-xl bg-[#fe8a24]/10 flex items-center justify-center text-2xl flex-shrink-0">🍽️</div>
              }
              <div className="min-w-0">
                <p className="font-bold text-gray-900">{activeRestaurant.name}</p>
                <p className="text-xs text-gray-400 truncate">{activeRestaurant.Reservation_email || activeRestaurant.Type}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm text-center">
              <div className="w-16 h-16 bg-[#fe8a24]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FiCopy className="w-8 h-8 text-[#fe8a24]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">{t('publicBookingPage')}</h2>
              <p className="text-gray-500 text-sm mb-5">{t('shareLink')}</p>
              <div className="flex items-center gap-2 bg-gray-50 border-2 border-gray-200 rounded-xl px-4 py-3">
                <span className="flex-1 text-sm text-gray-700 font-mono truncate">{reservationUrl}</span>
                <button onClick={copyLink} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-[#fe8a24] text-white hover:bg-[#ff9d47]'}`}>
                  {copied ? <><FiCheck className="w-3 h-3" /> {t('copied')}</> : <><FiCopy className="w-3 h-3" /> {t('copy')}</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: '📱', title: t('mobileReady'), desc: t('worksOnAllDevices') },
                { icon: '⚡', title: t('instantBooking'), desc: t('savedToDashboard') },
                { icon: '🎨', title: t('fullyBranded'), desc: t('yourColorsAndName') },
                { icon: '📊', title: t('allTracked'), desc: t('appearsInCalendar') },
              ].map(item => (
                <div key={item.title} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  //  PREVIEW / PUBLIC BOOKING PAGE
  // ════════════════════════════════════════════════════════════════════
  return (
    <div className={`min-h-screen relative overflow-hidden ${previewBgClass}`} style={previewBgStyle}>
      {config.backgroundMode === 'image' && config.backgroundImageUrl && (
        <div className="fixed inset-0 z-0" style={{ backgroundColor: `rgba(0,0,0,${config.overlayOpacity ?? 0.5})` }} />
      )}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.05) 0%, transparent 40%)' }} />
      <button onClick={() => setPageMode('config')} className="absolute top-4 left-4 z-50 flex items-center gap-2 px-3 py-2 bg-black/30 backdrop-blur-sm rounded-xl text-white/70 hover:text-white text-xs font-semibold transition-colors">
        <FiChevronLeft className="w-3.5 h-3.5" /> {t('backToEditor')}
      </button>
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-red-500 text-white rounded-2xl text-sm font-semibold shadow-2xl">{toast}</div>
      )}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-5xl">
          {config.logoUrl && (
            <div className="flex justify-center mb-6">
              <div className="overflow-hidden shadow-2xl" style={{ width: logoSizePx, height: logoSizePx, borderRadius: logoRadius, border: '2px solid rgba(255,255,255,0.18)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
                <img src={config.logoUrl} alt={config.restaurantName} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.3em] mb-2" style={{ color: config.accentColor }}>{config.restaurantName}</p>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">{config.welcomeMessage}</h1>
            <p className="text-white/50 text-base">{config.subMessage}</p>
          </div>

          {saved ? (
            <div className="max-w-md mx-auto text-center">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/20">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-2xl" style={{ backgroundColor: config.accentColor }}>
                  <FiCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2">{t('youreBooked')}</h2>
                <p className="text-white/60 text-sm mb-6">
                  {form.firstName}, {t('reservationConfirmed')}
                </p>
                <div className="space-y-2 text-left bg-white/5 rounded-2xl p-4 text-sm">
                  <div className="flex items-center gap-3 text-white/70"><FiUsers className="w-4 h-4" style={{ color: config.accentColor }} /><span>{guests} {t('guests')}</span></div>
                  <div className="flex items-center gap-3 text-white/70"><FiCalendar className="w-4 h-4" style={{ color: config.accentColor }} /><span>{selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
                  <div className="flex items-center gap-3 text-white/70"><FiClock className="w-4 h-4" style={{ color: config.accentColor }} /><span>{allTimeSlots.find(t => t.value === selectedTime)?.label}</span></div>
                </div>
                <button onClick={() => { setSaved(false); setStep(1); setSelectedDate(null); setSelectedTime(''); setForm({ firstName:'', lastName:'', phone:'', email:'', company:'', notes:'' }); }}
                  className="mt-6 w-full py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: config.accentColor }}>
                  {t('makeAnotherReservation')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20 sticky top-6">
                  <h3 className="text-white font-black text-lg mb-5">{t('summary')}</h3>
                  <div className="mb-4">
                    <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">{t('guests')}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {guestOptions.map(g => (
                        <button key={g} onClick={() => setGuests(g)}
                          className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${guests === g ? 'text-white shadow-lg' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                          style={guests === g ? { backgroundColor: config.accentColor } : {}}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { icon: FiUsers,    label: `${guests} ${t('guests')}`,    editable: false },
                      { icon: FiCalendar, label: selectedDate ? selectedDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : t('selectADate'), editable: !!selectedDate },
                      { icon: FiMapPin,   label: config.restaurantName, editable: false },
                      { icon: FiClock,    label: selectedTime ? allTimeSlots.find(t => t.value === selectedTime)?.label || selectedTime : t('selectATime'), editable: !!selectedTime },
                    ].map(({ icon: Icon, label, editable }) => (
                      <div key={label} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4" style={{ color: config.accentColor }} />
                          <span className="text-sm text-white/80">{label}</span>
                        </div>
                        {editable && <button onClick={() => setStep(1)} className="text-white/40 hover:text-white/70"><FiEdit2 className="w-3.5 h-3.5" /></button>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3">
                <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/20">
                  {step === 1 ? (
                    <>
                      <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-5">{t('selectDate')}</p>
                      <MiniCalendar
                        selectedDate={selectedDate}
                        onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); }}
                        accentColor={config.accentColor}
                        openDayNames={previewOpenDayNames}
                        t={t}
                      />
                      {selectedDate && (
                        <div className="mt-6">
                          {!previewIsOpen ? (
                            <div className="bg-red-500/15 border border-red-500/25 rounded-2xl p-5 text-center">
                              <p className="text-red-300 text-sm font-bold mb-1">{t('closedOnThisDay')}</p>
                              <p className="text-red-300/60 text-xs">{t('selectDifferentDate')}</p>
                            </div>
                          ) : !tablesLoaded ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                              <p className="text-white/60 text-sm">{t('loadingAvailability')}</p>
                            </div>
                          ) : timeSlots.length === 0 ? (
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
                              <p className="text-white/60 text-sm font-bold mb-1">{t('noTimeSlotsAvailable')}</p>
                              <p className="text-white/30 text-xs">{t('contactUsDirectly')}</p>
                            </div>
                          ) : (
                            <>
                              <p className="text-white/45 text-xs font-semibold uppercase tracking-wider mb-3">
                                {t('selectTime')}
                                <span className="text-white/25 normal-case font-normal ml-1">({previewOpenTime} – {previewCloseTime})</span>
                              </p>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {timeSlots.map(slot => (
                                  <button key={slot.value} onClick={() => setSelectedTime(slot.value)}
                                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${selectedTime === slot.value ? 'text-white shadow-lg scale-105' : 'bg-white/10 text-white/65 hover:bg-white/15'}`}
                                    style={selectedTime === slot.value ? { backgroundColor: config.accentColor } : {}}>
                                    {slot.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      {selectedDate && selectedTime && previewIsOpen && (
                        <button onClick={() => setStep(2)} className="mt-7 w-full py-4 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] shadow-xl" style={{ backgroundColor: config.accentColor }}>
                          {t('continue')}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 mb-6">
                        <button onClick={() => setStep(1)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20">
                          <FiChevronLeft className="w-4 h-4 text-white" />
                        </button>
                        <h3 className="text-white font-black text-lg">{t('enterContactDetails')}</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">{t('firstName')}</label>
                            <input value={form.firstName} onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="Juan" />
                          </div>
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">{t('lastName')}</label>
                            <input value={form.lastName} onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="dela Cruz" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            {t('phone')} {config.requirePhone && <span style={{ color: config.accentColor }}>*</span>}
                          </label>
                          <div className="flex gap-2">
                            <select value={phoneCode} onChange={e => setPhoneCode(e.target.value)} className="bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-white/50 w-24">
                              {COUNTRY_CODES.map(c => <option key={c.code} value={c.code} className="bg-gray-800 text-white">{c.flag} {c.code}</option>)}
                            </select>
                            <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} type="tel" className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="9XX XXX XXXX" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                            {t('email')} {config.requireEmail && <span style={{ color: config.accentColor }}>*</span>}
                          </label>
                          <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} type="email" className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder="juan@email.com" />
                        </div>
                        {config.showCompany && (
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">{t('company')}</label>
                            <input value={form.company} onChange={e => setForm(p => ({ ...p, company: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all" placeholder={t('companyNamePlaceholder')} />
                          </div>
                        )}
                        {config.showNotes && (
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">{t('notes')}</label>
                            <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} maxLength={360} className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/50 transition-all resize-none" placeholder={t('dietaryRequirements')} />
                            <p className="text-white/30 text-xs text-right mt-1">({form.notes.length}/360)</p>
                          </div>
                        )}
                        {reservationSettings?.enableOfferCode && (
                          <div>
                            <label className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-1.5 block">
                              {reservationSettings.offerCodeFieldLabel || t('haveOfferCode')}
                            </label>
                            <input
                              value={offerCodeInput}
                              onChange={e => setOfferCodeInput(e.target.value.toUpperCase())}
                              placeholder={t('offerCodePlaceholder')}
                              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm font-mono placeholder-white/30 focus:outline-none focus:border-white/50 transition-all"
                            />
                          </div>
                        )}
                        <label className="flex items-start gap-3 cursor-pointer">
                          <input type="checkbox" checked={agreeNewsletter} onChange={e => setAgreeNewsletter(e.target.checked)} className="mt-0.5 w-4 h-4 rounded" style={{ accentColor: config.accentColor }} />
                          <span className="text-white/50 text-xs leading-relaxed">
                            {t('agreeToNewsletters')}
                          </span>
                        </label>
                        <p className="text-white/30 text-xs">{t('byCompletingBooking')}</p>
                        <button onClick={handleSaveReservation} disabled={saving} className="w-full py-4 rounded-2xl text-sm font-black text-white transition-all hover:opacity-90 hover:scale-[1.01] shadow-xl disabled:opacity-50" style={{ backgroundColor: config.accentColor }}>
                          {saving ? t('saving') : t('makeReservation')}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReservationLinkPage;