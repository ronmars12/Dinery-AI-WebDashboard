// src/pages/ManageReservationPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  doc, getDoc, updateDoc, addDoc, collection,
  getDocs, query, where, onSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { firestore } from '../../firebase';
import {
  FiCalendar, FiClock, FiUsers, FiMapPin,
  FiCheck, FiX, FiChevronLeft, FiChevronRight, FiEdit2,
  FiTrash2, FiArrowRight, FiHome, FiCheckCircle,
  FiAlertCircle, FiInfo, FiUser, FiMail, FiPhone, FiBookOpen,
} from 'react-icons/fi';

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // Page titles
    manageReservation: 'Manage Your Reservation',
    modifyOrCancel: 'Modify or cancel your booking',
    reservationNotFound: 'Reservation Not Found',
    invalidLinkMsg: 'This link may be invalid, expired, or the reservation has been removed.',
    // Status labels
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    completed: 'Completed',
    // Info rows
    reservationId: 'Reservation ID',
    date: 'Date',
    time: 'Time',
    guests: 'Guests',
    guest: 'guest',
    guestsPlural: 'guests',
    restaurant: 'Restaurant',
    customer: 'Customer',
    // Action buttons
    modifyReservation: 'Modify Reservation',
    changeDateTimeParty: 'Change date, time, or party size',
    cancelReservation: 'Cancel Reservation',
    cancelBooking: 'Cancel your booking',
    // Modify flow
    modifyDetails: 'Modify Details',
    partySize: 'Party Size',
    selectDate: 'Select Date',
    selectTime: 'Select Time',
    noTimeSlots: 'No time slots available',
    restaurantClosed: 'Restaurant Closed on {day}',
    reviewChanges: 'Review Changes →',
    confirmChanges: 'Confirm Changes',
    currentBooking: 'Current Booking',
    changesTo: 'Changes To',
    newBooking: 'New Booking',
    autoAssigned: '(auto-assigned)',
    checkingAvailability: 'Checking availability...',
    tableAvailable: '✓ Table available — {time} on {date}',
    slotUnavailable: 'Slot just became unavailable — go back and pick another time.',
    popularSlot: 'This time slot is popular — your table will be assigned from available tables only.',
    guestCountChanged: 'ℹ️ Guest count changed — a new table will be assigned automatically based on availability.',
    updateImmediately: 'Your reservation will be updated immediately. A confirmation email will be sent to you.',
    confirming: 'Confirming...',
    confirmModification: 'Confirm Modification',
    // Cancel flow
    cancelReservationTitle: 'Cancel Reservation',
    cancelRequestSent: 'Your cancellation request will be sent to the restaurant for confirmation.',
    reasonOptional: 'Reason for cancellation (optional)',
    keepReservation: 'Keep Reservation',
    requestCancel: 'Request Cancel',
    sending: 'Sending...',
    // Success
    requestSent: 'Request Sent!',
    reservationUpdated: 'Reservation Updated!',
    reservationUpdatedMsg: 'Your reservation has been successfully updated and confirmed!',
    reservationCancelledMsg: 'Your reservation has been cancelled. A confirmation email has been sent.',
    tableConfirmed: 'Table confirmed — {time} on {date}',
    makeAnotherChange: 'Make Another Change',
    // Status messages
    thisReservationIs: 'This reservation is {status}',
    cannotModifyOnline: 'It can no longer be modified online',
    // Days
    sunday: 'Sunday',
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    // Email
    reservationUpdatedEmail: 'Reservation Updated ✅',
    reservationUpdatedEmailBody: 'Your reservation at {restaurant} has been successfully updated.',
    reservationCancelledEmail: 'Reservation Cancelled',
    reservationCancelledEmailBody: 'Your reservation at {restaurant} has been cancelled.',
    reason: 'Reason',
    hopeToSeeAgain: 'We hope to see you again soon.',
    // Table assignment
    tableFitsGuests: '"{name}" table fits {guests} guests',
    combinedTables: 'Combined tables accommodate {guests} guests',
    comboFitsGuests: '{name} fits {guests} guests',
    noTableForGuests: 'No table for {guests} guests {maxInfo}',
    maxAvailable: '(max: {max})',
    // Manage
    manageLabel: 'MANAGE',
    // Modification summary
    dateChange: 'Date: {old} → {new}',
    timeChange: 'Time: {old} → {new}',
    guestsChange: 'Guests: {old} → {new}',
    // Remove
    remove: 'Remove',
    // Loading
    loading: 'Loading...',
  },
  fi: {
    manageReservation: 'Hallitse varaustasi',
    modifyOrCancel: 'Muokkaa tai peruuta varauksesi',
    reservationNotFound: 'Varausta ei löytynyt',
    invalidLinkMsg: 'Tämä linkki voi olla virheellinen, vanhentunut tai varaus on poistettu.',
    confirmed: 'Vahvistettu',
    pending: 'Odottaa',
    cancelled: 'Peruttu',
    completed: 'Valmis',
    reservationId: 'Varauksen tunnus',
    date: 'Päivä',
    time: 'Aika',
    guests: 'Vieraat',
    guest: 'vieras',
    guestsPlural: 'vierasta',
    restaurant: 'Ravintola',
    customer: 'Asiakas',
    modifyReservation: 'Muokkaa varausta',
    changeDateTimeParty: 'Vaihda päivämäärää, aikaa tai seurueen kokoa',
    cancelReservation: 'Peru varaus',
    cancelBooking: 'Peru varauksesi',
    modifyDetails: 'Muokkaa tietoja',
    partySize: 'Seurueen koko',
    selectDate: 'Valitse päivä',
    selectTime: 'Valitse aika',
    noTimeSlots: 'Ei vapaita aikavälejä',
    restaurantClosed: 'Ravintola suljettu {day}',
    reviewChanges: 'Tarkista muutokset →',
    confirmChanges: 'Vahvista muutokset',
    currentBooking: 'Nykyinen varaus',
    changesTo: 'Muutokset',
    newBooking: 'Uusi varaus',
    autoAssigned: '(automaattinen)',
    checkingAvailability: 'Tarkistetaan saatavuutta...',
    tableAvailable: '✓ Pöytä saatavilla — {time} {date}',
    slotUnavailable: 'Aikaväli juuri varattu — palaa takaisin ja valitse toinen aika.',
    popularSlot: 'Tämä aikaväli on suosittu — pöytäsi varataan saatavilla olevista pöydistä.',
    guestCountChanged: 'ℹ️ Vierasmäärä muuttui — uusi pöytä varataan automaattisesti saatavuuden mukaan.',
    updateImmediately: 'Varauksesi päivitetään välittömästi. Vahvistusviesti lähetetään sähköpostiisi.',
    confirming: 'Vahvistetaan...',
    confirmModification: 'Vahvista muutos',
    cancelReservationTitle: 'Peru varaus',
    cancelRequestSent: 'Peruutusesi lähetetään ravintolalle vahvistettavaksi.',
    reasonOptional: 'Syy peruutukselle (valinnainen)',
    keepReservation: 'Pidä varaus',
    requestCancel: 'Pyydä peruutusta',
    sending: 'Lähetetään...',
    requestSent: 'Pyyntö lähetetty!',
    reservationUpdated: 'Varaus päivitetty!',
    reservationUpdatedMsg: 'Varauksesi on päivitetty ja vahvistettu onnistuneesti!',
    reservationCancelledMsg: 'Varauksesi on peruttu. Vahvistusviesti on lähetetty sähköpostiisi.',
    tableConfirmed: 'Pöytä vahvistettu — {time} {date}',
    makeAnotherChange: 'Tee toinen muutos',
    thisReservationIs: 'Tämä varaus on {status}',
    cannotModifyOnline: 'Sitä ei voi enää muokata verkossa',
    sunday: 'Sunnuntai',
    monday: 'Maanantai',
    tuesday: 'Tiistai',
    wednesday: 'Keskiviikko',
    thursday: 'Torstai',
    friday: 'Perjantai',
    saturday: 'Lauantai',
    reservationUpdatedEmail: 'Varaus päivitetty ✅',
    reservationUpdatedEmailBody: 'Varauksesi ravintolaan {restaurant} on päivitetty onnistuneesti.',
    reservationCancelledEmail: 'Varaus peruttu',
    reservationCancelledEmailBody: 'Varauksesi ravintolaan {restaurant} on peruttu.',
    reason: 'Syy',
    hopeToSeeAgain: 'Toivottavasti näemme sinut pian uudelleen.',
    tableFitsGuests: '"{name}" pöytä mahtuu {guests} vierasta',
    combinedTables: 'Yhdistetyt pöydät mahtuvat {guests} vierasta',
    comboFitsGuests: '{name} mahtuu {guests} vierasta',
    noTableForGuests: 'Ei pöytää {guests} vieraalle {maxInfo}',
    maxAvailable: '(max: {max})',
    manageLabel: 'HALLINTA',
    dateChange: 'Päivä: {old} → {new}',
    timeChange: 'Aika: {old} → {new}',
    guestsChange: 'Vieraat: {old} → {new}',
    remove: 'Poista',
    loading: 'Ladataan...',
  },
  no: {
    manageReservation: 'Administrer reservasjonen din',
    modifyOrCancel: 'Endre eller avbestill bestillingen din',
    reservationNotFound: 'Reservasjon ikke funnet',
    invalidLinkMsg: 'Denne lenken kan være ugyldig, utløpt eller reservasjonen er fjernet.',
    confirmed: 'Bekreftet',
    pending: 'Venter',
    cancelled: 'Avbestilt',
    completed: 'Fullført',
    reservationId: 'Reservasjons-ID',
    date: 'Dato',
    time: 'Tid',
    guests: 'Gjester',
    guest: 'gjest',
    guestsPlural: 'gjester',
    restaurant: 'Restaurant',
    customer: 'Kunde',
    modifyReservation: 'Endre reservasjon',
    changeDateTimeParty: 'Endre dato, tid eller antall gjester',
    cancelReservation: 'Avbestill reservasjon',
    cancelBooking: 'Avbestill bestillingen din',
    modifyDetails: 'Endre detaljer',
    partySize: 'Antall gjester',
    selectDate: 'Velg dato',
    selectTime: 'Velg tid',
    noTimeSlots: 'Ingen tilgjengelige tidspor',
    restaurantClosed: 'Restauranten stengt {day}',
    reviewChanges: 'Gå gjennom endringer →',
    confirmChanges: 'Bekreft endringer',
    currentBooking: 'Nåværende bestilling',
    changesTo: 'Endringer til',
    newBooking: 'Ny bestilling',
    autoAssigned: '(automatisk tildelt)',
    checkingAvailability: 'Sjekker tilgjengelighet...',
    tableAvailable: '✓ Bord tilgjengelig — {time} {date}',
    slotUnavailable: 'Tidspunktet ble nettopp utilgjengelig — gå tilbake og velg et annet tidspunkt.',
    popularSlot: 'Dette tidspunktet er populært — bordet ditt blir tildelt fra tilgjengelige bord.',
    guestCountChanged: 'ℹ️ Antall gjester endret — et nytt bord blir automatisk tildelt basert på tilgjengelighet.',
    updateImmediately: 'Reservasjonen din blir oppdatert umiddelbart. En bekreftelse sendes til din e-post.',
    confirming: 'Bekrefter...',
    confirmModification: 'Bekreft endring',
    cancelReservationTitle: 'Avbestill reservasjon',
    cancelRequestSent: 'Avbestillingsforespørselen din blir sendt til restauranten for bekreftelse.',
    reasonOptional: 'Grunn for avbestilling (valgfritt)',
    keepReservation: 'Behold reservasjon',
    requestCancel: 'Be om avbestilling',
    sending: 'Sender...',
    requestSent: 'Forespørsel sendt!',
    reservationUpdated: 'Reservasjon oppdatert!',
    reservationUpdatedMsg: 'Reservasjonen din er oppdatert og bekreftet!',
    reservationCancelledMsg: 'Reservasjonen din er avbestilt. En bekreftelse er sendt til din e-post.',
    tableConfirmed: 'Bord bekreftet — {time} {date}',
    makeAnotherChange: 'Gjør en ny endring',
    thisReservationIs: 'Denne reservasjonen er {status}',
    cannotModifyOnline: 'Den kan ikke lenger endres online',
    sunday: 'Søndag',
    monday: 'Mandag',
    tuesday: 'Tirsdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lørdag',
    reservationUpdatedEmail: 'Reservasjon oppdatert ✅',
    reservationUpdatedEmailBody: 'Reservasjonen din hos {restaurant} er oppdatert.',
    reservationCancelledEmail: 'Reservasjon avbestilt',
    reservationCancelledEmailBody: 'Reservasjonen din hos {restaurant} er avbestilt.',
    reason: 'Grunn',
    hopeToSeeAgain: 'Vi håper å se deg igjen snart.',
    tableFitsGuests: '"{name}" bord passer {guests} gjester',
    combinedTables: 'Kombinerte bord rommer {guests} gjester',
    comboFitsGuests: '{name} passer {guests} gjester',
    noTableForGuests: 'Ingen bord for {guests} gjester {maxInfo}',
    maxAvailable: '(max: {max})',
    manageLabel: 'ADMINISTRER',
    dateChange: 'Dato: {old} → {new}',
    timeChange: 'Tid: {old} → {new}',
    guestsChange: 'Gjester: {old} → {new}',
    remove: 'Fjern',
    loading: 'Laster...',
  },
  sv: {
    manageReservation: 'Hantera din bokning',
    modifyOrCancel: 'Ändra eller avboka din bokning',
    reservationNotFound: 'Bokning hittades inte',
    invalidLinkMsg: 'Denna länk kan vara ogiltig, utgången eller bokningen har tagits bort.',
    confirmed: 'Bekräftad',
    pending: 'Väntar',
    cancelled: 'Avbokad',
    completed: 'Slutförd',
    reservationId: 'Boknings-ID',
    date: 'Datum',
    time: 'Tid',
    guests: 'Gäster',
    guest: 'gäst',
    guestsPlural: 'gäster',
    restaurant: 'Restaurang',
    customer: 'Kund',
    modifyReservation: 'Ändra bokning',
    changeDateTimeParty: 'Ändra datum, tid eller sällskapsstorlek',
    cancelReservation: 'Avboka bokning',
    cancelBooking: 'Avboka din bokning',
    modifyDetails: 'Ändra detaljer',
    partySize: 'Sällskapsstorlek',
    selectDate: 'Välj datum',
    selectTime: 'Välj tid',
    noTimeSlots: 'Inga tillgängliga tider',
    restaurantClosed: 'Restaurangen stängd {day}',
    reviewChanges: 'Granska ändringar →',
    confirmChanges: 'Bekräfta ändringar',
    currentBooking: 'Nuvarande bokning',
    changesTo: 'Ändringar till',
    newBooking: 'Ny bokning',
    autoAssigned: '(automatiskt tilldelad)',
    checkingAvailability: 'Kontrollerar tillgänglighet...',
    tableAvailable: '✓ Bord tillgängligt — {time} {date}',
    slotUnavailable: 'Tiden blev just upptagen — gå tillbaka och välj en annan tid.',
    popularSlot: 'Denna tid är populär — ditt bord kommer att tilldelas från tillgängliga bord.',
    guestCountChanged: 'ℹ️ Antal gäster ändrat — ett nytt bord kommer att tilldelas automatiskt baserat på tillgänglighet.',
    updateImmediately: 'Din bokning uppdateras omedelbart. En bekräftelse skickas till din e-post.',
    confirming: 'Bekräftar...',
    confirmModification: 'Bekräfta ändring',
    cancelReservationTitle: 'Avboka bokning',
    cancelRequestSent: 'Din avbokningsförfrågan skickas till restaurangen för bekräftelse.',
    reasonOptional: 'Anledning till avbokning (valfritt)',
    keepReservation: 'Behåll bokning',
    requestCancel: 'Begär avbokning',
    sending: 'Skickar...',
    requestSent: 'Förfrågan skickad!',
    reservationUpdated: 'Bokning uppdaterad!',
    reservationUpdatedMsg: 'Din bokning har uppdaterats och bekräftats!',
    reservationCancelledMsg: 'Din bokning har avbokats. En bekräftelse har skickats till din e-post.',
    tableConfirmed: 'Bord bekräftat — {time} {date}',
    makeAnotherChange: 'Gör en ny ändring',
    thisReservationIs: 'Denna bokning är {status}',
    cannotModifyOnline: 'Den kan inte längre ändras online',
    sunday: 'Söndag',
    monday: 'Måndag',
    tuesday: 'Tisdag',
    wednesday: 'Onsdag',
    thursday: 'Torsdag',
    friday: 'Fredag',
    saturday: 'Lördag',
    reservationUpdatedEmail: 'Bokning uppdaterad ✅',
    reservationUpdatedEmailBody: 'Din bokning hos {restaurant} har uppdaterats.',
    reservationCancelledEmail: 'Bokning avbokad',
    reservationCancelledEmailBody: 'Din bokning hos {restaurant} har avbokats.',
    reason: 'Anledning',
    hopeToSeeAgain: 'Vi hoppas att se dig igen snart.',
    tableFitsGuests: '"{name}" bord passar {guests} gäster',
    combinedTables: 'Kombinerade bord rymmer {guests} gäster',
    comboFitsGuests: '{name} passar {guests} gäster',
    noTableForGuests: 'Inget bord för {guests} gäster {maxInfo}',
    maxAvailable: '(max: {max})',
    manageLabel: 'HANTERA',
    dateChange: 'Datum: {old} → {new}',
    timeChange: 'Tid: {old} → {new}',
    guestsChange: 'Gäster: {old} → {new}',
    remove: 'Ta bort',
    loading: 'Laddar...',
  },
  de: {
    manageReservation: 'Verwalten Sie Ihre Reservierung',
    modifyOrCancel: 'Ändern oder stornieren Sie Ihre Buchung',
    reservationNotFound: 'Reservierung nicht gefunden',
    invalidLinkMsg: 'Dieser Link könnte ungültig sein, abgelaufen oder die Reservierung wurde entfernt.',
    confirmed: 'Bestätigt',
    pending: 'Ausstehend',
    cancelled: 'Storniert',
    completed: 'Abgeschlossen',
    reservationId: 'Reservierungs-ID',
    date: 'Datum',
    time: 'Uhrzeit',
    guests: 'Gäste',
    guest: 'Gast',
    guestsPlural: 'Gäste',
    restaurant: 'Restaurant',
    customer: 'Kunde',
    modifyReservation: 'Reservierung ändern',
    changeDateTimeParty: 'Datum, Uhrzeit oder Gruppengröße ändern',
    cancelReservation: 'Reservierung stornieren',
    cancelBooking: 'Ihre Buchung stornieren',
    modifyDetails: 'Details ändern',
    partySize: 'Gruppengröße',
    selectDate: 'Datum auswählen',
    selectTime: 'Uhrzeit auswählen',
    noTimeSlots: 'Keine verfügbaren Zeitslots',
    restaurantClosed: 'Restaurant geschlossen am {day}',
    reviewChanges: 'Änderungen prüfen →',
    confirmChanges: 'Änderungen bestätigen',
    currentBooking: 'Aktuelle Buchung',
    changesTo: 'Änderungen zu',
    newBooking: 'Neue Buchung',
    autoAssigned: '(automatisch zugewiesen)',
    checkingAvailability: 'Prüfe Verfügbarkeit...',
    tableAvailable: '✓ Tisch verfügbar — {time} {date}',
    slotUnavailable: 'Zeitslot wurde gerade belegt — gehen Sie zurück und wählen Sie eine andere Uhrzeit.',
    popularSlot: 'Dieser Zeitslot ist beliebt — Ihr Tisch wird aus verfügbaren Tischen zugewiesen.',
    guestCountChanged: 'ℹ️ Gästezahl geändert — ein neuer Tisch wird automatisch basierend auf der Verfügbarkeit zugewiesen.',
    updateImmediately: 'Ihre Reservierung wird sofort aktualisiert. Eine Bestätigung wird an Ihre E-Mail gesendet.',
    confirming: 'Bestätige...',
    confirmModification: 'Änderung bestätigen',
    cancelReservationTitle: 'Reservierung stornieren',
    cancelRequestSent: 'Ihre Stornierungsanfrage wird zur Bestätigung an das Restaurant gesendet.',
    reasonOptional: 'Grund für die Stornierung (optional)',
    keepReservation: 'Reservierung behalten',
    requestCancel: 'Stornierung anfordern',
    sending: 'Sende...',
    requestSent: 'Anfrage gesendet!',
    reservationUpdated: 'Reservierung aktualisiert!',
    reservationUpdatedMsg: 'Ihre Reservierung wurde erfolgreich aktualisiert und bestätigt!',
    reservationCancelledMsg: 'Ihre Reservierung wurde storniert. Eine Bestätigung wurde an Ihre E-Mail gesendet.',
    tableConfirmed: 'Tisch bestätigt — {time} {date}',
    makeAnotherChange: 'Weitere Änderung vornehmen',
    thisReservationIs: 'Diese Reservierung ist {status}',
    cannotModifyOnline: 'Sie kann nicht mehr online geändert werden',
    sunday: 'Sonntag',
    monday: 'Montag',
    tuesday: 'Dienstag',
    wednesday: 'Mittwoch',
    thursday: 'Donnerstag',
    friday: 'Freitag',
    saturday: 'Samstag',
    reservationUpdatedEmail: 'Reservierung aktualisiert ✅',
    reservationUpdatedEmailBody: 'Ihre Reservierung bei {restaurant} wurde erfolgreich aktualisiert.',
    reservationCancelledEmail: 'Reservierung storniert',
    reservationCancelledEmailBody: 'Ihre Reservierung bei {restaurant} wurde storniert.',
    reason: 'Grund',
    hopeToSeeAgain: 'Wir hoffen, Sie bald wiederzusehen.',
    tableFitsGuests: 'Tisch "{name}" passt für {guests} Gäste',
    combinedTables: 'Kombinierte Tische bieten Platz für {guests} Gäste',
    comboFitsGuests: '{name} passt für {guests} Gäste',
    noTableForGuests: 'Kein Tisch für {guests} Gäste {maxInfo}',
    maxAvailable: '(max: {max})',
    manageLabel: 'VERWALTEN',
    dateChange: 'Datum: {old} → {new}',
    timeChange: 'Uhrzeit: {old} → {new}',
    guestsChange: 'Gäste: {old} → {new}',
    remove: 'Entfernen',
    loading: 'Lade...',
  },
};

const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const getOpenDayNames = (customHours) => {
  if (!customHours?.length) return new Set(ALL_DAYS);
  const open = new Set();
  for (const slot of customHours) {
    for (const d of (slot.days || [])) { if (d.name) open.add(d.name); }
  }
  return open.size > 0 ? open : new Set(ALL_DAYS);
};

const resolveHoursForDate = (customHours, date, settings) => {
  const def = { openTime: '10:00', closeTime: '22:00', maxGuests: 20, isOpen: true, interval: 30, startOffset: 0, endOffset: 0 };
  if (!customHours?.length || !date) return def;
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  for (const slot of customHours) {
    const entry = (slot.days || []).find(d => d.name === dayName);
    if (entry) {
      const ds = settings?.dayIntervals?.[dayName];
      return {
        openTime: slot.openTime || '10:00',
        closeTime: slot.closeTime || '22:00',
        maxGuests: entry.maxGuests > 0 ? entry.maxGuests : 20,
        isOpen: true,
        interval: ds?.interval || 30,
        startOffset: ds?.startOffset || 0,
        endOffset: ds?.endOffset || 0,
      };
    }
  }
  return { ...def, maxGuests: 0, isOpen: false };
};

const generateTimeSlots = (openTime, closeTime, interval = 30) => {
  const slots = [];
  if (!openTime || !closeTime) return slots;
  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const oMin = oH * 60 + oM;
  let cMin = cH * 60 + cM;
  if (cMin <= oMin) cMin += 24 * 60;
  const maxMin = oMin + 18 * 60;
  const endMin = Math.min(cMin, maxMin);
  for (let m = oMin; m < endMin; m += interval) {
    const a = m % (24 * 60);
    const h = Math.floor(a / 60), min = a % 60;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    slots.push({ value, label: `${h12}:${String(min).padStart(2, '0')} ${ampm}` });
  }
  return slots;
};

// ─── Mini Calendar (Professional) ───────────────────────────────────────────
function MiniCalendar({ selectedDate, onDateSelect, accentColor, openDayNames, t }) {
  const [view, setView] = useState(new Date());
  const yr = view.getFullYear(), mo = view.getMonth();
  const firstDay = new Date(yr, mo, 1).getDay();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
  const cells = [];
  const firstDayMon = (firstDay + 6) % 7;
  for (let i = 0; i < firstDayMon; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(d);
  const mName = view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setView(new Date(yr, mo - 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <FiChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-semibold text-white tracking-wide">{mName}</span>
        <button
          onClick={() => setView(new Date(yr, mo + 1, 1))}
          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <FiChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-3">
        {days.map((d, i) => {
          const fullDay = ALL_DAYS[(i + 1) % 7];
          const isClosed = openDayNames && !openDayNames.has(fullDay);
          return (
            <div key={d} className="text-center">
              <span className={`text-xs font-medium ${isClosed ? 'text-white/15' : 'text-white/40'}`}>
                {d}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="aspect-square" />;
          const td = new Date(yr, mo, day); td.setHours(0, 0, 0, 0);
          const isPast = td < today;
          const dayName = ALL_DAYS[td.getDay()];
          const isClosed = openDayNames && !openDayNames.has(dayName);
          const isDisabled = isPast || isClosed;
          const isSel = selectedDate && td.toDateString() === selectedDate.toDateString();
          const isToday = td.toDateString() === today.toDateString();

          let buttonClass = "aspect-square rounded-xl text-sm font-medium transition-all duration-200 flex items-center justify-center ";
          if (isDisabled) {
            buttonClass += "cursor-not-allowed text-white/15 bg-transparent";
          } else if (isSel) {
            buttonClass += ` text-white shadow-md transform scale-105`;
          } else if (isToday) {
            buttonClass += ` text-white/90 bg-white/10 hover:bg-white/20 border border-white/20`;
          } else {
            buttonClass += ` text-white/70 hover:text-white hover:bg-white/10 bg-transparent`;
          }

          return (
            <button
              key={i}
              disabled={isDisabled}
              onClick={() => onDateSelect(td)}
              className={buttonClass}
              style={isSel ? { backgroundColor: accentColor, boxShadow: `0 4px 12px ${accentColor}40` } : {}}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────────────
function StatusBadge({ status, t }) {
  const config = {
    confirmed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: FiCheckCircle, label: t('confirmed') },
    pending: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: FiAlertCircle, label: t('pending') },
    cancelled: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', icon: FiX, label: t('cancelled') },
    completed: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', icon: FiCheck, label: t('completed') },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${c.bg} ${c.text} border ${c.border}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </div>
  );
}

// ─── Info Row ───────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value, subValue, accent }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/8 transition-all duration-200">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: accent + '22' }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="flex-1">
        <p className="text-white/40 text-[11px] font-medium uppercase tracking-wider">{label}</p>
        <p className="text-white/90 text-sm font-semibold">{value}</p>
        {subValue && <p className="text-white/30 text-xs">{subValue}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ManageReservationPage() {
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

  const { reservationId } = useParams();
  const db = firestore;
  const [reservation, setReservation] = useState(null);
  const [restaurantData, setRestaurantData] = useState(null);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [combinations, setCombinations] = useState([]);
  const [settings, setSettings] = useState(null);
  const [pageConfig, setPageConfig] = useState(null);
  const [allReservations, setAllReservations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [mode, setMode] = useState('view');

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState(2);
  const [slotAvail, setSlotAvail] = useState(null);
  const [modStep, setModStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [request, setRequest] = useState('');

  const getTableCapacityInfo = (guestCount) => {
    const matchingCombo = combinations.find(c =>
      guestCount >= (c.minCapacity || 1) && guestCount <= (c.maxCapacity || 999)
    );
    if (matchingCombo) {
      return {
        fits: true,
        type: 'combo',
        name: matchingCombo.name,
        capacity: matchingCombo.maxCapacity,
        tableNames: matchingCombo.tableNames,
      };
    }
    const eligible = restaurantTables.filter(t => {
      const maxCap = t.maxCapacity || t.capacity || 0;
      return guestCount >= (t.minCapacity || 1) && (maxCap === 0 || guestCount <= maxCap) && t.online !== false;
    });
    if (eligible.length > 0) {
      const best = eligible.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))[0];
      return { fits: true, type: 'table', name: best.name, capacity: best.maxCapacity || best.capacity };
    }
    const allTables = restaurantTables.filter(t => t.online !== false);
    const sorted = allTables.sort((a, b) => (b.maxCapacity || 0) - (a.maxCapacity || 0));
    let combined = 0, combinedNames = [];
    for (const t of sorted) {
      combined += (t.maxCapacity || t.capacity || 0);
      combinedNames.push(t.name);
      if (combined >= guestCount) {
        return { fits: true, type: 'multi', name: combinedNames.join(' + '), capacity: combined };
      }
    }
    return { fits: false, maxAvailable: combined };
  };

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'reservations', reservationId));
        if (!snap.exists()) { setNotFound(true); setLoading(false); return; }
        const res = { id: snap.id, ...snap.data() };
        setReservation(res);
        setGuests(res.number_of_guests || 2);

        const col = res.restaurant_collection || 'restaurants';
        const rSnap = await getDoc(doc(db, col, res.restaurant_id));
        if (rSnap.exists()) setRestaurantData({ id: rSnap.id, _collection: col, ...rSnap.data() });

        const tabSnap = await getDocs(collection(db, col, res.restaurant_id, 'tables'));
        setRestaurantTables(tabSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        try {
          const comboSnap = await getDocs(collection(db, col, res.restaurant_id, 'tableCombinations'));
          setCombinations(comboSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) { }

        try {
          const sSnap = await getDoc(doc(db, col, res.restaurant_id, 'reservationSettings', 'config'));
          if (sSnap.exists()) setSettings(sSnap.data());
        } catch (e) { }

        try {
          const cfgSnap = await getDoc(doc(db, col, res.restaurant_id, 'reservationConfig', 'config'));
          if (cfgSnap.exists()) setPageConfig(cfgSnap.data());
        } catch (e) { }

      } catch (e) {
        console.error(e); setNotFound(true);
      } finally { setLoading(false); }
    };
    load();
  }, [reservationId]);

  useEffect(() => {
    if (!reservation?.restaurant_id) return;
    const q = query(
      collection(db, 'reservations'),
      where('restaurant_id', '==', reservation.restaurant_id),
      where('status', 'in', ['pending', 'confirmed'])
    );
    const unsub = onSnapshot(q, snap => {
      setAllReservations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [reservation?.restaurant_id]);

  const customHours = restaurantData?.customHours || [];
  const openDayNames = getOpenDayNames(customHours);
  const resolvedHours = resolveHoursForDate(customHours, selectedDate, settings);
  const { openTime, closeTime, isOpen, interval, startOffset, endOffset } = resolvedHours;

  const [oH, oM] = openTime.split(':').map(Number);
  const [cH, cM] = closeTime.split(':').map(Number);
  const effOpenMin = oH * 60 + oM + (startOffset || 0);
  const effCloseMin = cH * 60 + cM - (endOffset || 0);
  const effOpen = `${String(Math.floor(effOpenMin / 60)).padStart(2, '0')}:${String(effOpenMin % 60).padStart(2, '0')}`;
  const effClose = `${String(Math.floor(effCloseMin / 60)).padStart(2, '0')}:${String(effCloseMin % 60).padStart(2, '0')}`;
  const allTimeSlots = generateTimeSlots(effOpen, effClose, interval);
  const dayName = selectedDate ? selectedDate.toLocaleDateString('en-US', { weekday: 'long' }) : null;
  const blockedSlots = settings?.blockedTimeSlots?.[dayName] || [];
  const timeSlots = allTimeSlots.filter(s => {
    if (blockedSlots.includes(s.value)) return false;
    if (!selectedDate) return true;
    const dt = new Date(selectedDate);
    const [h, m] = s.value.split(':').map(Number);
    dt.setHours(h, m, 0, 0);
    return dt > new Date();
  });

  useEffect(() => {
    if (!selectedDate || !timeSlots.length || !restaurantTables.length) return;
    setSlotAvail(null);
    const timer = setTimeout(() => {
     const getEffectiveDuration = (guestCount) => {
        const def = settings?.defaultReservationDuration || 120;
        if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
        const match = settings.guestDurationRules.find(
          r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
        );
        return match ? match.duration : def;
      };
      const diningDur = getEffectiveDuration(guests);
      const cleanupDur = settings?.tableCleanupTime || 0;
      const totalDur = diningDur + cleanupDur;
      const avail = {};
      for (const slot of timeSlots) {
        const slotDt = new Date(selectedDate);
        const [sh, sm] = slot.value.split(':').map(Number);
        slotDt.setHours(sh, sm, 0, 0);
        const slotEnd = new Date(slotDt.getTime() + totalDur * 60000);
        const bookedIds = new Set();
        allReservations.forEach(res => {
          if (res.id === reservationId) return;
          const rDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
          const rEnd = new Date(rDate.getTime() + ((res.duration_minutes || diningDur) + cleanupDur) * 60000);
          if (rDate < slotEnd && rEnd > slotDt) {
            (Array.isArray(res.table_ids) ? res.table_ids : [res.table_id]).forEach(tid => tid && bookedIds.add(tid));
          }
        });
        const suitableTables = restaurantTables.filter(t => {
          const maxCap = t.maxCapacity || t.capacity || 0;
          return guests >= (t.minCapacity || 1) && (maxCap === 0 || guests <= maxCap) && t.online !== false;
        });
        const suitableCombos = combinations.filter(c => guests >= (c.minCapacity || 1) && guests <= (c.maxCapacity || 999));
        let free = suitableTables.some(t => !bookedIds.has(t.id))
          || suitableCombos.some(c => (c.tableIds || []).every(tid => !bookedIds.has(tid)));
        if (bookedIds.size === 0 && (suitableTables.length || suitableCombos.length)) free = true;
        avail[slot.value] = free;
      }
      setSlotAvail({ ...avail });
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedDate, guests, allReservations, restaurantTables, combinations, settings]);

  const autoAssignTable = (guestCount, bookedIds = new Set()) => {
    const combo = combinations.find(c =>
      guestCount >= (c.minCapacity || 1) && guestCount <= (c.maxCapacity || 999) &&
      (c.tableIds || []).every(tid => !bookedIds.has(tid))
    );
    if (combo) return { isCombination: true, combination: combo, tableIds: combo.tableIds, tableNames: combo.tableNames };
    const eligible = restaurantTables
      .filter(t => {
        const maxCap = t.maxCapacity || t.capacity || 0;
        return guestCount >= (t.minCapacity || 1) && (maxCap === 0 || guestCount <= maxCap) && t.online !== false && !bookedIds.has(t.id);
      })
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    if (!eligible.length) return null;
    const t = eligible[0];
    return { isCombination: false, table: t, tableIds: [t.id], tableNames: [t.name] };
  };

  const handleConfirmModification = async () => {
    if (!selectedDate || !selectedTime) return;

    const capInfo = getTableCapacityInfo(guests);
    if (!capInfo.fits) {
      alert(t('noTableForGuests').replace('{guests}', guests).replace('{maxInfo}', capInfo.maxAvailable > 0 ? t('maxAvailable').replace('{max}', capInfo.maxAvailable) : ''));
      setModStep(1);
      return;
    }

    setSaving(true);
    try {
      const resDate = new Date(selectedDate);
      const [h, m] = selectedTime.split(':').map(Number);
      resDate.setHours(h, m, 0, 0);

      const getEffectiveDuration = (guestCount) => {
        const def = settings?.defaultReservationDuration || 120;
        if (!settings?.useGuestBasedDuration || !settings?.guestDurationRules?.length) return def;
        const match = settings.guestDurationRules.find(
          r => guestCount >= (r.minGuests || 1) && guestCount <= (r.maxGuests || 99)
        );
        return match ? match.duration : def;
      };
      const diningDur = getEffectiveDuration(guests);
      const cleanupDur = settings?.tableCleanupTime || 0;
      const totalDur = diningDur + cleanupDur;
      const resEnd = new Date(resDate.getTime() + totalDur * 60000);

      const liveSnap = await getDocs(query(
        collection(db, 'reservations'),
        where('restaurant_id', '==', reservation.restaurant_id),
        where('status', 'in', ['pending', 'confirmed'])
      ));
      const bookedIds = new Set();
      liveSnap.docs.forEach(d => {
        if (d.id === reservationId) return;
        const r = d.data();
        const rDate = r.reservation_date?.toDate?.() || new Date(r.reservation_date);
        const rEnd = new Date(rDate.getTime() + ((r.duration_minutes || diningDur) + cleanupDur) * 60000);
        if (rDate < resEnd && rEnd > resDate) {
          (Array.isArray(r.table_ids) ? r.table_ids : [r.table_id]).forEach(tid => tid && bookedIds.add(tid));
        }
      });

      const assignment = autoAssignTable(guests, bookedIds);
      if (!assignment) {
        alert(t('slotUnavailable'));
        setSaving(false); return;
      }

      const col = reservation.restaurant_collection || 'restaurants';

      const tableUpdate = assignment.isCombination
        ? {
          combination_id: assignment.combination.id,
          combination_name: assignment.combination.name,
          table_ids: assignment.tableIds,
          table_names: assignment.tableNames,
          table_id: assignment.tableIds[0],
          table_name: assignment.tableNames[0],
        }
        : {
          table_id: assignment.table.id,
          table_name: assignment.table.name || '',
          table_ids: assignment.tableIds,
          table_names: assignment.tableNames,
          combination_id: null,
          combination_name: null,
        };

        const prevDate = resDate;
        const oldDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
        const oldTimeStr = oldDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const newTimeStr = resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const oldDateStr = oldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const newDateStr = resDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        const modSummary = [
          resDate.toDateString() !== oldDate.toDateString()
            ? t('dateChange').replace('{old}', oldDateStr).replace('{new}', newDateStr)
            : null,
          newTimeStr !== oldTimeStr
            ? t('timeChange').replace('{old}', oldTimeStr).replace('{new}', newTimeStr)
            : null,
          guests !== reservation.number_of_guests
            ? t('guestsChange').replace('{old}', reservation.number_of_guests).replace('{new}', guests)
            : null,
        ].filter(Boolean).join(' · ');

      await updateDoc(doc(db, 'reservations', reservationId), {
                reservation_date: resDate,
                time: resDate.toISOString(),
                number_of_guests: guests,
                duration_minutes: diningDur,
                status: 'confirmed',
                change_request: null,
                cancel_reason: null,
                requested_date: null,
                requested_time: null,
                modification_summary: modSummary || null,
                modified_at: new Date(),
                ...tableUpdate,
                updated_at: new Date(),
              });

              const freshSnap = await getDoc(doc(db, 'reservations', reservationId));
              if (freshSnap.exists()) {
                setReservation({ id: freshSnap.id, ...freshSnap.data() });
              }

            if (reservation.customer_email) {
          try {
            const fn = httpsCallable(getFunctions(undefined, 'asia-southeast1'), 'sendEmail');
            const firstName = reservation.customer_name?.split(' ')[0] || 'there';
            const tableName = assignment.isCombination ? assignment.combination.name : assignment.table.name;
            await fn({
              to: reservation.customer_email,
              subject: `${t('reservationUpdatedEmail')} ${reservation.restaurant_name}`,
              html: `
                <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                  <h2 style="color:#fe8a24;">${t('reservationUpdatedEmail')}</h2>
                  <p>Hi ${firstName},</p>
                  <p>${t('reservationUpdatedEmailBody').replace('{restaurant}', reservation.restaurant_name)}</p>
                  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                    <tr><td style="padding:8px 0;color:#888;">${t('date')}</td><td style="font-weight:bold;">${resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</td></tr>
                    <tr><td style="padding:8px 0;color:#888;">${t('time')}</td><td style="font-weight:bold;">${resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</td></tr>
                    <tr><td style="padding:8px 0;color:#888;">${t('guests')}</td><td style="font-weight:bold;">${guests}</td></tr>
                    <tr><td style="padding:8px 0;color:#888;">${t('table')}</td><td style="font-weight:bold;">${tableName}</td></tr>
                  </table>
                  <p style="color:#888;font-size:12px;">${t('updateImmediately')}</p>
                  <p style="color:#888;font-size:12px;margin-top:24px;">— ${reservation.restaurant_name}</p>
                </div>
              `,
            });
          } catch (emailErr) {
            console.error('❌ Modification confirmation email failed:', emailErr?.message || emailErr);
          }
        }

      setSuccessMsg(t('reservationUpdatedMsg'));
      setMode('success');
    } catch (e) {
      console.error(e);
      alert(t('saveFailed'));
    } finally { setSaving(false); }
  };

const handleCancelRequest = async () => {
  setSaving(true);
  try {
    const col = reservation?.restaurant_collection || 'restaurants';

    await updateDoc(doc(db, 'reservations', reservationId), {
      status: 'cancelled',
      cancel_reason: request || t('cancelledByCustomer'),
      change_request: null,
      updated_at: new Date(),
    });

      const freshSnap = await getDoc(doc(db, 'reservations', reservationId));
      if (freshSnap.exists()) {
        setReservation({ id: freshSnap.id, ...freshSnap.data() });
      }
    const tableIds = Array.isArray(reservation?.table_ids) && reservation.table_ids.length
      ? reservation.table_ids
      : reservation?.table_id ? [reservation.table_id] : [];

    if (tableIds.length && reservation?.restaurant_id) {
      await Promise.all(
        tableIds.map(tid =>
          updateDoc(
            doc(db, col, reservation.restaurant_id, 'tables', tid),
            {
              current_status: null,
              reserved_by: null,
              reserved_date: null,
              reserved_guests: null,
              reserved_duration_minutes: null,
              reserved_source: null,
              updated_at: new Date(),
            }
          ).catch(e => console.warn('Could not clear table:', tid, e))
        )
      );
    }

    if (reservation?.customer_email) {
      try {
        const fn = httpsCallable(getFunctions(undefined, 'asia-southeast1'), 'sendEmail');
        const firstName = reservation.customer_name?.split(' ')[0] || 'there';
        const resDate = reservation.reservation_date?.toDate?.() || new Date(reservation.reservation_date);
        await fn({
          to: reservation.customer_email,
          subject: `${t('reservationCancelledEmail')} – ${reservation.restaurant_name}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <h2 style="color:#ef4444;">${t('reservationCancelledEmail')}</h2>
              <p>Hi ${firstName},</p>
              <p>${t('reservationCancelledEmailBody').replace('{restaurant}', reservation.restaurant_name)}</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px 0;color:#888;">${t('date')}</td><td><strong>${resDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">${t('time')}</td><td><strong>${resDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</strong></td></tr>
                <tr><td style="padding:8px 0;color:#888;">${t('guests')}</td><td><strong>${reservation.number_of_guests}</strong></td></tr>
              </table>
              ${request ? `<p style="color:#888;">${t('reason')}: ${request}</p>` : ''}
              <p style="color:#888;font-size:12px;">${t('hopeToSeeAgain')}</p>
              <p style="color:#888;font-size:12px;margin-top:16px;">— ${reservation.restaurant_name}</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('❌ Cancellation email failed:', emailErr?.message || emailErr);
      }
    }
    setSuccessMsg(t('reservationCancelledMsg'));
    setMode('success');
  } catch (e) {
    console.error(e);
    alert(t('saveFailed'));
  } finally {
    setSaving(false);
  }
};

  const resDate = reservation?.reservation_date?.toDate?.() || (reservation ? new Date(reservation.reservation_date) : null);
  const formattedDate = resDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) || '';
  const formattedTime = resDate?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) || '';
  const getTimeLabel = val => timeSlots.find(t => t.value === val)?.label || val;
  const effectiveMax = settings?.maxGuestsPerReservation || 20;

  // ── Page visual config from reservationConfig ──
  const accent = pageConfig?.accentColor || '#fe8a24';
  const pageAccent = accent;
  const logoUrl    = pageConfig?.logoUrl || '';
  const logoShape  = pageConfig?.logoShape || 'circle';
  const logoSize   = pageConfig?.logoSize || 'md';
  const logoSizePx = logoSize === 'sm' ? 52 : logoSize === 'lg' ? 96 : 72;
  const logoRadius = logoShape === 'circle' ? '50%' : logoShape === 'rounded' ? '18px' : '6px';

  const bgClass = pageConfig?.backgroundImageUrl
    ? ''
    : pageConfig?.backgroundMode === 'color'
    ? ''
    : `bg-gradient-to-br ${pageConfig?.backgroundGradient || 'from-[#0f0c29] via-[#302b63] to-[#24243e]'}`;

  const bgStyle = pageConfig?.backgroundImageUrl
    ? {
        backgroundImage: `url("${pageConfig.backgroundImageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }
    : pageConfig?.backgroundMode === 'color'
    ? { backgroundColor: pageConfig.backgroundColor || '#1a1a2e' }
    : {};

  if (loading) return (
    <div className={`min-h-screen flex items-center justify-center ${bgClass || 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]'}`} style={bgStyle}>
      <div className="relative">
        <div className="w-16 h-16 border-4 border-white/20 rounded-full"></div>
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: accent }}></div>
      </div>
    </div>
  );

  if (notFound) return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${bgClass || 'bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e]'}`} style={bgStyle}>
      <div className="text-center max-w-md">
        <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🍽️</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">{t('reservationNotFound')}</h1>
        <p className="text-white/50 text-base">{t('invalidLinkMsg')}</p>
      </div>
    </div>
  );

    return (
      <div className={`min-h-screen relative overflow-hidden ${bgClass}`} style={bgStyle}>
        {pageConfig?.backgroundImageUrl && (
          <div className="fixed inset-0 z-0 pointer-events-none"
            style={{ backgroundColor: `rgba(0,0,0,${pageConfig.overlayOpacity ?? 0.25})` }}/>
        )}
        <div className="fixed inset-0 z-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(255,255,255,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(255,255,255,0.03) 0%, transparent 50%)' }}/>
      <div className="relative z-10 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Logo */}
        {logoUrl && (
          <div className="flex justify-center mb-6">
            <div className="overflow-hidden shadow-2xl"
              style={{
                width: logoSizePx,
                height: logoSizePx,
                borderRadius: logoRadius,
                border: '2px solid rgba(255,255,255,0.18)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                backgroundColor: 'transparent',
              }}>
              <img src={logoUrl} alt={reservation.restaurant_name}
                className="w-full h-full object-contain"
                style={{ backgroundColor: 'transparent' }}/>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <FiBookOpen className="w-3 h-3 text-white/50" />
            <span className="text-white/40 text-[11px] font-mono tracking-wider">{t('manageLabel')}</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">{t('manageReservation')}</h1>
          <p className="text-white/40 text-sm">{t('modifyOrCancel')}</p>
        </div>

        {mode === 'view' && (
        <div className="relative mb-6 group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#fe8a24] to-[#fe8a24]/40" />
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">{t('reservationId')}</p>
                  <p className="text-white/60 text-xs font-mono">{reservation.id?.slice(0, 12)}...</p>
                </div>
                <StatusBadge status={reservation.status} t={t} />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <InfoRow icon={FiCalendar} label={t('date')} value={formattedDate} accent={accent} />
                <InfoRow icon={FiClock} label={t('time')} value={formattedTime} accent={accent} />
                <InfoRow icon={FiUsers} label={t('guests')} value={`${reservation.number_of_guests} ${reservation.number_of_guests > 1 ? t('guestsPlural') : t('guest')}`} accent={accent} />
                <InfoRow icon={FiMapPin} label={t('restaurant')} value={reservation.restaurant_name} accent={accent} />
              </div>

              <div className="pt-4 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <FiUser className="w-3.5 h-3.5 text-white/40" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white/40 text-xs">{t('customer')}</p>
                    <p className="text-white/80 text-sm font-medium">{reservation.customer_name}</p>
                  </div>
                  {reservation.customer_email && (
                    <div className="text-right">
                      <p className="text-white/30 text-xs">{reservation.customer_email}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Action Buttons */}
        {mode === 'view' && !['cancelled', 'completed'].includes(reservation.status) && (
          <div className="grid gap-3">
            <button
              onClick={() => { setMode('modify_booking'); setModStep(1); setSelectedDate(null); setSelectedTime(''); setSlotAvail(null); }}
              className="group relative overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#fe8a24]/0 to-[#fe8a24]/0 group-hover:from-[#fe8a24]/10 group-hover:to-transparent transition-all duration-500" />
              <div className="relative flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#fe8a24]/20 flex items-center justify-center">
                    <FiEdit2 className="w-4 h-4 text-[#fe8a24]" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-semibold">{t('modifyReservation')}</p>
                    <p className="text-white/40 text-xs">{t('changeDateTimeParty')}</p>
                  </div>
                </div>
                <FiArrowRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
              </div>
            </button>

            {false ? null : (
                <button
                  onClick={() => setMode('cancel_confirm')}
                  className="group relative overflow-hidden rounded-xl bg-rose-500/5 border border-rose-500/20 hover:bg-rose-500/10 transition-all duration-300"
                >
                  <div className="relative flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <FiTrash2 className="w-4 h-4 text-rose-400" />
                      </div>
                      <div className="text-left">
                        <p className="text-rose-400 font-semibold">{t('cancelReservation')}</p>
                        <p className="text-rose-400/50 text-xs">{t('cancelBooking')}</p>
                      </div>
                    </div>
                    <FiArrowRight className="w-4 h-4 text-rose-400/30 group-hover:text-rose-400/60 transition-colors" />
                  </div>
                </button>
              )}
          </div>
        )}

        {['cancelled', 'completed'].includes(reservation.status) && mode === 'view' && (
          <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FiInfo className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/40 text-base">{t('thisReservationIs').replace('{status}', t(reservation.status))}</p>
            <p className="text-white/25 text-sm mt-1">{t('cannotModifyOnline')}</p>
          </div>
        )}

        {/* Modify Booking Flow */}
        {mode === 'modify_booking' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
            {modStep === 1 ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setMode('view')}
                    className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"
                  >
                    <FiChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <h3 className="text-white font-bold text-lg">{t('modifyDetails')}</h3>
                </div>

                {/* Guest Count Selector */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">{t('partySize')}</p>
                    <div className="flex items-center gap-2 bg-white/10 rounded-xl p-1">
                      <button
                        onClick={() => { const next = Math.max(1, guests - 1); setGuests(next); setSlotAvail(null); }}
                        disabled={guests <= 1}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white font-bold disabled:opacity-30 transition-all"
                      >
                        −
                      </button>
                      <span className="text-white font-bold text-lg w-10 text-center">{guests}</span>
                      <button
                        onClick={() => { const next = Math.min(effectiveMax, guests + 1); setGuests(next); setSlotAvail(null); }}
                        disabled={guests >= effectiveMax}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: accent }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {Array.from({ length: Math.min(effectiveMax, 8) }, (_, i) => i + 1).map(g => (
                      <button
                        key={g}
                        onClick={() => { setGuests(g); setSlotAvail(null); }}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${guests === g ? 'text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        style={guests === g ? { backgroundColor: accent } : {}}
                      >
                        {g}
                      </button>
                    ))}
                    {effectiveMax > 8 && (
                      <button
                        onClick={() => {
                          const v = parseInt(window.prompt(t('enterGuestsPrompt').replace('{max}', effectiveMax))) || guests;
                          if (v > 0 && v <= effectiveMax) { setGuests(v); setSlotAvail(null); }
                        }}
                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${guests > 8 ? 'text-white shadow-md' : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        style={guests > 8 ? { backgroundColor: accent } : {}}
                      >
                        {guests > 8 ? guests : '···'}
                      </button>
                    )}
                  </div>

                  {(() => {
                    const capInfo = getTableCapacityInfo(guests);
                    return capInfo.fits ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <p className="text-xs text-emerald-300 font-medium">
                          {capInfo.type === 'combo'
                            ? t('comboFitsGuests').replace('{name}', capInfo.name).replace('{guests}', guests)
                            : capInfo.type === 'multi'
                              ? t('combinedTables').replace('{guests}', guests)
                              : t('tableFitsGuests').replace('{name}', capInfo.name).replace('{guests}', guests)}
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <FiX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                        <p className="text-xs text-rose-300 font-medium">
                          {t('noTableForGuests').replace('{guests}', guests).replace('{maxInfo}', capInfo.maxAvailable > 0 ? t('maxAvailable').replace('{max}', capInfo.maxAvailable) : '')}
                        </p>
                      </div>
                    );
                  })()}
                </div>

                {/* Calendar */}
                <div className="mb-6">
                  <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-3">{t('selectDate')}</p>
                  <MiniCalendar
                    selectedDate={selectedDate}
                    onDateSelect={d => { setSelectedDate(d); setSelectedTime(''); setSlotAvail(null); }}
                    accentColor={accent}
                    openDayNames={openDayNames}
                    t={t}
                  />
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div className="mb-6">
                    {!isOpen ? (
                      <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-center">
                        <p className="text-rose-300 text-sm font-medium">{t('restaurantClosed').replace('{day}', selectedDate.toLocaleDateString('en-US', { weekday: 'long' }))}</p>
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                        <p className="text-white/50 text-sm">{t('noTimeSlots')}</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">{t('selectTime')}</p>
                          <p className="text-white/25 text-xs">{effOpen} – {effClose}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {timeSlots.map(slot => {
                            const checked = slotAvail !== null;
                            const isFull = checked && slotAvail[slot.value] === false;
                            return (
                              <button
                                key={slot.value}
                                onClick={() => !isFull && setSelectedTime(slot.value)}
                                disabled={isFull || slotAvail === null}
                                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${slotAvail === null ? 'bg-white/5 text-white/30 cursor-wait'
                                  : isFull ? 'bg-rose-500/10 text-rose-400 cursor-not-allowed border border-rose-500/20'
                                    : selectedTime === slot.value ? 'text-white shadow-md transform scale-105'
                                      : 'bg-white/5 text-white/60 hover:bg-white/10'
                                  }`}
                                style={!isFull && slotAvail !== null && selectedTime === slot.value ? { backgroundColor: accent } : {}}
                              >
                                {slotAvail === null ? '...' : isFull ? 'Full' : slot.label}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedDate && selectedTime && getTableCapacityInfo(guests).fits && (
                  <button
                    onClick={() => setModStep(2)}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: accent }}
                  >
                    {t('reviewChanges')}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={() => setModStep(1)} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                    <FiChevronLeft className="w-4 h-4 text-white" />
                  </button>
                  <h3 className="text-white font-bold text-lg">{t('confirmChanges')}</h3>
                </div>

                <div className="space-y-4 mb-6">
                  {/* Current booking */}
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-3">{t('currentBooking')}</p>
                    <div className="space-y-2 text-white/70 text-sm">
                      <div className="flex items-center gap-2"><FiCalendar className="w-3.5 h-3.5" /> {formattedDate}</div>
                      <div className="flex items-center gap-2"><FiClock className="w-3.5 h-3.5" /> {formattedTime}</div>
                      <div className="flex items-center gap-2"><FiUsers className="w-3.5 h-3.5" /> {reservation.number_of_guests} {reservation.number_of_guests > 1 ? t('guestsPlural') : t('guest')}</div>
                      {(reservation.combination_name || reservation.table_name) && (
                        <div className="flex items-center gap-2">
                          🪑 {reservation.combination_name || (Array.isArray(reservation.table_names) && reservation.table_names.length > 1 ? reservation.table_names.join(' + ') : reservation.table_name)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <div className="text-white/20 text-xs flex items-center gap-2">
                      <div className="w-8 h-px bg-white/20" /> {t('changesTo')} <div className="w-8 h-px bg-white/20" />
                    </div>
                  </div>

                  {/* New booking */}
                  <div className="p-4 rounded-xl" style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}30` }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: accent }}>{t('newBooking')}</p>
                    <div className="space-y-2 text-white/90 text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <FiCalendar className="w-3.5 h-3.5" style={{ color: accent }} />
                        {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <FiClock className="w-3.5 h-3.5" style={{ color: accent }} />
                        {getTimeLabel(selectedTime)}
                      </div>
                      <div className="flex items-center gap-2">
                        <FiUsers className="w-3.5 h-3.5" style={{ color: accent }} />
                        {guests} {guests > 1 ? t('guestsPlural') : t('guest')}
                        {guests !== reservation.number_of_guests && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold ml-1"
                            style={{ backgroundColor: accent + '30', color: accent }}>
                            {guests > reservation.number_of_guests ? `+${guests - reservation.number_of_guests}` : guests - reservation.number_of_guests}
                          </span>
                        )}
                      </div>
                      {(() => {
                        const capInfo = getTableCapacityInfo(guests);
                        if (!capInfo.fits) return null;
                        const slotOk = slotAvail === null ? null : slotAvail[selectedTime] !== false;
                        return (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center gap-2">🪑 {capInfo.name}
                              <span className="text-[10px] text-white/35 font-normal">{t('autoAssigned')}</span>
                            </div>
                            {slotOk === null ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin flex-shrink-0"/>
                                <p className="text-xs text-white/40">{t('checkingAvailability')}</p>
                              </div>
                            ) : slotOk ? (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0"/>
                                <p className="text-xs text-emerald-300 font-medium">
                                  {t('tableAvailable').replace('{time}', getTimeLabel(selectedTime)).replace('{date}', selectedDate?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }))}
                                </p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                                <FiX className="w-3.5 h-3.5 text-rose-400 flex-shrink-0"/>
                                <p className="text-xs text-rose-300 font-medium">
                                  {t('slotUnavailable')}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {/* Slot busyness indicator */}
                  {(() => {
                    if (!selectedDate || !selectedTime || !slotAvail) return null;
                    const diningDur  = settings?.defaultReservationDuration || 120;
                    const cleanupDur = settings?.tableCleanupTime || 0;
                    const slotDt = new Date(selectedDate);
                    const [sh, sm] = selectedTime.split(':').map(Number);
                    slotDt.setHours(sh, sm, 0, 0);
                    const slotEnd = new Date(slotDt.getTime() + (diningDur + cleanupDur) * 60000);
                    const conflictCount = allReservations.filter(res => {
                      if (res.id === reservationId) return false;
                      const rDate = res.reservation_date?.toDate?.() || new Date(res.reservation_date);
                      const rEnd  = new Date(rDate.getTime() + ((res.duration_minutes || diningDur) + cleanupDur) * 60000);
                      return rDate < slotEnd && rEnd > slotDt;
                    }).length;
                    if (!conflictCount) return null;
                    return (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                        <p className="text-white/40 text-xs">{t('popularSlot')}</p>
                      </div>
                    );
                  })()}
                  {guests !== reservation.number_of_guests && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl px-4 py-3">
                      <p className="text-blue-300 text-xs font-semibold">
                        {t('guestCountChanged')}
                      </p>
                    </div>
                  )}
                </div>

                <p className="text-white/30 text-xs text-center mb-5">
                  {t('updateImmediately')}
                </p>

                  <button
                    onClick={handleConfirmModification}
                    disabled={saving || slotAvail?.[selectedTime] === false}
                    className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ backgroundColor: slotAvail?.[selectedTime] === false ? '#6b7280' : accent }}
                  >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('confirming')}
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      {t('confirmModification')}
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* Cancel Confirmation */}
        {mode === 'cancel_confirm' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-rose-500/20 p-6">
            <h3 className="text-white font-bold text-lg mb-2">{t('cancelReservationTitle')}</h3>
            <p className="text-white/50 text-sm mb-5">{t('cancelRequestSent')}</p>
            <textarea
              value={request}
              onChange={e => setRequest(e.target.value)}
              rows={3}
              placeholder={t('reasonOptional')}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/25 focus:outline-none focus:border-white/30 transition-all resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setMode('view')}
                className="flex-1 py-3 rounded-xl text-sm font-medium text-white/60 bg-white/10 hover:bg-white/15 transition-all"
              >
                {t('keepReservation')}
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={saving}
                className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-all disabled:opacity-50"
              >
                {saving ? t('sending') : t('requestCancel')}
              </button>
            </div>
          </div>
        )}

{/* Success State */}
        {mode === 'success' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg"
              style={{ backgroundColor: successMsg.includes('cancel') ? '#ef4444' : accent }}>
              <FiCheck className="w-10 h-10 text-white" strokeWidth={2.5} />
            </div>
            <h3 className="text-white font-bold text-2xl mb-2">
              {successMsg.includes('cancel') ? t('requestSent') : t('reservationUpdated')}
            </h3>
            <p className="text-white/50 text-base mb-6">{successMsg}</p>

            {!successMsg.includes('cancel') && (
              <>
              {/* ── New booking details ── */}
              <div className="p-4 rounded-xl mb-6 text-left"
                style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}30` }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-3" style={{ color: accent }}>
                  {t('newBooking')}
                </p>
                <div className="space-y-2 text-white/90 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <FiCalendar className="w-3.5 h-3.5" style={{ color: accent }} />
                    {formattedDate}
                  </div>
                  <div className="flex items-center gap-2">
                    <FiClock className="w-3.5 h-3.5" style={{ color: accent }} />
                    {formattedTime}
                  </div>
                  <div className="flex items-center gap-2">
                    <FiUsers className="w-3.5 h-3.5" style={{ color: accent }} />
                    {reservation.number_of_guests} {reservation.number_of_guests > 1 ? t('guestsPlural') : t('guest')}
                  </div>
                  {(reservation.combination_name || reservation.table_name) && (
                    <div className="flex items-center gap-2">
                      🪑 {reservation.combination_name || (Array.isArray(reservation.table_names) && reservation.table_names.length > 1 ? reservation.table_names.join(' + ') : reservation.table_name)}
                      <span className="text-[10px] text-white/35 font-normal">{t('autoAssigned')}</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <FiCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <p className="text-xs text-emerald-300 font-medium">
                    {t('tableConfirmed').replace('{time}', formattedTime).replace('{date}', formattedDate)}
                  </p>
                </div>
              </div>
                <button
                  onClick={async () => {
                    const snap = await getDoc(doc(db, 'reservations', reservationId));
                    if (snap.exists()) setReservation({ id: snap.id, ...snap.data() });
                    setMode('view');
                    setModStep(1);
                    setSelectedDate(null);
                    setSelectedTime('');
                    setSlotAvail(null);
                  }}
                  className="px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                  style={{ backgroundColor: accent }}
                >
                  {t('makeAnotherChange')}
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </div>
      </div>
  );
}