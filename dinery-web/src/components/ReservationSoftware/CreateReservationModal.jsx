// src/components/reservation-software/CreateReservationModal.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { collection, addDoc, getDocs, doc, updateDoc, getDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { auth, firestore } from '../../firebase';
import {
  FiX, FiSave, FiUser, FiPhone, FiMail, FiChevronRight, FiUsers,
  FiClock, FiCheck, FiArrowLeft, FiLock, FiGlobe, FiPlus, FiMinus,
  FiTrash2, FiChevronDown, FiSearch, FiAlertCircle
} from 'react-icons/fi';

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // Modal titles
    editBooking: 'Edit Booking',
    createReservation: 'Create Reservation',
    quickBook: 'Quick Book',
    walkIn: 'Walk-in',
    // Steps
    stepTimeTable: 'Time & Table',
    stepGuestDetails: 'Guest Details',
    // Labels
    guests: 'Guests',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    email: 'Email',
    publicNotes: 'Public Notes',
    internalNotes: 'Internal Notes',
    visibleToCustomer: '(visible to customer)',
    staffOnly: '(staff only)',
    partyMenu: 'Party Menu',
    hidePartyMenu: 'Hide Party Menu',
    editPartyMenu: 'Edit Party Menu',
    selectTimeSlot: 'Please select a time slot',
    assignTableFirst: 'Please assign a table first.',
    tableNotAvailable: 'Selected table is not available for this time slot.',
    date: 'Date',
    time: 'Time',
    manualEntry: 'Manual Entry',
    selectSlot: 'Select Slot',
    status: 'Status',
    service: 'Service',
    mealStatus: 'Meal Status',
    notSet: 'Not Set',
    arrived: 'Arrived',
    foodDelivered: 'Food Delivered',
    dessert: 'Dessert',
    billDelivered: 'Bill Delivered',
    tableCleared: 'Table Cleared',
    noShow: 'No Show',
    clearOut: 'Clear Out',
    // Buttons
    back: 'Back',
    cancel: 'Cancel',
    saveWalkIn: 'Save Walk-in',
    updateReservation: 'Update Reservation',
    createReservationBtn: 'Create Reservation',
    next: 'Next',
    confirmBooking: 'Confirm Booking',
    saving: 'Saving…',
    confirming: 'Confirming…',
    // Table selector
    assignTable: 'Assign Table',
    combinations: 'Combinations',
    individualTables: 'Individual Tables',
    noTablesAvailable: 'No tables available yet.',
    someTablesBooked: 'Some tables are already booked for this time slot (greyed out)',
    tableUnavailable: 'This table is already booked for this time slot',
    // Time slots
    timeSlot: 'Time Slot',
    noAvailableSlots: 'No available slots',
    // Menu
    searchMenuItems: 'Search menu items…',
    noItemsMatch: 'No items match your search',
    noMenuItemsAvailable: 'No menu items available for this party size',
    add: 'Add',
    selectedItems: 'items selected',
    // Availability
    checkingAvailability: 'Checking availability...',
    available: 'Available',
    someTablesUnavailable: 'Some tables unavailable',
    // Session
    session: 'Session',
    dineIn: 'Dine-in',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    // Sitting time
    sittingTime: 'Sitting Time',
    untilClose: 'Until close',
    // Status options
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    // Customer info
    customerInformation: 'Customer Information',
    reservationDetails: 'Reservation Details',
    // Email
    reservationConfirmed: 'Reservation Confirmed –',
    ifNeedChanges: 'If you need to make changes, please contact us directly.',
    // Toast
    reservationCreated: 'Reservation created successfully!',
    // Errors
    firstNameRequired: 'First name is required',
    pleaseSelectSlot: 'Please select a time slot',
    pleaseAssignTable: 'Please assign at least one table.',
    tableCapacityError: 'Table capacity ({cap}) cannot fit {guests} guests',
    notAuthenticated: 'Not authenticated. Please refresh and try again.',
    ownerInfoMissing: 'Restaurant owner info missing. Please contact your administrator.',
    saveFailed: 'Failed: ',
    // Placeholders
    firstNamePlaceholder: 'John',
    lastNamePlaceholder: 'Doe',
    phonePlaceholder: '+1 234 567 8900',
    emailPlaceholder: 'email@example.com',
    publicNotesPlaceholder: 'Special requests, dietary needs, allergies, celebrations…',
    internalNotesPlaceholder: 'Staff notes, special arrangements, VIP info, pre-order details…',
    // Table availability
    tableCapacity: 'Cap',
    guestsCount: 'guests',
    // Step indicators
    timeTable: 'Time & Table',
    guestDetails: 'Guest Details',
    // Confirmations
    tableUnavailableTitle: 'Table Unavailable',
    // Walk-in
    walkInLabel: 'Walk-in',
    preSelectedTable: 'Table {name} pre-selected',
    hours: 'Hours',
  },
  fi: {
    editBooking: 'Muokkaa varausta',
    createReservation: 'Luo varaus',
    quickBook: 'Pikavaraus',
    walkIn: 'Kävelylle',
    stepTimeTable: 'Aika & Pöytä',
    stepGuestDetails: 'Asiakastiedot',
    guests: 'Vieraat',
    firstName: 'Etunimi',
    lastName: 'Sukunimi',
    phone: 'Puhelin',
    email: 'Sähköposti',
    publicNotes: 'Julkiset muistiinpanot',
    internalNotes: 'Sisäiset muistiinpanot',
    visibleToCustomer: '(näkyy asiakkaalle)',
    staffOnly: '(vain henkilökunnalle)',
    partyMenu: 'Ruokalista',
    hidePartyMenu: 'Piilota ruokalista',
    editPartyMenu: 'Muokkaa ruokalistaa',
    selectTimeSlot: 'Valitse aikaväli',
    assignTableFirst: 'Valitse pöytä ensin.',
    tableNotAvailable: 'Valittu pöytä ei ole saatavilla tälle ajalle.',
    date: 'Päivä',
    time: 'Aika',
    manualEntry: 'Manuaalinen syöttö',
    selectSlot: 'Valitse aika',
    status: 'Tila',
    service: 'Palvelu',
    mealStatus: 'Aterian tila',
    notSet: 'Ei asetettu',
    arrived: 'Saapunut',
    foodDelivered: 'Ruoka toimitettu',
    dessert: 'Jälkiruoka',
    billDelivered: 'Lasku toimitettu',
    tableCleared: 'Pöytä tyhjennetty',
    noShow: 'Ei saapunut',
    clearOut: 'Tyhjennä',
    back: 'Takaisin',
    cancel: 'Peruuta',
    saveWalkIn: 'Tallenna kävelylle',
    updateReservation: 'Päivitä varaus',
    createReservationBtn: 'Luo varaus',
    next: 'Seuraava',
    confirmBooking: 'Vahvista varaus',
    saving: 'Tallennetaan…',
    confirming: 'Vahvistetaan…',
    assignTable: 'Valitse pöytä',
    combinations: 'Yhdistelmät',
    individualTables: 'Yksittäiset pöydät',
    noTablesAvailable: 'Ei vielä pöytiä.',
    someTablesBooked: 'Jotkut pöydät ovat jo varattuja tälle ajalle (harmaalla)',
    tableUnavailable: 'Tämä pöytä on jo varattu tälle ajalle',
    timeSlot: 'Aikaväli',
    noAvailableSlots: 'Ei vapaita aikoja',
    searchMenuItems: 'Hae ruokalistan tuotteita…',
    noItemsMatch: 'Yksikään tuote ei vastaa hakua',
    noMenuItemsAvailable: 'Ei ruokalistan tuotteita tälle seurueelle',
    add: 'Lisää',
    selectedItems: 'tuotetta valittu',
    checkingAvailability: 'Tarkistetaan saatavuutta...',
    available: 'Saatavilla',
    someTablesUnavailable: 'Jotkut pöydät eivät ole saatavilla',
    session: 'Istunto',
    dineIn: 'Ravintolassa',
    takeaway: 'Nouto',
    delivery: 'Kotiinkuljetus',
    sittingTime: 'Istuntoaika',
    untilClose: 'Sulkemiseen asti',
    pending: 'Odottaa',
    confirmed: 'Vahvistettu',
    completed: 'Valmis',
    cancelled: 'Peruttu',
    customerInformation: 'Asiakastiedot',
    reservationDetails: 'Varauksen tiedot',
    reservationConfirmed: 'Varaus vahvistettu –',
    ifNeedChanges: 'Jos haluat tehdä muutoksia, ota yhteyttä suoraan ravintolaan.',
    reservationCreated: 'Varaus luotu onnistuneesti!',
    firstNameRequired: 'Etunimi vaaditaan',
    pleaseSelectSlot: 'Valitse aikaväli',
    pleaseAssignTable: 'Valitse vähintään yksi pöytä.',
    tableCapacityError: 'Pöydän kapasiteetti ({cap}) ei riitä {guests} vieraalle',
    notAuthenticated: 'Ei kirjauduttu. Päivitä sivu ja yritä uudelleen.',
    ownerInfoMissing: 'Ravintolan omistajatiedot puuttuvat. Ota yhteyttä järjestelmänvalvojaan.',
    saveFailed: 'Epäonnistui: ',
    firstNamePlaceholder: 'Matti',
    lastNamePlaceholder: 'Meikäläinen',
    phonePlaceholder: '+358 40 123 4567',
    emailPlaceholder: 'matti@esimerkki.fi',
    publicNotesPlaceholder: 'Erityistoiveet, ruokavaliot, allergiat, juhlat…',
    internalNotesPlaceholder: 'Henkilökunnan muistiinpanot, VIP-tiedot, erityisjärjestelyt…',
    tableCapacity: 'Kap.',
    guestsCount: 'vierasta',
    timeTable: 'Aika & Pöytä',
    guestDetails: 'Asiakastiedot',
    tableUnavailableTitle: 'Pöytä ei saatavilla',
    walkInLabel: 'Kävelylle',
    preSelectedTable: 'Pöytä {name} valittu',
    hours: 'Aukioloajat',
  },
  no: {
    editBooking: 'Rediger bestilling',
    createReservation: 'Opprett reservasjon',
    quickBook: 'Hurtigbestilling',
    walkIn: 'Drop-in',
    stepTimeTable: 'Tid & Bord',
    stepGuestDetails: 'Kundeopplysninger',
    guests: 'Gjester',
    firstName: 'Fornavn',
    lastName: 'Etternavn',
    phone: 'Telefon',
    email: 'E-post',
    publicNotes: 'Offentlige notater',
    internalNotes: 'Interne notater',
    visibleToCustomer: '(synlig for kunde)',
    staffOnly: '(kun ansatte)',
    partyMenu: 'Festmeny',
    hidePartyMenu: 'Skjul festmeny',
    editPartyMenu: 'Rediger festmeny',
    selectTimeSlot: 'Velg et tidspunkt',
    assignTableFirst: 'Tildel et bord først.',
    tableNotAvailable: 'Valgt bord er ikke tilgjengelig for dette tidspunktet.',
    date: 'Dato',
    time: 'Tid',
    manualEntry: 'Manuell oppføring',
    selectSlot: 'Velg spor',
    status: 'Status',
    service: 'Service',
    mealStatus: 'Måltidsstatus',
    notSet: 'Ikke satt',
    arrived: 'Ankommet',
    foodDelivered: 'Mat levert',
    dessert: 'Dessert',
    billDelivered: 'Regning levert',
    tableCleared: 'Bord ryddet',
    noShow: 'Ikke møtt',
    clearOut: 'Rydd ut',
    back: 'Tilbake',
    cancel: 'Avbryt',
    saveWalkIn: 'Lagre drop-in',
    updateReservation: 'Oppdater reservasjon',
    createReservationBtn: 'Opprett reservasjon',
    next: 'Neste',
    confirmBooking: 'Bekreft bestilling',
    saving: 'Lagrer…',
    confirming: 'Bekrefter…',
    assignTable: 'Tildel bord',
    combinations: 'Kombinasjoner',
    individualTables: 'Individuelle bord',
    noTablesAvailable: 'Ingen bord tilgjengelig ennå.',
    someTablesBooked: 'Noen bord er allerede booket for dette tidspunktet (grå)',
    tableUnavailable: 'Dette bordet er allerede booket for dette tidspunktet',
    timeSlot: 'Tidsspor',
    noAvailableSlots: 'Ingen tilgjengelige spor',
    searchMenuItems: 'Søk i menyelementer…',
    noItemsMatch: 'Ingen elementer samsvarer med søket',
    noMenuItemsAvailable: 'Ingen menyelementer tilgjengelig for denne gruppen',
    add: 'Legg til',
    selectedItems: 'elementer valgt',
    checkingAvailability: 'Sjekker tilgjengelighet...',
    available: 'Tilgjengelig',
    someTablesUnavailable: 'Noen bord er utilgjengelige',
    session: 'Økt',
    dineIn: 'Spise inne',
    takeaway: 'Takeaway',
    delivery: 'Levering',
    sittingTime: 'Sittetid',
    untilClose: 'Til stengetid',
    pending: 'Venter',
    confirmed: 'Bekreftet',
    completed: 'Fullført',
    cancelled: 'Avbestilt',
    customerInformation: 'Kundeinformasjon',
    reservationDetails: 'Bestillingsdetaljer',
    reservationConfirmed: 'Reservasjon bekreftet –',
    ifNeedChanges: 'Hvis du trenger å gjøre endringer, vennligst kontakt oss direkte.',
    reservationCreated: 'Reservasjon opprettet!',
    firstNameRequired: 'Fornavn er påkrevd',
    pleaseSelectSlot: 'Vennligst velg et tidspunkt',
    pleaseAssignTable: 'Vennligst tildel minst ett bord.',
    tableCapacityError: 'Bordkapasitet ({cap}) kan ikke romme {guests} gjester',
    notAuthenticated: 'Ikke autentisert. Vennligst oppdater og prøv igjen.',
    ownerInfoMissing: 'Restauranteierinformasjon mangler. Kontakt din administrator.',
    saveFailed: 'Mislyktes: ',
    firstNamePlaceholder: 'Ola',
    lastNamePlaceholder: 'Nordmann',
    phonePlaceholder: '+47 123 45 678',
    emailPlaceholder: 'ola@eksempel.no',
    publicNotesPlaceholder: 'Spesielle ønsker, diettkrav, allergier, feiringer…',
    internalNotesPlaceholder: 'Ansattnotater, VIP-info, spesielle ordninger…',
    tableCapacity: 'Kap.',
    guestsCount: 'gjester',
    timeTable: 'Tid & Bord',
    guestDetails: 'Kundeopplysninger',
    tableUnavailableTitle: 'Bord utilgjengelig',
    walkInLabel: 'Drop-in',
    preSelectedTable: 'Bord {name} forhåndsvalgt',
    hours: 'Åpningstider',
  },
  sv: {
    editBooking: 'Redigera bokning',
    createReservation: 'Skapa bokning',
    quickBook: 'Snabbbokning',
    walkIn: 'Drop-in',
    stepTimeTable: 'Tid & Bord',
    stepGuestDetails: 'Kunduppgifter',
    guests: 'Gäster',
    firstName: 'Förnamn',
    lastName: 'Efternamn',
    phone: 'Telefon',
    email: 'E-post',
    publicNotes: 'Offentliga anteckningar',
    internalNotes: 'Interna anteckningar',
    visibleToCustomer: '(synlig för kund)',
    staffOnly: '(endast personal)',
    partyMenu: 'Meny för sällskap',
    hidePartyMenu: 'Dölj menyn',
    editPartyMenu: 'Redigera menyn',
    selectTimeSlot: 'Välj en tid',
    assignTableFirst: 'Tilldela ett bord först.',
    tableNotAvailable: 'Valt bord är inte tillgängligt för denna tid.',
    date: 'Datum',
    time: 'Tid',
    manualEntry: 'Manuell inmatning',
    selectSlot: 'Välj tid',
    status: 'Status',
    service: 'Service',
    mealStatus: 'Måltidsstatus',
    notSet: 'Ej satt',
    arrived: 'Anländ',
    foodDelivered: 'Mat levererad',
    dessert: 'Efterrätt',
    billDelivered: 'Nota levererad',
    tableCleared: 'Bord rensat',
    noShow: 'Ej anländ',
    clearOut: 'Rensa ut',
    back: 'Tillbaka',
    cancel: 'Avbryt',
    saveWalkIn: 'Spara drop-in',
    updateReservation: 'Uppdatera bokning',
    createReservationBtn: 'Skapa bokning',
    next: 'Nästa',
    confirmBooking: 'Bekräfta bokning',
    saving: 'Sparar…',
    confirming: 'Bekräftar…',
    assignTable: 'Tilldela bord',
    combinations: 'Kombinationer',
    individualTables: 'Individuella bord',
    noTablesAvailable: 'Inga bord tillgängliga ännu.',
    someTablesBooked: 'Vissa bord är redan bokade för denna tid (grå)',
    tableUnavailable: 'Detta bord är redan bokat för denna tid',
    timeSlot: 'Tidsspalt',
    noAvailableSlots: 'Inga tillgängliga tider',
    searchMenuItems: 'Sök i menyalternativ…',
    noItemsMatch: 'Inga artiklar matchar sökningen',
    noMenuItemsAvailable: 'Inga menyalternativ tillgängliga för detta sällskap',
    add: 'Lägg till',
    selectedItems: 'artiklar valda',
    checkingAvailability: 'Kontrollerar tillgänglighet...',
    available: 'Tillgänglig',
    someTablesUnavailable: 'Vissa bord är inte tillgängliga',
    session: 'Session',
    dineIn: 'Äta inne',
    takeaway: 'Takeaway',
    delivery: 'Hemleverans',
    sittingTime: 'Sitttid',
    untilClose: 'Till stängning',
    pending: 'Väntar',
    confirmed: 'Bekräftad',
    completed: 'Slutförd',
    cancelled: 'Avbokad',
    customerInformation: 'Kundinformation',
    reservationDetails: 'Bokningsdetaljer',
    reservationConfirmed: 'Bokning bekräftad –',
    ifNeedChanges: 'Om du behöver göra ändringar, vänligen kontakta oss direkt.',
    reservationCreated: 'Bokning skapad!',
    firstNameRequired: 'Förnamn krävs',
    pleaseSelectSlot: 'Vänligen välj en tid',
    pleaseAssignTable: 'Vänligen tilldela minst ett bord.',
    tableCapacityError: 'Bordskapacitet ({cap}) kan inte rymma {guests} gäster',
    notAuthenticated: 'Inte autentiserad. Vänligen uppdatera och försök igen.',
    ownerInfoMissing: 'Restaurangägareinformation saknas. Kontakta din administratör.',
    saveFailed: 'Misslyckades: ',
    firstNamePlaceholder: 'Anna',
    lastNamePlaceholder: 'Andersson',
    phonePlaceholder: '+46 70 123 45 67',
    emailPlaceholder: 'anna@exempel.se',
    publicNotesPlaceholder: 'Speciella önskemål, kostkrav, allergier, firande…',
    internalNotesPlaceholder: 'Personalanteckningar, VIP-info, speciella arrangemang…',
    tableCapacity: 'Kap.',
    guestsCount: 'gäster',
    timeTable: 'Tid & Bord',
    guestDetails: 'Kunduppgifter',
    tableUnavailableTitle: 'Bord ej tillgängligt',
    walkInLabel: 'Drop-in',
    preSelectedTable: 'Bord {name} förvalt',
    hours: 'Öppettider',
  },
  de: {
    editBooking: 'Buchung bearbeiten',
    createReservation: 'Reservierung erstellen',
    quickBook: 'Schnellbuchung',
    walkIn: 'Laufkundschaft',
    stepTimeTable: 'Zeit & Tisch',
    stepGuestDetails: 'Gastdetails',
    guests: 'Gäste',
    firstName: 'Vorname',
    lastName: 'Nachname',
    phone: 'Telefon',
    email: 'E-Mail',
    publicNotes: 'Öffentliche Notizen',
    internalNotes: 'Interne Notizen',
    visibleToCustomer: '(für Kunden sichtbar)',
    staffOnly: '(nur Personal)',
    partyMenu: 'Partymenü',
    hidePartyMenu: 'Partymenü ausblenden',
    editPartyMenu: 'Partymenü bearbeiten',
    selectTimeSlot: 'Bitte wählen Sie einen Zeitslot',
    assignTableFirst: 'Bitte weisen Sie zuerst einen Tisch zu.',
    tableNotAvailable: 'Ausgewählter Tisch ist für diese Zeit nicht verfügbar.',
    date: 'Datum',
    time: 'Uhrzeit',
    manualEntry: 'Manuelle Eingabe',
    selectSlot: 'Slot auswählen',
    status: 'Status',
    service: 'Service',
    mealStatus: 'Mahlzeitstatus',
    notSet: 'Nicht festgelegt',
    arrived: 'Angekommen',
    foodDelivered: 'Essen geliefert',
    dessert: 'Dessert',
    billDelivered: 'Rechnung geliefert',
    tableCleared: 'Tisch geräumt',
    noShow: 'Nicht erschienen',
    clearOut: 'Räumen',
    back: 'Zurück',
    cancel: 'Abbrechen',
    saveWalkIn: 'Laufkundschaft speichern',
    updateReservation: 'Reservierung aktualisieren',
    createReservationBtn: 'Reservierung erstellen',
    next: 'Weiter',
    confirmBooking: 'Buchung bestätigen',
    saving: 'Speichere…',
    confirming: 'Bestätige…',
    assignTable: 'Tisch zuweisen',
    combinations: 'Kombinationen',
    individualTables: 'Einzelne Tische',
    noTablesAvailable: 'Noch keine Tische verfügbar.',
    someTablesBooked: 'Einige Tische sind bereits für diese Zeit gebucht (grau)',
    tableUnavailable: 'Dieser Tisch ist bereits für diese Zeit gebucht',
    timeSlot: 'Zeitslot',
    noAvailableSlots: 'Keine verfügbaren Slots',
    searchMenuItems: 'Menüpunkte durchsuchen…',
    noItemsMatch: 'Keine Artikel entsprechen der Suche',
    noMenuItemsAvailable: 'Keine Menüpunkte für diese Gruppe verfügbar',
    add: 'Hinzufügen',
    selectedItems: 'Artikel ausgewählt',
    checkingAvailability: 'Prüfe Verfügbarkeit...',
    available: 'Verfügbar',
    someTablesUnavailable: 'Einige Tische nicht verfügbar',
    session: 'Session',
    dineIn: 'Vor Ort',
    takeaway: 'Zum Mitnehmen',
    delivery: 'Lieferung',
    sittingTime: 'Sitzzeit',
    untilClose: 'Bis zur Schließung',
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    customerInformation: 'Kundeninformation',
    reservationDetails: 'Buchungsdetails',
    reservationConfirmed: 'Reservierung bestätigt –',
    ifNeedChanges: 'Wenn Sie Änderungen vornehmen müssen, kontaktieren Sie uns bitte direkt.',
    reservationCreated: 'Reservierung erstellt!',
    firstNameRequired: 'Vorname ist erforderlich',
    pleaseSelectSlot: 'Bitte wählen Sie einen Zeitslot',
    pleaseAssignTable: 'Bitte weisen Sie mindestens einen Tisch zu.',
    tableCapacityError: 'Tischkapazität ({cap}) kann {guests} Gäste nicht aufnehmen',
    notAuthenticated: 'Nicht authentifiziert. Bitte aktualisieren Sie und versuchen Sie es erneut.',
    ownerInfoMissing: 'Restaurantbesitzerinformationen fehlen. Bitte kontaktieren Sie Ihren Administrator.',
    saveFailed: 'Fehlgeschlagen: ',
    firstNamePlaceholder: 'Max',
    lastNamePlaceholder: 'Mustermann',
    phonePlaceholder: '+49 123 456 7890',
    emailPlaceholder: 'max@beispiel.de',
    publicNotesPlaceholder: 'Besondere Wünsche, Ernährungseinschränkungen, Allergien, Feierlichkeiten…',
    internalNotesPlaceholder: 'Personalnotizen, VIP-Info, Sondervereinbarungen…',
    tableCapacity: 'Kap.',
    guestsCount: 'Gäste',
    timeTable: 'Zeit & Tisch',
    guestDetails: 'Gastdetails',
    tableUnavailableTitle: 'Tisch nicht verfügbar',
    walkInLabel: 'Laufkundschaft',
    preSelectedTable: 'Tisch {name} vorausgewählt',
    hours: 'Öffnungszeiten',
  },
};

const sortTables = (tables) => {
  return [...tables].sort((a, b) => {
    const nameA = a.name?.toString() || '';
    const nameB = b.name?.toString() || '';
    
    const numA = parseFloat(nameA);
    const numB = parseFloat(nameB);
    
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    } else {
      return nameA.localeCompare(nameB);
    }
  });
};

const getMealStatusConfig = (mealStatus, t) => {
  const map = {
    'arrived':        { color: '#ef4444', label: t('arrived'), icon: '🔴' },
    'food_delivered': { color: '#3b82f6', label: t('foodDelivered'), icon: '🔵' },
    'dessert':        { color: '#8b5cf6', label: t('dessert'), icon: '🟣' },
    'bill_delivered': { color: '#eab308', label: t('billDelivered'), icon: '🟡' },
    'table_cleared':  { color: '#84cc16', label: t('tableCleared'), icon: '🟢' },
    'no_show':        { color: '#6b7280', label: t('noShow'), icon: '⚫' },
    'clear_out':      { color: '#9ca3af', label: t('clearOut'), icon: '⚪' },
  };
  return map[mealStatus?.toLowerCase()] || null;
};

const inputCls = "w-full border-2 border-gray-100 bg-gray-50 rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-800 focus:outline-none focus:border-[#fe8a24] focus:bg-white transition-all placeholder:text-gray-300";
const labelCls = "block text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 sm:mb-1.5";

// ── Step indicator ──
const StepPill = ({ step, current, label, t }) => (
  <div className="flex items-center gap-1 sm:gap-1.5">
    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold transition-all ${
      current > step ? 'bg-green-500 text-white' :
      current === step ? 'bg-[#fe8a24] text-white' :
      'bg-gray-200 text-gray-400'
    }`}>
      {current > step ? '✓' : step}
    </div>
    <span className={`text-[10px] sm:text-xs font-semibold ${current === step ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
  </div>
);

// ─── Table Availability Check ──────────────────────────────────────────────────
const checkTableAvailability = async (tableId, date, fromTime, duration, restaurantId, collectionName, excludeReservationId = null) => {
  try {
    const db = firestore;
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const q = query(
      collection(db, 'reservations'),
      where('restaurant_id', '==', restaurantId),
      where('reservation_date', '>=', dayStart),
      where('reservation_date', '<=', dayEnd),
      where('status', 'in', ['confirmed', 'pending'])
    );

    const querySnapshot = await getDocs(q);
    const reservations = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const [reqHour, reqMin] = fromTime.split(':').map(Number);
    const reqStartMinutes = reqHour * 60 + reqMin;
    const reqEndMinutes = reqStartMinutes + duration;

    for (const reservation of reservations) {
      if (excludeReservationId && reservation.id === excludeReservationId) continue;
      
      const reservationTableIds = reservation.table_ids || (reservation.table_id ? [reservation.table_id] : []);
      if (!reservationTableIds.includes(tableId)) continue;

      const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
      const resTime = reservation.from_time || `${String(resDate.getHours()).padStart(2,'0')}:${String(resDate.getMinutes()).padStart(2,'0')}`;
      const [resHour, resMin] = resTime.split(':').map(Number);
      const resStartMinutes = resHour * 60 + resMin;
      const resDuration = reservation.duration_minutes || 75;
      const resEndMinutes = resStartMinutes + resDuration;

      if (reqStartMinutes < resEndMinutes && reqEndMinutes > resStartMinutes) {
        const resDateOnly = new Date(resDate);
        const reqDateOnly = new Date(date);
        if (resDateOnly.toDateString() === reqDateOnly.toDateString()) {
          return {
            available: false,
            conflictingReservation: {
              id: reservation.id,
              name: reservation.customer_name || 'Guest',
              time: resTime,
              duration: resDuration,
              status: reservation.status
            }
          };
        }
      }
    }

    return { available: true };
  } catch (error) {
    console.error('Error checking table availability:', error);
    return { available: true, error: error.message };
  }
};

// ─── Check multiple tables for availability ───────────────────────────────────
const checkMultipleTablesAvailability = async (tableIds, date, fromTime, duration, restaurantId, collectionName, excludeReservationId = null) => {
  if (!tableIds || tableIds.length === 0) {
    return { available: true, conflicts: [] };
  }

  const conflicts = [];
  let allAvailable = true;

  for (const tableId of tableIds) {
    const result = await checkTableAvailability(
      tableId,
      date,
      fromTime,
      duration,
      restaurantId,
      collectionName,
      excludeReservationId
    );

    if (!result.available) {
      allAvailable = false;
      conflicts.push({
        tableId,
        conflict: result.conflictingReservation
      });
    }
  }

  return {
    available: allAvailable,
    conflicts: conflicts
  };
};

// ─── TableAvailabilityBadge ──
const TableAvailabilityBadge = ({ available, checking, t }) => {
  if (checking) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-400">
        <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
        {t('checkingAvailability')}
      </div>
    );
  }
  
  if (available === null || available === undefined) {
    return null;
  }
  
  if (available) {
    return (
      <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
        <FiCheck className="w-3 h-3" />
        {t('available')}
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-xs text-amber-500 font-medium">
      <FiAlertCircle className="w-3 h-3" />
      {t('someTablesUnavailable')}
    </div>
  );
};

// ─── TimeSlotGrid ──
const TimeSlotGrid = ({ 
  loadingSettings, timeSlots, selectedSlot, setSelectedSlot, 
  openTime, closeTime, compact, unavailableSlots, tableAvailability, t 
}) => {
  const allUnavailableSlots = useMemo(() => {
    const slots = [...(unavailableSlots || [])];
    if (tableAvailability && tableAvailability.available === false && tableAvailability.conflicts) {
      tableAvailability.conflicts.forEach(conflict => {
        if (conflict.conflict?.time) {
          slots.push(conflict.conflict.time);
        }
      });
    }
    return slots;
  }, [unavailableSlots, tableAvailability]);

  return (
    <div>
      <p className={labelCls}>
        <FiClock className="inline w-3 h-3 mr-1"/>{t('timeSlot')}{' '}
        <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">({openTime}–{closeTime})</span>
      </p>
      {loadingSettings ? (
        <div className="flex items-center justify-center py-6 sm:py-8 bg-gray-50 rounded-xl">
          <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : timeSlots.length === 0 ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 text-center text-[10px] sm:text-sm text-red-500 font-medium">{t('noAvailableSlots')}</div>
      ) : (
        <>
          <div className={`grid grid-cols-3 sm:grid-cols-4 gap-1 sm:gap-1.5 ${compact ? 'max-h-40 sm:max-h-48' : 'max-h-56 sm:max-h-64'} overflow-y-auto pr-1`}>
            {timeSlots.map((slot, i) => {
              const isSel = selectedSlot?.startTime === slot.startTime;
              const isUnavailable = allUnavailableSlots.includes(slot.startTime);
              
              return (
                <button 
                  key={i} 
                  type="button" 
                  onClick={() => {
                    if (!isUnavailable) {
                      setSelectedSlot(slot);
                    }
                  }}
                  disabled={isUnavailable}
                  className={`py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-semibold transition-all relative ${
                    isSel
                      ? 'bg-[#fe8a24] text-white shadow-md scale-105'
                      : isUnavailable
                      ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed line-through'
                      : 'bg-gray-50 border border-gray-200 text-gray-600 hover:border-[#fe8a24] hover:text-[#fe8a24] hover:bg-orange-50'
                  }`}
                >
                  {slot.startTime}
                  {isUnavailable && (
                    <span className="absolute -top-1 -right-1 text-[10px]">🚫</span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedSlot && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FiCheck className="w-3 h-3 sm:w-4 sm:h-4 text-green-600"/>
                <span className="text-[10px] sm:text-sm font-bold text-green-700">{selectedSlot.label}</span>
              </div>
              <button type="button" onClick={() => setSelectedSlot(null)} className="text-green-500 hover:text-green-700">
                <FiX className="w-3 h-3 sm:w-4 sm:h-4"/>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── TableSelector ──
const TableSelector = ({
  tables, combinations, selectedTableIds, selectedCombination,
  setSelectedTableIds, setSelectedCombination, setTableError,
  tableError, guests, combinedCapacity, capacityOk, preSelectedTableId,
  tableAvailability, checkingAvailability, checkTableAvailabilityForSlots,
  selectedDate, fromTime, duration, excludeReservationId, t,
}) => {
  const unavailableTableIds = useMemo(() => {
    if (!tableAvailability || tableAvailability.available !== false) return [];
    return tableAvailability.conflicts?.map(c => c.tableId) || [];
  }, [tableAvailability]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelCls}>🪑 {t('assignTable')}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTableIds.length > 0 && (
            <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${capacityOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {t('tableCapacity')} {combinedCapacity} {capacityOk ? '✓' : `— ${t('need')} ${guests}`}
            </span>
          )}
          {selectedTableIds.length > 0 && (
            <TableAvailabilityBadge 
              available={tableAvailability?.available} 
              checking={checkingAvailability}
              t={t}
            />
          )}
        </div>
      </div>
      {tableError && <p className="text-[10px] sm:text-xs text-red-500 font-semibold flex items-center gap-1">⚠ {tableError}</p>}
      {tableAvailability && tableAvailability.available === false && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2">
          <p className="text-[10px] sm:text-xs text-amber-700 font-medium flex items-center gap-1.5">
            <FiAlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            {t('someTablesBooked')}
          </p>
        </div>
      )}

      {combinations.length > 0 && (
        <div>
          <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2">{t('combinations')}</p>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {combinations.map(combo => {
              const isSel = selectedCombination?.id === combo.id;
              return (
                <button key={combo.id} type="button"
                  onClick={() => {
                    setTableError('');
                    if (isSel) { 
                      setSelectedCombination(null); 
                      setSelectedTableIds([]); 
                    } else { 
                      setSelectedCombination(combo); 
                      setSelectedTableIds(combo.tableIds);
                      if (selectedDate && fromTime && duration) {
                        checkTableAvailabilityForSlots(combo.tableIds);
                      }
                    }
                  }}
                  className={`relative flex flex-col gap-0.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 text-[10px] sm:text-xs font-semibold transition-all ${
                    isSel ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-400'
                  }`}>
                  {isSel && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-blue-500 rounded-full flex items-center justify-center">
                      <FiCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white"/>
                    </span>
                  )}
                  <span className="font-bold text-[10px] sm:text-xs">{combo.name}</span>
                  <span className="text-gray-400 text-[8px] sm:text-[10px]">{combo.minCapacity}–{combo.maxCapacity} {t('guestsCount')}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {tables.length === 0 ? (
        <p className="text-xs sm:text-sm text-gray-400 italic">{t('noTablesAvailable')}</p>
      ) : (
        <div>
          {combinations.length > 0 && (
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 sm:mb-2">{t('individualTables')}</p>
          )}
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {sortTables(tables).map(tbl => {
              const isSel = selectedTableIds.includes(tbl.id);
              const isPreSel = tbl.id === preSelectedTableId;
              const isUnavailable = unavailableTableIds.includes(tbl.id);
              
              return (
                <button 
                  key={tbl.id} 
                  type="button"
                  onClick={() => {
                    if (isUnavailable) return;
                    setTableError('');
                    const newIds = prev => prev.includes(tbl.id) ? prev.filter(x => x !== tbl.id) : [...prev, tbl.id];
                    setSelectedTableIds(newIds);
                    if (selectedDate && fromTime && duration) {
                      checkTableAvailabilityForSlots(newIds(selectedTableIds));
                    }
                  }}
                  className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border-2 text-[10px] sm:text-xs font-bold transition-all ${
                    isSel ? 'border-[#fe8a24] bg-orange-50 text-[#fe8a24]' :
                    isPreSel ? 'border-orange-300 bg-orange-50/50 text-orange-400' :
                    isUnavailable ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60' :
                    'border-gray-200 text-gray-600 hover:border-[#fe8a24] hover:bg-orange-50'
                  }`}
                  disabled={isUnavailable}
                  title={isUnavailable ? t('tableUnavailable') : ''}
                >
                  {isSel && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-[#fe8a24] rounded-full flex items-center justify-center">
                      <FiCheck className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white"/>
                    </span>
                  )}
                  <span className="text-[10px] sm:text-xs">{tbl.name}</span>
                  <span className={`text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-full ${isSel ? 'bg-[#fe8a24]/20' : isUnavailable ? 'bg-gray-200' : 'bg-gray-100'}`}>
                    <FiUsers className="inline w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5"/>{tbl.maxCapacity}
                  </span>
                  {isUnavailable && (
                    <span className="text-[10px] text-gray-400 ml-1">🚫</span>
                  )}
                  {!isUnavailable && isSel && checkingAvailability && (
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 border-[#fe8a24] border-t-transparent rounded-full animate-spin ml-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selectedCombination && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 sm:p-3 flex flex-wrap gap-1 sm:gap-1.5">
          <span className="text-[10px] sm:text-xs font-bold text-blue-700 w-full">🔗 {selectedCombination.name}</span>
          {selectedCombination.tableNames.map((n, i) => (
            <span key={i} className="text-[8px] sm:text-[10px] bg-blue-100 text-blue-600 px-1.5 sm:px-2 py-0.5 rounded-full font-medium">{n}</span>
          ))}
        </div>
      )}
      {!selectedCombination && selectedTableIds.length > 1 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-orange-700 font-medium">
          🔗 {t('combined')}: {sortTables(tables.filter(t => selectedTableIds.includes(t.id))).map(t => t.name).join(' + ')} · {combinedCapacity} {t('guestsCount')} total
        </div>
      )}
    </div>
  );
};

// ─── GuestPicker ──
const GuestPicker = ({ guests, setGuests, maxGuests, showCustomGuests, setShowCustomGuests, customGuests, setCustomGuests, t }) => (
  <div>
    <p className={labelCls}><FiUsers className="inline w-3 h-3 mr-1"/>{t('guests')}</p>
    <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2">
      {[1,2,3,4,5,6,7,8,9,10].map(g => (
        <button key={g} type="button"
          onClick={() => { setGuests(g); setShowCustomGuests(false); }}
          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
            guests === g && !showCustomGuests
              ? 'bg-[#fe8a24] text-white shadow-md scale-105'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>
          {g}
          {guests === g && !showCustomGuests && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white border-2 border-[#fe8a24]"/>
          )}
        </button>
      ))}
      <button type="button"
        onClick={() => setShowCustomGuests(s => !s)}
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl text-xs sm:text-sm font-bold transition-all ${
          showCustomGuests ? 'bg-[#fe8a24] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}>
        +
      </button>
    </div>
    {showCustomGuests && (
      <input type="number" min="1" max={maxGuests} value={customGuests} autoFocus
        onChange={e => { setCustomGuests(e.target.value); setGuests(parseInt(e.target.value) || 1); }}
        className={inputCls} placeholder={t('customGuestCount')} />
    )}
  </div>
);

// ─── MenuItemSelector ──
const MenuItemSelector = ({ menuItems, selectedItems, guests, onAddItem, onRemoveItem, onUpdateQuantity, getCategoryName, t }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const itemsByCategory = menuItems.reduce((acc, item) => {
    const catId = item.category || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(item);
    return acc;
  }, {});

  const filteredItems = Object.keys(itemsByCategory).reduce((acc, catId) => {
    const items = itemsByCategory[catId].filter(item => {
      if (searchQuery) {
        const name = item.name?.en || item.name || '';
        if (!name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      const minCap = item.minCapacity || 0;
      const maxCap = item.maxCapacity || 0;
      if (minCap > 0 && guests < minCap) return false;
      if (maxCap > 0 && guests > maxCap) return false;
      return true;
    });
    if (items.length > 0) acc[catId] = items;
    return acc;
  }, {});

  const isSelected = (itemId) => selectedItems.some(si => si.id === itemId);
  const getQuantity = (itemId) => {
    const found = selectedItems.find(si => si.id === itemId);
    return found ? found.quantity : 0;
  };
  const totalItems = selectedItems.reduce((sum, si) => sum + si.quantity, 0);

  return (
    <div className="space-y-2 sm:space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={labelCls}>🍽️ {t('partyMenu')}</p>
        {totalItems > 0 && (
          <span className="text-[10px] sm:text-xs font-bold bg-[#fe8a24]/10 text-[#fe8a24] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
            {totalItems} {t('itemsSelected')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
        <FiSearch className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchMenuItems')}
          className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none w-full"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <FiX className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        )}
      </div>

      <div className="max-h-48 sm:max-h-60 overflow-y-auto pr-1 space-y-2">
        {Object.keys(filteredItems).length === 0 ? (
          <p className="text-xs sm:text-sm text-gray-400 text-center py-3 sm:py-4">
            {searchQuery ? t('noItemsMatch') : t('noMenuItemsAvailable')}
          </p>
        ) : (
          Object.keys(filteredItems).map((catId) => {
            const items = filteredItems[catId];
            const isExpanded = expandedCategory === catId;
            const catName = getCategoryName ? getCategoryName(catId) : (catId === 'uncategorized' ? t('uncategorized') : catId);

            return (
              <div key={catId} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : catId)}
                  className="w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-700 truncate">{catName}</span>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    <span className="text-[10px] sm:text-xs text-gray-400">{items.length} {t('items')}</span>
                    {isExpanded ? <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" /> : <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-1.5 sm:p-2 space-y-1 sm:space-y-1.5">
                    {items.map((item) => {
                      const selected = isSelected(item.id);
                      const qty = getQuantity(item.id);
                      const itemName = item.name?.en || item.name || 'Unnamed';
                      const price = item.price || '0';

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-1.5 sm:p-2 rounded-lg transition-all gap-1.5 sm:gap-2 ${
                            selected ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] sm:text-sm font-semibold text-gray-800 truncate">{itemName}</p>
                            <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-0.5">
                              <span className="text-[10px] sm:text-xs font-bold text-[#fe8a24]">{price},-</span>
                              {(item.minCapacity > 0 || item.maxCapacity > 0) && (
                                <span className="text-[8px] sm:text-[10px] text-gray-400">
                                  👥 {item.minCapacity > 0 && item.maxCapacity > 0
                                    ? `${item.minCapacity}–${item.maxCapacity} ${t('guests')}`
                                    : item.minCapacity > 0
                                    ? `${item.minCapacity}+ ${t('guests')}`
                                    : `${t('upTo')} ${item.maxCapacity} ${t('guests')}`}
                                </span>
                              )}
                              {item.allergens?.length > 0 && (
                                <span className="text-[8px] sm:text-[10px] text-amber-600">⚠️ {t('allergens')}</span>
                              )}
                            </div>
                          </div>

                          {selected ? (
                            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.id, qty - 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors"
                              >
                                <FiMinus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </button>
                              <span className="text-xs sm:text-sm font-bold text-gray-700 w-5 sm:w-6 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.id, qty + 1)}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#fe8a24] hover:bg-[#ff9d47] text-white flex items-center justify-center transition-colors"
                              >
                                <FiPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors"
                              >
                                <FiTrash2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddItem(item)}
                              className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 py-1 sm:py-1.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-lg text-[10px] sm:text-xs font-semibold transition-colors flex-shrink-0"
                            >
                              <FiPlus className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {t('add')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {selectedItems.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-2 sm:p-3">
          <p className="text-[10px] sm:text-xs font-semibold text-green-700 mb-1.5 sm:mb-2">{t('selectedItems')}:</p>
          <div className="flex flex-wrap gap-1 sm:gap-1.5">
            {selectedItems.map((si) => (
              <span key={si.id} className="inline-flex items-center gap-0.5 sm:gap-1 bg-white border border-green-200 rounded-full px-1.5 sm:px-2.5 py-0.5 sm:py-1 text-[8px] sm:text-xs font-medium text-gray-700">
                <span className="truncate max-w-[60px] sm:max-w-none">{si.name}</span>
                <span className="bg-[#fe8a24] text-white rounded-full px-1 sm:px-1.5 text-[8px] sm:text-[10px] font-bold">×{si.quantity}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN MODAL
// ─────────────────────────────────────────────────────────────────────────────
const CreateReservationModal = ({
  onClose,
  selectedDate,
  selectedRestaurant,
  modalMode = 'full',
  preSelectedTableId = null,
  preSelectedTableName = null,
  preSelectedTableIds = null,
  preSelectedTableNames = null,
  preSelectedCombinationId = null,
  preSelectedCombinationName = null,
  excludeReservationId = null,
  existingReservationData = null,
}) => {
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

  const isWalkIn    = modalMode === 'walkin';
  const isQuickBook = modalMode === 'quickbook';
  
  // Safely get staffRestaurantId
  let staffRestaurantId = null;
  try {
    staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  } catch (e) {
    // sessionStorage not available
  }
  const isStaff = !!staffRestaurantId;

  const [guests, setGuests]                     = useState(existingReservationData?.number_of_guests || 2);
  const [customGuests, setCustomGuests]         = useState('');
  const [showCustomGuests, setShowCustomGuests] = useState(false);
  const [saving, setSaving]                     = useState(false);
  const [error, setError]                       = useState('');
  const [toast, setToast]                       = useState(null);
  const [tableError, setTableError]             = useState('');
  const [settings, setSettings]                 = useState(null);
  const [loadingSettings, setLoadingSettings]   = useState(true);

  const [tables, setTables]                         = useState([]);
  const [selectedTableIds, setSelectedTableIds]     = useState(
    existingReservationData?.table_ids ||
    (preSelectedCombinationId ? (preSelectedTableIds || []) :
     preSelectedTableIds ? preSelectedTableIds :
     (preSelectedTableId ? [preSelectedTableId] : []))
  );
  const [combinations, setCombinations]             = useState([]);
  const [selectedCombination, setSelectedCombination] = useState(
    existingReservationData?.combination_id ? 
      { id: existingReservationData.combination_id, name: existingReservationData.combination_name, tableIds: existingReservationData.table_ids, tableNames: existingReservationData.table_names } 
      : preSelectedCombinationId ? {
          id: preSelectedCombinationId,
          name: preSelectedCombinationName || '',
          tableIds: preSelectedTableIds || [],
          tableNames: preSelectedTableNames || [],
        }
      : null
  );

  // ─── Table Availability States ──────────────────────────────────────────────
  const [tableAvailability, setTableAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailableSlots, setUnavailableSlots] = useState([]);

  const [selectedSlot, setSelectedSlot]   = useState(null);
  const [step, setStep]                   = useState(1);
  const [showTimeSlots, setShowTimeSlots] = useState(true);
  const [isTimeManuallyChanged, setIsTimeManuallyChanged] = useState(false);
  const [fromTime, setFromTime] = useState(() => {
    if (existingReservationData?.from_time) return existingReservationData.from_time;
    try {
      const now = new Date();
      return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    } catch (e) {
      return '12:00';
    }
  });
  const [toTime, setToTime] = useState(() => {
    if (existingReservationData?.to_time) return existingReservationData.to_time;
    try {
      const now = new Date();
      const end = new Date(now.getTime() + 60 * 60000);
      return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
    } catch (e) {
      return '13:00';
    }
  });
  const [untilClose, setUntilClose]       = useState(false);
  const sittingTime                       = 60;

  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState(
    existingReservationData?.selected_menu_items || []
  );
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showMenuSelector, setShowMenuSelector] = useState(false);

  const [formData, setFormData] = useState({
    customer_first_name:     existingReservationData?.customer_name?.split(' ')[0] || '',
    customer_last_name:      existingReservationData?.customer_name?.split(' ').slice(1).join(' ') || '',
    customer_email:          existingReservationData?.customer_email || '',
    customer_phone:          existingReservationData?.customer_phone || '',
    special_requests:        existingReservationData?.special_requests || '',
    internal_notes:          existingReservationData?.internal_notes || '',
    ServiceType_Reservation: existingReservationData?.ServiceType_Reservation || 'dine-in',
    status:                  existingReservationData?.status || 'confirmed',
    meal_status:             existingReservationData?.meal_status || (isWalkIn ? 'arrived' : ''),
    reservation_date:        existingReservationData?.reservation_date?.toDate?.() || selectedDate || new Date(),
  });

  const db = firestore;

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => { setToast(null); onClose(); }, 1800);
  };

  // ─── Check table availability ──────────────────────────────────────────────
  const checkTableAvailabilityForSlots = useCallback(async (tableIds, date, time, dur) => {
    if (!tableIds || tableIds.length === 0 || !date || !time || !dur) {
      setTableAvailability(null);
      return;
    }

    const checkDate = date || selectedDate || new Date();
    const checkTime = time || fromTime;
    const checkDuration = dur || getEffectiveDuration(guests);

    setCheckingAvailability(true);
    setTableAvailability(null);

    try {
      const col = selectedRestaurant?._collection || 'restaurants';
      const restaurantId = selectedRestaurant?.id;

      const result = await checkMultipleTablesAvailability(
        tableIds,
        checkDate,
        checkTime,
        checkDuration,
        restaurantId,
        col,
        excludeReservationId
      );

      setTableAvailability({
        available: result.available,
        conflicts: result.conflicts,
        tableIds: tableIds
      });
    } catch (error) {
      console.error('Error checking table availability:', error);
      setTableAvailability({ available: true, error: error.message });
    } finally {
      setCheckingAvailability(false);
    }
  }, [selectedDate, fromTime, guests, selectedRestaurant, excludeReservationId]);

  // ─── Check all slots for availability ──────────────────────────────────────
  const checkAllSlotsAvailability = useCallback(async (tableIds) => {
    if (!tableIds || tableIds.length === 0 || !selectedDate) {
      setUnavailableSlots([]);
      return;
    }

    const col = selectedRestaurant?._collection || 'restaurants';
    const restaurantId = selectedRestaurant?.id;
    const duration = getEffectiveDuration(guests);
    const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings?.dayIntervals?.[dayName];
    const interval = daySettings?.interval || settings?.timeSlotInterval || 30;
    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );
    const ch = selectedRestaurant?.customHours?.[0];
    const dayOpenTime = matchingHours?.openTime || ch?.openTime || '10:00';
    const dayCloseTime = matchingHours?.closeTime || ch?.closeTime || '22:00';

    if (!dayOpenTime || !dayCloseTime) return;

    const [oH, oM] = dayOpenTime.split(':').map(Number);
    const [cH, cM] = dayCloseTime.split(':').map(Number);
    const oMin = oH * 60 + oM;
    let cMin = cH * 60 + cM;
    if (cMin <= oMin) cMin += 24 * 60;

    const blocked = settings?.blockedTimeSlots?.[dayName] || [];
    const slots = [];
    for (let m = oMin; m < cMin; m += interval) {
      const actualMin = m % (24 * 60);
      const h = Math.floor(actualMin / 60);
      const min = actualMin % 60;
      const startTime = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
      if (blocked.includes(startTime)) continue;
      slots.push(startTime);
    }

    const unavailable = [];
    for (const tableId of tableIds) {
      for (const slot of slots) {
        const result = await checkTableAvailability(
          tableId,
          selectedDate,
          slot,
          duration,
          restaurantId,
          col,
          excludeReservationId
        );
        if (!result.available) {
          unavailable.push(slot);
        }
      }
    }

    setUnavailableSlots(unavailable);
  }, [selectedDate, guests, settings, selectedRestaurant, excludeReservationId]);

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const fetchAll = async () => {
      try {
        const col = selectedRestaurant._collection || 'restaurants';
        const [tabSnap, comboSnap] = await Promise.all([
          getDocs(collection(db, col, selectedRestaurant.id, 'tables')),
          getDocs(collection(db, col, selectedRestaurant.id, 'tableCombinations')),
        ]);
        const loadedTables = tabSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setTables(sortTables(loadedTables));
        setCombinations(comboSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        if (!existingReservationData) {
          if (preSelectedCombinationId) {
            setSelectedCombination({
              id: preSelectedCombinationId,
              name: preSelectedCombinationName || '',
              tableIds: preSelectedTableIds || [],
              tableNames: preSelectedTableNames || [],
            });
            setSelectedTableIds(preSelectedTableIds || []);
            if (selectedDate && fromTime && (preSelectedTableIds || []).length) {
              const duration = getEffectiveDuration(guests);
              checkTableAvailabilityForSlots(preSelectedTableIds, selectedDate, fromTime, duration);
            }
          } else if (preSelectedTableId) {
            setSelectedTableIds([preSelectedTableId]);
            if (selectedDate && fromTime) {
              const duration = getEffectiveDuration(guests);
              checkTableAvailabilityForSlots([preSelectedTableId], selectedDate, fromTime, duration);
            }
          }
        }
        if (existingReservationData?.table_ids && existingReservationData.table_ids.length > 0) {
          setSelectedTableIds(existingReservationData.table_ids);
        }
      } catch(e) { console.error(e); }
    };
    fetchAll();
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    if (!selectedRestaurant?.id) return;
    const loadMenu = async () => {
      setLoadingMenu(true);
      try {
        const col = selectedRestaurant._collection || 'restaurants';
        const [itemsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, col, selectedRestaurant.id, 'menuItems')),
          getDocs(collection(db, col, selectedRestaurant.id, 'menuCategories')),
        ]);
        
        const items = itemsSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(item => item.active !== false);
        
        const categories = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        setMenuItems(items);
        setMenuCategories(categories);
      } catch(e) { console.error('Failed to load menu:', e); }
      finally { setLoadingMenu(false); }
    };
    loadMenu();
  }, [selectedRestaurant?.id]);

  useEffect(() => {
    const load = async () => {
      if (!selectedRestaurant?.id) { setLoadingSettings(false); return; }
      setLoadingSettings(true);
      try {
        const col = selectedRestaurant._collection || 'restaurants';
        const snap = await getDoc(doc(db, col, selectedRestaurant.id, 'reservationSettings', 'config'));
        setSettings(snap.exists() ? snap.data() : { requireTableAssignment: true });
      } catch(e) { setSettings({ requireTableAssignment: true }); }
      finally { setLoadingSettings(false); }
    };
    load();
  }, [selectedRestaurant?.id]);

  // Check availability when time changes
  useEffect(() => {
    if (selectedTableIds.length > 0 && selectedDate && fromTime) {
      const duration = getEffectiveDuration(guests);
      checkTableAvailabilityForSlots(selectedTableIds, selectedDate, fromTime, duration);
    }
  }, [selectedTableIds, selectedDate, fromTime, guests]);

  // Check all slots when table selection changes
  useEffect(() => {
    if (selectedTableIds.length > 0 && selectedDate) {
      checkAllSlotsAvailability(selectedTableIds);
    } else {
      setUnavailableSlots([]);
    }
  }, [selectedTableIds, selectedDate]);

  useEffect(() => {
    if (isTimeManuallyChanged) return;
    
    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );
    const ch = matchingHours || selectedRestaurant?.customHours?.[0];
    if (!ch?.openTime || !ch?.closeTime) return;
    const [oH, oM] = ch.openTime.split(':').map(Number);
    const [cH, cM] = ch.closeTime.split(':').map(Number);
    const oMins = oH * 60 + oM, cMins = cH * 60 + cM;
    if (selectedDate) {
      const d = new Date(selectedDate);
      const slotMins = d.getHours() * 60 + d.getMinutes();
      if (slotMins >= oMins && slotMins < cMins) {
        const from = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        const endMins = Math.min(slotMins + 60, cMins);
        setFromTime(from);
        setToTime(`${String(Math.floor(endMins/60)%24).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`);
        return;
      }
    }
    const endMins = Math.min(oMins + 60, cMins);
    setFromTime(ch.openTime);
    setToTime(`${String(Math.floor(endMins/60)%24).padStart(2,'0')}:${String(endMins%60).padStart(2,'0')}`);
  }, [selectedRestaurant?.id, selectedDate, formData.reservation_date, isTimeManuallyChanged]);

  useEffect(() => {
    if (!fromTime || !toTime) {
      try {
        const now = new Date();
        const mins = now.getMinutes();
        const roundedMins = Math.ceil(mins / 30) * 30;
        now.setMinutes(roundedMins, 0, 0);
        const from = now.toTimeString().slice(0, 5);
        setFromTime(from);
        
        const end = new Date(now.getTime() + 60 * 60000);
        setToTime(end.toTimeString().slice(0, 5));
      } catch (e) {
        setFromTime('12:00');
        setToTime('13:00');
      }
    }
  }, []);

  const formatDisplayTime = (timeStr) => {
    if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return timeStr || '';
    if (settings?.use24HourFormat === false) {
      const [h, m] = timeStr.split(':').map(Number);
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${String(m).padStart(2, '0')} ${period}`;
    }
    return timeStr;
  };
  const { openTime, closeTime, maxGuests } = (() => {
    const maxFromSettings = 999;

    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings?.dayIntervals?.[dayName];

    const ch = selectedRestaurant?.customHours?.[0];

    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );

    const open  = matchingHours?.openTime  || ch?.openTime  || '10:00';
    const close = matchingHours?.closeTime || ch?.closeTime || '22:00';

    return { openTime: open, closeTime: close, maxGuests: maxFromSettings };
  })();

  const getEffectiveDuration = (guestCount) => {
    const def = settings?.defaultReservationDuration || 120;
    if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
    const match = settings.guestDurationRules.find(
      r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
    );
    return match ? match.duration : def;
  };

  const duration = getEffectiveDuration(guests);

  const addMinutes = (t, mins) => {
    const [h, m] = t.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total/60)%24).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  };

  const timeSlots = useMemo(() => {
    const dayName = (formData.reservation_date || new Date()).toLocaleDateString('en-US', { weekday: 'long' });
    const daySettings = settings?.dayIntervals?.[dayName];
    const interval = daySettings?.interval || settings?.timeSlotInterval || 30;
    const startOffset = daySettings?.startOffset || 0;
    const endOffset = daySettings?.endOffset || 0;

    const matchingHours = selectedRestaurant?.customHours?.find(slot =>
      slot.days?.some(d => d.name === dayName && !d.closed)
    );
    const ch = selectedRestaurant?.customHours?.[0];
    const dayOpenTime  = matchingHours?.openTime  || ch?.openTime  || openTime  || '10:00';
    const dayCloseTime = matchingHours?.closeTime || ch?.closeTime || closeTime || '22:00';

    if (!dayOpenTime || !dayCloseTime) return [];

    const [oH, oM] = dayOpenTime.split(':').map(Number);
    const [cH, cM] = dayCloseTime.split(':').map(Number);
    const oMin = oH * 60 + oM;
    let cMin = cH * 60 + cM;

    if (cMin <= oMin) cMin += 24 * 60;

    const maxMin = oMin + 18 * 60;
    const effOpen  = oMin + startOffset;
    const effClose = Math.min(cMin - endOffset, maxMin);

    const slots = [];
    for (let m = effOpen; m < effClose; m += interval) {
      const actualMin = m % (24 * 60);
      const h = Math.floor(actualMin / 60);
      const min = actualMin % 60;
      const startTime = `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;

      const endActual = (m + duration) % (24 * 60);
      const eH = Math.floor(endActual / 60);
      const eM = endActual % 60;
      const endTime = `${String(eH).padStart(2,'0')}:${String(eM).padStart(2,'0')}`;

      slots.push({
        label: `${startTime} – ${endTime}`,
        startH: h,
        startMin: min,
        startTime,
      });
    }

    const blocked = settings?.blockedTimeSlots?.[dayName] || [];
    
    const now = new Date();
    const resDate = formData.reservation_date || new Date();
    const isToday = resDate.toDateString() === now.toDateString();

    return slots.filter(s => {
      if (blocked.includes(s.startTime)) return false;
      if (isToday) {
        const slotDateTime = new Date(resDate);
        slotDateTime.setHours(s.startH, s.startMin, 0, 0);
        if (slotDateTime <= now) return false;
      }
      if (unavailableSlots.includes(s.startTime)) return false;
      return true;
    });
  }, [openTime, closeTime, formData.reservation_date, settings, duration, unavailableSlots, selectedRestaurant]);

  const combinedCapacity = tables.filter(t => selectedTableIds.includes(t.id)).reduce((s,t) => s+(t.maxCapacity||0), 0);
  const capacityOk = selectedTableIds.length > 0 && combinedCapacity >= guests;

  const getReservationDate = () => {
    if (isWalkIn) {
      const now = new Date();
      const [h,m] = fromTime.split(':').map(Number);
      now.setHours(h,m,0,0);
      return now;
    }
    if (modalMode === 'full') {
      const base = new Date(formData.reservation_date || selectedDate || new Date());
      if (showTimeSlots && selectedSlot) {
        base.setHours(selectedSlot.startH, selectedSlot.startMin, 0, 0);
      } else {
        const [h,m] = fromTime.split(':').map(Number);
        base.setHours(h,m,0,0);
      }
      return base;
    }
    if (selectedSlot) {
      const base = selectedDate ? new Date(selectedDate) : new Date();
      base.setHours(selectedSlot.startH, selectedSlot.startMin, 0, 0);
      return base;
    }
    return selectedDate ? new Date(selectedDate) : new Date();
  };

  const handleAddMenuItem = (item) => {
    setSelectedMenuItems(prev => {
      const existing = prev.find(si => si.id === item.id);
      if (existing) {
        return prev.map(si => si.id === item.id ? { ...si, quantity: si.quantity + 1 } : si);
      }
      return [...prev, { id: item.id, name: item.name?.en || item.name || 'Unnamed', price: item.price || 0, quantity: 1 }];
    });
  };

  const handleRemoveMenuItem = (itemId) => {
    setSelectedMenuItems(prev => prev.filter(si => si.id !== itemId));
  };

  const handleUpdateMenuItemQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      handleRemoveMenuItem(itemId);
      return;
    }
    setSelectedMenuItems(prev => 
      prev.map(si => si.id === itemId ? { ...si, quantity } : si)
    );
  };

  const getCategoryName = (catId) => {
    if (catId === 'uncategorized') return t('uncategorized');
    const cat = menuCategories.find(c => c.id === catId);
    return cat?.name?.en || cat?.name || catId || t('uncategorized');
  };

  const handleSave = async () => {
    setError(''); setTableError('');
    const name = `${formData.customer_first_name?.trim() || ''} ${formData.customer_last_name?.trim() || ''}`.trim() || (isWalkIn ? 'Walk-in Guest' : '');
    if (!isWalkIn && !formData.customer_first_name?.trim()) { setError(t('firstNameRequired')); return; }
    if (isQuickBook && !selectedSlot) { setError(t('pleaseSelectSlot')); return; }
    if (settings?.requireTableAssignment && selectedTableIds.length===0) { setTableError(t('pleaseAssignTable')); return; }

    // ─── Final availability check before saving ──────────────────────────────
    if (selectedTableIds.length > 0) {
      const checkDate = getReservationDate();
      const checkTime = selectedSlot ? `${String(selectedSlot.startH).padStart(2,'0')}:${String(selectedSlot.startMin).padStart(2,'0')}` : fromTime;
      const checkDuration = duration;

      const result = await checkMultipleTablesAvailability(
        selectedTableIds,
        checkDate,
        checkTime,
        checkDuration,
        selectedRestaurant?.id,
        selectedRestaurant?._collection || 'restaurants',
        excludeReservationId
      );

      if (!result.available) {
        const conflictMessages = result.conflicts.map(c => {
          const tableName = tables.find(t => t.id === c.tableId)?.name || c.tableId;
          return `Table "${tableName}" is already booked for this time slot (${c.conflict?.name || 'another reservation'})`;
        });
        setTableError(conflictMessages.join('; '));
        return;
      }
    }

    try {
      setSaving(true);
      let emailSettings = null;
      try {
        const col = selectedRestaurant?._collection || 'restaurants';
        const settingsSnap = await getDoc(doc(db, col, selectedRestaurant.id, 'reservationSettings', 'config'));
        if (settingsSnap.exists()) emailSettings = settingsSnap.data();
      } catch (e) { /* settings optional */ }

      if (settings?.requireTableAssignment) {
        const cap = selectedCombination ? selectedCombination.maxCapacity
          : tables.filter(t=>selectedTableIds.includes(t.id)).reduce((s,t)=>s+(t.maxCapacity||0),0);
        if (cap < guests) { setTableError(t('tableCapacityError').replace('{cap}', cap).replace('{guests}', guests)); setSaving(false); return; }
      }
      
      let currentUser = null;
      try {
        currentUser = auth.currentUser;
      } catch (e) {}
      
      if (!currentUser) {
        try {
          const { getAuth } = await import('firebase/auth');
          const authInstance = getAuth();
          currentUser = authInstance.currentUser;
        } catch (e) {}
      }
      
      if (!currentUser) throw new Error(t('notAuthenticated'));
      
      let ownerUid = currentUser.uid;
      if (isStaff) {
        if (selectedRestaurant?.Owner_ID) {
          ownerUid = selectedRestaurant.Owner_ID;
        } else {
          setError(t('ownerInfoMissing'));
          setSaving(false);
          return;
        }
      }
      
      const reservationDate = getReservationDate();
      const primaryTableId  = selectedTableIds[0];
      const primaryTable    = tables.find(t=>t.id===primaryTableId);
      
      const finalDuration = (() => {
        if (isQuickBook) return getEffectiveDuration(guests);
        if (isWalkIn) {
          const [fh, fm] = fromTime.split(':').map(Number);
          const [th, tm] = toTime.split(':').map(Number);
          const diff = (th * 60 + tm) - (fh * 60 + fm);
          return diff > 0 ? diff : sittingTime;
        }
        if (untilClose) {
          const [fh, fm] = fromTime.split(':').map(Number);
          const [th, tm] = closeTime.split(':').map(Number);
          return Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
        }
        if (modalMode === 'full' && showTimeSlots && selectedSlot) {
          return getEffectiveDuration(guests);
        }
        const [fh, fm] = fromTime.split(':').map(Number);
        const [th, tm] = toTime.split(':').map(Number);
        return Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
      })();
      
      const reservationData = {
        customer_name: name || 'Walk-in Guest',
        customer_email:    formData.customer_email.trim(),
        customer_phone:    formData.customer_phone.trim(),
        number_of_guests:  guests,
        reservation_date:  reservationDate,
        ServiceType_Reservation: formData.ServiceType_Reservation,
        status:            formData.status||'confirmed',
        special_requests:  formData.special_requests.trim(),
        internal_notes:    formData.internal_notes.trim(),
        selected_menu_items: selectedMenuItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        restaurant_owner_id: ownerUid,
        created_by_uid: currentUser.uid,
        created_by_role: isStaff ? (() => { try { return sessionStorage.getItem("staffRole") || "staff"; } catch(e) { return "staff"; } })() : "owner",
        restaurant_id:     selectedRestaurant?.id||null,
        restaurant_name:   selectedRestaurant?.name||'',
        created_at:        serverTimestamp(),
        updated_at:        serverTimestamp(),
        meal_status:       formData.meal_status||null,
        is_walkin:         isWalkIn,
        from_time: selectedSlot && (isQuickBook || (modalMode === 'full' && showTimeSlots))
          ? `${String(selectedSlot.startH).padStart(2,'0')}:${String(selectedSlot.startMin).padStart(2,'0')}`
          : fromTime,
        to_time: (() => {
          if (untilClose) return closeTime;
          if ((isQuickBook || (modalMode === 'full' && showTimeSlots)) && selectedSlot) {
            const slotDur = getEffectiveDuration(guests);
            const totalMins = selectedSlot.startH * 60 + selectedSlot.startMin + slotDur;
            const h = Math.floor(totalMins / 60) % 24;
            const m = totalMins % 60;
            return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
          }
          return toTime;
        })(),
        duration_minutes:  finalDuration,
        ...(selectedCombination ? {
          combination_id: selectedCombination.id, combination_name: selectedCombination.name,
          table_ids: selectedCombination.tableIds, table_names: selectedCombination.tableNames,
          table_id: selectedCombination.tableIds[0], table_name: selectedCombination.tableNames[0],
        } : {
          table_id: primaryTableId, table_name: primaryTable?.name||'',
          table_ids: selectedTableIds, table_names: tables.filter(t=>selectedTableIds.includes(t.id)).map(t=>t.name),
        }),
        coupon_confirmed: false,
        reservation_completed_points_awarded: false,
        restaurant_collection: selectedRestaurant?._collection||'restaurants',
      };
      await addDoc(collection(db,'reservations'), reservationData);
      const colName = selectedRestaurant?._collection||'restaurants';
      await Promise.all(selectedTableIds.map(tid=>
        updateDoc(doc(db,colName,selectedRestaurant.id,'tables',tid),{
          current_status:'reserved', reserved_by:reservationData.customer_name,
          reserved_date:reservationDate, reserved_guests:guests,
          reserved_duration_minutes:finalDuration, reserved_source:isWalkIn?'walkin':'dashboard',
          updated_at:serverTimestamp(),
        }).catch(e=>console.warn('Table update failed:',tid,e))
      ));
      if (!isWalkIn && formData.customer_email?.trim()) {
        try {
          const { getFunctions, httpsCallable } = await import('firebase/functions');
          const sendEmailFn = httpsCallable(getFunctions(undefined, 'asia-southeast1'), 'sendEmail');
          const resDateFormatted = reservationDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const resTimeFormatted = reservationDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          const tableName = selectedCombination
            ? selectedCombination.name
            : tables.filter(t => selectedTableIds.includes(t.id)).map(t => t.name).join(' + ') || '—';
          
          const menuItemsHtml = selectedMenuItems.length > 0 ? `
            <div style="margin-top:16px;padding:12px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
              <p style="margin:0 0 8px;font-weight:bold;color:#1e293b;font-size:13px;">🍽️ ${t('preSelectedMenuItems')}</p>
              <ul style="margin:0;padding:0;list-style:none;">
                ${selectedMenuItems.map(item => `
                  <li style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#334155;">
                    <span>${item.name} ×${item.quantity}</span>
                    <span style="font-weight:600;color:#fe8a24;">${(parseFloat(item.price) * item.quantity).toFixed(0)},-</span>
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : '';

          await sendEmailFn({
            to: formData.customer_email.trim(),
            subject: `${t('reservationConfirmed')} ${selectedRestaurant?.name || 'Restaurant'}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#fe8a24;">${t('yourReservationConfirmed')} 🎉</h2>
                <p>Hi ${formData.customer_first_name?.trim() || 'there'},</p>
                <p>${t('yourBookingAt')} <strong>${selectedRestaurant?.name || 'Restaurant'}</strong> ${t('hasBeenConfirmed')}</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px 0;color:#888;">${t('date')}</td><td><strong>${resDateFormatted}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('time')}</td><td><strong>${resTimeFormatted}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('guests')}</td><td><strong>${guests}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('table')}</td><td><strong>${tableName}</strong></td></tr>
                  ${formData.special_requests?.trim() ? `<tr><td style="padding:8px 0;color:#888;">${t('specialRequests')}</td><td>${formData.special_requests}</td></tr>` : ''}
                </table>
                ${menuItemsHtml}
                ${(settings?.contactEmail || settings?.contactPhone) ? `
                  <div style="margin-top:24px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:8px;">
                    <p style="margin:0 0 8px;font-weight:bold;color:#fe8a24;font-size:13px;">📞 ${t('restaurantContact')}</p>
                    ${settings?.contactEmail ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">✉️ <a href="mailto:${settings.contactEmail}" style="color:#fe8a24;">${settings.contactEmail}</a></p>` : ''}
                    ${settings?.contactPhone ? `<p style="margin:0;font-size:13px;color:#555;">📱 <a href="tel:${settings.contactPhone}" style="color:#fe8a24;">${settings.contactPhone}</a></p>` : ''}
                  </div>
                ` : ''}
                <p style="color:#888;font-size:12px;margin-top:24px;">
                  ${t('ifNeedChanges')}
                </p>
              </div>
            `,
          }).catch(e => console.warn('Email failed:', e));
        } catch (emailErr) {
          console.error('❌ Confirmation email failed:', emailErr?.message || emailErr);
        }
      }

      showToast(t('reservationCreated'));
    } catch(err) { setError(t('saveFailed') + err.message); }
    finally { setSaving(false); }
  };

  const now = new Date();
  const walkInEnd = new Date(now.getTime() + sittingTime*60000);
  const walkInLabel = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} – ${String(walkInEnd.getHours()).padStart(2,'0')}:${String(walkInEnd.getMinutes()).padStart(2,'0')}`;

  const headerBg = isWalkIn ? 'from-gray-700 to-gray-800' : isQuickBook ? 'from-[#fe8a24] to-[#ff6b1a]' : 'from-[#1e293b] to-[#0f172a]';
  const modeLabel = isWalkIn ? t('walkIn') : isQuickBook ? t('quickBook') : t('createReservation');

  const ManualTimePicker = (
    <>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="bg-gray-50 border-2 border-gray-100 rounded-xl px-2 sm:px-4 py-1.5 sm:py-3 focus-within:border-[#fe8a24] transition-colors">
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-semibold uppercase mb-0.5 sm:mb-1">{t('from')}</p>
          <input
            type="time"
            value={fromTime}
            onChange={e => {
              const val = e.target.value;
              setIsTimeManuallyChanged(true);
              setFromTime(val);
              
              if (val && !untilClose) {
                const [h, m] = val.split(':').map(Number);
                let endMins = h * 60 + m + sittingTime;
                if (endMins >= 24 * 60) {
                  endMins = endMins - 24 * 60;
                }
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                const endStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
                setToTime(endStr);
              }
              
              if (modalMode === 'full' && val) {
                const [h, m] = val.split(':').map(Number);
                const nd = new Date(formData.reservation_date || new Date());
                nd.setHours(h, m, 0, 0);
                setFormData(p => ({ ...p, reservation_date: nd }));
              }
            }}
            step="1800"
            className="text-xs sm:text-sm font-bold text-gray-800 focus:outline-none w-full bg-transparent"
          />
        </div>
        <div className={`bg-gray-50 border-2 rounded-xl px-2 sm:px-4 py-1.5 sm:py-3 transition-colors ${untilClose ? 'opacity-50 border-gray-100' : 'border-gray-100 focus-within:border-[#fe8a24]'}`}>
          <p className="text-[8px] sm:text-[10px] text-gray-400 font-semibold uppercase mb-0.5 sm:mb-1">{t('to')}</p>
          <input
            type="time"
            value={untilClose ? closeTime : toTime}
            disabled={untilClose}
            onChange={e => {
              const val = e.target.value;
              if (val) {
                setIsTimeManuallyChanged(true);
                setToTime(val);
              }
            }}
            step="1800"
            className="text-xs sm:text-sm font-bold text-gray-800 focus:outline-none w-full bg-transparent disabled:text-gray-400"
          />
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1.5 sm:mt-2">
        <button
          type="button"
          onClick={() => {
            setIsTimeManuallyChanged(true);
            const now = new Date();
            const mins = now.getMinutes();
            const roundedMins = Math.ceil(mins / 30) * 30;
            now.setMinutes(roundedMins, 0, 0);
            const time = now.toTimeString().slice(0, 5);
            setFromTime(time);
            if (!untilClose) {
              const [fh, fm] = time.split(':').map(Number);
              let endMins = fh * 60 + fm + sittingTime;
              if (endMins >= 24 * 60) {
                endMins = endMins - 24 * 60;
              }
              const endH = Math.floor(endMins / 60);
              const endM = endMins % 60;
              setToTime(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`);
            }
          }}
          className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
        >
          {t('now')}
        </button>
        {openTime && (
          <button
            type="button"
            onClick={() => {
              setIsTimeManuallyChanged(true);
              setFromTime(openTime);
              if (!untilClose) {
                const [fh, fm] = openTime.split(':').map(Number);
                let endMins = fh * 60 + fm + sittingTime;
                if (endMins >= 24 * 60) {
                  endMins = endMins - 24 * 60;
                }
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                setToTime(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`);
              }
            }}
            className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          >
            {t('open')} ({openTime})
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-1 sm:gap-1.5 mt-1">
        {[30, 45, 60, 75, 90, 120].map(duration => (
          <button
            key={duration}
            type="button"
            onClick={() => {
              if (fromTime && !untilClose) {
                setIsTimeManuallyChanged(true);
                const [fh, fm] = fromTime.split(':').map(Number);
                let endMins = fh * 60 + fm + duration;
                if (endMins >= 24 * 60) {
                  endMins = endMins - 24 * 60;
                }
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                setToTime(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`);
              }
            }}
            className="px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
          >
            {duration}m
          </button>
        ))}
      </div>
      
      <label className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2 cursor-pointer">
        <input type="checkbox" checked={untilClose}
          onChange={e => { 
            setUntilClose(e.target.checked); 
            if (e.target.checked) {
              setToTime(closeTime);
            } else {
              if (fromTime) {
                const [fh, fm] = fromTime.split(':').map(Number);
                let endMins = fh * 60 + fm + sittingTime;
                if (endMins >= 24 * 60) {
                  endMins = endMins - 24 * 60;
                }
                const endH = Math.floor(endMins / 60);
                const endM = endMins % 60;
                setToTime(`${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`);
              }
            }
          }}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 accent-[#fe8a24]" />
        <span className="text-[10px] sm:text-sm text-gray-500">{t('untilClose')} <span className="text-gray-300">({closeTime})</span></span>
      </label>
      
      <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm bg-blue-50 border border-blue-200 rounded-xl px-2 sm:px-4 py-1.5 sm:py-2.5">
        <span className="font-semibold text-blue-700">{t('selected')}:</span>
        <span className="font-mono font-bold text-gray-800">{fromTime || '--:--'}</span>
        <span className="text-gray-400">→</span>
        <span className="font-mono font-bold text-gray-800">{untilClose ? closeTime : (toTime || '--:--')}</span>
        {!untilClose && fromTime && toTime && (() => {
          const [th, tm] = toTime.split(':').map(Number);
          const [ffh, ffm] = fromTime.split(':').map(Number);
          let dur = (th * 60 + tm) - (ffh * 60 + ffm);
          if (dur < 0) dur += 24 * 60;
          return dur > 0 ? <span className="text-[10px] sm:text-xs text-gray-400 ml-0.5 sm:ml-1">({dur} min)</span> : null;
        })()}
        {untilClose && <span className="text-[10px] sm:text-xs text-[#fe8a24] font-semibold ml-0.5 sm:ml-1">({t('untilClose')})</span>}
      </div>
    </>
  );

  const sessionButtons = (
    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
      {['dine-in','takeaway','delivery'].map(svcType => (
        <button key={svcType} type="button"
          onClick={() => setFormData(p=>({...p,ServiceType_Reservation:svcType}))}
          className={`py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-semibold border-2 transition-all capitalize ${
            formData.ServiceType_Reservation===svcType
              ? 'border-[#fe8a24] bg-orange-50 text-[#fe8a24]'
              : 'border-gray-200 text-gray-500 hover:border-[#fe8a24]'
          }`}>
          {svcType === 'dine-in' ? '🍽 ' + t('dineIn') : svcType === 'takeaway' ? '🥡 ' + t('takeaway') : '🛵 ' + t('delivery')}
        </button>
      ))}
    </div>
  );

  const tableSelectorProps = {
    tables, combinations, selectedTableIds, selectedCombination,
    setSelectedTableIds, setSelectedCombination, setTableError,
    tableError, guests, combinedCapacity, capacityOk, preSelectedTableId,
    tableAvailability, checkingAvailability, checkTableAvailabilityForSlots,
    selectedDate, fromTime, duration, excludeReservationId, t,
  };

  const timeSlotProps = {
    loadingSettings, timeSlots, selectedSlot, setSelectedSlot, openTime, closeTime,
    unavailableSlots, tableAvailability, t,
  };

  const guestPickerProps = {
    guests, setGuests, maxGuests, showCustomGuests, setShowCustomGuests, customGuests, setCustomGuests, t,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      {toast && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2.5 sm:py-4 rounded-2xl shadow-2xl bg-green-500 text-white font-semibold text-[10px] sm:text-sm max-w-[90vw]">
          ✅ {toast}
        </div>
      )}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={e => {
          if (document.activeElement?.type === 'date' || document.activeElement?.type === 'time') {
            document.activeElement.blur();
            return;
          }
          onClose();
        }}
      />

      <div className={`relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[92vh] flex flex-col ${modalMode==='full' ? 'max-w-4xl' : 'max-w-lg'}`}>

        {/* Header */}
        <div className={`bg-gradient-to-r ${headerBg} px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2 flex-shrink-0`}>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm sm:text-base">
              {existingReservationData ? t('editBooking') : modeLabel}
            </p>
            {isWalkIn && <p className="text-white/60 text-[10px] sm:text-xs mt-0.5 truncate">{walkInLabel}</p>}
            {preSelectedTableName && <p className="text-white/70 text-[10px] sm:text-xs mt-0.5">🪑 {t('preSelectedTable').replace('{name}', preSelectedTableName)}</p>}
            {selectedRestaurant?.customHours?.[0] && <p className="text-white/50 text-[10px] sm:text-xs mt-0.5 hidden sm:block">{t('hours')}: {openTime} – {closeTime}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 sm:p-2 hover:bg-white/15 rounded-full transition-colors text-white/70 hover:text-white flex-shrink-0">
            <FiX className="w-4 h-4 sm:w-5 sm:h-5"/>
          </button>
        </div>

        {/* Step indicator */}
        {isQuickBook && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
            <StepPill step={1} current={step} label={t('timeTable')} t={t}/>
            <div className="flex-1 h-px bg-gray-200 min-w-[20px]"/>
            <StepPill step={2} current={step} label={t('guestDetails')} t={t}/>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-2.5 sm:p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-[10px] sm:text-sm font-medium">
              ⚠ {error}
            </div>
          )}

          {/* ══ WALK-IN ══ */}
          {isWalkIn && (
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">

              {/* 1. Guests */}
              <div>
                <GuestPicker {...guestPickerProps} />
              </div>

              {/* 2. Sitting Time */}
              <div>
                <p className={labelCls}><FiClock className="inline w-3 h-3 mr-1"/>{t('sittingTime')}</p>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[15, 30, 45, 60, 75, 90, 105, 120, 135, 150].map(mins => {
                    const [fh, fm] = fromTime.split(':').map(Number);
                    const endMins = fh * 60 + fm + mins;
                    const endH = Math.floor(endMins / 60) % 24;
                    const endM = endMins % 60;
                    const endStr = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
                    const currentDuration = (() => {
                      const [th, tm] = toTime.split(':').map(Number);
                      const [ffh, ffm] = fromTime.split(':').map(Number);
                      return (th * 60 + tm) - (ffh * 60 + ffm);
                    })();
                    const isSelected = currentDuration === mins;
                    return (
                      <button key={mins} type="button"
                        onClick={() => { setIsTimeManuallyChanged(true); setToTime(endStr); }}
                        className={`px-2 sm:px-3 h-8 sm:h-11 rounded-xl text-[10px] sm:text-sm font-bold transition-all ${
                          isSelected
                            ? 'bg-[#fe8a24] text-white shadow-md scale-105'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}>
                        {mins}
                      </button>
                    );
                  })}
                  <button type="button"
                    onClick={() => setUntilClose(u => !u)}
                    className={`px-2 sm:px-3 h-8 sm:h-11 rounded-xl text-[10px] sm:text-sm font-bold transition-all ${
                      untilClose ? 'bg-[#fe8a24] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    +
                  </button>
                </div>
                <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm text-gray-500">
                  <span className="font-mono font-semibold text-gray-700">{fromTime}</span>
                  <span>→</span>
                  <span className="font-mono font-semibold text-gray-700">{untilClose ? closeTime : toTime}</span>
                  {!untilClose && (() => {
                    const [th, tm] = toTime.split(':').map(Number);
                    const [ffh, ffm] = fromTime.split(':').map(Number);
                    const dur = (th * 60 + tm) - (ffh * 60 + ffm);
                    return dur > 0 ? <span className="text-[10px] sm:text-xs text-gray-400">({dur} min)</span> : null;
                  })()}
                  {untilClose && <span className="text-[10px] sm:text-xs text-[#fe8a24] font-semibold">{t('untilClose')}</span>}
                </div>
              </div>

              {/* 3. Session */}
              <div>
                <p className={labelCls}>{t('session')}</p>
                {sessionButtons}
              </div>

              {/* 4. Table */}
              <TableSelector {...tableSelectorProps}/>

              {/* 5. Public Notes */}
              <div>
                <label className={labelCls}>
                  <FiGlobe className="inline w-3 h-3 mr-1"/>{t('publicNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('visibleToCustomer')}</span>
                </label>
                <textarea 
                  value={formData.special_requests}
                  onChange={e => setFormData(p => ({...p, special_requests: e.target.value}))}
                  rows="2"
                  className={inputCls + ' resize-none'} 
                  placeholder={t('publicNotesPlaceholder')}
                />
              </div>

              {/* 6. Party Menu */}
              {menuItems.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMenuSelector(!showMenuSelector)}
                    className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-semibold text-[#fe8a24] hover:text-[#ff9d47] transition-colors"
                  >
                    {showMenuSelector ? <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /> : <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {showMenuSelector ? t('hidePartyMenu') : '🍽️ ' + t('partyMenu')}
                    {selectedMenuItems.length > 0 && (
                      <span className="text-[10px] sm:text-xs bg-[#fe8a24] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                        {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('items')}
                      </span>
                    )}
                  </button>
                  {showMenuSelector && (
                    <div className="mt-2 sm:mt-3">
                      {loadingMenu ? (
                        <div className="flex items-center justify-center py-6 sm:py-8">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <MenuItemSelector 
                          menuItems={menuItems}
                          selectedItems={selectedMenuItems}
                          guests={guests}
                          onAddItem={handleAddMenuItem}
                          onRemoveItem={handleRemoveMenuItem}
                          onUpdateQuantity={handleUpdateMenuItemQuantity}
                          getCategoryName={getCategoryName}
                          t={t}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 7. Internal Notes */}
              <div>
                <label className={labelCls}>
                  <FiLock className="inline w-3 h-3 mr-1"/>{t('internalNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('staffOnly')}</span>
                </label>
                <textarea 
                  value={formData.internal_notes}
                  onChange={e => setFormData(p => ({...p, internal_notes: e.target.value}))}
                  rows="2"
                  className={inputCls + ' resize-none'} 
                  placeholder={t('internalNotesPlaceholder')}
                />
              </div>

            </div>
          )}

          {/* ══ QUICK BOOK STEP 1 ══ */}
          {isQuickBook && step === 1 && (
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">

              <GuestPicker {...guestPickerProps} />

              <TimeSlotGrid {...timeSlotProps} />

              <TableSelector {...tableSelectorProps} />

              {menuItems.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMenuSelector(!showMenuSelector)}
                    className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-semibold text-[#fe8a24] hover:text-[#ff9d47] transition-colors"
                  >
                    {showMenuSelector
                      ? <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      : <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {showMenuSelector ? t('hidePartyMenu') : '🍽️ ' + t('partyMenu')}
                    {selectedMenuItems.length > 0 && (
                      <span className="text-[10px] sm:text-xs bg-[#fe8a24] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                        {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('items')}
                      </span>
                    )}
                  </button>
                  {showMenuSelector && (
                    <div className="mt-2 sm:mt-3">
                      {loadingMenu ? (
                        <div className="flex items-center justify-center py-6 sm:py-8">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <MenuItemSelector
                          menuItems={menuItems}
                          selectedItems={selectedMenuItems}
                          guests={guests}
                          onAddItem={handleAddMenuItem}
                          onRemoveItem={handleRemoveMenuItem}
                          onUpdateQuantity={handleUpdateMenuItemQuantity}
                          getCategoryName={getCategoryName}
                          t={t}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {/* ══ QUICK BOOK STEP 2 ══ */}
          {isQuickBook && step===2 && (
            <div className="p-3 sm:p-6 space-y-4 sm:space-y-5">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <span className="flex items-center gap-1 sm:gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                  <FiUsers className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> {guests} {t('guests')}
                </span>
                {selectedSlot && (
                  <span className="flex items-center gap-1 sm:gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                    <FiClock className="w-2.5 h-2.5 sm:w-3 sm:h-3"/> {selectedSlot.label}
                  </span>
                )}
                {selectedTableIds.length > 0 && (
                  <span className="flex items-center gap-1 sm:gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                    🪑 {tables.filter(t=>selectedTableIds.includes(t.id)).map(t=>t.name).join(' + ')}
                  </span>
                )}
                {selectedMenuItems.length > 0 && (
                  <span className="flex items-center gap-1 sm:gap-1.5 bg-green-50 border border-green-200 text-green-700 text-[10px] sm:text-xs font-semibold px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
                    🍽️ {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('menuItems')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}><FiUser className="inline w-3 h-3 mr-1"/>{t('firstName')} *</label>
                  <input type="text" value={formData.customer_first_name}
                    onChange={e=>setFormData(p=>({...p,customer_first_name:e.target.value}))}
                    className={inputCls} placeholder={t('firstNamePlaceholder')}/>
                </div>
                <div>
                  <label className={labelCls}>{t('lastName')}</label>
                  <input type="text" value={formData.customer_last_name}
                    onChange={e=>setFormData(p=>({...p,customer_last_name:e.target.value}))}
                    className={inputCls} placeholder={t('lastNamePlaceholder')}/>
                </div>
              </div>
              <div>
                <label className={labelCls}><FiPhone className="inline w-3 h-3 mr-1"/>{t('phone')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('optional')}</span></label>
                <input type="tel" value={formData.customer_phone}
                  onChange={e=>setFormData(p=>({...p,customer_phone:e.target.value}))}
                  className={inputCls} placeholder={t('phonePlaceholder')}/>
              </div>
              <div>
                <label className={labelCls}><FiMail className="inline w-3 h-3 mr-1"/>{t('email')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('optional')}</span></label>
                <input type="email" value={formData.customer_email}
                  onChange={e=>setFormData(p=>({...p,customer_email:e.target.value}))}
                  className={inputCls} placeholder={t('emailPlaceholder')}/>
              </div>
              
              <div>
                <label className={labelCls}>
                  <FiGlobe className="inline w-3 h-3 mr-1"/>{t('publicNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('visibleToCustomer')}</span>
                </label>
                <textarea 
                  value={formData.special_requests}
                  onChange={e=>setFormData(p=>({...p,special_requests:e.target.value}))}
                  rows="2" 
                  className={inputCls+' resize-none'} 
                  placeholder={t('publicNotesPlaceholder')}
                />
              </div>

              {menuItems.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMenuSelector(!showMenuSelector)}
                    className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-semibold text-[#fe8a24] hover:text-[#ff9d47] transition-colors"
                  >
                    {showMenuSelector ? <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /> : <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                    {showMenuSelector ? t('hidePartyMenu') : '🍽️ ' + t('partyMenu')}
                    {selectedMenuItems.length > 0 && (
                      <span className="text-[10px] sm:text-xs bg-[#fe8a24] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                        {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('items')}
                      </span>
                    )}
                  </button>
                  {showMenuSelector && (
                    <div className="mt-2 sm:mt-3">
                      {loadingMenu ? (
                        <div className="flex items-center justify-center py-6 sm:py-8">
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        <MenuItemSelector 
                          menuItems={menuItems}
                          selectedItems={selectedMenuItems}
                          guests={guests}
                          onAddItem={handleAddMenuItem}
                          onRemoveItem={handleRemoveMenuItem}
                          onUpdateQuantity={handleUpdateMenuItemQuantity}
                          getCategoryName={getCategoryName}
                          t={t}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className={labelCls}>
                  <FiLock className="inline w-3 h-3 mr-1"/>{t('internalNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('staffOnly')}</span>
                </label>
                <textarea 
                  value={formData.internal_notes}
                  onChange={e=>setFormData(p=>({...p,internal_notes:e.target.value}))}
                  rows="2" 
                  className={inputCls+' resize-none'} 
                  placeholder={t('internalNotesPlaceholder')}
                />
              </div>

              <div>
                <p className={labelCls}>{t('service')}</p>
                {sessionButtons}
              </div>
            </div>
          )}

          {/* ══ FULL CREATE ══ */}
          {modalMode==='full' && (
            <div className="p-3 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

                {/* Left: Customer Information + Public Notes + Party Menu + Internal Notes */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider pb-2 border-b-2 border-[#fe8a24]/30">
                    👤 {t('customerInformation')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}><FiUser className="inline w-3 h-3 mr-1"/>{t('firstName')} *</label>
                      <input type="text" value={formData.customer_first_name}
                        onChange={e=>setFormData(p=>({...p,customer_first_name:e.target.value}))}
                        className={inputCls} placeholder={t('firstNamePlaceholder')}/>
                    </div>
                    <div>
                      <label className={labelCls}>{t('lastName')}</label>
                      <input type="text" value={formData.customer_last_name}
                        onChange={e=>setFormData(p=>({...p,customer_last_name:e.target.value}))}
                        className={inputCls} placeholder={t('lastNamePlaceholder')}/>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}><FiPhone className="inline w-3 h-3 mr-1"/>{t('phone')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('optional')}</span></label>
                    <input type="tel" value={formData.customer_phone}
                      onChange={e=>setFormData(p=>({...p,customer_phone:e.target.value}))}
                      className={inputCls} placeholder={t('phonePlaceholder')}/>
                  </div>
                  <div>
                    <label className={labelCls}><FiMail className="inline w-3 h-3 mr-1"/>{t('email')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('optional')}</span></label>
                    <input type="email" value={formData.customer_email}
                      onChange={e=>setFormData(p=>({...p,customer_email:e.target.value}))}
                      className={inputCls} placeholder={t('emailPlaceholder')}/>
                  </div>
                  
                  <div>
                    <label className={labelCls}>
                      <FiGlobe className="inline w-3 h-3 mr-1"/>{t('publicNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('visibleToCustomer')}</span>
                    </label>
                    <textarea 
                      value={formData.special_requests}
                      onChange={e=>setFormData(p=>({...p,special_requests:e.target.value}))}
                      rows="3" 
                      className={inputCls+' resize-none'} 
                      placeholder={t('publicNotesPlaceholder')}
                    />
                  </div>

                  {menuItems.length > 0 && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowMenuSelector(!showMenuSelector)}
                        className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm font-semibold text-[#fe8a24] hover:text-[#ff9d47] transition-colors"
                      >
                        {showMenuSelector ? <FiChevronDown className="w-3 h-3 sm:w-4 sm:h-4" /> : <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />}
                        {showMenuSelector ? t('hidePartyMenu') : '🍽️ ' + t('partyMenu')}
                        {selectedMenuItems.length > 0 && (
                          <span className="text-[10px] sm:text-xs bg-[#fe8a24] text-white px-1.5 sm:px-2 py-0.5 rounded-full">
                            {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('items')}
                          </span>
                        )}
                      </button>
                      {showMenuSelector && (
                        <div className="mt-2 sm:mt-3">
                          {loadingMenu ? (
                            <div className="flex items-center justify-center py-6 sm:py-8">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : (
                            <MenuItemSelector 
                              menuItems={menuItems}
                              selectedItems={selectedMenuItems}
                              guests={guests}
                              onAddItem={handleAddMenuItem}
                              onRemoveItem={handleRemoveMenuItem}
                              onUpdateQuantity={handleUpdateMenuItemQuantity}
                              getCategoryName={getCategoryName}
                              t={t}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className={labelCls}>
                      <FiLock className="inline w-3 h-3 mr-1"/>{t('internalNotes')} <span className="text-gray-300 normal-case font-normal text-[10px] sm:text-xs">{t('staffOnly')}</span>
                    </label>
                    <textarea 
                      value={formData.internal_notes}
                      onChange={e=>setFormData(p=>({...p,internal_notes:e.target.value}))}
                      rows="3" 
                      className={inputCls+' resize-none'} 
                      placeholder={t('internalNotesPlaceholder')}
                    />
                  </div>
                </div>

                {/* Right: Reservation Details */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider pb-2 border-b-2 border-[#fe8a24]/30">
                    📅 {t('reservationDetails')}
                  </h4>

                  <div>
                    <label className={labelCls}>{t('date')} *</label>
                    <div className="flex gap-2 items-center">
                      {/* Month */}
                      <select
                        value={getReservationDate().getMonth() + 1}
                        onChange={e => {
                          const nd = new Date(formData.reservation_date || new Date());
                          nd.setMonth(parseInt(e.target.value) - 1);
                          setFormData(p => ({ ...p, reservation_date: nd }));
                        }}
                        className={inputCls + ' flex-[2]'}
                      >
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      {/* Day */}
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={getReservationDate().getDate()}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!val || val < 1 || val > 31) return;
                          const nd = new Date(formData.reservation_date || new Date());
                          nd.setDate(val);
                          setFormData(p => ({ ...p, reservation_date: nd }));
                        }}
                        className={inputCls + ' flex-1 text-center'}
                        placeholder="DD"
                      />
                      {/* Year */}
                      <input
                        type="number"
                        min="2024"
                        max="2099"
                        value={getReservationDate().getFullYear()}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          if (!val || val < 2024) return;
                          const nd = new Date(formData.reservation_date || new Date());
                          nd.setFullYear(val);
                          setFormData(p => ({ ...p, reservation_date: nd }));
                        }}
                        className={inputCls + ' flex-[1.2] text-center'}
                        placeholder="YYYY"
                      />
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}><FiClock className="inline w-3 h-3 mr-1"/>{t('time')} *</label>
                    <div className="flex bg-gray-100 rounded-xl p-0.5 sm:p-1 mb-2 sm:mb-3 gap-0.5 sm:gap-1">
                      {[t('manualEntry'), t('selectSlot')].map((lbl,i)=>(
                        <button key={lbl} type="button" onClick={()=>setShowTimeSlots(i===1)}
                          className={`flex-1 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold rounded-lg transition-all ${(showTimeSlots?i===1:i===0)?'bg-white text-[#fe8a24] shadow-sm':'text-gray-500'}`}>
                          {lbl}
                        </button>
                      ))}
                    </div>
                    {!showTimeSlots ? ManualTimePicker : <TimeSlotGrid {...timeSlotProps} compact/>}
                  </div>

                  <div>
                    <label className={labelCls}><FiUsers className="inline w-3 h-3 mr-1"/>{t('guests')} *</label>
                    <input
                      type="number"
                      value={guests}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '') {
                          setGuests('');
                          return;
                        }
                        const parsed = parseInt(val, 10);
                        if (!isNaN(parsed)) setGuests(parsed);
                      }}
                      onBlur={e => {
                        const parsed = parseInt(e.target.value, 10);
                        if (e.target.value === '' || isNaN(parsed) || parsed < 1) {
                          setGuests(1);
                        }
                      }}
                      min="1" max={maxGuests} className={inputCls}/>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>{t('status')}</label>
                      <select value={formData.status} onChange={e=>setFormData(p=>({...p,status:e.target.value}))} className={inputCls}>
                        <option value="pending">{t('pending')}</option>
                        <option value="confirmed">{t('confirmed')}</option>
                        <option value="completed">{t('completed')}</option>
                        <option value="cancelled">{t('cancelled')}</option>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls}>{t('service')}</label>
                      <select value={formData.ServiceType_Reservation} onChange={e=>setFormData(p=>({...p,ServiceType_Reservation:e.target.value}))} className={inputCls}>
                        <option value="dine-in">{t('dineIn')}</option>
                        <option value="takeaway">{t('takeaway')}</option>
                        <option value="delivery">{t('delivery')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelCls}>{t('mealStatus')}</label>
                    <select value={formData.meal_status||''} onChange={e=>setFormData(p=>({...p,meal_status:e.target.value}))} className={inputCls}>
                      <option value="">{t('notSet')}</option>
                      <option value="arrived">🔴 {t('arrived')}</option>
                      <option value="food_delivered">🔵 {t('foodDelivered')}</option>
                      <option value="dessert">🟣 {t('dessert')}</option>
                      <option value="bill_delivered">🟡 {t('billDelivered')}</option>
                      <option value="table_cleared">🟢 {t('tableCleared')}</option>
                      <option value="no_show">⚫ {t('noShow')}</option>
                      <option value="clear_out">⚪ {t('clearOut')}</option>
                    </select>
                    {formData.meal_status && (() => { const mc=getMealStatusConfig(formData.meal_status, t); return mc ? (
                      <div className="mt-1 sm:mt-1.5 flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-medium" style={{backgroundColor:mc.color+'18',color:mc.color}}>
                        {mc.icon} {mc.label}
                      </div>
                    ) : null; })()}
                  </div>

                  <TableSelector {...tableSelectorProps}/>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-2 sm:gap-0 flex-shrink-0">
          <div className="text-[10px] sm:text-xs text-gray-400 flex flex-wrap items-center gap-1.5 sm:gap-3">
            {selectedTableIds.length > 0 && (
              <span className="text-[#fe8a24] font-semibold flex items-center gap-1">
                🪑 {sortTables(tables.filter(t=>selectedTableIds.includes(t.id))).map(t=>t.name).join(' + ')}
              </span>
            )}
            {selectedMenuItems.length > 0 && (
              <span className="text-green-600 font-semibold flex items-center gap-1">
                🍽️ {selectedMenuItems.reduce((sum, i) => sum + i.quantity, 0)} {t('menuItems')}
              </span>
            )}
            {tableAvailability && tableAvailability.available === false && (
              <span className="text-amber-500 font-medium flex items-center gap-1">
                <FiAlertCircle className="w-3 h-3" /> {t('someTablesUnavailable')}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {isQuickBook && step===2 && (
              <button onClick={()=>setStep(1)}
                className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-[10px] sm:text-sm font-semibold hover:bg-white transition-colors">
                <FiArrowLeft className="w-3 h-3 sm:w-4 sm:h-4"/> {t('back')}
              </button>
            )}
            <button onClick={onClose}
              className="px-3 sm:px-4 py-1.5 sm:py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl text-[10px] sm:text-sm font-semibold hover:bg-white transition-colors">
              {t('cancel')}
            </button>
            {(isWalkIn || modalMode==='full') ? (
              <button 
                onClick={handleSave} 
                disabled={saving || (tableAvailability && tableAvailability.available === false)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all shadow-sm ${
                  saving || (tableAvailability && tableAvailability.available === false)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#fe8a24] hover:bg-[#ff9d47] text-white'
                }`}
              >
                <FiSave className="w-3 h-3 sm:w-4 sm:h-4"/>
                {saving ? t('saving') : isWalkIn ? t('saveWalkIn') : (existingReservationData ? t('updateReservation') : t('createReservationBtn'))}
              </button>
            ) : isQuickBook && step===1 ? (
              <button
                onClick={()=>{
                  if(!selectedSlot){setError(t('pleaseSelectSlot'));return;}
                  if(selectedTableIds.length===0){setTableError(t('pleaseAssignTable'));return;}
                  if(tableAvailability && tableAvailability.available === false){setTableError(t('tableNotAvailable'));return;}
                  setError('');setTableError('');setStep(2);
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all shadow-sm ${
                  selectedSlot && selectedTableIds.length > 0 && tableAvailability?.available !== false
                    ? 'bg-[#fe8a24] text-white hover:bg-[#ff9d47]'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                disabled={!selectedSlot || selectedTableIds.length === 0 || tableAvailability?.available === false}
              >
                {t('next')} <FiChevronRight className="w-3 h-3 sm:w-4 sm:h-4"/>
              </button>
            ) : (
              <button 
                onClick={handleSave} 
                disabled={saving || (tableAvailability && tableAvailability.available === false)}
                className={`flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl text-[10px] sm:text-sm font-bold transition-all shadow-sm ${
                  saving || (tableAvailability && tableAvailability.available === false)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-[#fe8a24] hover:bg-[#ff9d47] text-white'
                }`}
              >
                <FiCheck className="w-3 h-3 sm:w-4 sm:h-4"/>
                {saving ? t('confirming') : t('confirmBooking')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateReservationModal;