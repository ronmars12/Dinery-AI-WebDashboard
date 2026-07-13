// ReservationSettings.jsx - Updated with text-only tabs and language support
import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, getDocs, collection, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { FiCheck, FiX, FiSave, FiClock, FiCalendar, FiUsers, FiBell, FiMonitor, FiSettings, FiSliders, FiMenu, FiPlus, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';

const db = getFirestore();

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // General
    general: 'General',
    booking: 'Booking',
    menu: 'Menu',
    tables: 'Tables',
    hours: 'Hours',
    timeSlots: 'Time Slots',
    notifications: 'Notifications',
    display: 'Display',
    // Settings labels
    twentyFourHourFormat: '24-Hour Time Format',
    displayTimes24Hour: 'Display times in 24-hour format',
    diningDuration: 'Dining Duration',
    defaultDiningTime: 'Default time for dining',
    tableCleanup: 'Table Cleanup',
    timeBetweenReservations: 'Time between reservations',
    totalSlotTime: 'Total slot time',
    diningAndCleanup: 'Dining + Cleanup',
    guestBasedDuration: 'Guest-Based Duration',
    setDurationByPartySize: 'Set different dining durations based on party size',
    defineDurationPerRange: 'Define duration (minutes) per guest range. Ranges are evaluated top to bottom — first match wins.',
    previewByPartySize: 'Preview by party size:',
    addRule: 'Add Rule',
    advanceBooking: 'Advance Booking',
    maxDaysInAdvance: 'Max days in advance',
    minNotice: 'Min Notice',
    hoursBeforeBooking: 'Hours before booking',
    // Booking tab
    publicBookingPage: 'Public booking page settings',
    controlCustomerFields: 'Control what customers see and need to provide',
    contactInfo: 'Contact Info',
    usedInConfirmationEmails: 'Used in confirmation emails sent to customers',
    contactEmail: 'Contact Email',
    contactPhone: 'Contact Phone',
    requireFullName: 'Require Full Name',
    makeFullNameMandatory: 'Make full name mandatory',
    requireEmail: 'Require Email',
    makeEmailMandatory: 'Make email mandatory',
    requirePhone: 'Require Phone',
    makePhoneMandatory: 'Make phone mandatory',
    showCompanyField: 'Show Company Field',
    displayCompanyField: 'Display company field',
    showNotesField: 'Show Notes Field',
    allowSpecialRequests: 'Allow special requests',
    maxPartySize: 'Max Party Size',
    maximumGuestsPerBooking: 'Maximum guests per online booking',
    minPartySize: 'Min Party Size',
    minimumGuestsAllowed: 'Minimum guests allowed',
    overallMaximum: 'Overall maximum — based on largest table',
    blockFullSlots: 'Block Full Slots',
    preventBookingsWhenFull: 'Prevent bookings when full',
    allowWalkIns: 'Allow Walk-ins',
    walkInsWithoutTable: 'Walk-ins without table assignment',
    birthdayOffer: 'Birthday Offer',
    showBirthdayField: 'Show Birthday Field',
    askCustomersForBirthday: 'Ask customers for their birthday',
    birthdayOfferMessage: 'Birthday Offer Message',
    shownAboveBirthdayPicker: 'Shown above the birthday date picker',
    menuOnBookingPage: 'Menu on Booking Page',
    showMenuOnPublicPage: 'Show Menu on Public Page',
    displayMenuBelowBooking: 'Display your menu below the booking form',
    minGuestsToShowMenu: 'Min Guests to Show Menu',
    menuAppearsWhenPartySize: 'Menu only appears when party size reaches this number',
    requireGroupMenuSelection: 'Require Group Menu Selection',
    forceCustomersToSelectItem: 'Force customers to select a menu item before confirming',
    requirementMessage: 'Requirement Message',
    shownWhenGroupMenuRequired: 'Shown when group menu selection is required',
    menuSectionTitle: 'Menu Section Title',
    headingShownAboveMenu: 'Heading shown above the menu',
    menuSectionSubtitle: 'Menu Section Subtitle',
    shownBelowTitle: 'Shown below the title',
    reservationSuccessPage: 'Reservation Success Page',
    thankYouMessage: 'Thank You Message',
    shownAfterSuccessfulReservation: 'Shown after a successful reservation',
    restaurantPageUrl: 'Restaurant Page URL',
    linkShownOnSuccessPage: 'Link shown on success page to return to your website',
    offerCampaignCode: 'Offer / Campaign Code',
    oneUnifiedCodeField: 'One unified code field for every marketing channel — CRM thank-you emails, Facebook, Instagram, Google Ads, flyers/QR codes, or the Dinery App. Links can pre-fill it automatically; guests can also type a code in manually.',
    enableOfferCodeField: 'Enable Offer Code Field',
    showOfferCodeField: 'Show an offer code field on the public reservation page',
    fieldLabel: 'Field Label',
    shownAboveOfferCodeInput: 'Shown above the offer code input',
    // Tables tab
    requireTableAssignment: 'Require Table Assignment',
    blockIfNoSuitableTable: 'Block if no suitable table',
    autoAssignTables: 'Auto-Assign Tables',
    automaticTableAssignment: 'Automatic table assignment',
    allowOverbooking: 'Allow Overbooking',
    allowOverCapacity: 'Allow over capacity (not recommended)',
    showCapacityWarnings: 'Show Capacity Warnings',
    alertWhenPartyExceedsCapacity: 'Alert when party exceeds capacity',
    // Hours tab
    closed: 'Closed',
    slotInterval: 'Slot Interval',
    howOftenTimeSlotsDisplayed: 'Slot Interval: how often time slots are displayed',
    noStartBuffer: 'No start buffer',
    startBuffer: 'start buffer',
    noEndBuffer: 'No end buffer',
    endBuffer: 'end buffer',
    notAcceptingBookings: 'Not accepting bookings',
    noOperatingHoursSet: 'No operating hours set',
    configureRestaurantHours: 'Please configure restaurant hours in main settings first',
    // Time Slots tab
    individualTimeSlotControl: 'Individual Time Slot Control',
    toggleSpecificTimeSlots: 'Toggle specific time slots on/off for each day. Green = available, Red = blocked.',
    restaurantHours: 'Restaurant hours',
    bookings: 'bookings',
    minSlots: 'min slots',
    totalSlots: 'total slots',
    availableTimeSlots: 'Available Time Slots',
    available: 'Available',
    blocked: 'Blocked',
    enableAllSlots: 'Enable All Slots',
    disableAllSlots: 'Disable All Slots',
    restaurantClosedOn: 'Restaurant is closed on',
    noOperatingHoursConfigured: 'No operating hours configured',
    setOperatingHoursFirst: 'Please set your restaurant\'s operating hours in the main settings before configuring time slot availability.',
    howThisWorks: 'How this works',
    greenSlotsAvailable: 'Green slots are available for customer bookings',
    redSlotsBlocked: 'Red crossed slots are blocked and won\'t appear on booking pages',
    clickToToggleSlot: 'Click any time slot to toggle it between available and blocked',
    useEnableAllDisableAll: 'Use "Enable All" or "Disable All" for quick batch changes',
    slotsBasedOnInterval: 'Time slots are based on the interval setting in the "Hours" tab (15/30/60 min)',
    dontForgetToSave: 'Don\'t forget to click "Save Changes" at the bottom!',
    // Notifications tab
    confirmationEmail: 'Confirmation Email',
    sendWhenBookingConfirmed: 'Send when booking confirmed',
    reminderEmail: 'Reminder Email',
    sendBeforeReservation: 'Send before reservation',
    reminderTime: 'Reminder Time',
    hoursBeforeReservation: 'Hours before reservation',
    // Display tab
    timeBarStartOfHour: 'Time Bar Start of Hour',
    showHourLabelsAtBeginning: 'Show hour labels at beginning',
    highlightCurrentTime: 'Highlight Current Time',
    showCurrentTimeIndicator: 'Show current time indicator',
    // Menu panel
    categories: 'Categories',
    allItems: 'All Items',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    addItem: 'Add Item',
    editItem: 'Edit Item',
    itemName: 'Item Name',
    price: 'Price',
    allergens: 'Allergens',
    attributes: 'Attributes',
    actions: 'Actions',
    noMenuItemsYet: 'No menu items yet',
    addFirstItem: 'Click "Add Item" to create your first menu item',
    addFirstItemBtn: 'Add First Item',
    searchMenuItems: 'Search menu items…',
    summary: 'Summary',
    total: 'total',
    active: 'active',
    hidden: 'hidden',
    // Category modal
    color: 'Color',
    categoryName: 'Category Name',
    subcategories: 'Subcategories',
    addSubcategory: 'Add subcategory…',
    add: 'Add',
    // Item modal
    content: 'Content',
    select: '— Select —',
    none: '— None —',
    // Delete confirm
    delete: 'Delete',
    deleteItem: 'Delete {type}?',
    deleteConfirm: '"{name}" will be permanently removed.',
    cancel: 'Cancel',
    deleting: 'Deleting…',
    // Save
    saving: 'Saving...',
    saved: 'Saved!',
    saveChanges: 'Save Changes',
    // Toast
    categoryAdded: 'Category added',
    categoryUpdated: 'Category updated',
    itemAdded: 'Item added',
    itemUpdated: 'Item updated',
    deleted: 'Deleted',
    failed: 'Failed',
    // Status
    activeStatus: 'Active',
    hiddenStatus: 'Hidden',
    on: 'on',
    off: 'off',
    // Responsive tab labels
    slots: 'Slots',
    alerts: 'Alerts',
    view: 'View',
    seats: 'Seats',
    book: 'Book',
  },
  fi: {
    general: 'Yleiset',
    booking: 'Varaus',
    menu: 'Ruokalista',
    tables: 'Pöydät',
    hours: 'Aukioloajat',
    timeSlots: 'Aikavälit',
    notifications: 'Ilmoitukset',
    display: 'Näyttö',
    twentyFourHourFormat: '24 tunnin aikamuoto',
    displayTimes24Hour: 'Näytä ajat 24 tunnin muodossa',
    diningDuration: 'Ruokailuaika',
    defaultDiningTime: 'Oletusaika ruokailulle',
    tableCleanup: 'Pöydän siivous',
    timeBetweenReservations: 'Aika varausten välillä',
    totalSlotTime: 'Kokonaisaika',
    diningAndCleanup: 'Ruokailu + Siivous',
    guestBasedDuration: 'Vierasmäärään perustuva kesto',
    setDurationByPartySize: 'Aseta eri ruokailuajat seurueen koon mukaan',
    defineDurationPerRange: 'Määritä kesto (minuutteina) vierasmääräalueittain. Alueet arvioidaan ylhäältä alas — ensimmäinen osuma voittaa.',
    previewByPartySize: 'Esikatselu seurueen koon mukaan:',
    addRule: 'Lisää sääntö',
    advanceBooking: 'Ennakkovaraus',
    maxDaysInAdvance: 'Maksimipäivät etukäteen',
    minNotice: 'Vähimmäisilmoitus',
    hoursBeforeBooking: 'Tuntia ennen varausta',
    publicBookingPage: 'Julkisen varaussivun asetukset',
    controlCustomerFields: 'Hallitse, mitä asiakkaat näkevät ja mitä heidän tulee antaa',
    contactInfo: 'Yhteystiedot',
    usedInConfirmationEmails: 'Käytetään asiakkaille lähetettävissä vahvistussähköposteissa',
    contactEmail: 'Yhteyssähköposti',
    contactPhone: 'Yhteyspuhelin',
    requireFullName: 'Vaadi koko nimi',
    makeFullNameMandatory: 'Tee koko nimestä pakollinen',
    requireEmail: 'Vaadi sähköposti',
    makeEmailMandatory: 'Tee sähköpostista pakollinen',
    requirePhone: 'Vaadi puhelin',
    makePhoneMandatory: 'Tee puhelimesta pakollinen',
    showCompanyField: 'Näytä yrityskenttä',
    displayCompanyField: 'Näytä yrityskenttä',
    showNotesField: 'Näytä muistiinpanokenttä',
    allowSpecialRequests: 'Salli erityistoiveet',
    maxPartySize: 'Maksimiseurueen koko',
    maximumGuestsPerBooking: 'Maksimivierasmäärä verkkovarauksessa',
    minPartySize: 'Minimiseurueen koko',
    minimumGuestsAllowed: 'Sallittu vähimmäisvierasmäärä',
    overallMaximum: 'Yleinen maksimi — perustuu suurimpaan pöytään',
    blockFullSlots: 'Estä täydet ajat',
    preventBookingsWhenFull: 'Estä varaukset kun täynnä',
    allowWalkIns: 'Salli kävelyt',
    walkInsWithoutTable: 'Kävelyt ilman pöytävarausta',
    birthdayOffer: 'Syntymäpäivätarjous',
    showBirthdayField: 'Näytä syntymäpäiväkenttä',
    askCustomersForBirthday: 'Kysy asiakkailta syntymäpäivä',
    birthdayOfferMessage: 'Syntymäpäivätarjouksen viesti',
    shownAboveBirthdayPicker: 'Näytetään syntymäpäivävalitsimen yläpuolella',
    menuOnBookingPage: 'Ruokalista varaussivulla',
    showMenuOnPublicPage: 'Näytä ruokalista julkisella sivulla',
    displayMenuBelowBooking: 'Näytä ruokalista varauslomakkeen alapuolella',
    minGuestsToShowMenu: 'Minimivieraat ruokalistan näyttämiseen',
    menuAppearsWhenPartySize: 'Ruokalista näkyy vain, kun seurueen koko saavuttaa tämän määrän',
    requireGroupMenuSelection: 'Vaadi ryhmäruokalistan valinta',
    forceCustomersToSelectItem: 'Pakota asiakkaat valitsemaan ruokalistalta ennen vahvistusta',
    requirementMessage: 'Vaatimusviesti',
    shownWhenGroupMenuRequired: 'Näytetään, kun ryhmäruokalistan valinta vaaditaan',
    menuSectionTitle: 'Ruokalistaosion otsikko',
    headingShownAboveMenu: 'Otsikko, joka näkyy ruokalistan yläpuolella',
    menuSectionSubtitle: 'Ruokalistaosion alaotsikko',
    shownBelowTitle: 'Näytetään otsikon alapuolella',
    reservationSuccessPage: 'Varauksen onnistumissivu',
    thankYouMessage: 'Kiitosviesti',
    shownAfterSuccessfulReservation: 'Näytetään onnistuneen varauksen jälkeen',
    restaurantPageUrl: 'Ravintolan sivun URL',
    linkShownOnSuccessPage: 'Linkki, joka näkyy onnistumissivulla paluuta varten verkkosivustollesi',
    offerCampaignCode: 'Tarjous / Kampanjakoodi',
    oneUnifiedCodeField: 'Yksi yhtenäinen koodikenttä kaikille markkinointikanaville — CRM-kiitos-sähköpostit, Facebook, Instagram, Google Ads, mainokset/QR-koodit tai Dinery-sovellus. Linkit voivat täyttää sen automaattisesti; asiakkaat voivat myös kirjoittaa koodin manuaalisesti.',
    enableOfferCodeField: 'Ota tarjouskoodikenttä käyttöön',
    showOfferCodeField: 'Näytä tarjouskoodikenttä julkisella varaussivulla',
    fieldLabel: 'Kentän nimi',
    shownAboveOfferCodeInput: 'Näytetään tarjouskoodikentän yläpuolella',
    requireTableAssignment: 'Vaadi pöytävaraus',
    blockIfNoSuitableTable: 'Estä, jos sopivaa pöytää ei ole',
    autoAssignTables: 'Automaattinen pöydänvaraus',
    automaticTableAssignment: 'Automaattinen pöydän määritys',
    allowOverbooking: 'Salli ylivaraus',
    allowOverCapacity: 'Salli kapasiteetin ylittäminen (ei suositeltava)',
    showCapacityWarnings: 'Näytä kapasiteettivaroitukset',
    alertWhenPartyExceedsCapacity: 'Varoita, kun seurue ylittää kapasiteetin',
    closed: 'Suljettu',
    slotInterval: 'Aikavälin pituus',
    howOftenTimeSlotsDisplayed: 'Aikavälin pituus: kuinka usein aikavälit näytetään',
    noStartBuffer: 'Ei alkupuskuria',
    startBuffer: 'alkupuskuri',
    noEndBuffer: 'Ei loppupuskuria',
    endBuffer: 'loppupuskuri',
    notAcceptingBookings: 'Ei ota vastaan varauksia',
    noOperatingHoursSet: 'Aukioloaikoja ei ole asetettu',
    configureRestaurantHours: 'Määritä ravintolan aukioloajat ensin pääasetuksissa',
    individualTimeSlotControl: 'Yksittäisten aikavälien hallinta',
    toggleSpecificTimeSlots: 'Kytke yksittäiset aikavälit päälle/pois jokaiselle päivälle. Vihreä = saatavilla, Punainen = estetty.',
    restaurantHours: 'Ravintolan aukioloajat',
    bookings: 'varaukset',
    minSlots: 'min aikaväliä',
    totalSlots: 'yhteensä aikaväliä',
    availableTimeSlots: 'Saatavilla olevat aikavälit',
    available: 'Saatavilla',
    blocked: 'Estetty',
    enableAllSlots: 'Ota kaikki käyttöön',
    disableAllSlots: 'Estä kaikki',
    restaurantClosedOn: 'Ravintola on suljettu',
    noOperatingHoursConfigured: 'Aukioloaikoja ei ole määritetty',
    setOperatingHoursFirst: 'Aseta ravintolan aukioloajat pääasetuksissa ennen aikavälien määrittämistä.',
    howThisWorks: 'Näin tämä toimii',
    greenSlotsAvailable: 'Vihreät aikavälit ovat saatavilla asiakasvarauksia varten',
    redSlotsBlocked: 'Punaiset yliviivatut aikavälit on estetty eivätkä näy varaussivuilla',
    clickToToggleSlot: 'Napsauta mitä tahansa aikaväliä vaihtaaksesi sen saatavuuden ja eston välillä',
    useEnableAllDisableAll: 'Käytä "Ota kaikki käyttöön" tai "Estä kaikki" nopeisiin erämuutoksiin',
    slotsBasedOnInterval: 'Aikavälit perustuvat "Aukioloajat"-välilehden aikaväliasetukseen (15/30/60 min)',
    dontForgetToSave: 'Älä unohda napsauttaa "Tallenna muutokset" alareunassa!',
    confirmationEmail: 'Vahvistussähköposti',
    sendWhenBookingConfirmed: 'Lähetä, kun varaus vahvistetaan',
    reminderEmail: 'Muistutussähköposti',
    sendBeforeReservation: 'Lähetä ennen varausta',
    reminderTime: 'Muistutusaika',
    hoursBeforeReservation: 'Tuntia ennen varausta',
    timeBarStartOfHour: 'Aikapalkki tunnin alussa',
    showHourLabelsAtBeginning: 'Näytä tuntimerkit alussa',
    highlightCurrentTime: 'Korosta nykyinen aika',
    showCurrentTimeIndicator: 'Näytä nykyinen aikamerkki',
    categories: 'Kategoriat',
    allItems: 'Kaikki tuotteet',
    addCategory: 'Lisää kategoria',
    editCategory: 'Muokkaa kategoriaa',
    addItem: 'Lisää tuote',
    editItem: 'Muokkaa tuotetta',
    itemName: 'Tuotteen nimi',
    price: 'Hinta',
    allergens: 'Allergeenit',
    attributes: 'Ominaisuudet',
    actions: 'Toiminnot',
    noMenuItemsYet: 'Ei vielä ruokalistan tuotteita',
    addFirstItem: 'Napsauta "Lisää tuote" luodaksesi ensimmäisen tuotteen',
    addFirstItemBtn: 'Lisää ensimmäinen tuote',
    searchMenuItems: 'Hae ruokalistan tuotteita…',
    summary: 'Yhteenveto',
    total: 'yhteensä',
    active: 'aktiivista',
    hidden: 'piilotettua',
    color: 'Väri',
    categoryName: 'Kategorian nimi',
    subcategories: 'Alakategoriat',
    addSubcategory: 'Lisää alakategoria…',
    add: 'Lisää',
    content: 'Sisältö',
    select: '— Valitse —',
    none: '— Ei mitään —',
    delete: 'Poista',
    deleteItem: 'Poista {type}?',
    deleteConfirm: '"{name}" poistetaan pysyvästi.',
    cancel: 'Peruuta',
    deleting: 'Poistetaan…',
    saving: 'Tallennetaan...',
    saved: 'Tallennettu!',
    saveChanges: 'Tallenna muutokset',
    categoryAdded: 'Kategoria lisätty',
    categoryUpdated: 'Kategoria päivitetty',
    itemAdded: 'Tuote lisätty',
    itemUpdated: 'Tuote päivitetty',
    deleted: 'Poistettu',
    failed: 'Epäonnistui',
    activeStatus: 'Aktiivinen',
    hiddenStatus: 'Piilotettu',
    on: 'päällä',
    off: 'pois',
    slots: 'Välit',
    alerts: 'Ilmoitukset',
    view: 'Näkymä',
    seats: 'Istuimet',
    book: 'Varaa',
  },
  no: {
    general: 'Generelt',
    booking: 'Bestilling',
    menu: 'Meny',
    tables: 'Bord',
    hours: 'Åpningstider',
    timeSlots: 'Tidspor',
    notifications: 'Varsler',
    display: 'Visning',
    twentyFourHourFormat: '24-timers format',
    displayTimes24Hour: 'Vis tider i 24-timers format',
    diningDuration: 'Spisetid',
    defaultDiningTime: 'Standard tid for spising',
    tableCleanup: 'Bordrydding',
    timeBetweenReservations: 'Tid mellom reservasjoner',
    totalSlotTime: 'Total tid',
    diningAndCleanup: 'Spising + Rydding',
    guestBasedDuration: 'Gjestebasert varighet',
    setDurationByPartySize: 'Sett forskjellig spisetid basert på selskapsstørrelse',
    defineDurationPerRange: 'Definer varighet (minutter) per gjesteområde. Områder vurderes topp til bunn — første treff vinner.',
    previewByPartySize: 'Forhåndsvisning etter selskapsstørrelse:',
    addRule: 'Legg til regel',
    advanceBooking: 'Forhåndsbestilling',
    maxDaysInAdvance: 'Maks dager i forveien',
    minNotice: 'Minste varsel',
    hoursBeforeBooking: 'Timer før bestilling',
    publicBookingPage: 'Offentlig bestillingsside innstillinger',
    controlCustomerFields: 'Kontroller hva kunder ser og må oppgi',
    contactInfo: 'Kontaktinfo',
    usedInConfirmationEmails: 'Brukes i bekreftelses-e-poster sendt til kunder',
    contactEmail: 'Kontakt e-post',
    contactPhone: 'Kontakt telefon',
    requireFullName: 'Krev fullt navn',
    makeFullNameMandatory: 'Gjør fullt navn obligatorisk',
    requireEmail: 'Krev e-post',
    makeEmailMandatory: 'Gjør e-post obligatorisk',
    requirePhone: 'Krev telefon',
    makePhoneMandatory: 'Gjør telefon obligatorisk',
    showCompanyField: 'Vis bedriftsfelt',
    displayCompanyField: 'Vis bedriftsfelt',
    showNotesField: 'Vis notatfelt',
    allowSpecialRequests: 'Tillat spesielle ønsker',
    maxPartySize: 'Maks selskapsstørrelse',
    maximumGuestsPerBooking: 'Maks antall gjester per online bestilling',
    minPartySize: 'Min selskapsstørrelse',
    minimumGuestsAllowed: 'Minimum antall gjester tillatt',
    overallMaximum: 'Generelt maksimum — basert på største bord',
    blockFullSlots: 'Blokker fulle spor',
    preventBookingsWhenFull: 'Forhindre bestillinger når fullt',
    allowWalkIns: 'Tillat drop-in',
    walkInsWithoutTable: 'Drop-in uten bordtildeling',
    birthdayOffer: 'Bursdagstilbud',
    showBirthdayField: 'Vis bursdagsfelt',
    askCustomersForBirthday: 'Spør kunder om bursdag',
    birthdayOfferMessage: 'Bursdagstilbud melding',
    shownAboveBirthdayPicker: 'Vist over bursdagsvelgeren',
    menuOnBookingPage: 'Meny på bestillingsside',
    showMenuOnPublicPage: 'Vis meny på offentlig side',
    displayMenuBelowBooking: 'Vis menyen under bestillingsskjemaet',
    minGuestsToShowMenu: 'Min gjester for å vise meny',
    menuAppearsWhenPartySize: 'Menyen vises bare når selskapets størrelse når dette antallet',
    requireGroupMenuSelection: 'Krev gruppemenyvalg',
    forceCustomersToSelectItem: 'Tving kunder til å velge et menyelement før bekreftelse',
    requirementMessage: 'Kravmelding',
    shownWhenGroupMenuRequired: 'Vist når gruppemenyvalg kreves',
    menuSectionTitle: 'Meny seksjon tittel',
    headingShownAboveMenu: 'Overskrift vist over menyen',
    menuSectionSubtitle: 'Meny seksjon undertekst',
    shownBelowTitle: 'Vist under tittelen',
    reservationSuccessPage: 'Bestilling vellykket side',
    thankYouMessage: 'Takkemelding',
    shownAfterSuccessfulReservation: 'Vist etter vellykket bestilling',
    restaurantPageUrl: 'Restaurant side URL',
    linkShownOnSuccessPage: 'Link vist på suksessiden for å gå tilbake til nettstedet ditt',
    offerCampaignCode: 'Tilbud / Kampanjekode',
    oneUnifiedCodeField: 'Ett enhetlig kodefelt for alle markedsføringskanaler — CRM-takk-e-poster, Facebook, Instagram, Google Ads, flyers/QR-koder eller Dinery App. Lenker kan fylle det automatisk; gjester kan også skrive inn en kode manuelt.',
    enableOfferCodeField: 'Aktiver tilbudskodefelt',
    showOfferCodeField: 'Vis et tilbudskodefelt på den offentlige bestillingssiden',
    fieldLabel: 'Feltnavn',
    shownAboveOfferCodeInput: 'Vist over tilbudskodefeltet',
    requireTableAssignment: 'Krev bordtildeling',
    blockIfNoSuitableTable: 'Blokker hvis ikke egnet bord',
    autoAssignTables: 'Auto-tildel bord',
    automaticTableAssignment: 'Automatisk bordtildeling',
    allowOverbooking: 'Tillat overbestilling',
    allowOverCapacity: 'Tillat over kapasitet (ikke anbefalt)',
    showCapacityWarnings: 'Vis kapasitetsadvarsler',
    alertWhenPartyExceedsCapacity: 'Varsle når selskapet overskrider kapasitet',
    closed: 'Stengt',
    slotInterval: 'Sporintervall',
    howOftenTimeSlotsDisplayed: 'Sporintervall: hvor ofte tidspor vises',
    noStartBuffer: 'Ingen startbuffer',
    startBuffer: 'startbuffer',
    noEndBuffer: 'Ingen sluttbuffer',
    endBuffer: 'sluttbuffer',
    notAcceptingBookings: 'Tar ikke imot bestillinger',
    noOperatingHoursSet: 'Ingen åpningstider satt',
    configureRestaurantHours: 'Vennligst konfigurer restaurantens åpningstider i hovedinnstillingene først',
    individualTimeSlotControl: 'Individuell tidsporkontroll',
    toggleSpecificTimeSlots: 'Aktiver/deaktiver spesifikke tidspor for hver dag. Grønn = tilgjengelig, Rød = blokkert.',
    restaurantHours: 'Restaurantens åpningstider',
    bookings: 'bestillinger',
    minSlots: 'min spor',
    totalSlots: 'totalt spor',
    availableTimeSlots: 'Tilgjengelige tidspor',
    available: 'Tilgjengelig',
    blocked: 'Blokkert',
    enableAllSlots: 'Aktiver alle spor',
    disableAllSlots: 'Deaktiver alle spor',
    restaurantClosedOn: 'Restauranten er stengt på',
    noOperatingHoursConfigured: 'Ingen åpningstider konfigurert',
    setOperatingHoursFirst: 'Vennligst sett restaurantens åpningstider i hovedinnstillingene før du konfigurerer tidspor.',
    howThisWorks: 'Hvordan dette fungerer',
    greenSlotsAvailable: 'Grønne spor er tilgjengelige for kundebestillinger',
    redSlotsBlocked: 'Røde overstrykede spor er blokkert og vil ikke vises på bestillingssider',
    clickToToggleSlot: 'Klikk på et hvilket som helst tidspor for å veksle mellom tilgjengelig og blokkert',
    useEnableAllDisableAll: 'Bruk "Aktiver alle" eller "Deaktiver alle" for raske batch-endringer',
    slotsBasedOnInterval: 'Tidspor er basert på intervallinnstillingen i "Åpningstider"-fanen (15/30/60 min)',
    dontForgetToSave: 'Ikke glem å klikke "Lagre endringer" nederst!',
    confirmationEmail: 'Bekreftelses-e-post',
    sendWhenBookingConfirmed: 'Send når bestilling bekreftes',
    reminderEmail: 'Påminnelses-e-post',
    sendBeforeReservation: 'Send før reservasjon',
    reminderTime: 'Påminnelsestid',
    hoursBeforeReservation: 'Timer før reservasjon',
    timeBarStartOfHour: 'Tidslinje start av time',
    showHourLabelsAtBeginning: 'Vis timetiketter ved start',
    highlightCurrentTime: 'Fremhev nåværende tid',
    showCurrentTimeIndicator: 'Vis nåværende tidsindikator',
    categories: 'Kategorier',
    allItems: 'Alle varer',
    addCategory: 'Legg til kategori',
    editCategory: 'Rediger kategori',
    addItem: 'Legg til vare',
    editItem: 'Rediger vare',
    itemName: 'Varenavn',
    price: 'Pris',
    allergens: 'Allergener',
    attributes: 'Egenskaper',
    actions: 'Handlinger',
    noMenuItemsYet: 'Ingen menyvarer ennå',
    addFirstItem: 'Klikk "Legg til vare" for å opprette din første menyvare',
    addFirstItemBtn: 'Legg til første vare',
    searchMenuItems: 'Søk i menyelementer…',
    summary: 'Sammendrag',
    total: 'totalt',
    active: 'aktive',
    hidden: 'skjulte',
    color: 'Farge',
    categoryName: 'Kategorinavn',
    subcategories: 'Underkategorier',
    addSubcategory: 'Legg til underkategori…',
    add: 'Legg til',
    content: 'Innhold',
    select: '— Velg —',
    none: '— Ingen —',
    delete: 'Slett',
    deleteItem: 'Slett {type}?',
    deleteConfirm: '"{name}" vil bli permanent fjernet.',
    cancel: 'Avbryt',
    deleting: 'Sletter…',
    saving: 'Lagrer...',
    saved: 'Lagret!',
    saveChanges: 'Lagre endringer',
    categoryAdded: 'Kategori lagt til',
    categoryUpdated: 'Kategori oppdatert',
    itemAdded: 'Vare lagt til',
    itemUpdated: 'Vare oppdatert',
    deleted: 'Slettet',
    failed: 'Mislyktes',
    activeStatus: 'Aktiv',
    hiddenStatus: 'Skjult',
    on: 'på',
    off: 'av',
    slots: 'Spor',
    alerts: 'Varsler',
    view: 'Visning',
    seats: 'Seter',
    book: 'Bestill',
  },
  sv: {
    general: 'Allmänt',
    booking: 'Bokning',
    menu: 'Meny',
    tables: 'Bord',
    hours: 'Öppettider',
    timeSlots: 'Tidsspalt',
    notifications: 'Aviseringar',
    display: 'Visning',
    twentyFourHourFormat: '24-timmarsformat',
    displayTimes24Hour: 'Visa tider i 24-timmarsformat',
    diningDuration: 'Måltidstid',
    defaultDiningTime: 'Standardtid för måltid',
    tableCleanup: 'Bordrensning',
    timeBetweenReservations: 'Tid mellan bokningar',
    totalSlotTime: 'Total tid',
    diningAndCleanup: 'Måltid + Rensning',
    guestBasedDuration: 'Gästbaserad varaktighet',
    setDurationByPartySize: 'Ange olika måltidstider baserat på sällskapets storlek',
    defineDurationPerRange: 'Definiera varaktighet (minuter) per gästintervall. Intervaller utvärderas uppifrån och ned — första träffen vinner.',
    previewByPartySize: 'Förhandsvisning efter sällskapsstorlek:',
    addRule: 'Lägg till regel',
    advanceBooking: 'Förhandsbeställning',
    maxDaysInAdvance: 'Max dagar i förväg',
    minNotice: 'Minsta varsel',
    hoursBeforeBooking: 'Timmar före bokning',
    publicBookingPage: 'Offentlig bokningssida inställningar',
    controlCustomerFields: 'Kontrollera vad kunder ser och måste ange',
    contactInfo: 'Kontaktinfo',
    usedInConfirmationEmails: 'Används i bekräftelsemejl som skickas till kunder',
    contactEmail: 'Kontakt e-post',
    contactPhone: 'Kontakt telefon',
    requireFullName: 'Kräv fullständigt namn',
    makeFullNameMandatory: 'Gör fullständigt namn obligatoriskt',
    requireEmail: 'Kräv e-post',
    makeEmailMandatory: 'Gör e-post obligatoriskt',
    requirePhone: 'Kräv telefon',
    makePhoneMandatory: 'Gör telefon obligatoriskt',
    showCompanyField: 'Visa företagsfält',
    displayCompanyField: 'Visa företagsfält',
    showNotesField: 'Visa anteckningsfält',
    allowSpecialRequests: 'Tillåt speciella önskemål',
    maxPartySize: 'Max sällskapsstorlek',
    maximumGuestsPerBooking: 'Max antal gäster per onlinebokning',
    minPartySize: 'Min sällskapsstorlek',
    minimumGuestsAllowed: 'Minsta antal gäster tillåtna',
    overallMaximum: 'Övergripande maximum — baserat på största bordet',
    blockFullSlots: 'Blockera fulla tider',
    preventBookingsWhenFull: 'Förhindra bokningar när fullt',
    allowWalkIns: 'Tillåt drop-in',
    walkInsWithoutTable: 'Drop-in utan bordstilldelning',
    birthdayOffer: 'Födelsedagserbjudande',
    showBirthdayField: 'Visa födelsedagsfält',
    askCustomersForBirthday: 'Fråga kunder om födelsedag',
    birthdayOfferMessage: 'Födelsedagserbjudande meddelande',
    shownAboveBirthdayPicker: 'Visas ovanför födelsedagsväljaren',
    menuOnBookingPage: 'Meny på bokningssida',
    showMenuOnPublicPage: 'Visa meny på offentlig sida',
    displayMenuBelowBooking: 'Visa menyn under bokningsformuläret',
    minGuestsToShowMenu: 'Min gäster för att visa meny',
    menuAppearsWhenPartySize: 'Menyn visas bara när sällskapets storlek når detta antal',
    requireGroupMenuSelection: 'Kräv gruppmenyval',
    forceCustomersToSelectItem: 'Tvinga kunder att välja ett menyalternativ innan bekräftelse',
    requirementMessage: 'Kravmeddelande',
    shownWhenGroupMenuRequired: 'Visas när gruppmenyval krävs',
    menuSectionTitle: 'Menysektion titel',
    headingShownAboveMenu: 'Rubrik som visas ovanför menyn',
    menuSectionSubtitle: 'Menysektion undertext',
    shownBelowTitle: 'Visas under titeln',
    reservationSuccessPage: 'Bokningsframgångssida',
    thankYouMessage: 'Tackmeddelande',
    shownAfterSuccessfulReservation: 'Visas efter lyckad bokning',
    restaurantPageUrl: 'Restaurang sidans URL',
    linkShownOnSuccessPage: 'Länk som visas på framgångssidan för att återgå till din webbplats',
    offerCampaignCode: 'Erbjudande / Kampanjkod',
    oneUnifiedCodeField: 'Ett enhetligt kodfält för alla marknadsföringskanaler — CRM-tack-mejl, Facebook, Instagram, Google Ads, flyers/QR-koder eller Dinery App. Länkar kan fylla i det automatiskt; gäster kan också skriva in en kod manuellt.',
    enableOfferCodeField: 'Aktivera erbjudandekodfält',
    showOfferCodeField: 'Visa ett erbjudandekodfält på den offentliga bokningssidan',
    fieldLabel: 'Fältetikett',
    shownAboveOfferCodeInput: 'Visas ovanför erbjudandekodfältet',
    requireTableAssignment: 'Kräv bordstilldelning',
    blockIfNoSuitableTable: 'Blockera om inget lämpligt bord',
    autoAssignTables: 'Auto-tilldela bord',
    automaticTableAssignment: 'Automatisk bordstilldelning',
    allowOverbooking: 'Tillåt överbokning',
    allowOverCapacity: 'Tillåt över kapacitet (rekommenderas inte)',
    showCapacityWarnings: 'Visa kapacitetsvarningar',
    alertWhenPartyExceedsCapacity: 'Varna när sällskapet överskrider kapacitet',
    closed: 'Stängd',
    slotInterval: 'Tidsintervall',
    howOftenTimeSlotsDisplayed: 'Tidsintervall: hur ofta tidsspalt visas',
    noStartBuffer: 'Ingen startbuffert',
    startBuffer: 'startbuffert',
    noEndBuffer: 'Ingen slutbuffert',
    endBuffer: 'slutbuffert',
    notAcceptingBookings: 'Tar inte emot bokningar',
    noOperatingHoursSet: 'Inga öppettider inställda',
    configureRestaurantHours: 'Vänligen konfigurera restaurangens öppettider i huvudinställningarna först',
    individualTimeSlotControl: 'Individuell tidsspaltkontroll',
    toggleSpecificTimeSlots: 'Aktivera/inaktivera specifika tidsspalt för varje dag. Grön = tillgänglig, Röd = blockerad.',
    restaurantHours: 'Restaurangens öppettider',
    bookings: 'bokningar',
    minSlots: 'min spalt',
    totalSlots: 'totalt spalt',
    availableTimeSlots: 'Tillgängliga tidsspalt',
    available: 'Tillgänglig',
    blocked: 'Blockerad',
    enableAllSlots: 'Aktivera alla spalt',
    disableAllSlots: 'Inaktivera alla spalt',
    restaurantClosedOn: 'Restaurangen är stängd på',
    noOperatingHoursConfigured: 'Inga öppettider konfigurerade',
    setOperatingHoursFirst: 'Vänligen ställ in restaurangens öppettider i huvudinställningarna innan du konfigurerar tidsspalt.',
    howThisWorks: 'Hur detta fungerar',
    greenSlotsAvailable: 'Gröna spalt är tillgängliga för kundbokningar',
    redSlotsBlocked: 'Röda överstrukna spalt är blockerade och kommer inte att visas på bokningssidor',
    clickToToggleSlot: 'Klicka på valfri tidsspalt för att växla mellan tillgänglig och blockerad',
    useEnableAllDisableAll: 'Använd "Aktivera alla" eller "Inaktivera alla" för snabba batchändringar',
    slotsBasedOnInterval: 'Tidsspalt baseras på intervallinställningen i "Öppettider"-fliken (15/30/60 min)',
    dontForgetToSave: 'Glöm inte att klicka på "Spara ändringar" längst ner!',
    confirmationEmail: 'Bekräftelsemejl',
    sendWhenBookingConfirmed: 'Skicka när bokning bekräftas',
    reminderEmail: 'Påminnelsemejl',
    sendBeforeReservation: 'Skicka före bokning',
    reminderTime: 'Påminnelsetid',
    hoursBeforeReservation: 'Timmar före bokning',
    timeBarStartOfHour: 'Tidslinje start av timme',
    showHourLabelsAtBeginning: 'Visa timetiketter vid start',
    highlightCurrentTime: 'Markera aktuell tid',
    showCurrentTimeIndicator: 'Visa aktuell tidsindikator',
    categories: 'Kategorier',
    allItems: 'Alla artiklar',
    addCategory: 'Lägg till kategori',
    editCategory: 'Redigera kategori',
    addItem: 'Lägg till artikel',
    editItem: 'Redigera artikel',
    itemName: 'Artikelnamn',
    price: 'Pris',
    allergens: 'Allergener',
    attributes: 'Egenskaper',
    actions: 'Åtgärder',
    noMenuItemsYet: 'Inga menyartiklar ännu',
    addFirstItem: 'Klicka på "Lägg till artikel" för att skapa din första menyartikel',
    addFirstItemBtn: 'Lägg till första artikel',
    searchMenuItems: 'Sök i menyalternativ…',
    summary: 'Sammanfattning',
    total: 'totalt',
    active: 'aktiva',
    hidden: 'dolda',
    color: 'Färg',
    categoryName: 'Kategorinamn',
    subcategories: 'Underkategorier',
    addSubcategory: 'Lägg till underkategori…',
    add: 'Lägg till',
    content: 'Innehåll',
    select: '— Välj —',
    none: '— Ingen —',
    delete: 'Ta bort',
    deleteItem: 'Ta bort {type}?',
    deleteConfirm: '"{name}" kommer att tas bort permanent.',
    cancel: 'Avbryt',
    deleting: 'Tar bort…',
    saving: 'Sparar...',
    saved: 'Sparad!',
    saveChanges: 'Spara ändringar',
    categoryAdded: 'Kategori tillagd',
    categoryUpdated: 'Kategori uppdaterad',
    itemAdded: 'Artikel tillagd',
    itemUpdated: 'Artikel uppdaterad',
    deleted: 'Borttagen',
    failed: 'Misslyckades',
    activeStatus: 'Aktiv',
    hiddenStatus: 'Dold',
    on: 'på',
    off: 'av',
    slots: 'Spalt',
    alerts: 'Varningar',
    view: 'Visa',
    seats: 'Säten',
    book: 'Boka',
  },
  de: {
    general: 'Allgemein',
    booking: 'Buchung',
    menu: 'Menü',
    tables: 'Tische',
    hours: 'Öffnungszeiten',
    timeSlots: 'Zeitslots',
    notifications: 'Benachrichtigungen',
    display: 'Anzeige',
    twentyFourHourFormat: '24-Stunden-Format',
    displayTimes24Hour: 'Zeiten im 24-Stunden-Format anzeigen',
    diningDuration: 'Essensdauer',
    defaultDiningTime: 'Standardzeit für Essen',
    tableCleanup: 'Tischreinigung',
    timeBetweenReservations: 'Zeit zwischen Reservierungen',
    totalSlotTime: 'Gesamtzeit',
    diningAndCleanup: 'Essen + Reinigung',
    guestBasedDuration: 'Gästebasierte Dauer',
    setDurationByPartySize: 'Verschiedene Essenszeiten basierend auf Gruppengröße festlegen',
    defineDurationPerRange: 'Dauer (Minuten) pro Gästebereich definieren. Bereiche werden von oben nach unten ausgewertet — erste Übereinstimmung gewinnt.',
    previewByPartySize: 'Vorschau nach Gruppengröße:',
    addRule: 'Regel hinzufügen',
    advanceBooking: 'Vorausbuchung',
    maxDaysInAdvance: 'Max. Tage im Voraus',
    minNotice: 'Mindestvorlauf',
    hoursBeforeBooking: 'Stunden vor Buchung',
    publicBookingPage: 'Öffentliche Buchungsseite Einstellungen',
    controlCustomerFields: 'Steuern Sie, was Kunden sehen und angeben müssen',
    contactInfo: 'Kontaktinfo',
    usedInConfirmationEmails: 'Wird in Bestätigungs-E-Mails an Kunden verwendet',
    contactEmail: 'Kontakt E-Mail',
    contactPhone: 'Kontakt Telefon',
    requireFullName: 'Vollständigen Namen verlangen',
    makeFullNameMandatory: 'Vollständigen Namen verpflichtend machen',
    requireEmail: 'E-Mail verlangen',
    makeEmailMandatory: 'E-Mail verpflichtend machen',
    requirePhone: 'Telefon verlangen',
    makePhoneMandatory: 'Telefon verpflichtend machen',
    showCompanyField: 'Firmenfeld anzeigen',
    displayCompanyField: 'Firmenfeld anzeigen',
    showNotesField: 'Notizfeld anzeigen',
    allowSpecialRequests: 'Besondere Wünsche erlauben',
    maxPartySize: 'Max. Gruppengröße',
    maximumGuestsPerBooking: 'Max. Gäste pro Online-Buchung',
    minPartySize: 'Min. Gruppengröße',
    minimumGuestsAllowed: 'Min. erlaubte Gäste',
    overallMaximum: 'Gesamtmaximum — basierend auf größtem Tisch',
    blockFullSlots: 'Volle Slots blockieren',
    preventBookingsWhenFull: 'Buchungen verhindern wenn voll',
    allowWalkIns: 'Laufkundschaft erlauben',
    walkInsWithoutTable: 'Laufkundschaft ohne Tischzuweisung',
    birthdayOffer: 'Geburtstagsangebot',
    showBirthdayField: 'Geburtstagsfeld anzeigen',
    askCustomersForBirthday: 'Kunden nach Geburtstag fragen',
    birthdayOfferMessage: 'Geburtstagsangebot Nachricht',
    shownAboveBirthdayPicker: 'Über dem Geburtstagsauswahlfeld angezeigt',
    menuOnBookingPage: 'Menü auf Buchungsseite',
    showMenuOnPublicPage: 'Menü auf öffentlicher Seite anzeigen',
    displayMenuBelowBooking: 'Menü unter dem Buchungsformular anzeigen',
    minGuestsToShowMenu: 'Min. Gäste für Menüanzeige',
    menuAppearsWhenPartySize: 'Menü wird nur angezeigt, wenn die Gruppengröße diese Anzahl erreicht',
    requireGroupMenuSelection: 'Gruppenmenüauswahl verlangen',
    forceCustomersToSelectItem: 'Kunden zwingen, vor der Bestätigung ein Menüelement auszuwählen',
    requirementMessage: 'Anforderungsnachricht',
    shownWhenGroupMenuRequired: 'Wird angezeigt, wenn Gruppenmenüauswahl erforderlich ist',
    menuSectionTitle: 'Menübereich Titel',
    headingShownAboveMenu: 'Überschrift über dem Menü',
    menuSectionSubtitle: 'Menübereich Untertitel',
    shownBelowTitle: 'Unter dem Titel angezeigt',
    reservationSuccessPage: 'Buchungserfolgsseite',
    thankYouMessage: 'Dankesnachricht',
    shownAfterSuccessfulReservation: 'Nach erfolgreicher Buchung angezeigt',
    restaurantPageUrl: 'Restaurant-Seiten-URL',
    linkShownOnSuccessPage: 'Link auf Erfolgsseite zur Rückkehr zu Ihrer Website',
    offerCampaignCode: 'Angebot / Kampagnencode',
    oneUnifiedCodeField: 'Ein einheitliches Codefeld für alle Marketingkanäle — CRM-Dankes-E-Mails, Facebook, Instagram, Google Ads, Flyer/QR-Codes oder die Dinery App. Links können es automatisch ausfüllen; Gäste können auch manuell einen Code eingeben.',
    enableOfferCodeField: 'Angebotscodefeld aktivieren',
    showOfferCodeField: 'Ein Angebotscodefeld auf der öffentlichen Buchungsseite anzeigen',
    fieldLabel: 'Feldbezeichnung',
    shownAboveOfferCodeInput: 'Über dem Angebotscodefeld angezeigt',
    requireTableAssignment: 'Tischzuweisung verlangen',
    blockIfNoSuitableTable: 'Blockieren wenn kein geeigneter Tisch',
    autoAssignTables: 'Tische automatisch zuweisen',
    automaticTableAssignment: 'Automatische Tischzuweisung',
    allowOverbooking: 'Überbuchung erlauben',
    allowOverCapacity: 'Über Kapazität erlauben (nicht empfohlen)',
    showCapacityWarnings: 'Kapazitätswarnungen anzeigen',
    alertWhenPartyExceedsCapacity: 'Warnen wenn Gruppe Kapazität überschreitet',
    closed: 'Geschlossen',
    slotInterval: 'Slot-Intervall',
    howOftenTimeSlotsDisplayed: 'Slot-Intervall: wie oft Zeitslots angezeigt werden',
    noStartBuffer: 'Kein Startpuffer',
    startBuffer: 'Startpuffer',
    noEndBuffer: 'Kein Endpuffer',
    endBuffer: 'Endpuffer',
    notAcceptingBookings: 'Nimmt keine Buchungen an',
    noOperatingHoursSet: 'Keine Öffnungszeiten festgelegt',
    configureRestaurantHours: 'Bitte konfigurieren Sie zuerst die Öffnungszeiten des Restaurants in den Haupt-Einstellungen',
    individualTimeSlotControl: 'Individuelle Zeitslot-Steuerung',
    toggleSpecificTimeSlots: 'Spezifische Zeitslots für jeden Tag ein-/ausschalten. Grün = verfügbar, Rot = blockiert.',
    restaurantHours: 'Öffnungszeiten des Restaurants',
    bookings: 'Buchungen',
    minSlots: 'min Slots',
    totalSlots: 'Slots insgesamt',
    availableTimeSlots: 'Verfügbare Zeitslots',
    available: 'Verfügbar',
    blocked: 'Blockiert',
    enableAllSlots: 'Alle Slots aktivieren',
    disableAllSlots: 'Alle Slots deaktivieren',
    restaurantClosedOn: 'Restaurant ist geschlossen am',
    noOperatingHoursConfigured: 'Keine Öffnungszeiten konfiguriert',
    setOperatingHoursFirst: 'Bitte legen Sie zuerst die Öffnungszeiten des Restaurants in den Haupt-Einstellungen fest, bevor Sie Zeitslots konfigurieren.',
    howThisWorks: 'So funktioniert es',
    greenSlotsAvailable: 'Grüne Slots sind für Kundenbuchungen verfügbar',
    redSlotsBlocked: 'Rote durchgestrichene Slots sind blockiert und erscheinen nicht auf Buchungsseiten',
    clickToToggleSlot: 'Klicken Sie auf einen beliebigen Zeitslot, um zwischen verfügbar und blockiert umzuschalten',
    useEnableAllDisableAll: 'Verwenden Sie "Alle aktivieren" oder "Alle deaktivieren" für schnelle Batch-Änderungen',
    slotsBasedOnInterval: 'Zeitslots basieren auf der Intervall-Einstellung im "Öffnungszeiten"-Tab (15/30/60 min)',
    dontForgetToSave: 'Vergessen Sie nicht, unten auf "Änderungen speichern" zu klicken!',
    confirmationEmail: 'Bestätigungs-E-Mail',
    sendWhenBookingConfirmed: 'Senden wenn Buchung bestätigt wird',
    reminderEmail: 'Erinnerungs-E-Mail',
    sendBeforeReservation: 'Vor der Reservierung senden',
    reminderTime: 'Erinnerungszeit',
    hoursBeforeReservation: 'Stunden vor der Reservierung',
    timeBarStartOfHour: 'Zeitbalken Stundenbeginn',
    showHourLabelsAtBeginning: 'Stundenmarkierungen am Anfang anzeigen',
    highlightCurrentTime: 'Aktuelle Zeit hervorheben',
    showCurrentTimeIndicator: 'Aktuelle Zeitindikator anzeigen',
    categories: 'Kategorien',
    allItems: 'Alle Artikel',
    addCategory: 'Kategorie hinzufügen',
    editCategory: 'Kategorie bearbeiten',
    addItem: 'Artikel hinzufügen',
    editItem: 'Artikel bearbeiten',
    itemName: 'Artikelname',
    price: 'Preis',
    allergens: 'Allergene',
    attributes: 'Eigenschaften',
    actions: 'Aktionen',
    noMenuItemsYet: 'Noch keine Menüartikel',
    addFirstItem: 'Klicken Sie auf "Artikel hinzufügen", um Ihren ersten Menüartikel zu erstellen',
    addFirstItemBtn: 'Ersten Artikel hinzufügen',
    searchMenuItems: 'Menüpunkte durchsuchen…',
    summary: 'Zusammenfassung',
    total: 'gesamt',
    active: 'aktiv',
    hidden: 'versteckt',
    color: 'Farbe',
    categoryName: 'Kategoriename',
    subcategories: 'Unterkategorien',
    addSubcategory: 'Unterkategorie hinzufügen…',
    add: 'Hinzufügen',
    content: 'Inhalt',
    select: '— Auswählen —',
    none: '— Keine —',
    delete: 'Löschen',
    deleteItem: '{type} löschen?',
    deleteConfirm: '"{name}" wird dauerhaft entfernt.',
    cancel: 'Abbrechen',
    deleting: 'Lösche…',
    saving: 'Speichere...',
    saved: 'Gespeichert!',
    saveChanges: 'Änderungen speichern',
    categoryAdded: 'Kategorie hinzugefügt',
    categoryUpdated: 'Kategorie aktualisiert',
    itemAdded: 'Artikel hinzugefügt',
    itemUpdated: 'Artikel aktualisiert',
    deleted: 'Gelöscht',
    failed: 'Fehlgeschlagen',
    activeStatus: 'Aktiv',
    hiddenStatus: 'Versteckt',
    on: 'ein',
    off: 'aus',
    slots: 'Slots',
    alerts: 'Alarme',
    view: 'Ansicht',
    seats: 'Sitze',
    book: 'Buchen',
  },
};

// ─── Menu Category Panel ────────────────────────────────────────────────────
const MenuCategoryPanel = ({ restaurantId, collectionName, t }) => {
  const [categories, setCategories] = useState([]);
  const [itemCounts, setItemCounts]  = useState({});
  const [loading, setLoading]        = useState(true);
  const [expanded, setExpanded]      = useState({});

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [catSnap, itemSnap] = await Promise.all([
          getDocs(collection(db, collectionName, restaurantId, 'menuCategories')),
          getDocs(collection(db, collectionName, restaurantId, 'menuItems')),
        ]);
        const cats = catSnap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a,b) => (a.sortOrder||0) - (b.sortOrder||0));
        const counts = {};
        itemSnap.docs.forEach(d => {
          const cat = d.data().category;
          if (cat) counts[cat] = (counts[cat] || 0) + 1;
        });
        setCategories(cats);
        setItemCounts(counts);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [restaurantId, collectionName]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (categories.length === 0) return (
    <div className="flex flex-col items-center justify-center py-10 text-center px-4">
      <span className="text-4xl mb-3">🍽️</span>
      <p className="text-sm font-semibold text-gray-600">{t('noMenuItemsYet')}</p>
      <p className="text-xs text-gray-400 mt-1">{t('addFirstItem')}</p>
    </div>
  );

  const totalItems = Object.values(itemCounts).reduce((s,n) => s+n, 0);

  return (
    <div>
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-4 overflow-x-auto">
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">{categories.length}</p>
          <p className="text-[10px] text-gray-400 uppercase">{t('categories')}</p>
        </div>
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-gray-800">{totalItems}</p>
          <p className="text-[10px] text-gray-400 uppercase">{t('items')}</p>
        </div>
        <div className="w-px h-8 bg-gray-200 flex-shrink-0" />
        <div className="text-center flex-shrink-0">
          <p className="text-lg font-bold text-green-600">
            {categories.filter(c => c.active !== false).length}
          </p>
          <p className="text-[10px] text-gray-400 uppercase">{t('active')}</p>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
        {categories.map(cat => {
          const count = itemCounts[cat.id] || 0;
          const subs  = cat.subcategories || [];
          const isOpen = expanded[cat.id];
          return (
            <div key={cat.id}>
              <div
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => subs.length > 0 && setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
              >
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color || '#fe8a24' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                    {cat.name?.en || 'Unnamed'}
                  </p>
                  {subs.length > 0 && (
                    <span className="text-[10px] sm:text-xs text-gray-400">{subs.length} {t('subcategories')}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-600 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {count} {t('items')}
                  </span>
                  <span className={`text-[8px] sm:text-[10px] font-semibold px-1 sm:px-1.5 py-0.5 rounded-full ${
                    cat.active !== false
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'
                  }`}>
                    {cat.active !== false ? t('on') : t('off')}
                  </span>
                  {subs.length > 0 && (
                    <svg className={`w-3 h-3 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''} flex-shrink-0`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
              {isOpen && subs.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 sm:gap-3 pl-6 sm:pl-10 pr-3 sm:pr-4 py-1 sm:py-1.5 bg-gray-50/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                  <p className="text-[10px] sm:text-xs text-gray-600 flex-1 truncate">{sub.name?.en || sub.id}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Menu Panel (self-contained inside Settings) ────────────────────────────
const MENU_LANGUAGES = [
  { code: 'en', flag: '🇬🇧', label: 'EN', name: 'English'   },
  { code: 'no', flag: '🇳🇴', label: 'NO', name: 'Norwegian' },
  { code: 'da', flag: '🇩🇰', label: 'DA', name: 'Danish'    },
  { code: 'se', flag: '🇸🇪', label: 'SE', name: 'Swedish'   },
  { code: 'fi', flag: '🇫🇮', label: 'FI', name: 'Finnish'   },
];

const MENU_ALLERGENS = [
  { id: 'gluten',    label: 'Gluten',    icon: '🌾' },
  { id: 'shellfish', label: 'Shellfish', icon: '🦐' },
  { id: 'eggs',      label: 'Eggs',      icon: '🥚' },
  { id: 'fish',      label: 'Fish',      icon: '🐟' },
  { id: 'peanuts',   label: 'Peanuts',   icon: '🥜' },
  { id: 'soy',       label: 'Soy',       icon: '🫘' },
  { id: 'milk',      label: 'Milk',      icon: '🥛' },
  { id: 'nuts',      label: 'Nuts',      icon: '🌰' },
  { id: 'celery',    label: 'Celery',    icon: '🥬' },
  { id: 'mustard',   label: 'Mustard',   icon: '🌭' },
  { id: 'sesame',    label: 'Sesame',    icon: '⚪' },
  { id: 'sulphites', label: 'Sulphites', icon: '🍷' },
  { id: 'lupin',     label: 'Lupin',     icon: '🌼' },
  { id: 'molluscs',  label: 'Molluscs',  icon: '🦪' },
];

const MENU_ATTRIBUTES = [
  { id: 'vegan',       label: 'Vegan',       icon: '🌱', color: '#16a34a' },
  { id: 'vegetarian',  label: 'Vegetarian',  icon: '🥗', color: '#15803d' },
  { id: 'gluten_free', label: 'Gluten Free', icon: '🚫', color: '#d97706' },
  { id: 'spicy',       label: 'Spicy',       icon: '🌶️', color: '#dc2626' },
  { id: 'halal',       label: 'Halal',       icon: '☪️',  color: '#2563eb' },
  { id: 'kosher',      label: 'Kosher',      icon: '✡️',  color: '#7c3aed' },
  { id: 'organic',     label: 'Organic',     icon: '🌿', color: '#059669' },
  { id: 'popular',     label: 'Popular',     icon: '⭐', color: '#f59e0b' },
  { id: 'new',         label: 'New',         icon: '🆕', color: '#3b82f6' },
  { id: 'kids',        label: "Kids'",       icon: '👶', color: '#ec4899' },
];

const emptyLangs  = () => Object.fromEntries(MENU_LANGUAGES.map(l => [l.code, '']));
const emptyItem   = (catId = '') => ({
  name: emptyLangs(), description: emptyLangs(),
  price: '', category: catId, subcategory: '',
  allergens: [], attributes: [], active: true, sortOrder: 0,
});
const emptyCategory = () => ({
  name: emptyLangs(), sortOrder: 0, active: true,
  color: '#fe8a24', subcategories: [],
});

const MenuPanel = ({ restaurantId, collectionName }) => {
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

  const [categories, setCategories] = useState([]);
  const [menuItems,  setMenuItems]   = useState([]);
  const [loading,    setLoading]     = useState(true);
  const [saving,     setSaving]      = useState(false);
  const [toast,      setToast]       = useState(null);

  const [selectedCat,  setSelectedCat]  = useState(null);
  const [viewLang,     setViewLang]     = useState('en');
  const [searchQ,      setSearchQ]      = useState('');
  const [sortBy,       setSortBy]       = useState('sortOrder');

  // Modals
  const [itemModal,   setItemModal]   = useState(null);
  const [catModal,    setCatModal]    = useState(null);
  const [deleteConf,  setDeleteConf]  = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    if (!restaurantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [cs, is] = await Promise.all([
          getDocs(collection(db, collectionName, restaurantId, 'menuCategories')),
          getDocs(collection(db, collectionName, restaurantId, 'menuItems')),
        ]);
        const cats  = cs.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
        const items = is.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0));
        setCategories(cats);
        setMenuItems(items);
        if (cats.length > 0) setSelectedCat(cats[0].id);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [restaurantId, collectionName]);

  const saveCat = async (form) => {
    setSaving(true);
    try {
      if (catModal === 'add') {
        const ref = await addDoc(collection(db, collectionName, restaurantId, 'menuCategories'),
          { ...form, sortOrder: categories.length, createdAt: new Date() });
        setCategories(p => [...p, { id: ref.id, ...form }]);
        setSelectedCat(ref.id);
        showToast(t('categoryAdded'));
      } else {
        await updateDoc(doc(db, collectionName, restaurantId, 'menuCategories', catModal.id), form);
        setCategories(p => p.map(c => c.id === catModal.id ? { ...c, ...form } : c));
        showToast(t('categoryUpdated'));
      }
      setCatModal(null);
    } catch(e) { showToast(t('failed'), 'error'); }
    finally { setSaving(false); }
  };

  const saveItem = async (form) => {
    setSaving(true);
    try {
    if (itemModal === 'add') {
            const catItems = menuItems.filter(i => i.category === form.category);
            const maxOrder = catItems.length > 0 ? Math.max(...catItems.map(i => i.sortOrder || 0)) + 1 : 0;
            const ref = await addDoc(collection(db, collectionName, restaurantId, 'menuItems'),
              { ...form, sortOrder: maxOrder, createdAt: new Date() });
        setMenuItems(p => [...p, { id: ref.id, ...form }]);
        showToast(t('itemAdded'));
      } else {
        await updateDoc(doc(db, collectionName, restaurantId, 'menuItems', itemModal.id), form);
        setMenuItems(p => p.map(i => i.id === itemModal.id ? { ...i, ...form } : i));
        showToast(t('itemUpdated'));
      }
      setItemModal(null);
    } catch(e) { showToast(t('failed'), 'error'); }
    finally { setSaving(false); }
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      if (deleteConf.type === 'item') {
        await deleteDoc(doc(db, collectionName, restaurantId, 'menuItems', deleteConf.id));
        setMenuItems(p => p.filter(i => i.id !== deleteConf.id));
      } else {
        await deleteDoc(doc(db, collectionName, restaurantId, 'menuCategories', deleteConf.id));
        setCategories(p => p.filter(c => c.id !== deleteConf.id));
        setMenuItems(p => p.filter(i => i.category !== deleteConf.id));
        if (selectedCat === deleteConf.id) setSelectedCat(null);
      }
      showToast(t('deleted'));
      setDeleteConf(null);
    } catch(e) { showToast(t('failed'), 'error'); }
    finally { setSaving(false); }
  };

  const filteredItems = menuItems
    .filter(i => {
      if (selectedCat && i.category !== selectedCat) return false;
      if (searchQ) {
        const q = searchQ.toLowerCase();
        return Object.values(i.name||{}).join(' ').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.name?.en || '').localeCompare(b.name?.en || '');
      if (sortBy === 'price') return (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0);
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    });

  const handleDragStart = (e, index) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('dragIndex', String(index));
    };

    const handleDrop = async (e, dropIndex) => {
      e.preventDefault();
      const dragIndex = parseInt(e.dataTransfer.getData('dragIndex'));
      if (isNaN(dragIndex) || dragIndex === dropIndex) return;
      const reordered = [...filteredItems];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(dropIndex, 0, moved);
      const updates = reordered.map((item, i) => ({ ...item, sortOrder: i }));
      setMenuItems(prev => {
        const ids = new Set(updates.map(u => u.id));
        return [...prev.filter(i => !ids.has(i.id)), ...updates]
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      });
      await Promise.all(
        updates.map(item =>
          updateDoc(doc(db, collectionName, restaurantId, 'menuItems', item.id), { sortOrder: item.sortOrder })
        )
      ).catch(err => { console.error(err); showToast(t('failed'), 'error'); });
      showToast('Order saved');
    };

    if (loading) return (
      <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0" style={{ minHeight: '500px', height: '100%' }}>

      {/* ── Left sidebar ── */}
      <div className="w-full md:w-64 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-white">
          <span className="text-xs sm:text-sm font-bold text-gray-700 uppercase tracking-wider">📁 {t('categories')}</span>
          <button onClick={() => setCatModal('add')}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#fe8a24] text-white flex items-center justify-center hover:bg-[#ff9d47] transition-all shadow-sm">
            <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 max-h-64 md:max-h-none">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-between transition-colors ${
              !selectedCat ? 'bg-[#fe8a24]/10 text-[#fe8a24] border-r-2 border-[#fe8a24]' : 'text-gray-700 hover:bg-gray-100'
            }`}>
            <span>📋 {t('allItems')}</span>
            <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-700 px-1.5 sm:px-2 py-0.5 rounded-full font-semibold">{menuItems.length}</span>
          </button>
          {categories.map(cat => {
            const count = menuItems.filter(i => i.category === cat.id).length;
            const isSel = selectedCat === cat.id;
            return (
              <div key={cat.id}
                className={`group flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 cursor-pointer transition-colors ${
                  isSel ? 'bg-white border-r-2 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                }`}
                style={isSel ? { borderRightColor: cat.color || '#fe8a24' } : {}}
                onClick={() => setSelectedCat(cat.id)}>
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: cat.color || '#fe8a24' }} />
                  <span className="text-xs sm:text-sm font-semibold truncate">{cat.name?.[viewLang] || cat.name?.en || 'Unnamed'}</span>
                  {!cat.active && <span className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-200 px-1 rounded">off</span>}
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-[10px] sm:text-xs font-semibold text-gray-500 bg-gray-200 px-1.5 sm:px-2 py-0.5 rounded-full">{count}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5 sm:gap-1">
                    <button onClick={e => { e.stopPropagation(); setCatModal(cat); }}
                      className="p-0.5 sm:p-1 rounded hover:bg-white text-gray-500 hover:text-[#fe8a24] transition-colors">
                      <FiEdit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setDeleteConf({ type: 'category', id: cat.id, name: cat.name?.en || 'this' }); }}
                      className="p-0.5 sm:p-1 rounded hover:bg-white text-gray-500 hover:text-red-500 transition-colors">
                      <FiTrash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: items ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-b border-gray-200 flex items-center gap-2 sm:gap-3 flex-wrap flex-shrink-0 bg-white">
          <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 flex-1 sm:flex-initial">
            <FiSearch className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder={t('searchMenuItems')}
              className="bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none w-20 sm:w-32 placeholder:text-xs sm:placeholder:text-sm" />
            {searchQ && <button onClick={() => setSearchQ('')} className="text-gray-400 hover:text-gray-600"><FiX className="w-3.5 h-3.5 sm:w-4 sm:h-4" /></button>}
          </div>
          
          {/* Lang switcher - scrollable on mobile */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1 overflow-x-auto">
            {MENU_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setViewLang(l.code)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                  viewLang === l.code ? 'bg-[#fe8a24] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-100 rounded-lg p-0.5 sm:p-1">
            {[['sortOrder','⠿ Order'],['name','A–Z'],['price','Price']].map(([key, label]) => (
              <button key={key} onClick={() => setSortBy(key)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-semibold transition-all whitespace-nowrap ${
                  sortBy === key ? 'bg-[#fe8a24] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setItemModal('add')}
            className="ml-auto flex items-center gap-1 sm:gap-2 bg-[#fe8a24] hover:bg-[#ff9d47] text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-sm font-semibold transition-all shadow-sm">
            <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">{t('addItem')}</span>
          </button>
        </div>

        {/* Items list - responsive grid */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-4">
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8 sm:py-16">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 sm:mb-4 text-3xl sm:text-4xl shadow-inner">🍽️</div>
              <p className="text-sm sm:text-base font-semibold text-gray-600">{t('noMenuItemsYet')}</p>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">{t('addFirstItem')}</p>
              <button onClick={() => setItemModal('add')}
                className="mt-3 sm:mt-4 flex items-center gap-2 bg-[#fe8a24] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold hover:bg-[#ff9d47] transition-all shadow-md">
                <FiPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {t('addFirstItemBtn')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Header row - hidden on mobile */}
              <div className={`hidden md:grid px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-50 rounded-lg ${sortBy === 'sortOrder' ? 'pl-8' : ''}`}
                style={{ gridTemplateColumns: '1fr 100px 180px 180px 100px' }}>
                <span>🍽️ {t('itemName')}</span>
                <span>💰 {t('price')}</span>
                <span>⚠️ {t('allergens')}</span>
                <span>🏷️ {t('attributes')}</span>
                <span>⚡ {t('actions')}</span>
              </div>
              
              {filteredItems.map(item => {
                const cat = categories.find(c => c.id === item.category);
                const name = item.name?.[viewLang] || item.name?.en || 'Unnamed';
                const desc = item.description?.[viewLang] || item.description?.en || '';
                return (
                <div key={item.id}
                    draggable={sortBy === 'sortOrder'}
                    onDragStart={(e) => handleDragStart(e, filteredItems.indexOf(item))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, filteredItems.indexOf(item))}
                    className={`relative grid grid-cols-1 md:grid-cols-[1fr,100px,180px,180px,100px] items-start md:items-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl border-2 transition-all hover:shadow-md cursor-pointer group gap-2 ${
                      item.active ? 'bg-white border-gray-200 hover:border-[#fe8a24]/40' : 'bg-gray-50 border-gray-200 opacity-60'
                    } ${sortBy === 'sortOrder' ? 'pl-6 sm:pl-8' : ''}`}
                    onClick={() => setItemModal(item)}>
                    {sortBy === 'sortOrder' && (
                      <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing select-none text-lg leading-none">⠿</div>
                    )}
                    
                    {/* Name + desc */}
                    <div className="min-w-0 pr-1 sm:pr-3">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {cat && <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ background: cat.color || '#fe8a24' }} />}
                        <span className="text-sm sm:text-base font-bold text-gray-900 truncate">{name}</span>
                        {!item.active && <span className="text-[8px] sm:text-[10px] text-gray-400 bg-gray-200 px-1 sm:px-1.5 py-0.5 rounded">{t('hidden')}</span>}
                      </div>
                      {desc && <p className="text-[10px] sm:text-xs text-gray-500 truncate mt-0.5 sm:mt-1 ml-1 sm:ml-3">{desc}</p>}
                    </div>

                    {/* Price */}
                    <div className="text-base sm:text-lg font-bold text-gray-900">
                      {item.price ? `${item.price} NOK` : <span className="text-gray-300 text-xs sm:text-sm">—</span>}
                    </div>

                    {/* Allergens */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {(item.allergens||[]).slice(0, 3).map(id => {
                        const a = MENU_ALLERGENS.find(x=>x.id===id);
                        return a ? <span key={id} className="text-[8px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">{a.icon} {a.label}</span> : null;
                      })}
                      {(item.allergens||[]).length > 3 && (
                        <span className="text-[8px] sm:text-xs font-semibold text-gray-500 bg-gray-100 px-1 sm:px-2 py-0.5 rounded-full">
                          +{item.allergens.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Attributes */}
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                      {(item.attributes||[]).slice(0, 2).map(id => {
                        const a = MENU_ATTRIBUTES.find(x=>x.id===id);
                        return a ? <span key={id} className="text-[8px] sm:text-xs px-1 sm:px-2 py-0.5 rounded-full font-semibold" style={{ background: a.color+'20', color: a.color }}>{a.icon} {a.label}</span> : null;
                      })}
                      {(item.attributes||[]).length > 2 && (
                        <span className="text-[8px] sm:text-xs font-semibold text-gray-500 bg-gray-100 px-1 sm:px-2 py-0.5 rounded-full">
                          +{item.attributes.length - 2}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 sm:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity justify-end md:justify-start" onClick={e=>e.stopPropagation()}>
                      <button onClick={() => setItemModal(item)} 
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#fe8a24] transition-colors">
                        <FiEdit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                      <button onClick={() => setDeleteConf({ type: 'item', id: item.id, name })} 
                        className="p-1 sm:p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors">
                        <FiTrash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer - responsive */}
        <div className="px-3 sm:px-5 py-2 sm:py-3 border-t border-gray-100 bg-gray-50 flex-shrink-0 overflow-x-auto">
          <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-sm text-gray-600 flex-nowrap">
            <span className="font-semibold hidden xs:inline">{t('summary')}:</span>
            <span><span className="font-bold text-gray-800">{menuItems.length}</span> {t('total')}</span>
            <span className="text-green-700"><span className="font-bold text-green-600">{menuItems.filter(i=>i.active).length}</span> {t('active')}</span>
            <span className="text-gray-500 hidden sm:inline"><span className="font-bold">{menuItems.filter(i=>!i.active).length}</span> {t('hidden')}</span>
            <span className="text-blue-700 hidden md:inline"><span className="font-bold">{categories.length}</span> {t('categories')}</span>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl shadow-xl text-xs sm:text-sm font-semibold text-white max-w-[90vw] text-center ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-gray-900'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* ── Delete confirm ── */}
      {deleteConf && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteConf(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-4 sm:p-6 w-11/12 sm:w-96 mx-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 text-center mb-2">{t('deleteItem').replace('{type}', deleteConf.type === 'item' ? t('item') : t('category'))}</h3>
            <p className="text-xs sm:text-sm text-gray-500 text-center mb-4 sm:mb-5">{t('deleteConfirm').replace('{name}', deleteConf.name)}</p>
            <div className="flex gap-2 sm:gap-3">
              <button onClick={() => setDeleteConf(null)} className="flex-1 py-2 sm:py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm text-gray-600 hover:bg-gray-50 transition-colors">{t('cancel')}</button>
              <button onClick={confirmDelete} disabled={saving} className="flex-1 py-2 sm:py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors">
                {saving ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Category modal ── */}
      {catModal && (
        <MenuCatModal
          category={catModal === 'add' ? null : catModal}
          onSave={saveCat}
          onClose={() => setCatModal(null)}
          saving={saving}
          viewLang={viewLang}
          t={t}
        />
      )}

      {/* ── Item modal ── */}
      {itemModal && (
        <MenuItemModal
          item={itemModal === 'add' ? null : itemModal}
          categories={categories}
          onSave={saveItem}
          onClose={() => setItemModal(null)}
          saving={saving}
          defaultCat={selectedCat}
          t={t}
        />
      )}
    </div>
  );
};

// ── Category modal ───────────────────────────────────────────────────────────
const MenuCatModal = ({ category, onSave, onClose, saving, viewLang, t }) => {
  const [form, setForm] = useState(category || emptyCategory());
  const [activeLang, setActiveLang] = useState('en');
  const [newSub, setNewSub] = useState('');
  const COLORS = ['#fe8a24','#ef4444','#3b82f6','#10b981','#8b5cf6','#f59e0b','#ec4899','#06b6d4','#64748b','#1e293b'];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900">{category ? t('editCategory') : t('addCategory')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><FiX className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 sm:mb-2">{t('color')}</label>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {COLORS.map(col => (
                <button key={col} onClick={() => setForm(p=>({...p,color:col}))}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg transition-all ${form.color===col?'ring-2 ring-offset-1 ring-gray-400 scale-110':'hover:scale-105'}`}
                  style={{ background: col }} />
              ))}
              <label><input type="color" value={form.color} onChange={e=>setForm(p=>({...p,color:e.target.value}))} className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg border border-gray-200 cursor-pointer" /></label>
            </div>
          </div>
          {/* Lang tabs */}
          <div className="flex gap-0.5 sm:gap-1 flex-wrap">
            {MENU_LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setActiveLang(l.code)}
                className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold ${activeLang===l.code?'bg-[#fe8a24] text-white':'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {l.flag} {l.label}
              </button>
            ))}
          </div>
          {/* Name per lang */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('categoryName')}</label>
            {MENU_LANGUAGES.filter(l => l.code === activeLang).map(l => (
              <div key={l.code} className="flex items-center gap-2">
                <span className="text-xs sm:text-sm flex-shrink-0">{l.flag}</span>
                <input type="text" value={form.name[l.code]||''} onChange={e=>setForm(p=>({...p,name:{...p.name,[l.code]:e.target.value}}))}
                  placeholder={`${t('name')} in ${l.name}…`}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
              </div>
            ))}
          </div>
          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => setForm(p=>({...p,active:!p.active}))}
              className={`w-10 h-5 rounded-full relative transition-colors ${form.active?'bg-green-500':'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active?'translate-x-5':'translate-x-0.5'}`} />
            </div>
            <span className="text-xs sm:text-sm text-gray-700">{form.active ? t('activeStatus') : t('hiddenStatus')}</span>
          </label>
          {/* Subcategories */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">{t('subcategories')}</label>
            <div className="space-y-1 mb-2">
              {(form.subcategories||[]).map(sub => (
                <div key={sub.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5">
                  <span className="flex-1 text-[10px] sm:text-xs text-gray-700 truncate">{sub.name?.en||sub.id}</span>
                  <button onClick={() => setForm(p=>({...p,subcategories:(p.subcategories||[]).filter(s=>s.id!==sub.id)}))}
                    className="text-gray-400 hover:text-red-500"><FiX className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={newSub} onChange={e=>setNewSub(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&newSub.trim()){setForm(p=>({...p,subcategories:[...(p.subcategories||[]),{id:Date.now().toString(),name:{...Object.fromEntries(MENU_LANGUAGES.map(l=>[l.code,''])),en:newSub.trim()},active:true}]}));setNewSub('');}}}
                placeholder={t('addSubcategory')}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#fe8a24]" />
              <button onClick={()=>{if(newSub.trim()){setForm(p=>({...p,subcategories:[...(p.subcategories||[]),{id:Date.now().toString(),name:{...Object.fromEntries(MENU_LANGUAGES.map(l=>[l.code,''])),en:newSub.trim()},active:true}]}));setNewSub('');}}}
                className="px-3 py-1.5 bg-[#fe8a24] text-white rounded-lg text-xs font-semibold hover:bg-[#ff9d47] whitespace-nowrap">{t('add')}</button>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50">{t('cancel')}</button>
          <button onClick={() => onSave(form)} disabled={saving}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#fe8a24] text-white rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-[#ff9d47]">
            {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <FiCheck className="w-4 h-4" />}
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Item modal ───────────────────────────────────────────────────────────────
const MenuItemModal = ({ item, categories, onSave, onClose, saving, defaultCat, t }) => {
  const [form, setForm] = useState(item || emptyItem(defaultCat || ''));
  const [activeLang, setActiveLang] = useState('en');
  const [tab, setTab] = useState('basic');

  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const toggleArr = (k,v) => setForm(p=>({...p,[k]:p[k].includes(v)?p[k].filter(x=>x!==v):[...p[k],v]}));
  const subcats = categories.find(c=>c.id===form.category)?.subcategories||[];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-gray-900">{item ? t('editItem') : t('addItem')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500"><FiX className="w-4 h-4" /></button>
        </div>
        {/* Lang tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-5 py-1.5 sm:py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {MENU_LANGUAGES.map(l=>(
            <button key={l.code} onClick={()=>setActiveLang(l.code)}
              className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded font-bold whitespace-nowrap ${activeLang===l.code?'bg-[#fe8a24] text-white':'bg-white border border-gray-200 text-gray-500 hover:border-[#fe8a24]'}`}>
              {l.flag} {l.label}
            </button>
          ))}
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 px-3 sm:px-5 overflow-x-auto">
          {[['basic', t('content')],['allergens', t('allergens')],['attributes', t('attributes')]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap ${tab===k?'border-[#fe8a24] text-[#fe8a24]':'border-transparent text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-3 sm:py-4 space-y-3 sm:space-y-4">
          {tab === 'basic' && <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('category')}</label>
                <select value={form.category} onChange={e=>set('category',e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]">
                  <option value="">{t('select')}</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.name?.en||c.id}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('subcategory')}</label>
                <select value={form.subcategory} onChange={e=>set('subcategory',e.target.value)} disabled={subcats.length===0}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] disabled:bg-gray-50">
                  <option value="">{t('none')}</option>
                  {subcats.map(s=><option key={s.id} value={s.id}>{s.name?.en||s.id}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{t('price')}</label>
                <input type="number" min="0" step="0.01" value={form.price} onChange={e=>set('price',e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div onClick={()=>set('active',!form.active)}
                    className={`w-10 h-5 rounded-full relative transition-colors ${form.active?'bg-green-500':'bg-gray-300'}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.active?'translate-x-5':'translate-x-0.5'}`} />
                  </div>
                  <span className="text-xs sm:text-sm text-gray-700">{form.active ? t('activeStatus') : t('hiddenStatus')}</span>
                </label>
              </div>
            </div>
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t('itemName')}</label>
              {MENU_LANGUAGES.filter(l=>l.code===activeLang).map(l=>(
                <div key={l.code} className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm">{l.flag}</span>
                  <input value={form.name[l.code]||''} onChange={e=>set('name',{...form.name,[l.code]:e.target.value})}
                    placeholder={`${t('name')} in ${l.name}…`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24]" />
                </div>
              ))}
            </div>
            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t('description')}</label>
              {MENU_LANGUAGES.filter(l=>l.code===activeLang).map(l=>(
                <div key={l.code} className="flex items-start gap-2">
                  <span className="text-xs sm:text-sm mt-2">{l.flag}</span>
                  <textarea value={form.description[l.code]||''} onChange={e=>set('description',{...form.description,[l.code]:e.target.value})}
                    rows={3} placeholder={`${t('description')} in ${l.name}…`}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#fe8a24] resize-none" />
                </div>
              ))}
            </div>
          </>}

          {tab === 'allergens' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">{t('selectAllergens')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {MENU_ALLERGENS.map(a=>{
                  const active = form.allergens.includes(a.id);
                  return (
                    <button key={a.id} onClick={()=>toggleArr('allergens',a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all ${active?'border-amber-400 bg-amber-50 text-amber-800':'border-gray-200 text-gray-600 hover:border-amber-300'}`}>
                      <span>{a.icon}</span><span>{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 ml-auto text-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'attributes' && (
            <div>
              <p className="text-xs sm:text-sm text-gray-500 mb-2 sm:mb-3">{t('tagItem')}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2">
                {MENU_ATTRIBUTES.map(a=>{
                  const active = form.attributes.includes(a.id);
                  return (
                    <button key={a.id} onClick={()=>toggleArr('attributes',a.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs sm:text-sm font-medium transition-all"
                      style={{ borderColor: active?a.color:'#e5e7eb', background: active?a.color+'15':'white', color: active?a.color:'#4b5563' }}>
                      <span>{a.icon}</span><span>{a.label}</span>
                      {active && <FiCheck className="w-3 h-3 ml-auto" style={{color:a.color}} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-3 border-t border-gray-100 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs sm:text-sm hover:bg-gray-50">{t('cancel')}</button>
          <button onClick={()=>onSave(form)} disabled={saving}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 bg-[#fe8a24] text-white rounded-lg text-xs sm:text-sm font-semibold disabled:opacity-50 hover:bg-[#ff9d47]">
            {saving?<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<FiCheck className="w-4 h-4"/>}
            {t('saveItem')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main ReservationSettings ──────────────────────────────────────────────────
const ReservationSettings = ({ selectedRestaurant, onClose }) => {
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

  const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState({
    use24HourFormat: false,
    defaultReservationDuration: 90,
    tableCleanupTime: 15,
    timeSlotInterval: 15,
    maxAdvanceBookingDays: 90,
    minAdvanceBookingHours: 2,
    requireName: true,
    requireEmail: true,
    requirePhone: true,
    showCompany: false,
    showNotes: true,
    maxGuestsOnline: 20,
    dayIntervals: {},
    blockedTimeSlots: {},
    requireTableAssignment: true,
    allowOverbooking: false,
    autoAssignTables: true,
    maxGuestsPerReservation: 20,
    minGuestsPerReservation: 1,
    sendConfirmationEmail: true,
    sendReminderEmail: true,
    reminderHoursBefore: 24,
    timeBarShowsStartOfHour: true,
    highlightCurrentTime: true,
    showTableCapacityWarnings: true,
    allowWalkInsWithoutTable: false,
    blockFullTimeSlots: true,
    showMenuOnPublicPage: false,
    menuDisplayMinGuests: 1,
    menuDisplayTitle: 'Our Menu',
    menuDisplaySubtitle: 'Browse our menu selection for your party',
    requireGroupMenuSelection: false,
    groupMenuMinGuests: 8,
    groupMenuRequiredMessage: 'Please select your group menu to continue',
    groupMenuItemsPerPerson: 0,
    thankYouMessage: 'Thank you for your reservation!',
    restaurantPageUrl: '',
    showBirthdayField: false,
    birthdayOfferMessage: 'Would you like a special offer for your birthday?',
    useGuestBasedDuration: false,
    guestDurationRules: [
      { minGuests: 1,  maxGuests: 2,  duration: 90  },
      { minGuests: 3,  maxGuests: 5,  duration: 120 },
      { minGuests: 6,  maxGuests: 8,  duration: 135 },
      { minGuests: 9,  maxGuests: 99, duration: 165 },
    ],
    enableOfferCode: false,
    offerCodeFieldLabel: 'Have an offer code?',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [restaurantData, setRestaurantData] = useState(null);
  const [loadingRestaurantData, setLoadingRestaurantData] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      if (!selectedRestaurant?.id) return;
      try {
        const collectionName = selectedRestaurant?._collection || 'restaurants';
        const docRef = doc(db, collectionName, selectedRestaurant.id, 'reservationSettings', 'config');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({ ...prev, ...data }));
          console.log('✅ Loaded reservation settings:', {
            collection: collectionName,
            restaurantId: selectedRestaurant.id,
            hasDayIntervals: !!data.dayIntervals,
            hasBlockedSlots: !!data.blockedTimeSlots
          });
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, [selectedRestaurant]);

  useEffect(() => {
  const loadMaxCapacity = async () => {
    if (!selectedRestaurant?.id) return;
    try {
      const col = selectedRestaurant?._collection || 'restaurants';
      const tablesSnap = await getDocs(
        collection(db, col, selectedRestaurant.id, 'tables')
      );
      const combosSnap = await getDocs(
        collection(db, col, selectedRestaurant.id, 'tableCombinations')
      );

      const tables = tablesSnap.docs.map(d => d.data());
      const combos = combosSnap.docs.map(d => d.data());

      const totalTableCap = tables.reduce((s, t) => s + (t.maxCapacity || t.capacity || 0), 0);
      const maxComboCap = combos.reduce((s, c) => Math.max(s, c.maxCapacity || 0), 0);
      const maxCap = Math.max(totalTableCap, maxComboCap);

      if (maxCap > 0) {
        setSettings(prev => ({ 
          ...prev, 
          maxGuestsPerReservation: maxCap
        }));
    }
    } catch (e) {
      console.error('Failed to load table capacity:', e);
    }
  };
  loadMaxCapacity();
}, [selectedRestaurant?.id]);

  useEffect(() => {
    const loadRestaurantData = async () => {
      if (!selectedRestaurant?.id) {
        setLoadingRestaurantData(false);
        return;
      }
      
      setLoadingRestaurantData(true);
      
      try {
        const collectionName = selectedRestaurant?._collection || 'restaurants';
        const docRef = doc(db, collectionName, selectedRestaurant.id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setRestaurantData({ 
            ...data, 
            id: selectedRestaurant.id,
            _collection: collectionName 
          });
        } else {
          setRestaurantData(selectedRestaurant);
        }
      } catch (err) {
        console.error('Error loading restaurant data:', err);
        setRestaurantData(selectedRestaurant);
      } finally {
        setLoadingRestaurantData(false);
      }
    };
    
    loadRestaurantData();
  }, [selectedRestaurant]);

  const handleSave = async () => {
    if (!selectedRestaurant?.id) {
      alert('No restaurant selected');
      return;
    }

    try {
      setSaving(true);
      const collectionName = selectedRestaurant?._collection || 'restaurants';
      const restaurantId = selectedRestaurant?.id || selectedRestaurant?.docId;
      
      console.log('💾 Saving settings to:', {
        collection: collectionName,
        restaurantId: restaurantId,
        path: `${collectionName}/${restaurantId}/reservationSettings/config`
      });
      
      await setDoc(
        doc(db, collectionName, restaurantId, 'reservationSettings', 'config'),
        {
          ...settings,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      
      console.log('✅ All settings saved successfully:', {
        dayIntervals: Object.keys(settings.dayIntervals || {}).length,
        blockedTimeSlots: Object.keys(settings.blockedTimeSlots || {}).length
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('❌ Save error:', err);
      alert('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Updated tabs - using text labels only, no icons
  const tabs = [
    { id: 'general', label: t('general') },
    { id: 'booking', label: t('booking') },
    { id: 'menu',    label: t('menu') },
    { id: 'tables',  label: t('tables') },
    { id: 'hours',   label: t('hours') },
    { id: 'opening_hours', label: t('timeSlots') },
    { id: 'notifications', label: t('notifications') },
    { id: 'display', label: t('display') },
  ];

  // Responsive tabs - shorter labels on mobile
  const getTabs = () => {
    const isMobile = window.innerWidth < 640;
    return tabs.map(tab => ({
      ...tab,
      label: isMobile && tab.id === 'opening_hours' ? t('slots') : 
             isMobile && tab.id === 'notifications' ? t('alerts') :
             isMobile && tab.id === 'display' ? t('view') :
             isMobile && tab.id === 'tables' ? t('seats') :
             isMobile && tab.id === 'booking' ? t('book') :
             tab.label
    }));
  };

  const SettingToggle = ({ label, description, settingKey }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setSettings(prev => ({ ...prev, [settingKey]: !prev[settingKey] }))}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${
          settings[settingKey] ? 'bg-[#fe8a24]' : 'bg-gray-300'
        }`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          settings[settingKey] ? 'translate-x-6' : 'translate-x-1'
        }`} />
      </button>
    </div>
  );

const SettingNumber = ({ label, description, settingKey, min, max, unit, step = 1 }) => {
  const intervalRef = React.useRef(null);
  const timeoutRef = React.useRef(null);

  const change = (dir) => {
    setSettings(prev => {
      const current = prev[settingKey] || min;
      const next = current + dir * step;
      return { ...prev, [settingKey]: Math.min(max, Math.max(min, next)) };
    });
  };

  const startPress = (dir) => {
    change(dir);
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => change(dir), 80);
    }, 400);
  };

  const stopPress = () => {
    clearTimeout(timeoutRef.current);
    clearInterval(intervalRef.current);
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onMouseDown={() => startPress(-1)}
            onMouseUp={stopPress}
            onMouseLeave={stopPress}
            onTouchStart={() => startPress(-1)}
            onTouchEnd={stopPress}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm sm:text-base transition-colors select-none border-r border-gray-200"
          >−</button>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={settings[settingKey]}
            onChange={(e) => setSettings(prev => ({ ...prev, [settingKey]: parseInt(e.target.value) || min }))}
            className="w-12 sm:w-16 px-1 sm:px-2 py-1 sm:py-1.5 text-xs sm:text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 border-0"
          />
          <button
            onMouseDown={() => startPress(1)}
            onMouseUp={stopPress}
            onMouseLeave={stopPress}
            onTouchStart={() => startPress(1)}
            onTouchEnd={stopPress}
            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold text-sm sm:text-base transition-colors select-none border-l border-gray-200"
          >+</button>
        </div>
        {unit && <span className="text-xs text-gray-500 min-w-[30px] sm:min-w-[40px]">{unit}</span>}
      </div>
    </div>
  );
};

  const SettingSelect = ({ label, description, settingKey, options }) => (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <select
        value={settings[settingKey]}
        onChange={(e) => setSettings(prev => ({ ...prev, [settingKey]: parseInt(e.target.value) }))}
        className="px-2 sm:px-3 py-1.5 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

const renderGeneralTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label={t('twentyFourHourFormat')}
        description={t('displayTimes24Hour')}
        settingKey="use24HourFormat"
      />
      <SettingNumber
        label={t('diningDuration')}
        description={t('defaultDiningTime')}
        settingKey="defaultReservationDuration"
        min={30}
        max={240}
        unit="min"
        step={15}
      />
      <SettingNumber
        label={t('tableCleanup')}
        description={t('timeBetweenReservations')}
        settingKey="tableCleanupTime"
        min={0}
        max={60}
        unit="min"
      />
<div className="bg-orange-50 rounded-lg p-3 mt-2">
        <p className="text-xs text-gray-600">{t('totalSlotTime')}</p>
        <p className="text-lg font-bold text-[#fe8a24]">
          {settings.defaultReservationDuration + settings.tableCleanupTime} min
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {t('diningAndCleanup')}
        </p>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <SettingToggle
          label={t('guestBasedDuration')}
          description={t('setDurationByPartySize')}
          settingKey="useGuestBasedDuration"
        />
        {settings.useGuestBasedDuration && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500 mb-3">{t('defineDurationPerRange')}</p>
            {(settings.guestDurationRules || [
              { minGuests: 1,  maxGuests: 2,  duration: 90  },
              { minGuests: 3,  maxGuests: 5,  duration: 120 },
              { minGuests: 6,  maxGuests: 8,  duration: 135 },
              { minGuests: 9,  maxGuests: 99, duration: 165 },
            ]).map((rule, idx) => {
              const rules = settings.guestDurationRules || [
                { minGuests: 1,  maxGuests: 2,  duration: 90  },
                { minGuests: 3,  maxGuests: 5,  duration: 120 },
                { minGuests: 6,  maxGuests: 8,  duration: 135 },
                { minGuests: 9,  maxGuests: 99, duration: 165 },
              ];
              const updateRule = (field, value) => {
                const updated = rules.map((r, i) => i === idx ? { ...r, [field]: parseInt(value) || 0 } : r);
                setSettings(prev => ({ ...prev, guestDurationRules: updated }));
              };
              const removeRule = () => {
                const updated = rules.filter((_, i) => i !== idx);
                setSettings(prev => ({ ...prev, guestDurationRules: updated }));
              };
              const hrs = Math.floor(rule.duration / 60);
              const mins = rule.duration % 60;
              return (
                <div key={idx} className="flex flex-wrap items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-gray-400 text-sm">👤</span>
                    <input
                      type="number" min="1" max="99" value={rule.minGuests}
                      onChange={e => updateRule('minGuests', e.target.value)}
                      className="w-10 sm:w-12 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-400">–</span>
                    <input
                      type="number" min="1" max="99" value={rule.maxGuests}
                      onChange={e => updateRule('maxGuests', e.target.value)}
                      className="w-10 sm:w-12 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-400 hidden sm:inline">{t('guests')}</span>
                  </div>
                  <span className="text-gray-300 mx-1">→</span>
                  <div className="flex items-center gap-1.5 flex-1 min-w-[100px]">
                    <span className="text-gray-400 text-sm">🕐</span>
                    <input
                      type="number" min="15" max="480" step="15" value={rule.duration}
                      onChange={e => updateRule('duration', e.target.value)}
                      className="w-14 sm:w-16 px-1 sm:px-2 py-1 border border-gray-200 rounded-lg text-xs text-center focus:outline-none focus:border-[#fe8a24]"
                    />
                    <span className="text-xs text-gray-500">
                      min {hrs > 0 ? `(${hrs}h${mins > 0 ? ` ${mins}m` : ''})` : ''}
                    </span>
                  </div>
                  <button
                    onClick={removeRule}
                    className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 p-1"
                  >
                    <FiX className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => {
                const rules = settings.guestDurationRules || [];
                setSettings(prev => ({
                  ...prev,
                  guestDurationRules: [...rules, { minGuests: 1, maxGuests: 10, duration: 120 }]
                }));
              }}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-xl text-xs font-semibold text-gray-400 hover:border-[#fe8a24] hover:text-[#fe8a24] transition-colors flex items-center justify-center gap-1.5"
            >
              <FiPlus className="w-3.5 h-3.5" /> {t('addRule')}
            </button>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-1 overflow-x-auto">
              <p className="text-xs text-blue-700 mb-2">
                💡 {t('whenEnabled')}
              </p>
              <p className="text-xs font-semibold text-blue-800 mb-2">{t('previewByPartySize')}</p>
              <div className="flex flex-wrap gap-1.5">
                {[1,2,3,4,5,6,7,8,9,10,12].map(g => {
                  const rules = settings.guestDurationRules || [];
                  const match = rules.find(r => g >= (r.minGuests||1) && g <= (r.maxGuests||99));
                  const dur = match ? match.duration : (settings.defaultReservationDuration || 120);
                  const hrs = Math.floor(dur / 60);
                  const mins = dur % 60;
                  const label = hrs > 0 ? `${hrs}h${mins > 0 ? `${mins}m` : ''}` : `${mins}m`;
                  const hasMatch = !!match;
                  return (
                    <div key={g} className={`flex flex-col items-center px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-lg border text-[10px] sm:text-xs ${
                      hasMatch ? 'bg-white border-blue-300' : 'bg-gray-50 border-gray-200 opacity-50'
                    }`}>
                      <span className="font-bold text-gray-700">{g} pax</span>
                      <span className={`font-semibold ${hasMatch ? 'text-[#fe8a24]' : 'text-gray-400'}`}>{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
      <SettingNumber
        label={t('advanceBooking')}
        description={t('maxDaysInAdvance')}
        settingKey="maxAdvanceBookingDays"
        min={1}
        max={365}
        unit="days"
      />
      <SettingNumber
        label={t('minNotice')}
        description={t('hoursBeforeBooking')}
        settingKey="minAdvanceBookingHours"
        min={0}
        max={48}
        unit="hrs"
      />
    </div>
);

  const renderBookingTab = () => (
  <div className="space-y-4">
    <div className="bg-blue-50 rounded-lg p-3 mb-2">
      <p className="text-xs font-medium text-blue-800">{t('publicBookingPage')}</p>
      <p className="text-xs text-blue-600 mt-1">{t('controlCustomerFields')}</p>
    </div>

    <div className="mb-4 pb-4 border-b border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        📞 {t('contactInfo')}
      </p>
      <p className="text-xs text-gray-400 mb-3">{t('usedInConfirmationEmails')}</p>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">{t('contactEmail')}</label>
          <input
            type="email"
            value={settings.contactEmail || ''}
            onChange={e => setSettings(prev => ({ ...prev, contactEmail: e.target.value }))}
            placeholder="restaurant@example.com"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-800 mb-1">{t('contactPhone')}</label>
          <input
            type="tel"
            value={settings.contactPhone || ''}
            onChange={e => setSettings(prev => ({ ...prev, contactPhone: e.target.value }))}
            placeholder="+47 123 456 789"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      </div>
    </div>

    <SettingToggle
      label={t('requireFullName')}
      description={t('makeFullNameMandatory')}
      settingKey="requireName"
    />
    <SettingToggle
      label={t('requireEmail')}
      description={t('makeEmailMandatory')}
      settingKey="requireEmail"
    />
    <SettingToggle
      label={t('requirePhone')}
      description={t('makePhoneMandatory')}
      settingKey="requirePhone"
    />
    <SettingToggle
      label={t('showCompanyField')}
      description={t('displayCompanyField')}
      settingKey="showCompany"
    />
    <SettingToggle
      label={t('showNotesField')}
      description={t('allowSpecialRequests')}
      settingKey="showNotes"
    />
    <SettingNumber
      label={t('maxPartySize')}
      description={t('maximumGuestsPerBooking')}
      settingKey="maxGuestsOnline"
      min={1}
      max={50}
      unit="guests"
    />
    <SettingNumber
      label={t('minPartySize')}
      description={t('minimumGuestsAllowed')}
      settingKey="minGuestsPerReservation"
      min={1}
      max={10}
      unit="guests"
    />
    <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-gray-100 last:border-0 gap-3 sm:gap-0">
      <div className="flex-1 pr-0 sm:pr-4">
        <p className="text-sm font-medium text-gray-800">{t('maxPartySize')}</p>
        <p className="text-xs text-gray-500 mt-0.5">{t('overallMaximum')}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          <span className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-bold text-gray-700 w-12 sm:w-16 text-center">
            {(() => {
              const col = selectedRestaurant?._collection || 'restaurants';
              return settings.maxGuestsPerReservation || '—';
            })()}
          </span>
        </div>
        <span className="text-xs text-gray-500 min-w-[30px] sm:min-w-[40px]">{t('guests')}</span>
      </div>
    </div>
    <SettingToggle
      label={t('blockFullSlots')}
      description={t('preventBookingsWhenFull')}
      settingKey="blockFullTimeSlots"
    />
   <SettingToggle
      label={t('allowWalkIns')}
      description={t('walkInsWithoutTable')}
      settingKey="allowWalkInsWithoutTable"
    />

    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎂 {t('birthdayOffer')}
      </p>
      <SettingToggle
        label={t('showBirthdayField')}
        description={t('askCustomersForBirthday')}
        settingKey="showBirthdayField"
      />
      {settings.showBirthdayField && (
        <div className="py-3 border-b border-gray-100">
          <p className="text-sm font-medium text-gray-800 mb-1">{t('birthdayOfferMessage')}</p>
          <p className="text-xs text-gray-500 mb-2">{t('shownAboveBirthdayPicker')}</p>
          <input
            type="text"
            value={settings.birthdayOfferMessage || ''}
            onChange={e => setSettings(prev => ({ ...prev, birthdayOfferMessage: e.target.value }))}
            placeholder={t('birthdayOfferPlaceholder')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      )}
    </div>

    <div className="mt-4 pt-4 border-t border-gray-100">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🍽️ {t('menuOnBookingPage')}
      </p>
      <SettingToggle
        label={t('showMenuOnPublicPage')}
        description={t('displayMenuBelowBooking')}
        settingKey="showMenuOnPublicPage"
      />
      {settings.showMenuOnPublicPage && (
        <>
          <SettingNumber
            label={t('minGuestsToShowMenu')}
            description={t('menuAppearsWhenPartySize')}
            settingKey="menuDisplayMinGuests"
            min={1}
            max={50}
            unit="guests"
          />
          <SettingToggle
            label={t('requireGroupMenuSelection')}
            description={t('forceCustomersToSelectItem')}
            settingKey="requireGroupMenuSelection"
          />
          {settings.requireGroupMenuSelection && (
            <div className="py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-800 mb-1">{t('requirementMessage')}</p>
              <p className="text-xs text-gray-500 mb-2">{t('shownWhenGroupMenuRequired')}</p>
              <input
                type="text"
                value={settings.groupMenuRequiredMessage || ''}
                onChange={e => setSettings(prev => ({ ...prev, groupMenuRequiredMessage: e.target.value }))}
                placeholder={t('groupMenuRequiredPlaceholder')}
                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
              />
            </div>
          )}
          <div className="py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-800 mb-1">{t('menuSectionTitle')}</p>
            <p className="text-xs text-gray-500 mb-2">{t('headingShownAboveMenu')}</p>
            <input
              type="text"
              value={settings.menuDisplayTitle || ''}
              onChange={e => setSettings(prev => ({ ...prev, menuDisplayTitle: e.target.value }))}
              placeholder={t('menuTitlePlaceholder')}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
            />
          </div>
          <div className="py-3">
            <p className="text-sm font-medium text-gray-800 mb-1">{t('menuSectionSubtitle')}</p>
            <p className="text-xs text-gray-500 mb-2">{t('shownBelowTitle')}</p>
            <input
              type="text"
              value={settings.menuDisplaySubtitle || ''}
              onChange={e => setSettings(prev => ({ ...prev, menuDisplaySubtitle: e.target.value }))}
              placeholder={t('menuSubtitlePlaceholder')}
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
            />
          </div>
        </>
      )}
    </div>

    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎉 {t('reservationSuccessPage')}
      </p>
      
      <div className="py-3 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-800 mb-1">{t('thankYouMessage')}</p>
        <p className="text-xs text-gray-500 mb-2">{t('shownAfterSuccessfulReservation')}</p>
        <input
          type="text"
          value={settings.thankYouMessage || ''}
          onChange={e => setSettings(prev => ({ ...prev, thankYouMessage: e.target.value }))}
          placeholder={t('thankYouPlaceholder')}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
        />
      </div>
      
<div className="py-3">
        <p className="text-sm font-medium text-gray-800 mb-1">{t('restaurantPageUrl')}</p>
        <p className="text-xs text-gray-500 mb-2">{t('linkShownOnSuccessPage')}</p>
        <input
          type="url"
          value={settings.restaurantPageUrl || ''}
          onChange={e => setSettings(prev => ({ ...prev, restaurantPageUrl: e.target.value }))}
          placeholder="https://your-restaurant.com"
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
        />
      </div>
    </div>

    <div className="mt-6 pt-4 border-t border-gray-200">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
        🎟️ {t('offerCampaignCode')}
      </p>
      <p className="text-xs text-gray-400 mb-3">
        {t('oneUnifiedCodeField')}
      </p>
      <SettingToggle
        label={t('enableOfferCodeField')}
        description={t('showOfferCodeField')}
        settingKey="enableOfferCode"
      />
      {settings.enableOfferCode && (
        <div className="py-3">
          <p className="text-sm font-medium text-gray-800 mb-1">{t('fieldLabel')}</p>
          <p className="text-xs text-gray-500 mb-2">{t('shownAboveOfferCodeInput')}</p>
          <input
            type="text"
            value={settings.offerCodeFieldLabel || ''}
            onChange={e => setSettings(prev => ({ ...prev, offerCodeFieldLabel: e.target.value }))}
            placeholder={t('offerCodePlaceholder')}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20 focus:border-[#fe8a24]"
          />
        </div>
      )}
    </div>
  </div>
);  

  const renderTablesTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label={t('requireTableAssignment')}
        description={t('blockIfNoSuitableTable')}
        settingKey="requireTableAssignment"
      />
      <SettingToggle
        label={t('autoAssignTables')}
        description={t('automaticTableAssignment')}
        settingKey="autoAssignTables"
      />
      <SettingToggle
        label={t('allowOverbooking')}
        description={t('allowOverCapacity')}
        settingKey="allowOverbooking"
      />
      <SettingToggle
        label={t('showCapacityWarnings')}
        description={t('alertWhenPartyExceedsCapacity')}
        settingKey="showTableCapacityWarnings"
      />
    </div>
  );

  const renderHoursTab = () => (
    <div className="space-y-4">
      {loadingRestaurantData ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading hours...</p>
        </div>
      ) : (
        (() => {
          const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
          const dayHoursMap = {};
          (restaurantData?.customHours || []).forEach(slot => {
            slot.days?.forEach(d => {
              if (d.name) {
                dayHoursMap[d.name] = {
                  openTime: slot.openTime || '10:00',
                  closeTime: slot.closeTime || '22:00'
                };
              }
            });
          });
          
          return ALL_DAYS.map((dayName) => {
            const hours = dayHoursMap[dayName];
            const isClosed = !hours;
            const daySettings = settings?.dayIntervals?.[dayName] || { interval: settings?.timeSlotInterval || 30, startOffset: 0, endOffset: 0 };
            
            return (
              <div key={dayName} className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200 hover:shadow-sm transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-base">{dayName}</h4>
                    <p className="text-xs text-gray-500">
                      {isClosed ? t('closed') : `${hours.openTime} - ${hours.closeTime}`}
                    </p>
                  </div>
                  {!isClosed && (
                  <div className="flex flex-col items-start sm:items-end gap-1">
                    <select
                      value={daySettings?.interval || settings?.timeSlotInterval || 30}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, interval: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#fe8a24]/20"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>60 min</option>
                    </select>
                    <p className="text-[10px] text-gray-400 text-left sm:text-right max-w-[200px] leading-tight">
                      {t('slotInterval')}
                    </p>
                  </div>
                  )}
                </div>
                
                {!isClosed && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    <select
                      value={daySettings.startOffset || 0}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, startOffset: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    >
                      <option value={0}>{t('noStartBuffer')}</option>
                      <option value={15}>+15 min {t('startBuffer')}</option>
                      <option value={30}>+30 min {t('startBuffer')}</option>
                      <option value={60}>+60 min {t('startBuffer')}</option>
                    </select>
                    <select
                      value={daySettings.endOffset || 0}
                      onChange={(e) => {
                        const newIntervals = { ...(settings.dayIntervals || {}) };
                        newIntervals[dayName] = { ...daySettings, endOffset: parseInt(e.target.value) };
                        setSettings(prev => ({ ...prev, dayIntervals: newIntervals }));
                      }}
                      className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                    >
                      <option value={0}>{t('noEndBuffer')}</option>
                      <option value={15}>-15 min {t('endBuffer')}</option>
                      <option value={30}>-30 min {t('endBuffer')}</option>
                      <option value={60}>-60 min {t('endBuffer')}</option>
                    </select>
                  </div>
                )}
                
                {isClosed && (
                  <div className="mt-2 text-center text-xs text-gray-400 bg-gray-50 rounded-lg py-2">
                    {t('notAcceptingBookings')}
                  </div>
                )}
              </div>
            );
          });
        })()
      )}
      
      {(!restaurantData?.customHours || restaurantData.customHours.length === 0) && !loadingRestaurantData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-xs font-medium text-yellow-800">⚠️ {t('noOperatingHoursSet')}</p>
          <p className="text-xs text-yellow-700 mt-1">
            {t('configureRestaurantHours')}
          </p>
        </div>
      )}
    </div>
  );

  // ✅ NEW TAB: Opening Hours with Time Slot Toggle Grid
  const renderOpeningHoursTab = () => {
    const generateTimeSlots = (openTime, closeTime, interval = 15) => {
      const slots = [];
      if (!openTime || !closeTime) return slots;
      
      const [openH, openM] = openTime.split(':').map(Number);
      const [closeH, closeM] = closeTime.split(':').map(Number);
      const openMinutes = openH * 60 + openM;
      let closeMinutes = closeH * 60 + closeM;
      
      if (closeMinutes <= openMinutes) {
        closeMinutes += 24 * 60;
      }
      
      for (let m = openMinutes; m < closeMinutes; m += interval) {
        const actualMin = m % (24 * 60);
        const h = Math.floor(actualMin / 60);
        const min = actualMin % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        slots.push(timeStr);
      }
      
      return slots;
    };
    
    const toggleTimeSlot = (dayName, timeStr) => {
      const blocked = settings.blockedTimeSlots || {};
      const dayBlocked = blocked[dayName] || [];
      
      let newDayBlocked;
      if (dayBlocked.includes(timeStr)) {
        newDayBlocked = dayBlocked.filter(t => t !== timeStr);
      } else {
        newDayBlocked = [...dayBlocked, timeStr];
      }
      
      const newBlocked = {
        ...blocked,
        [dayName]: newDayBlocked
      };
      
      setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
    };

    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-4">
          <h3 className="text-sm font-bold text-orange-900 mb-1">🕐 {t('individualTimeSlotControl')}</h3>
          <p className="text-xs text-orange-700">
            {t('toggleSpecificTimeSlots')}
          </p>
        </div>

        {loadingRestaurantData ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-[#fe8a24] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading hours...</p>
          </div>
        ) : (
          (() => {
            const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const dayHoursMap = {};
            
            (restaurantData?.customHours || []).forEach(slot => {
              slot.days?.forEach(d => {
                if (d.name && !d.closed) {
                  dayHoursMap[d.name] = {
                    openTime: slot.openTime || '10:00',
                    closeTime: slot.closeTime || '22:00'
                  };
                }
              });
            });
            
            return ALL_DAYS.map((dayName) => {
              const hours = dayHoursMap[dayName];
              const isClosed = !hours;
              const daySettings = settings?.dayIntervals?.[dayName] || { interval: 30, startOffset: 0, endOffset: 0 };
              
              const interval = daySettings?.interval || settings?.timeSlotInterval || 30;
              const startOffset = daySettings?.startOffset || 0;
              const endOffset = daySettings?.endOffset || 0;
              const [oH, oM] = hours.openTime.split(':').map(Number);
              const [cH, cM] = hours.closeTime.split(':').map(Number);
              const effOpenMin = oH * 60 + oM + startOffset;
              const effCloseMin = cH * 60 + cM - endOffset;
              const effOpenTime = `${String(Math.floor(effOpenMin/60)).padStart(2,'0')}:${String(effOpenMin%60).padStart(2,'0')}`;
              const effCloseTime = `${String(Math.floor(effCloseMin/60)).padStart(2,'0')}:${String(effCloseMin%60).padStart(2,'0')}`;
              const timeSlots = !isClosed ? generateTimeSlots(effOpenTime, effCloseTime, interval) : [];
              const blockedSlots = settings.blockedTimeSlots?.[dayName] || [];
              
              return (
                <div 
                  key={dayName} 
                  className={`bg-white rounded-lg border-2 transition-all ${
                    isClosed 
                      ? 'border-gray-200 bg-gray-50/50 p-3 sm:p-4' 
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  {/* Header */}
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1">
                        <h4 className={`font-bold text-sm sm:text-base ${isClosed ? 'text-gray-400' : 'text-gray-800'}`}>
                          {dayName}
                        </h4>
                        <p className={`text-xs mt-1 ${isClosed ? 'text-gray-400' : 'text-gray-500'}`}>
                          {isClosed ? `${t('closed')} - ${t('notAcceptingBookings')}` : `${t('restaurantHours')}: ${hours.openTime} - ${hours.closeTime}${startOffset || endOffset ? ` (${t('bookings')}: ${effOpenTime} - ${effCloseTime})` : ''}`}
                        </p>
                      </div>
                      
                      {!isClosed && (
                        <div className="text-left sm:text-right">
                          <p className="text-xs font-semibold text-gray-700">
                            {interval} min {t('slots')}
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {timeSlots.length} {t('totalSlots')}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isClosed && timeSlots.length > 0 && (
                    <div className="p-3 sm:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                        <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          📅 {t('availableTimeSlots')}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-green-700 font-medium">
                            ✓ {timeSlots.length - blockedSlots.length} {t('available')}
                          </span>
                          <span className="text-xs text-red-700 font-medium">
                            ✕ {blockedSlots.length} {t('blocked')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 sm:gap-1.5 max-h-80 overflow-y-auto p-1">
                        {timeSlots.map(timeStr => {
                          const isBlocked = blockedSlots.includes(timeStr);
                          const [h, m] = timeStr.split(':').map(Number);
                          const display = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                          
                          return (
                            <button
                              key={timeStr}
                              onClick={() => toggleTimeSlot(dayName, timeStr)}
                              className={`relative px-1.5 sm:px-2 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold rounded-lg border-2 transition-all shadow-sm hover:shadow-md ${
                                isBlocked
                                  ? 'bg-red-50 border-red-300 text-red-500 line-through hover:bg-red-100'
                                  : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                              }`}
                              title={isBlocked ? t('clickToEnableSlot') : t('clickToDisableSlot')}
                            >
                              {display}
                              {isBlocked && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 rounded-full flex items-center justify-center shadow">
                                  <span className="text-white text-[7px] sm:text-[9px] font-bold">✕</span>
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row gap-2 mt-4 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => {
                            const newBlocked = { ...settings.blockedTimeSlots };
                            newBlocked[dayName] = [];
                            setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
                          }}
                          className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-green-700 bg-green-50 hover:bg-green-100 border-2 border-green-300 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                          ✓ {t('enableAllSlots')}
                        </button>
                        <button
                          onClick={() => {
                            const newBlocked = { ...settings.blockedTimeSlots };
                            newBlocked[dayName] = [...timeSlots];
                            setSettings(prev => ({ ...prev, blockedTimeSlots: newBlocked }));
                          }}
                          className="flex-1 px-3 sm:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border-2 border-red-300 rounded-lg transition-all shadow-sm hover:shadow"
                        >
                          ✕ {t('disableAllSlots')}
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {isClosed && (
                    <div className="text-center text-xs text-gray-400 bg-gray-100 rounded-lg py-4">
                      ⚠️ {t('restaurantClosedOn')} {dayName}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
        
        {(!restaurantData?.customHours || restaurantData.customHours.length === 0) && !loadingRestaurantData && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
            <p className="text-sm font-bold text-yellow-900 mb-1">⚠️ {t('noOperatingHoursConfigured')}</p>
            <p className="text-xs text-yellow-700">
              {t('setOperatingHoursFirst')}
            </p>
          </div>
        )}
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
          <p className="text-xs font-bold text-blue-900 mb-2">💡 {t('howThisWorks')}</p>
          <ul className="text-xs text-blue-800 space-y-1.5 list-disc list-inside">
            <li>{t('greenSlotsAvailable')}</li>
            <li>{t('redSlotsBlocked')}</li>
            <li>{t('clickToToggleSlot')}</li>
            <li>{t('useEnableAllDisableAll')}</li>
            <li>{t('slotsBasedOnInterval')}</li>
            <li>{t('dontForgetToSave')}</li>
          </ul>
        </div>
      </div>
    );
  };

  const renderNotificationsTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label={t('confirmationEmail')}
        description={t('sendWhenBookingConfirmed')}
        settingKey="sendConfirmationEmail"
      />
      <SettingToggle
        label={t('reminderEmail')}
        description={t('sendBeforeReservation')}
        settingKey="sendReminderEmail"
      />
      <SettingNumber
        label={t('reminderTime')}
        description={t('hoursBeforeReservation')}
        settingKey="reminderHoursBefore"
        min={1}
        max={168}
        unit="hrs"
      />
    </div>
  );

const renderDisplayTab = () => (
    <div className="space-y-4">
      <SettingToggle
        label={t('timeBarStartOfHour')}
        description={t('showHourLabelsAtBeginning')}
        settingKey="timeBarShowsStartOfHour"
      />
      <SettingToggle
        label={t('highlightCurrentTime')}
        description={t('showCurrentTimeIndicator')}
        settingKey="highlightCurrentTime"
      />
    </div>
  );

  const renderMenuTab = () => (
    <MenuPanel
      restaurantId={selectedRestaurant?.id}
      collectionName={selectedRestaurant?._collection || 'restaurants'}
    />
  );

  // Check if mobile for responsive tabs
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-3 sm:px-6 py-3 sm:py-5 border-b border-gray-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-orange-50 to-white">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 truncate">{t('reservationSettings')}</h2>
            <p className="text-[10px] sm:text-sm text-gray-500 mt-0.5 truncate max-w-[150px] sm:max-w-none">{selectedRestaurant?.name}</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 sm:p-2 hover:bg-white rounded-full transition-colors flex-shrink-0"
          >
            <FiX className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs - Responsive scrolling - TEXT ONLY */}
        <div className="border-b border-gray-200 px-2 sm:px-6 flex-shrink-0 overflow-x-auto">
          <div className="flex gap-0.5 sm:gap-1 min-w-max">
            {getTabs().map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 sm:px-4 py-2 sm:py-3 text-[10px] sm:text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-[#fe8a24]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fe8a24] rounded-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'booking' && renderBookingTab()}
          {activeTab === 'tables' && renderTablesTab()}
          {activeTab === 'hours' && renderHoursTab()}
          {activeTab === 'opening_hours' && renderOpeningHoursTab()}
          {activeTab === 'notifications' && renderNotificationsTab()}
          {activeTab === 'display' && renderDisplayTab()}
          {activeTab === 'menu'    && renderMenuTab()}
        </div>

        {/* Footer - Responsive buttons */}
        <div className="px-3 sm:px-6 py-2.5 sm:py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-end gap-2 sm:gap-3 flex-shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-white transition-colors text-sm"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg font-medium transition-all text-sm ${
              saved
                ? 'bg-green-500 text-white'
                : 'bg-[#fe8a24] hover:bg-[#ff9d47] text-white shadow-sm hover:shadow'
            } disabled:opacity-50`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <FiCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <FiSave className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            {saving ? t('saving') : saved ? t('saved') : t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationSettings;