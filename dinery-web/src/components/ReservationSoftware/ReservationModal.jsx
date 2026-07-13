// src/components/reservation-software/ReservationModal.jsx
import React, { useState, useEffect } from 'react';
import { doc, updateDoc, deleteDoc, serverTimestamp, collection, getDocs, getDoc, setDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from '../../firebase';
import { 
  FiX, FiTrash2, FiSave, FiUser, FiPhone, FiMail, FiClock, FiUsers, 
  FiLock, FiGlobe, FiPlus, FiMinus, FiChevronDown, FiChevronRight, FiSearch 
} from 'react-icons/fi';

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    editBooking: 'Edit Booking',
    bookingId: 'Booking',
    customerInformation: 'Customer Information',
    customerName: 'Customer Name',
    email: 'Email',
    phoneNumber: 'Phone Number',
    birthday: 'Birthday',
    customerProvided: 'Customer provided',
    tableAssignment: 'Table Assignment',
    tables: 'tables',
    clickToToggle: 'Click to toggle · select multiple tables',
    fitsGuests: 'fits guests',
    tooSmall: 'too small',
    clearAll: 'Clear all',
    reservationDetails: 'Reservation Details',
    date: 'Date',
    time: 'Time (24-hour format)',
    from: 'From',
    to: 'To',
    use24Hour: 'Use 24-hour format (e.g., 14:30 for 2:30 PM)',
    numberOfGuests: 'Number of Guests',
    serviceType: 'Service Type',
    dineIn: 'Dine-In',
    takeaway: 'Takeaway',
    delivery: 'Delivery',
    status: 'Status',
    pending: 'Pending',
    confirmed: 'Confirmed',
    completed: 'Completed',
    cancelled: 'Cancelled',
    mealStatus: 'Meal Status',
    none: '— None —',
    arrived: 'Arrived',
    foodDelivered: 'Food Delivered',
    dessert: 'Dessert',
    billDelivered: 'Bill Delivered',
    tableCleared: 'Table Cleared',
    noShow: 'No Show',
    notes: 'Notes',
    publicNotes: 'Public Notes',
    visibleToCustomer: '(visible to customer)',
    internalNotes: 'Internal Notes',
    staffOnly: '(staff only)',
    partyMenu: 'Party Menu',
    editPartyMenu: 'Edit Party Menu',
    hidePartyMenu: 'Hide Party Menu',
    items: 'items',
    selectedItems: 'items selected',
    noItemsMatch: 'No items match your search',
    noMenuItemsAvailable: 'No menu items available for this party size',
    searchMenuItems: 'Search menu items…',
    allItems: 'All Items',
    allergens: 'Allergens',
    add: 'Add',
    selectedItemsLabel: 'Selected Items:',
    offerApplied: 'Offer Applied',
    confirmedLabel: 'Confirmed',
    mobile: 'Mobile',
    discount: 'Discount',
    off: 'off',
    bookingSource: 'Booking Source:',
    mobileApp: 'Mobile App',
    reservationLink: 'Reservation Link',
    deleteReservation: 'Delete',
    deleting: 'Deleting...',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    saving: 'Saving...',
    reservationSaved: 'Reservation saved successfully!',
    reservationDeleted: 'Reservation deleted successfully!',
    areYouSure: 'Are you sure you want to delete this reservation?',
    failedUpdate: 'Failed to update reservation',
    failedDelete: 'Failed to delete reservation',
    editBookingTitle: 'Edit Booking #',
    updateNotification: 'Reservation Updated –',
    pendingRequest: 'Change Request',
    approvedSuccessfully: 'Approved Successfully',
    requestRejected: 'Request Rejected',
    cancellationRequest: 'Cancellation Request',
    customerModifiedBooking: 'Customer Modified Booking',
    awaitingApproval: 'Awaiting your approval',
    requestApproved: 'The request has been approved and the customer has been notified by email.',
    requestRejectedMessage: 'The request has been rejected. Reservation remains unchanged.',
    customerUpdatedBooking: 'Customer updated their booking:',
    customerWantsToCancel: 'Customer wants to cancel:',
    customerRequested: 'Customer requested:',
    requestedNewDateTime: 'Requested new date/time:',
    approve: 'Approve',
    reject: 'Reject',
    dismiss: 'Dismiss',
    total: 'Total',
    specialRequests: 'Special requests, dietary requirements, allergies, celebrations…',
    staffNotes: 'Staff notes, VIP info, special arrangements, pre-order details…',
    table: 'Table',
    cap: 'Cap',
    newTable: 'New Table',
    walkIn: 'Walk in',
    allDay: 'All Day',
    event: 'Event',
    party: 'Party',
    viewDetails: 'View Details',
  },
  fi: {
    editBooking: 'Muokkaa varausta',
    bookingId: 'Varaus',
    customerInformation: 'Asiakastiedot',
    customerName: 'Asiakkaan nimi',
    email: 'Sähköposti',
    phoneNumber: 'Puhelinnumero',
    birthday: 'Syntymäpäivä',
    customerProvided: 'Asiakkaan ilmoittama',
    tableAssignment: 'Pöytävaraus',
    tables: 'pöytää',
    clickToToggle: 'Napsauta valitaksesi · valitse useita pöytiä',
    fitsGuests: 'sopii vieraalle',
    tooSmall: 'liian pieni',
    clearAll: 'Tyhjennä kaikki',
    reservationDetails: 'Varauksen tiedot',
    date: 'Päivä',
    time: 'Aika (24 tunnin muodossa)',
    from: 'Alkaen',
    to: 'Päättyen',
    use24Hour: 'Käytä 24 tunnin muotoa (esim. 14:30)',
    numberOfGuests: 'Vieraiden määrä',
    serviceType: 'Palvelutyyppi',
    dineIn: 'Ravintolassa',
    takeaway: 'Nouto',
    delivery: 'Kotiinkuljetus',
    status: 'Tila',
    pending: 'Odottaa',
    confirmed: 'Vahvistettu',
    completed: 'Valmis',
    cancelled: 'Peruttu',
    mealStatus: 'Aterian tila',
    none: '— Ei mitään —',
    arrived: 'Saapunut',
    foodDelivered: 'Ruoka toimitettu',
    dessert: 'Jälkiruoka',
    billDelivered: 'Lasku toimitettu',
    tableCleared: 'Pöytä tyhjennetty',
    noShow: 'Ei saapunut',
    notes: 'Muistiinpanot',
    publicNotes: 'Julkiset muistiinpanot',
    visibleToCustomer: '(näkyy asiakkaalle)',
    internalNotes: 'Sisäiset muistiinpanot',
    staffOnly: '(vain henkilökunnalle)',
    partyMenu: 'Ruokalista',
    editPartyMenu: 'Muokkaa ruokalistaa',
    hidePartyMenu: 'Piilota ruokalista',
    items: 'tuotetta',
    selectedItems: 'tuotetta valittu',
    noItemsMatch: 'Yksikään tuote ei vastaa hakua',
    noMenuItemsAvailable: 'Ruokalistan tuotteita ei ole saatavilla tälle seurueelle',
    searchMenuItems: 'Etsi ruokalistan tuotteita…',
    allItems: 'Kaikki tuotteet',
    allergens: 'Allergeenit',
    add: 'Lisää',
    selectedItemsLabel: 'Valitut tuotteet:',
    offerApplied: 'Tarjous käytössä',
    confirmedLabel: 'Vahvistettu',
    mobile: 'Mobiili',
    discount: 'Alennus',
    off: 'alennus',
    bookingSource: 'Varauksen lähde:',
    mobileApp: 'Mobiilisovellus',
    reservationLink: 'Varauslinkki',
    deleteReservation: 'Poista',
    deleting: 'Poistetaan...',
    cancel: 'Peruuta',
    saveChanges: 'Tallenna muutokset',
    saving: 'Tallennetaan...',
    reservationSaved: 'Varaus tallennettu onnistuneesti!',
    reservationDeleted: 'Varaus poistettu onnistuneesti!',
    areYouSure: 'Haluatko varmasti poistaa tämän varauksen?',
    failedUpdate: 'Varauksen päivitys epäonnistui',
    failedDelete: 'Varauksen poisto epäonnistui',
    editBookingTitle: 'Muokkaa varausta #',
    updateNotification: 'Varaus päivitetty –',
    pendingRequest: 'Muutospyyntö',
    approvedSuccessfully: 'Hyväksytty onnistuneesti',
    requestRejected: 'Pyyntö hylätty',
    cancellationRequest: 'Peruutuspäivä',
    customerModifiedBooking: 'Asiakas muokkasi varausta',
    awaitingApproval: 'Odottaa hyväksyntääsi',
    requestApproved: 'Pyyntö on hyväksytty ja asiakkaalle on lähetetty ilmoitus sähköpostitse.',
    requestRejectedMessage: 'Pyyntö on hylätty. Varaus pysyy ennallaan.',
    customerUpdatedBooking: 'Asiakas päivitti varauksensa:',
    customerWantsToCancel: 'Asiakas haluaa perua:',
    customerRequested: 'Asiakas pyysi:',
    requestedNewDateTime: 'Pyydetty uusi päivämäärä/aika:',
    approve: 'Hyväksy',
    reject: 'Hylkää',
    dismiss: 'Poista',
    total: 'Yhteensä',
    specialRequests: 'Erityistoiveet, ruokavaliot, allergiat, juhlat…',
    staffNotes: 'Henkilökunnan muistiinpanot, VIP-tiedot, erityisjärjestelyt, ennakkotilaukset…',
    table: 'Pöytä',
    cap: 'Kap.',
    newTable: 'Uusi pöytä',
    walkIn: 'Kävelylle',
    allDay: 'Koko päivä',
    event: 'Tapahtuma',
    party: 'Seurue',
    viewDetails: 'Näytä tiedot',
  },
  no: {
    editBooking: 'Rediger bestilling',
    bookingId: 'Bestilling',
    customerInformation: 'Kundeinformasjon',
    customerName: 'Kundenavn',
    email: 'E-post',
    phoneNumber: 'Telefonnummer',
    birthday: 'Bursdag',
    customerProvided: 'Kunden oppgitt',
    tableAssignment: 'Bordtildeling',
    tables: 'bord',
    clickToToggle: 'Klikk for å velge · velg flere bord',
    fitsGuests: 'passer gjester',
    tooSmall: 'for liten',
    clearAll: 'Tøm alle',
    reservationDetails: 'Bestillingsdetaljer',
    date: 'Dato',
    time: 'Tid (24-timers format)',
    from: 'Fra',
    to: 'Til',
    use24Hour: 'Bruk 24-timers format (f.eks. 14:30)',
    numberOfGuests: 'Antall gjester',
    serviceType: 'Servicetype',
    dineIn: 'Spise inne',
    takeaway: 'Takeaway',
    delivery: 'Levering',
    status: 'Status',
    pending: 'Venter',
    confirmed: 'Bekreftet',
    completed: 'Fullført',
    cancelled: 'Avbestilt',
    mealStatus: 'Måltidsstatus',
    none: '— Ingen —',
    arrived: 'Ankommet',
    foodDelivered: 'Mat levert',
    dessert: 'Dessert',
    billDelivered: 'Regning levert',
    tableCleared: 'Bord ryddet',
    noShow: 'Ikke møtt',
    notes: 'Notater',
    publicNotes: 'Offentlige notater',
    visibleToCustomer: '(synlig for kunde)',
    internalNotes: 'Interne notater',
    staffOnly: '(kun ansatte)',
    partyMenu: 'Festmeny',
    editPartyMenu: 'Rediger festmeny',
    hidePartyMenu: 'Skjul festmeny',
    items: 'elementer',
    selectedItems: 'elementer valgt',
    noItemsMatch: 'Ingen elementer samsvarer med søket',
    noMenuItemsAvailable: 'Ingen menyelementer tilgjengelig for denne gruppen',
    searchMenuItems: 'Søk i menyelementer…',
    allItems: 'Alle elementer',
    allergens: 'Allergener',
    add: 'Legg til',
    selectedItemsLabel: 'Valgte elementer:',
    offerApplied: 'Tilbud brukt',
    confirmedLabel: 'Bekreftet',
    mobile: 'Mobil',
    discount: 'Rabatt',
    off: 'av',
    bookingSource: 'Bestillingskilde:',
    mobileApp: 'Mobilapp',
    reservationLink: 'Bestillingslenke',
    deleteReservation: 'Slett',
    deleting: 'Sletter...',
    cancel: 'Avbryt',
    saveChanges: 'Lagre endringer',
    saving: 'Lagrer...',
    reservationSaved: 'Bestilling lagret!',
    reservationDeleted: 'Bestilling slettet!',
    areYouSure: 'Er du sikker på at du vil slette denne bestillingen?',
    failedUpdate: 'Kunne ikke oppdatere bestilling',
    failedDelete: 'Kunne ikke slette bestilling',
    editBookingTitle: 'Rediger bestilling #',
    updateNotification: 'Bestilling oppdatert –',
    pendingRequest: 'Endringsforespørsel',
    approvedSuccessfully: 'Godkjent',
    requestRejected: 'Forespørsel avvist',
    cancellationRequest: 'Avbestillingsforespørsel',
    customerModifiedBooking: 'Kunde endret bestilling',
    awaitingApproval: 'Venter på din godkjenning',
    requestApproved: 'Forespørselen er godkjent og kunden er varslet på e-post.',
    requestRejectedMessage: 'Forespørselen er avvist. Bestillingen forblir uendret.',
    customerUpdatedBooking: 'Kunden oppdaterte bestillingen sin:',
    customerWantsToCancel: 'Kunden vil avbestille:',
    customerRequested: 'Kunden forespurte:',
    requestedNewDateTime: 'Forespurt ny dato/tid:',
    approve: 'Godkjenn',
    reject: 'Avvis',
    dismiss: 'Lukk',
    total: 'Totalt',
    specialRequests: 'Spesielle ønsker, diettkrav, allergier, feiringer…',
    staffNotes: 'Ansattnotater, VIP-info, spesielle ordninger, forhåndsbestillinger…',
    table: 'Bord',
    cap: 'Kap.',
    newTable: 'Nytt bord',
    walkIn: 'Drop-in',
    allDay: 'Hele dagen',
    event: 'Arrangement',
    party: 'Gruppe',
    viewDetails: 'Vis detaljer',
  },
  sv: {
    editBooking: 'Redigera bokning',
    bookingId: 'Bokning',
    customerInformation: 'Kundinformation',
    customerName: 'Kundnamn',
    email: 'E-post',
    phoneNumber: 'Telefonnummer',
    birthday: 'Födelsedag',
    customerProvided: 'Kundens uppgift',
    tableAssignment: 'Bordtilldelning',
    tables: 'bord',
    clickToToggle: 'Klicka för att välja · välj flera bord',
    fitsGuests: 'passar gäster',
    tooSmall: 'för litet',
    clearAll: 'Rensa alla',
    reservationDetails: 'Bokningsdetaljer',
    date: 'Datum',
    time: 'Tid (24-timmarsformat)',
    from: 'Från',
    to: 'Till',
    use24Hour: 'Använd 24-timmarsformat (t.ex. 14:30)',
    numberOfGuests: 'Antal gäster',
    serviceType: 'Servicetyp',
    dineIn: 'Äta inne',
    takeaway: 'Takeaway',
    delivery: 'Hemleverans',
    status: 'Status',
    pending: 'Väntar',
    confirmed: 'Bekräftad',
    completed: 'Slutförd',
    cancelled: 'Avbokad',
    mealStatus: 'Måltidsstatus',
    none: '— Ingen —',
    arrived: 'Anländ',
    foodDelivered: 'Mat levererad',
    dessert: 'Efterrätt',
    billDelivered: 'Nota levererad',
    tableCleared: 'Bord rensat',
    noShow: 'Ej anländ',
    notes: 'Anteckningar',
    publicNotes: 'Offentliga anteckningar',
    visibleToCustomer: '(synlig för kund)',
    internalNotes: 'Interna anteckningar',
    staffOnly: '(endast personal)',
    partyMenu: 'Meny för sällskap',
    editPartyMenu: 'Redigera menyn',
    hidePartyMenu: 'Dölj menyn',
    items: 'artiklar',
    selectedItems: 'artiklar valda',
    noItemsMatch: 'Inga artiklar matchar sökningen',
    noMenuItemsAvailable: 'Inga menyalternativ tillgängliga för detta sällskap',
    searchMenuItems: 'Sök i menyalternativ…',
    allItems: 'Alla artiklar',
    allergens: 'Allergener',
    add: 'Lägg till',
    selectedItemsLabel: 'Valda artiklar:',
    offerApplied: 'Erbjudande använt',
    confirmedLabel: 'Bekräftad',
    mobile: 'Mobil',
    discount: 'Rabatt',
    off: 'av',
    bookingSource: 'Bokningskälla:',
    mobileApp: 'Mobilapp',
    reservationLink: 'Bokningslänk',
    deleteReservation: 'Ta bort',
    deleting: 'Tar bort...',
    cancel: 'Avbryt',
    saveChanges: 'Spara ändringar',
    saving: 'Sparar...',
    reservationSaved: 'Bokning sparad!',
    reservationDeleted: 'Bokning borttagen!',
    areYouSure: 'Är du säker på att du vill ta bort denna bokning?',
    failedUpdate: 'Kunde inte uppdatera bokningen',
    failedDelete: 'Kunde inte ta bort bokningen',
    editBookingTitle: 'Redigera bokning #',
    updateNotification: 'Bokning uppdaterad –',
    pendingRequest: 'Ändringsförfrågan',
    approvedSuccessfully: 'Godkänd',
    requestRejected: 'Förfrågan avvisad',
    cancellationRequest: 'Avbokningsförfrågan',
    customerModifiedBooking: 'Kund ändrade bokning',
    awaitingApproval: 'Väntar på ditt godkännande',
    requestApproved: 'Förfrågan har godkänts och kunden har meddelats via e-post.',
    requestRejectedMessage: 'Förfrågan har avvisats. Bokningen förblir oförändrad.',
    customerUpdatedBooking: 'Kunden uppdaterade sin bokning:',
    customerWantsToCancel: 'Kunden vill avboka:',
    customerRequested: 'Kunden begärde:',
    requestedNewDateTime: 'Begärd ny tid/datum:',
    approve: 'Godkänn',
    reject: 'Avvisa',
    dismiss: 'Stäng',
    total: 'Totalt',
    specialRequests: 'Speciella önskemål, kostkrav, allergier, firande…',
    staffNotes: 'Personalanteckningar, VIP-info, speciella arrangemang, förbeställningar…',
    table: 'Bord',
    cap: 'Kap.',
    newTable: 'Nytt bord',
    walkIn: 'Drop-in',
    allDay: 'Hela dagen',
    event: 'Evenemang',
    party: 'Sällskap',
    viewDetails: 'Visa detaljer',
  },
  de: {
    editBooking: 'Buchung bearbeiten',
    bookingId: 'Buchung',
    customerInformation: 'Kundeninformation',
    customerName: 'Kundenname',
    email: 'E-Mail',
    phoneNumber: 'Telefonnummer',
    birthday: 'Geburtstag',
    customerProvided: 'Kundenangabe',
    tableAssignment: 'Tischzuweisung',
    tables: 'Tische',
    clickToToggle: 'Klicken zum Auswählen · mehrere Tische auswählen',
    fitsGuests: 'passt Gäste',
    tooSmall: 'zu klein',
    clearAll: 'Alle löschen',
    reservationDetails: 'Buchungsdetails',
    date: 'Datum',
    time: 'Uhrzeit (24-Stunden-Format)',
    from: 'Von',
    to: 'Bis',
    use24Hour: '24-Stunden-Format verwenden (z.B. 14:30)',
    numberOfGuests: 'Anzahl Gäste',
    serviceType: 'Servicetyp',
    dineIn: 'Vor Ort',
    takeaway: 'Zum Mitnehmen',
    delivery: 'Lieferung',
    status: 'Status',
    pending: 'Ausstehend',
    confirmed: 'Bestätigt',
    completed: 'Abgeschlossen',
    cancelled: 'Storniert',
    mealStatus: 'Mahlzeitstatus',
    none: '— Keine —',
    arrived: 'Angekommen',
    foodDelivered: 'Essen geliefert',
    dessert: 'Dessert',
    billDelivered: 'Rechnung geliefert',
    tableCleared: 'Tisch geräumt',
    noShow: 'Nicht erschienen',
    notes: 'Notizen',
    publicNotes: 'Öffentliche Notizen',
    visibleToCustomer: '(für Kunden sichtbar)',
    internalNotes: 'Interne Notizen',
    staffOnly: '(nur Personal)',
    partyMenu: 'Partymenü',
    editPartyMenu: 'Partymenü bearbeiten',
    hidePartyMenu: 'Partymenü ausblenden',
    items: 'Artikel',
    selectedItems: 'Artikel ausgewählt',
    noItemsMatch: 'Keine Artikel entsprechen der Suche',
    noMenuItemsAvailable: 'Keine Menüpunkte für diese Gruppe verfügbar',
    searchMenuItems: 'Menüpunkte durchsuchen…',
    allItems: 'Alle Artikel',
    allergens: 'Allergene',
    add: 'Hinzufügen',
    selectedItemsLabel: 'Ausgewählte Artikel:',
    offerApplied: 'Angebot angewendet',
    confirmedLabel: 'Bestätigt',
    mobile: 'Mobil',
    discount: 'Rabatt',
    off: 'Rabatt',
    bookingSource: 'Buchungsquelle:',
    mobileApp: 'Mobile App',
    reservationLink: 'Buchungslink',
    deleteReservation: 'Löschen',
    deleting: 'Lösche...',
    cancel: 'Abbrechen',
    saveChanges: 'Änderungen speichern',
    saving: 'Speichere...',
    reservationSaved: 'Buchung gespeichert!',
    reservationDeleted: 'Buchung gelöscht!',
    areYouSure: 'Möchten Sie diese Buchung wirklich löschen?',
    failedUpdate: 'Buchung konnte nicht aktualisiert werden',
    failedDelete: 'Buchung konnte nicht gelöscht werden',
    editBookingTitle: 'Buchung bearbeiten #',
    updateNotification: 'Buchung aktualisiert –',
    pendingRequest: 'Änderungsanfrage',
    approvedSuccessfully: 'Erfolgreich genehmigt',
    requestRejected: 'Anfrage abgelehnt',
    cancellationRequest: 'Stornierungsanfrage',
    customerModifiedBooking: 'Kunde hat Buchung geändert',
    awaitingApproval: 'Wartet auf Ihre Genehmigung',
    requestApproved: 'Die Anfrage wurde genehmigt und der Kunde wurde per E-Mail benachrichtigt.',
    requestRejectedMessage: 'Die Anfrage wurde abgelehnt. Die Buchung bleibt unverändert.',
    customerUpdatedBooking: 'Kunde hat seine Buchung aktualisiert:',
    customerWantsToCancel: 'Kunde möchte stornieren:',
    customerRequested: 'Kunde hat angefordert:',
    requestedNewDateTime: 'Angefragtes neues Datum/Uhrzeit:',
    approve: 'Genehmigen',
    reject: 'Ablehnen',
    dismiss: 'Schließen',
    total: 'Gesamt',
    specialRequests: 'Besondere Wünsche, Ernährungseinschränkungen, Allergien, Feierlichkeiten…',
    staffNotes: 'Personalnotizen, VIP-Info, Sondervereinbarungen, Vorbestellungen…',
    table: 'Tisch',
    cap: 'Kap.',
    newTable: 'Neuer Tisch',
    walkIn: 'Laufkundschaft',
    allDay: 'Ganztägig',
    event: 'Veranstaltung',
    party: 'Gruppe',
    viewDetails: 'Details anzeigen',
  },
};

// ─── MenuItemSelector Component ───────────────────────────────────────────────
const MenuItemSelector = ({ menuItems, selectedItems, guests, onAddItem, onRemoveItem, onUpdateQuantity, getCategoryName, t }) => {
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Group items by category
  const itemsByCategory = menuItems.reduce((acc, item) => {
    const catId = item.category || 'uncategorized';
    if (!acc[catId]) acc[catId] = [];
    acc[catId].push(item);
    return acc;
  }, {});

  // Filter items based on search and guest capacity
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">🍽️ {t('partyMenu')}</p>
        {totalItems > 0 && (
          <span className="text-xs font-bold bg-[#fe8a24]/10 text-[#fe8a24] px-2.5 py-1 rounded-full">
            {totalItems} {t('items')} {t('selectedItems')}
          </span>
        )}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
        <FiSearch className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchMenuItems')}
          className="bg-transparent text-sm text-gray-700 focus:outline-none w-full"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <FiX className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Menu items grid */}
      <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
        {Object.keys(filteredItems).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">
            {searchQuery ? t('noItemsMatch') : t('noMenuItemsAvailable')}
          </p>
        ) : (
          Object.keys(filteredItems).map((catId) => {
            const items = filteredItems[catId];
            const isExpanded = expandedCategory === catId;
            const catName = getCategoryName ? getCategoryName(catId) : (catId === 'uncategorized' ? t('allItems') : catId);

            return (
              <div key={catId} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : catId)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <span className="text-xs font-semibold text-gray-700 truncate">{catName}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400">{items.length} {t('items')}</span>
                    {isExpanded ? <FiChevronDown className="w-4 h-4 text-gray-400" /> : <FiChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>
                {isExpanded && (
                  <div className="p-2 space-y-1.5">
                    {items.map((item) => {
                      const selected = isSelected(item.id);
                      const qty = getQuantity(item.id);
                      const itemName = item.name?.en || item.name || 'Unnamed';
                      const price = item.price || '0';

                      return (
                        <div
                          key={item.id}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg transition-all gap-2 ${
                            selected ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-100 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{itemName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs font-bold text-[#fe8a24]">{price},-</span>
                              {(item.minCapacity > 0 || item.maxCapacity > 0) && (
                                <span className="text-[10px] text-gray-400">
                                  👥 {item.minCapacity > 0 && item.maxCapacity > 0
                                    ? `${item.minCapacity}–${item.maxCapacity} ${t('guests')}`
                                    : item.minCapacity > 0
                                    ? `${item.minCapacity}+ ${t('guests')}`
                                    : `${t('upTo')} ${item.maxCapacity} ${t('guests')}`}
                                </span>
                              )}
                              {item.allergens?.length > 0 && (
                                <span className="text-[10px] text-amber-600">⚠️ {t('allergens')}</span>
                              )}
                            </div>
                          </div>

                          {selected ? (
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.id, qty - 1)}
                                className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 flex items-center justify-center transition-colors"
                              >
                                <FiMinus className="w-3 h-3" />
                              </button>
                              <span className="text-sm font-bold text-gray-700 w-6 text-center">{qty}</span>
                              <button
                                type="button"
                                onClick={() => onUpdateQuantity(item.id, qty + 1)}
                                className="w-7 h-7 rounded-lg bg-[#fe8a24] hover:bg-[#ff9d47] text-white flex items-center justify-center transition-colors"
                              >
                                <FiPlus className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemoveItem(item.id)}
                                className="w-7 h-7 rounded-lg bg-red-100 hover:bg-red-200 text-red-500 flex items-center justify-center transition-colors ml-1"
                              >
                                <FiTrash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onAddItem(item)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-[#fe8a24] hover:bg-[#ff9d47] text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
                            >
                              <FiPlus className="w-3 h-3" /> {t('add')}
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

      {/* Selected items summary */}
      {selectedItems.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-green-700 mb-2">{t('selectedItemsLabel')}</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map((si) => (
              <span key={si.id} className="inline-flex items-center gap-1 bg-white border border-green-200 rounded-full px-2.5 py-1 text-xs font-medium text-gray-700">
                <span className="truncate max-w-[80px] sm:max-w-none">{si.name}</span>
                <span className="bg-[#fe8a24] text-white rounded-full px-1.5 text-[10px] font-bold">×{si.quantity}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main ReservationModal Component ───────────────────────────────────────────
const ReservationModal = ({ reservation, onClose }) => {
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

  const [formData, setFormData] = useState({
      customer_name: reservation.customer_name || '',
      customer_email: reservation.customer_email || '',
      customer_phone: reservation.customer_phone || '',
      number_of_guests: reservation.number_of_guests || 2,
      reservation_date: reservation.reservation_date?.toDate?.() || new Date(),
      ServiceType_Reservation: reservation.ServiceType_Reservation || 'dine-in',
      status: reservation.status || 'pending',
      special_requests: reservation.special_requests || '',
      internal_notes: reservation.internal_notes || '',
      claimed_offer: reservation.claimed_offer || reservation.offer_name || reservation.offerName || '',
      claimed_offer_id: reservation.claimed_offer_id || reservation.offer_id || reservation.offerId || '',
      discount_percent:
        reservation.claimed_offer_discount_percent ||
        reservation.discount_percent ||
        reservation.offer_discount_percent ||
        reservation.discountPercent || 0,
      duration_minutes: reservation.duration_minutes || 75,
      from_time: reservation.from_time || '',
      to_time: reservation.to_time || '',
      source: reservation.source || '',
      meal_status: reservation.meal_status || null, 
    });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [liveReservation, setLiveReservation] = useState(reservation);

  // ── Party Menu state ──
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMenuItems, setSelectedMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);
  const [showMenuSelector, setShowMenuSelector] = useState(false);

  const refreshReservation = async () => {
    try {
      const { getDoc } = await import('firebase/firestore');
      const snap = await getDoc(doc(firestore, 'reservations', reservation.id));
      if (snap.exists()) {
        setLiveReservation({ id: snap.id, ...snap.data() });
      }
    } catch (e) {
      console.error('Failed to refresh reservation:', e);
    }
  };

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      status: liveReservation.status || prev.status,
      reservation_date: liveReservation.reservation_date?.toDate?.() || new Date(liveReservation.reservation_date) || prev.reservation_date,
      special_requests: liveReservation.special_requests || prev.special_requests || '',
      internal_notes: liveReservation.internal_notes || prev.internal_notes || '',
    }));
  }, [liveReservation]);

  // ── Load menu items and categories ──
  useEffect(() => {
    if (!reservation.restaurant_id) return;
    const loadMenu = async () => {
      setLoadingMenu(true);
      try {
        const col = reservation.restaurant_collection || 'restaurants';
        const [itemsSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(firestore, col, reservation.restaurant_id, 'menuItems')),
          getDocs(collection(firestore, col, reservation.restaurant_id, 'menuCategories')),
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
  }, [reservation.restaurant_id]);

  // ── Load existing selected menu items from reservation ──
  useEffect(() => {
    if (reservation.selected_menu_items && reservation.selected_menu_items.length > 0) {
      const items = reservation.selected_menu_items.map(item => ({
        id: item.id,
        name: item.name || 'Unnamed',
        price: item.price || 0,
        quantity: item.quantity || item.qty || 1,
      }));
      setSelectedMenuItems(items);
      setShowMenuSelector(true);
    }
  }, [reservation.selected_menu_items]);

  const [settings, setSettings] = useState(null);

  useEffect(() => {
    if (!reservation.restaurant_id) return;
    const col = reservation.restaurant_collection || 'restaurants';
    import('firebase/firestore').then(({ doc: fsDoc, getDoc }) => {
      getDoc(fsDoc(firestore, col, reservation.restaurant_id, 'reservationSettings', 'config'))
        .then(snap => { if (snap.exists()) setSettings(snap.data()); })
        .catch(e => console.warn('Could not load settings:', e));
    });
  }, [reservation.restaurant_id]);
  
  const [tables, setTables] = useState([]);
  const isMultiTable = Array.isArray(reservation.table_ids) && reservation.table_ids.length > 1;
  const [selectedTableIds, setSelectedTableIds] = useState(
    Array.isArray(reservation.table_ids) && reservation.table_ids.length > 0
      ? reservation.table_ids
      : reservation.table_id ? [reservation.table_id] : []
  );
  
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => { setToast(null); onClose(); }, 1800);
  };
  
  useEffect(() => {
    if (!reservation.restaurant_id) return;
    const collectionName = reservation.restaurant_collection || 'restaurants';
    import('firebase/firestore').then(({ collection, getDocs }) => {
      getDocs(collection(firestore, collectionName, reservation.restaurant_id, 'tables'))
        .then(snap => {
          const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(t => t.online !== false)
            .sort((a, b) => (a.name > b.name ? 1 : -1));
          setTables(data);
        })
        .catch(e => console.warn('Could not load tables:', e));
    });
  }, [reservation.restaurant_id]);
  
  const db = firestore; 
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateTimeChange = (e) => {
    const { name, value } = e.target;
    const newDate = new Date(formData.reservation_date);
    
    if (name === 'date') {
      const [year, month, day] = value.split('-');
      newDate.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else if (name === 'time') {
      const [hours, minutes] = value.split(':');
      newDate.setHours(parseInt(hours), parseInt(minutes));
    }
    
    setFormData(prev => ({
      ...prev,
      reservation_date: newDate
    }));
  };

  const getAssignedTableIds = () => {
    if (Array.isArray(reservation.table_ids) && reservation.table_ids.length > 0) {
      return reservation.table_ids;
    }
    return reservation.table_id ? [reservation.table_id] : [];
  };

  const clearAssignedTables = async () => {
    const tableIds = getAssignedTableIds();
    if (!tableIds.length || !reservation.restaurant_id) return;
    const collectionName = reservation.restaurant_collection || 'restaurants';
    await Promise.all(
      tableIds.map(tid =>
        updateDoc(doc(db, collectionName, reservation.restaurant_id, 'tables', tid), {
          current_status: null,
          reserved_by: null,
          reserved_date: null,
          reserved_guests: null,
          reserved_duration_minutes: null,
          reserved_source: null,
          updated_at: serverTimestamp(),
        }).catch(e => console.warn('Could not clear table status:', tid, e))
      )
    );
  };

  // ── Menu item handlers ──
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

  // Get category name by ID
  const getCategoryName = (catId) => {
    if (catId === 'uncategorized') return t('allItems');
    const cat = menuCategories.find(c => c.id === catId);
    return cat?.name?.en || cat?.name || catId || t('allItems');
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      console.log('💾 Saving reservation:', reservation.id);

      const reservationRef = doc(db, 'reservations', reservation.id);
      const selectedTables = tables.filter(t => selectedTableIds.includes(t.id));
      const tableFields = {
        table_id:         selectedTableIds[0] || null,
        table_name:       selectedTables[0]?.name || '',
        table_ids:        selectedTableIds,
        table_names:      selectedTables.map(t => t.name),
        combination_id:   selectedTableIds.length > 1 ? (reservation.combination_id || null) : null,
        combination_name: selectedTableIds.length > 1 ? (reservation.combination_name || null) : null,
      };

      // Format selected menu items for saving
      const formattedMenuItems = selectedMenuItems.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price || '',
        quantity: item.quantity || 1,
      }));

      await updateDoc(reservationRef, {
        ...formData,
        reservation_date: formData.reservation_date,
        from_time: formData.from_time,
        to_time: formData.to_time,
        duration_minutes: formData.duration_minutes,
        meal_status: formData.meal_status || null,
        special_requests: formData.special_requests || '',
        internal_notes: formData.internal_notes || '',
        selected_menu_items: formattedMenuItems,
        ...tableFields,
        updated_at: serverTimestamp(),
      });

const oldTableIds = reservation.table_ids?.length
        ? reservation.table_ids
        : reservation.table_id ? [reservation.table_id] : [];
      const removedIds = oldTableIds.filter(id => !selectedTableIds.includes(id));
      if (removedIds.length) {
        const col = reservation.restaurant_collection || 'restaurants';
        await Promise.all(removedIds.map(tid =>
          updateDoc(doc(db, col, reservation.restaurant_id, 'tables', tid), {
            current_status: null, reserved_by: null, reserved_date: null,
            reserved_guests: null, updated_at: serverTimestamp(),
          }).catch(() => {})
        ));
      }
      const clearedStatuses = ['cancelled', 'completed'];

      if (clearedStatuses.includes(formData.status)) {
        await clearAssignedTables();
      }
      const justCompleted = reservation.status !== 'completed' && formData.status === 'completed';
      const hasOfferCode = !!(reservation.offer_code_applied);

      if (justCompleted && hasOfferCode && reservation.restaurant_id) {
        try {
          const statsRef = doc(db, 'crm_stats', reservation.restaurant_id);
          const statsSnap = await getDoc(statsRef);
          const current = statsSnap.exists() ? (statsSnap.data().offersRedeemed || 0) : 0;
          await setDoc(statsRef, { offersRedeemed: current + 1 }, { merge: true });
        } catch (e) {
          console.warn('offersRedeemed increment failed:', e);
        }
      }
      // ── Determine if anything customer-facing actually changed ──
      const originalDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
      const newDate = formData.reservation_date;

      const dateChanged =
        originalDate.getFullYear() !== newDate.getFullYear() ||
        originalDate.getMonth() !== newDate.getMonth() ||
        originalDate.getDate() !== newDate.getDate();

      const originalFromTime = reservation.from_time || formatTimeForInput(originalDate);
      const newFromTime = formData.from_time || formatTimeForInput(newDate);
      const originalToTime = reservation.to_time || '';
      const newToTime = formData.to_time || '';

      const timeChanged = originalFromTime !== newFromTime || originalToTime !== newToTime;
      const guestsChanged = (reservation.number_of_guests || 0) !== (formData.number_of_guests || 0);

      const shouldNotifyCustomer = dateChanged || timeChanged || guestsChanged;

      // ── Notify customer of changes ──
      if (formData.customer_email?.trim() && !clearedStatuses.includes(formData.status) && shouldNotifyCustomer) {
        try {
          const sendEmailFn = httpsCallable(getFunctions(undefined, 'asia-southeast1'), 'sendEmail');
          const resDate = formData.reservation_date;
          const resDateFormatted = resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          const displayFromTime = formData.from_time || formatTimeForInput(resDate);
          const displayToTime = formData.to_time || (() => {
            const end = new Date(resDate.getTime() + (formData.duration_minutes || 75) * 60000);
            return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
          })();
          const tableNamesStr = selectedTables.map(t => t.name).join(' + ') || '—';

          await sendEmailFn({
            to: formData.customer_email.trim(),
            subject: `${t('updateNotification')} ${reservation.restaurant_name || 'Restaurant'}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h2 style="color:#22c55e;">${t('updateNotification')} ✏️</h2>
                <p>Hi ${formData.customer_name?.split(' ')[0] || 'there'},</p>
                <p>Your booking at <strong>${reservation.restaurant_name || 'Restaurant'}</strong> has been updated. Here are the current details:</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px 0;color:#888;">${t('date')}</td><td><strong>${resDateFormatted}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('time')}</td><td><strong>${displayFromTime} – ${displayToTime}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('numberOfGuests')}</td><td><strong>${formData.number_of_guests}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('table')}</td><td><strong>${tableNamesStr}</strong></td></tr>
                  <tr><td style="padding:8px 0;color:#888;">${t('status')}</td><td><strong style="text-transform:capitalize;">${formData.status}</strong></td></tr>
                  ${formData.special_requests?.trim() ? `<tr><td style="padding:8px 0;color:#888;">${t('specialRequests')}</td><td>${formData.special_requests}</td></tr>` : ''}
                </table>
                <p style="color:#888;font-size:12px;margin-top:8px;">
                  Need to change the time again, or anything else? You can manage your reservation here:
                </p>
                <a href="https://booking.dinery.ai/manage-reservation/${reservation.id}"
                  style="display:inline-block;margin-top:8px;padding:10px 20px;background:#fe8a24;color:white;text-decoration:none;border-radius:8px;font-weight:bold;font-size:13px;">
                  ${t('manageMyReservation')}
                </a>
                ${(settings?.contactEmail || settings?.contactPhone) ? `
                  <div style="margin-top:24px;padding:16px;background:#fff8f0;border:1px solid #fe8a24;border-radius:8px;">
                    <p style="margin:0 0 8px;font-weight:bold;color:#fe8a24;font-size:13px;">📞 ${t('restaurantContact')}</p>
                    ${settings?.contactEmail ? `<p style="margin:0 0 4px;font-size:13px;color:#555;">✉️ <a href="mailto:${settings.contactEmail}" style="color:#fe8a24;">${settings.contactEmail}</a></p>` : ''}
                    ${settings?.contactPhone ? `<p style="margin:0;font-size:13px;color:#555;">📱 <a href="tel:${settings.contactPhone}" style="color:#fe8a24;">${settings.contactPhone}</a></p>` : ''}
                  </div>
                ` : ''}
                <p style="color:#888;font-size:12px;margin-top:16px;">
                  ${t('questionsFeedback')} <a href="mailto:feedback@yayas.no" style="color:#fe8a24;">feedback@yayas.no</a>
                </p>
                <p style="color:#888;font-size:12px;margin-top:8px;">— ${reservation.restaurant_name || ''}</p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error('❌ Update notification email failed:', emailErr?.message || emailErr);
        }
      }

      console.log('✅ Reservation updated successfully');
      showToast(t('reservationSaved'));
    } catch (error) {
      console.error('❌ Error updating reservation:', error);
      alert(t('failedUpdate') + ': ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('areYouSure'))) {
      return;
    }

    try {
      setDeleting(true);
      console.log('🗑️ Deleting reservation:', reservation.id);

      const reservationRef = doc(db, 'reservations', reservation.id);
      await deleteDoc(reservationRef);
      await clearAssignedTables();
      console.log('✅ Reservation deleted successfully');
      showToast(t('reservationDeleted'), 'delete');
    } catch (error) {
      console.error('❌ Error deleting reservation:', error);
      alert(t('failedDelete') + ': ' + error.message);
    } finally {
      setDeleting(false);
    }
  };

  const formatDateForInput = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (date) => {
    const d = new Date(date);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const getMealStatusConfig = (mealStatus) => {
    const map = {
      'arrived':        { color: '#ef4444', label: t('arrived'), icon: '🔴' },
      'food_delivered': { color: '#3b82f6', label: t('foodDelivered'), icon: '🔵' },
      'dessert':        { color: '#8b5cf6', label: t('dessert'), icon: '🟣' },
      'bill_delivered': { color: '#eab308', label: t('billDelivered'), icon: '🟡' },
      'table_cleared':  { color: '#84cc16', label: t('tableCleared'), icon: '🟢' },
      'no_show':        { color: '#000000', label: t('noShow'), icon: '⚫' },
      'clear_out':      { color: '#6b7280', label: t('clearOut'), icon: '⚪' },
    };
    return map[mealStatus?.toLowerCase()] || null;
  };

  const getEffectiveDuration = (guestCount) => {
    const def = settings?.defaultReservationDuration || 75;
    if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
    const match = settings.guestDurationRules.find(
      r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
    );
    return match ? match.duration : def;
  };

  // Additional translations needed for email
  const emailTranslations = {
    manageMyReservation: 'Manage My Reservation',
    restaurantContact: 'Restaurant Contact',
    questionsFeedback: 'Questions or feedback? Reach us at',
    clearOut: 'Clear Out',
    upTo: 'up to',
    guests: 'guests',
    specialRequests: 'Special Requests',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-fadeIn">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 rounded-2xl shadow-2xl text-white font-semibold text-xs sm:text-sm transition-all animate-bounce-in max-w-[90vw] ${
          toast.type === 'delete' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          <span className="text-lg sm:text-xl">{toast.type === 'delete' ? '🗑️' : '✅'}</span>
          <span className="truncate">{toast.message}</span>
        </div>
      )}
      
      {/* Backdrop with touch-friendly events */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={onClose}
        onTouchEnd={(e) => {
          // Prevent accidental closing on touch
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      />
      
      {/* Modal Container - fixed height with proper scrolling */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp max-h-[95vh] flex flex-col">
        
        {/* Header - Sticky */}
        <div className="flex-shrink-0 sticky top-0 z-10 bg-gradient-to-r from-green-600 to-green-700 text-white px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-base sm:text-2xl font-bold truncate">
                {t('editBooking')} #{reservation.id.slice(0, 8)}
              </h3>
              <p className="text-green-100 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                {new Date(reservation.created_at?.toDate?.() || reservation.created_at).toLocaleString()}
              </p>
            </div>
            <button
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="text-white hover:bg-white/20 rounded-full p-1.5 sm:p-2 transition-colors flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <FiX className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* ── Pending Request Banner ── */}
          {(liveReservation.change_request || liveReservation.cancel_reason || liveReservation.modification_summary) && (
          <div className={`mb-4 sm:mb-6 rounded-2xl border-2 overflow-hidden ${
            approvalStatus === 'approved' ? 'border-green-300 bg-green-50' :
            approvalStatus === 'rejected' ? 'border-gray-300 bg-gray-50' :
            liveReservation.cancel_reason ? 'border-purple-300 bg-purple-50' :
            liveReservation.modification_summary ? 'border-blue-300 bg-blue-50' :
            'border-blue-300 bg-blue-50'
          }`}>
            <div className={`px-3 sm:px-4 py-1.5 sm:py-2 flex flex-wrap items-center gap-2 ${
              approvalStatus === 'approved' ? 'bg-green-500' :
              approvalStatus === 'rejected' ? 'bg-gray-500' :
              liveReservation.cancel_reason ? 'bg-purple-600' :
              liveReservation.modification_summary ? 'bg-blue-500' :
              'bg-blue-500'
            }`}>
              <span className="text-white text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                {approvalStatus === 'approved' ? `✅ ${t('approvedSuccessfully')}` :
                approvalStatus === 'rejected' ? `✗ ${t('requestRejected')}` :
                liveReservation.cancel_reason ? `✕ ${t('cancellationRequest')}` :
                liveReservation.modification_summary ? `✏️ ${t('customerModifiedBooking')}` :
                `! ${t('pendingRequest')}`}
              </span>
              {!approvalStatus && !liveReservation.modification_summary && (
                <span className="ml-auto text-white/70 text-[10px] sm:text-xs">{t('awaitingApproval')}</span>
              )}
              {liveReservation.modification_summary && !liveReservation.cancel_reason && (
                <span className="ml-auto text-white/70 text-[10px] sm:text-xs">
                  {liveReservation.modified_at?.toDate
                    ? liveReservation.modified_at.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              )}
            </div>
            <div className="px-3 sm:px-4 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                {approvalStatus === 'approved' ? (
                  <p className="text-xs sm:text-sm font-semibold text-green-700">
                    ✅ {t('requestApproved')}
                  </p>
                ) : approvalStatus === 'rejected' ? (
                  <p className="text-xs sm:text-sm font-semibold text-gray-600">
                    ✗ {t('requestRejectedMessage')}
                  </p>
                ) : liveReservation.modification_summary && !liveReservation.cancel_reason ? (
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">{t('customerUpdatedBooking')}</p>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                      {liveReservation.modification_summary.split(' · ').map((change, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                          {change.startsWith('Date') ? '📅' : change.startsWith('Time') ? '🕐' : change.startsWith('Guests') ? '👥' : '✏️'} {change}
                        </span>
                      ))}
                    </div>
                  <button
                    onClick={async () => {
                      try {
                        const { doc: fsDoc, updateDoc: fsUpdate } = await import('firebase/firestore');
                        await fsUpdate(fsDoc(firestore, 'reservations', reservation.id), {
                          modification_summary: null,
                          modified_at: null,
                        });
                        await refreshReservation();
                      } catch (e) {
                        console.error('Dismiss error:', e);
                      }
                    }}
                    className="mt-1.5 sm:mt-2 text-[9px] sm:text-[10px] text-gray-400 hover:text-gray-600 transition-colors">
                    {t('dismiss')}
                  </button>
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm font-semibold text-gray-800 mb-1">
                      {liveReservation.cancel_reason ? t('customerWantsToCancel') : t('customerRequested')}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 break-words">{liveReservation.change_request || liveReservation.cancel_reason}</p>
                    {liveReservation.requested_date && (
                      <p className="text-[10px] sm:text-xs text-blue-600 font-semibold mt-1">
                        📅 {t('requestedNewDateTime')} {(() => {
                          const d = liveReservation.requested_date?.toDate?.() || new Date(liveReservation.requested_date);
                          const hours = String(d.getHours()).padStart(2, '0');
                          const minutes = String(d.getMinutes()).padStart(2, '0');
                          return `${d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} ${hours}:${minutes}`;
                        })()}
                      </p>
                    )}
                  </>
                )}
              </div>
               {!approvalStatus && !liveReservation.modification_summary && !liveReservation.cancel_reason && (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    disabled={approvalStatus === 'loading'}
                    onClick={async () => {
                      try {
                        setApprovalStatus('loading');
                        const approvalUpdate = {
                          status: reservation.cancel_reason ? 'cancelled' : 'confirmed',
                          change_request: null,
                          cancel_reason: null,
                          updated_at: new Date(),
                        };
                        if (liveReservation.requested_date) {
                          const reqDate = liveReservation.requested_date?.toDate?.() || new Date(liveReservation.requested_date);
                          approvalUpdate.reservation_date = reqDate;
                          approvalUpdate.time = reqDate.toISOString();
                          approvalUpdate.requested_date = null;
                          approvalUpdate.requested_time = null;
                        }
                        await updateDoc(doc(db, 'reservations', reservation.id), approvalUpdate);
                        if (reservation.customer_email) {
                          const sendEmailFn = httpsCallable(getFunctions(), 'sendEmail');
                          const isCancel = !!liveReservation.cancel_reason;
                          const reqDate = liveReservation.requested_date?.toDate?.() || null;
                          await sendEmailFn({
                            to: reservation.customer_email,
                            subject: isCancel
                              ? `Reservation Cancelled – ${reservation.restaurant_name}`
                              : `Reservation Updated – ${reservation.restaurant_name}`,
                            html: `
                              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                                <h2 style="color:${isCancel ? '#7c3aed' : '#22c55e'};">
                                  ${isCancel ? 'Reservation Cancelled ✕' : 'Your Reservation Has Been Updated ✅'}
                                </h2>
                                <p>Hi ${reservation.customer_name?.split(' ')[0] || 'there'},</p>
                                <p>${isCancel
                                  ? `Your cancellation request for <strong>${reservation.restaurant_name}</strong> has been approved.`
                                  : `Your change request for <strong>${reservation.restaurant_name}</strong> has been approved.`
                                }</p>
                                ${reqDate && !isCancel ? `
                                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                                    <tr><td style="padding:8px 0;color:#888;">New Date</td><td style="padding:8px 0;"><strong>${reqDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></td></tr>
                                    <tr><td style="padding:8px 0;color:#888;">New Time</td><td style="padding:8px 0;"><strong>${String(reqDate.getHours()).padStart(2, '0')}:${String(reqDate.getMinutes()).padStart(2, '0')}</strong></td></tr>
                                   </table>
                                ` : ''}
                                <p style="color:#888;font-size:12px;margin-top:24px;">— ${reservation.restaurant_name}</p>
                              </div>
                            `,
                          }).catch(e => console.warn('Email failed:', e));
                        }
                        setApprovalStatus('approved');
                        await refreshReservation();
                      } catch (e) {
                        console.error('Approve error:', e);
                        setApprovalStatus(null);
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-green-500 hover:bg-green-600 transition-all disabled:opacity-50 min-h-[44px] min-w-[60px]">
                    {approvalStatus === 'loading' ? '...' : `✓ ${t('approve')}`}
                  </button>
                  <button
                    disabled={approvalStatus === 'loading'}
                    onClick={async () => {
                      try {
                        setApprovalStatus('loading');
                        await updateDoc(doc(db, 'reservations', reservation.id), {
                          change_request: null,
                          cancel_reason: null,
                          requested_date: null,
                          requested_time: null,
                          status: 'confirmed',
                          updated_at: new Date(),
                        });
                        setApprovalStatus('rejected');
                        await refreshReservation();
                      } catch (e) {
                        console.error('Reject error:', e);
                        setApprovalStatus(null);
                      }
                    }}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-all disabled:opacity-50 min-h-[44px] min-w-[60px]">
                    {approvalStatus === 'loading' ? '...' : `✗ ${t('reject')}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Customer Information */}
            <div className="space-y-3 sm:space-y-4 flex flex-col">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2">
                {t('customerInformation')}
              </h4>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <FiUser className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t('customerName')} *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <FiMail className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t('email')}
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="john@example.com"
                />
              </div>

               <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <FiPhone className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t('phoneNumber')}
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="+1 234 567 8900"
                />
              </div>

              {reservation.customer_birthday && (() => {
                const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const parts = reservation.customer_birthday.split('-');
                const monthIdx = parseInt(parts[0]) - 1;
                const day = parseInt(parts[1]);
                const display = (!isNaN(monthIdx) && !isNaN(day) && monthIdx >= 0 && monthIdx < 12)
                  ? `${MONTHS[monthIdx]} ${day}`
                  : reservation.customer_birthday;
                return (
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                      🎂 {t('birthday')}
                    </label>
                    <div className="w-full rounded-lg border-2 border-amber-200 bg-amber-50 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
                      <span className="text-xs sm:text-sm font-semibold text-amber-800 truncate">{display}</span>
                      <span className="ml-auto text-[10px] sm:text-xs text-amber-500 font-medium">{t('customerProvided')}</span>
                    </div>
                  </div>
                );
              })()}

              {tables.length > 0 && (
                <div className="flex-1">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                    {t('tableAssignment')}
                    {selectedTableIds.length > 1 && (
                      <span className="ml-2 text-[10px] sm:text-xs font-bold text-purple-600 bg-purple-100 px-1.5 sm:px-2 py-0.5 rounded-full">
                        ⛓ {selectedTableIds.length} {t('tables')}
                      </span>
                    )}
                  </label>
                  <div className="border-2 border-gray-200 rounded-xl p-2 overflow-y-auto" style={{ maxHeight: 220 }}>
                    <p className="text-[10px] sm:text-xs text-gray-400 mb-2">{t('clickToToggle')}</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                      {tables.map(t => {
                        const isSelected = selectedTableIds.includes(t.id);
                        const cap = t.maxCapacity || t.capacity || 0;
                        const guestFit = cap >= (formData.number_of_guests || 1);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTableIds(prev =>
                                prev.includes(t.id)
                                  ? prev.filter(id => id !== t.id)
                                  : [...prev, t.id]
                              );
                            }}
                            title={`${t.name} · ${t('cap')}. ${cap}`}
                            className={`relative rounded-lg px-0.5 sm:px-1 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold transition-all border-2 flex flex-col items-center gap-0.5 min-h-[44px] ${
                              isSelected
                                ? 'bg-[#fe8a24] border-[#fe8a24] text-white shadow-md scale-105'
                                : guestFit
                                ? 'bg-green-50 border-green-300 text-green-800 hover:border-green-500 hover:bg-green-100'
                                : 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-400'
                            }`}
                          >
                            <span className="leading-tight">{t.name}</span>
                            <span className={`text-[8px] sm:text-[10px] font-normal leading-tight ${isSelected ? 'text-white/80' : 'opacity-60'}`}>
                              ({cap})
                            </span>
                            {!guestFit && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-orange-400 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 pt-2 border-t border-gray-100">
                      <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-400">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 inline-block" /> {t('fitsGuests')}
                      </span>
                      <span className="flex items-center gap-1 text-[9px] sm:text-[10px] text-gray-400">
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-400 inline-block" /> {t('tooSmall')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedTableIds([])}
                        className="ml-auto text-[9px] sm:text-[10px] text-gray-400 hover:text-red-500 transition-colors min-h-[32px] min-w-[32px]"
                      >
                        {t('clearAll')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reservation Details */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2">
                {t('reservationDetails')}
              </h4>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  {t('date')} *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formatDateForInput(formData.reservation_date)}
                  onChange={handleDateTimeChange}
                  required
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <FiClock className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t('time')} *
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  {/* From */}
                <div className="w-full sm:flex-1 border-2 border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 focus-within:border-orange-500 transition-colors">
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">{t('from')}</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={formData.from_time || formatTimeForInput(formData.reservation_date)}
                    onChange={(e) => {
                        let val = e.target.value.replace(/[^0-9:]/g, '');
                        if (val.length === 2 && !val.includes(':')) val = val + ':';
                        if (/^\d{2}:\d{2}$/.test(val)) {
                          const duration = getEffectiveDuration(formData.number_of_guests || 2);
                          const [fh, fm] = val.split(':').map(Number);
                          const totalMins = fh * 60 + fm + duration;
                          const th = Math.floor(totalMins / 60) % 24;
                          const tm = totalMins % 60;
                          const newToTime = `${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}`;
                          setFormData(prev => ({
                            ...prev,
                            from_time: val,
                            to_time: newToTime,
                            duration_minutes: duration,
                          }));
                          handleDateTimeChange({ target: { name: 'time', value: val } });
                        } else {
                          setFormData(prev => ({ ...prev, from_time: val }));
                        }
                      }}
                    className="text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none w-full bg-transparent"
                  />
                </div>
                {/* To */}
                <div className="w-full sm:flex-1 border-2 border-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 focus-within:border-orange-500 transition-colors">
                  <p className="text-[10px] sm:text-xs text-gray-400 mb-0.5 sm:mb-1">{t('to')}</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="HH:MM"
                    maxLength={5}
                    value={(() => {
                      if (formData.to_time) return formData.to_time;
                      const d = new Date(formData.reservation_date);
                      const duration = formData.duration_minutes || 75;
                      const end = new Date(d.getTime() + duration * 60000);
                      return `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`;
                    })()}
                    onChange={(e) => {
                      let val = e.target.value.replace(/[^0-9:]/g, '');
                      if (val.length === 2 && !val.includes(':')) val = val + ':';
                      if (/^\d{2}:\d{2}$/.test(val)) {
                        const fromVal = formData.from_time || formatTimeForInput(formData.reservation_date);
                        const [th, tm] = val.split(':').map(Number);
                        const [fh, fm] = fromVal.split(':').map(Number);
                        const newDuration = Math.max(15, (th * 60 + tm) - (fh * 60 + fm));
                        setFormData(prev => ({ ...prev, to_time: val, duration_minutes: newDuration }));
                      } else {
                        setFormData(prev => ({ ...prev, to_time: val }));
                      }
                    }}
                    className="text-xs sm:text-sm font-semibold text-gray-800 focus:outline-none w-full bg-transparent"
                  />
                </div>
                </div>
                <p className="text-[10px] sm:text-xs text-gray-400 mt-1">{t('use24Hour')}</p>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                  <FiUsers className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  {t('numberOfGuests')} *
                </label>
               <input
                    type="number"
                    name="number_of_guests"
                    value={formData.number_of_guests}
                    onChange={(e) => {
                      const guests = parseInt(e.target.value) || 1;
                      const newDuration = getEffectiveDuration(guests);
                      const fromVal = formData.from_time;
                      let newToTime = formData.to_time;
                      if (fromVal && /^\d{2}:\d{2}$/.test(fromVal)) {
                        const [fh, fm] = fromVal.split(':').map(Number);
                        const totalMins = fh * 60 + fm + newDuration;
                        const th = Math.floor(totalMins / 60) % 24;
                        const tm = totalMins % 60;
                        newToTime = `${String(th).padStart(2,'0')}:${String(tm).padStart(2,'0')}`;
                      }
                      setFormData(prev => ({
                        ...prev,
                        number_of_guests: guests,
                        duration_minutes: newDuration,
                        to_time: newToTime,
                      }));
                    }}
                    min={1}
                    max={999}
                    required
                    className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  {t('serviceType')}
                </label>
                <select
                  name="ServiceType_Reservation"
                  value={formData.ServiceType_Reservation}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="dine-in">{t('dineIn')}</option>
                  <option value="takeaway">{t('takeaway')}</option>
                  <option value="delivery">{t('delivery')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  {t('status')}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="pending">{t('pending')}</option>
                  <option value="confirmed">{t('confirmed')}</option>
                  <option value="completed">{t('completed')}</option>
                  <option value="cancelled">{t('cancelled')}</option>
                </select>
              </div>
            </div>

            {/* Meal Status - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                {t('mealStatus')}
              </label>
              <select
                value={formData.meal_status || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, meal_status: e.target.value || null }))}
                className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors"
              >
                <option value="">{t('none')}</option>
                <option value="arrived">🔴 {t('arrived')}</option>
                <option value="food_delivered">🔵 {t('foodDelivered')}</option>
                <option value="dessert">🟣 {t('dessert')}</option>
                <option value="bill_delivered">🟡 {t('billDelivered')}</option>
                <option value="table_cleared">🟢 {t('tableCleared')}</option>
                <option value="no_show">⚫ {t('noShow')}</option>
              </select>
            </div>

            {/* Notes Section - Full Width */}
            <div className="md:col-span-2">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2 mb-3 sm:mb-4">
                {t('notes')}
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Public Notes (Special Requests) */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                    <FiGlobe className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    {t('publicNotes')} <span className="text-[10px] sm:text-xs text-gray-400 font-normal">{t('visibleToCustomer')}</span>
                  </label>
                  <textarea
                    name="special_requests"
                    value={formData.special_requests}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                    placeholder={t('specialRequests')}
                  />
                </div>

                {/* Internal Notes */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-2">
                    <FiLock className="w-4 h-4 text-purple-500 flex-shrink-0" />
                    {t('internalNotes')} <span className="text-[10px] sm:text-xs text-gray-400 font-normal">{t('staffOnly')}</span>
                  </label>
                  <textarea
                    name="internal_notes"
                    value={formData.internal_notes}
                    onChange={handleChange}
                    rows="4"
                    className="w-full rounded-lg border-2 border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 text-sm focus:outline-none focus:border-orange-500 transition-colors resize-none"
                    placeholder={t('staffNotes')}
                  />
                </div>
              </div>
            </div>

            {/* ── Party Menu Section ── */}
            <div className="md:col-span-2">
              <h4 className="text-base sm:text-lg font-semibold text-gray-900 border-b pb-2 mb-3 sm:mb-4">
                🍽️ {t('partyMenu')}
              </h4>
              
              {menuItems.length > 0 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMenuSelector(!showMenuSelector)}
                    className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-semibold text-[#fe8a24] hover:text-[#ff9d47] transition-colors min-h-[44px]"
                  >
                    {showMenuSelector ? <FiChevronDown className="w-4 h-4" /> : <FiChevronRight className="w-4 h-4" />}
                    {showMenuSelector ? t('hidePartyMenu') : t('editPartyMenu')}
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
                          guests={formData.number_of_guests || 2}
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

              {/* Selected Menu Items Display (read-only summary) */}
              {reservation.selected_menu_items?.length > 0 && (
                <div className="mt-3 bg-orange-50 border-2 border-orange-200 rounded-xl overflow-hidden">
                  <div className="divide-y divide-orange-100 max-h-48 overflow-y-auto">
                    {reservation.selected_menu_items.map((item, i) => (
                      <div key={i} className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 sm:py-2.5 gap-1">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          {item.quantity > 1 && (
                            <span className="text-[10px] sm:text-xs font-bold bg-[#fe8a24] text-white px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0">
                              ×{item.quantity}
                            </span>
                          )}
                          <span className="text-xs sm:text-sm font-semibold text-gray-800 truncate">{item.name}</span>
                        </div>
                        {item.price && (
                          <span className="text-xs sm:text-sm font-bold text-[#fe8a24] flex-shrink-0">
                            {item.quantity > 1
                              ? `${(parseFloat(item.price) * item.quantity).toFixed(0)},-`
                              : `${item.price},-`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-100 border-t border-orange-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-xs font-semibold text-orange-700">
                      {reservation.selected_menu_items.reduce((s, i) => s + (i.quantity || 1), 0)} {t('items')} {t('selectedItems')}
                    </span>
                    {reservation.selected_menu_items.some(i => i.price) && (
                      <span className="text-xs sm:text-sm font-bold text-[#fe8a24]">
                        {t('total')}: {reservation.selected_menu_items.reduce((s, i) =>
                          s + (parseFloat(i.price) || 0) * (i.quantity || 1), 0
                        ).toFixed(0)},-
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Offer Information */}
            {(formData.claimed_offer || formData.source) && (
                <div className="md:col-span-2 space-y-3">

                  {/* Source badge */}
                  {formData.source && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('bookingSource')}</span>
                      <span className={`inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${
                        formData.source === 'mobile_app'
                          ? 'bg-purple-100 text-purple-700 border border-purple-200'
                          : formData.source === 'reservation_link'
                          ? 'bg-blue-100 text-blue-700 border border-blue-200'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}>
                        {formData.source === 'mobile_app' ? t('mobileApp') :
                        formData.source === 'reservation_link' ? `🔗 ${t('reservationLink')}` :
                        formData.source}
                      </span>
                    </div>
                  )}

                 {/* Offer block */}
                {formData.claimed_offer && (
                  <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-3 sm:p-5 overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-amber-100 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
                    <div className="absolute bottom-0 left-0 w-16 h-16 sm:w-20 sm:h-20 bg-orange-100 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />

                    <div className="relative flex flex-wrap items-start gap-3 sm:gap-4">
                      <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-amber-400 rounded-xl flex items-center justify-center shadow-md">
                        <span className="text-xl sm:text-2xl">🏷️</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="font-bold text-amber-900 text-xs sm:text-sm uppercase tracking-wide">
                            {t('offerApplied')}
                          </h4>
                          {reservation.coupon_confirmed && (
                            <span className="text-[9px] sm:text-xs bg-green-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                              ✓ {t('confirmedLabel')}
                            </span>
                          )}
                          {formData.source === 'mobile_app' && (
                            <span className="text-[9px] sm:text-xs bg-purple-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full font-medium">
                              {t('mobile')}
                            </span>
                          )}
                        </div>

                        <p className="text-amber-800 font-semibold text-sm sm:text-base mb-2 sm:mb-3 break-words">
                          {formData.claimed_offer}
                        </p>

                        <div className="flex flex-wrap gap-2 sm:gap-3">
                          {formData.discount_percent > 0 && (
                            <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 shadow-sm">
                              <span className="text-amber-500 font-bold text-base sm:text-lg">%</span>
                              <div>
                                <p className="text-[9px] sm:text-xs text-gray-500 leading-none">{t('discount')}</p>
                                <p className="text-xs sm:text-sm font-bold text-gray-900">{formData.discount_percent}% {t('off')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Sticky with touch-friendly buttons */}
        <div className="flex-shrink-0 sticky bottom-0 bg-gray-50 px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={handleDelete}
            onTouchEnd={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={deleting}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm min-h-[48px] min-w-[80px]"
          >
            <FiTrash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            {deleting ? t('deleting') : t('deleteReservation')}
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              onTouchEnd={(e) => {
                e.preventDefault();
                onClose();
              }}
              className="w-full sm:w-auto px-4 sm:px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors text-sm min-h-[48px] min-w-[80px]"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              onTouchEnd={(e) => {
                e.preventDefault();
                handleSave();
              }}
              disabled={saving}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 sm:px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 text-sm min-h-[48px] min-w-[80px]"
            >
              <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
              {saving ? t('saving') : t('saveChanges')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationModal;