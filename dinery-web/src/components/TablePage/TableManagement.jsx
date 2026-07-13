import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  getFirestore, collection, getDocs, addDoc, updateDoc,
  deleteDoc, doc, query, where, getDoc, setDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const db   = getFirestore();
const auth = getAuth();

// ─── Constants ─────────────────────────────────────────────────────────────────
const GRID      = 20;
const CHAIR_W   = 18;
const CHAIR_H   = 11;
const CHAIR_GAP = 7;

// ─── Language / i18n ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    tableManagement: 'Table Management',
    selectRestaurant: 'Select a restaurant to manage its tables',
    noRestaurantsFound: 'No restaurants found',
    back: 'Back',
    create: 'Create',
    tables: 'Tables',
    floorMap: 'Floor Map',
    online: 'online',
    internal: 'internal',
    reserved: 'reserved',
    seated: 'seated',
    alertPax: 'Alert pax below min.',
    combineTables: 'Combine Tables',
    cancelCombine: 'Cancel Combine',
    selectTablesToCombine: 'Select tables to combine',
    pickAtLeast: 'Pick at least 2 tables to combine them into one bookable group',
    combinedCapacity: 'Combined capacity',
    createCombination: 'Create Combination',
    noTablesYet: 'No tables yet',
    addFirstTable: 'Click "+ Create" to add your first table',
    name: 'Name',
    min: 'Min.',
    max: 'Max.',
    priority: 'Priority',
    status: 'Status',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    partOfCombination: 'Part of a combination',
    tableCombinations: 'Table Combinations',
    tablesInCombo: 'tables',
    paxTotal: 'pax total',
    createTable: 'Create Table',
    editTable: 'Edit Table',
    tableName: 'Table Name / Number',
    minCapacity: 'Min. Capacity',
    maxCapacity: 'Max. Capacity',
    tableAvailability: 'Table Availability',
    onlineVisible: '🟢 Online - Visible to public',
    internalOnly: '🟣 Internal - Waiters only',
    notes: 'Notes (optional)',
    cancel: 'Cancel',
    saveChanges: 'Save Changes',
    createTableBtn: 'Create Table',
    saving: 'Saving…',
    creating: 'Creating…',
    createTableCombination: 'Create Table Combination',
    tablesSelected: 'tables selected',
    tablesInThisCombination: 'Tables in this combination',
    totalCombinedCapacity: 'Total Combined Capacity',
    avgPerTable: 'avg pax/table',
    combinationName: 'Combination Name',
    namePlaceholder: 'e.g. VIP Section, Large Party (7 tables), Terrace Group',
    thisNameAppears: 'This name will appear when booking large groups',
    saveCombination: 'Save Combination',
    noTablesToMap: 'No tables to map',
    addTablesFirst: 'Add tables in the Tables tab first',
    deleteTable: 'Delete this table?',
    removeCombination: 'Remove this table combination?',
    accessDenied: 'Access denied.',
    failedSave: 'Failed to save table. Please try again.',
    failedCombination: 'Failed to save combination.',
    lowerPriority: 'Lower = higher priority',
    windowSeat: 'e.g. Window seat, wheelchair accessible',
    active: 'Active',
    inactive: 'Inactive',
    editTableTitle: 'Edit Table',
    createTableTitle: 'Create Table',
    table: 'Table',
    noTables: 'No tables',
    addFirst: 'Add your first table',
  },
  fi: {
    tableManagement: 'Pöytien hallinta',
    selectRestaurant: 'Valitse ravintola, jonka pöytiä haluat hallita',
    noRestaurantsFound: 'Ravintoloita ei löytynyt',
    back: 'Takaisin',
    create: 'Luo',
    tables: 'Pöydät',
    floorMap: 'Pohjapiirros',
    online: 'julkinen',
    internal: 'sisäinen',
    reserved: 'varattu',
    seated: 'istutettu',
    alertPax: 'Varoita, jos pöytä on alle vähimmäiskapasiteetin',
    combineTables: 'Yhdistä pöydät',
    cancelCombine: 'Peru yhdistäminen',
    selectTablesToCombine: 'Valitse pöydät yhdistettäväksi',
    pickAtLeast: 'Valitse vähintään 2 pöytää yhdistääksesi ne yhdeksi varattavaksi ryhmäksi',
    combinedCapacity: 'Yhdistetty kapasiteetti',
    createCombination: 'Luo yhdistelmä',
    noTablesYet: 'Ei vielä pöytiä',
    addFirstTable: 'Napsauta "+ Luo" lisätäksesi ensimmäisen pöydän',
    name: 'Nimi',
    min: 'Min.',
    max: 'Max.',
    priority: 'Prioriteetti',
    status: 'Tila',
    actions: 'Toiminnot',
    edit: 'Muokkaa',
    delete: 'Poista',
    partOfCombination: 'Osa yhdistelmää',
    tableCombinations: 'Pöytäyhdistelmät',
    tablesInCombo: 'pöytää',
    paxTotal: 'henkilöä yhteensä',
    createTable: 'Luo pöytä',
    editTable: 'Muokkaa pöytää',
    tableName: 'Pöydän nimi / numero',
    minCapacity: 'Min. kapasiteetti',
    maxCapacity: 'Max. kapasiteetti',
    tableAvailability: 'Pöydän saatavuus',
    onlineVisible: '🟢 Julkinen - Näkyy asiakkaille',
    internalOnly: '🟣 Sisäinen - Vain tarjoilijoille',
    notes: 'Muistiinpanot (valinnainen)',
    cancel: 'Peruuta',
    saveChanges: 'Tallenna muutokset',
    createTableBtn: 'Luo pöytä',
    saving: 'Tallennetaan…',
    creating: 'Luodaan…',
    createTableCombination: 'Luo pöytäyhdistelmä',
    tablesSelected: 'pöytää valittu',
    tablesInThisCombination: 'Pöydät tässä yhdistelmässä',
    totalCombinedCapacity: 'Yhdistetty kokonaiskapasiteetti',
    avgPerTable: 'keskim. henkilöä/pöytä',
    combinationName: 'Yhdistelmän nimi',
    namePlaceholder: 'esim. VIP-osasto, Iso seurue (7 pöytää), Terassiryhmä',
    thisNameAppears: 'Tämä nimi näkyy varattaessa suuria ryhmiä',
    saveCombination: 'Tallenna yhdistelmä',
    noTablesToMap: 'Ei pöytiä kartoitettavaksi',
    addTablesFirst: 'Lisää pöytiä Pöydät-välilehdellä ensin',
    deleteTable: 'Poista tämä pöytä?',
    removeCombination: 'Poista tämä pöytäyhdistelmä?',
    accessDenied: 'Pääsy estetty.',
    failedSave: 'Pöydän tallentaminen epäonnistui. Yritä uudelleen.',
    failedCombination: 'Yhdistelmän tallentaminen epäonnistui.',
    lowerPriority: 'Pienempi = korkeampi prioriteetti',
    windowSeat: 'esim. Ikkunapaikka, esteetön',
    active: 'Aktiivinen',
    inactive: 'Epäaktiivinen',
    editTableTitle: 'Muokkaa pöytää',
    createTableTitle: 'Luo pöytä',
    table: 'Pöytä',
    noTables: 'Ei pöytiä',
    addFirst: 'Lisää ensimmäinen pöytä',
  },
  no: {
    tableManagement: 'Bordshåndtering',
    selectRestaurant: 'Velg en restaurant for å administrere bordene',
    noRestaurantsFound: 'Ingen restauranter funnet',
    back: 'Tilbake',
    create: 'Opprett',
    tables: 'Bord',
    floorMap: 'Plantegning',
    online: 'offentlig',
    internal: 'intern',
    reserved: 'reservert',
    seated: 'sittende',
    alertPax: 'Varsle når under min. kapasitet',
    combineTables: 'Kombiner bord',
    cancelCombine: 'Avbryt kombinasjon',
    selectTablesToCombine: 'Velg bord å kombinere',
    pickAtLeast: 'Velg minst 2 bord for å kombinere dem til én bookbar gruppe',
    combinedCapacity: 'Kombinert kapasitet',
    createCombination: 'Opprett kombinasjon',
    noTablesYet: 'Ingen bord ennå',
    addFirstTable: 'Klikk "+ Opprett" for å legge til ditt første bord',
    name: 'Navn',
    min: 'Min.',
    max: 'Maks.',
    priority: 'Prioritet',
    status: 'Status',
    actions: 'Handlinger',
    edit: 'Rediger',
    delete: 'Slett',
    partOfCombination: 'Del av kombinasjon',
    tableCombinations: 'Bordkombinasjoner',
    tablesInCombo: 'bord',
    paxTotal: 'personer totalt',
    createTable: 'Opprett bord',
    editTable: 'Rediger bord',
    tableName: 'Bordnavn / nummer',
    minCapacity: 'Min. kapasitet',
    maxCapacity: 'Maks. kapasitet',
    tableAvailability: 'Bordtilgjengelighet',
    onlineVisible: '🟢 Offentlig - Synlig for publikum',
    internalOnly: '🟣 Intern - Kun for servitører',
    notes: 'Notater (valgfritt)',
    cancel: 'Avbryt',
    saveChanges: 'Lagre endringer',
    createTableBtn: 'Opprett bord',
    saving: 'Lagrer…',
    creating: 'Oppretter…',
    createTableCombination: 'Opprett bordkombinasjon',
    tablesSelected: 'bord valgt',
    tablesInThisCombination: 'Bord i denne kombinasjonen',
    totalCombinedCapacity: 'Total kombinert kapasitet',
    avgPerTable: 'gj.sn. personer/bord',
    combinationName: 'Kombinasjonsnavn',
    namePlaceholder: 'f.eks. VIP-seksjon, Stor gruppe (7 bord), Terrassegruppe',
    thisNameAppears: 'Dette navnet vises ved booking av store grupper',
    saveCombination: 'Lagre kombinasjon',
    noTablesToMap: 'Ingen bord å kartlegge',
    addTablesFirst: 'Legg til bord i Bord-fanen først',
    deleteTable: 'Slett dette bordet?',
    removeCombination: 'Fjern denne bordkombinasjonen?',
    accessDenied: 'Tilgang nektet.',
    failedSave: 'Kunne ikke lagre bordet. Prøv igjen.',
    failedCombination: 'Kunne ikke lagre kombinasjonen.',
    lowerPriority: 'Lavere = høyere prioritet',
    windowSeat: 'f.eks. Vindusplass, rullestoltilgjengelig',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    editTableTitle: 'Rediger bord',
    createTableTitle: 'Opprett bord',
    table: 'Bord',
    noTables: 'Ingen bord',
    addFirst: 'Legg til ditt første bord',
  },
  sv: {
    tableManagement: 'Bordhantering',
    selectRestaurant: 'Välj en restaurang för att hantera dess bord',
    noRestaurantsFound: 'Inga restauranger hittades',
    back: 'Tillbaka',
    create: 'Skapa',
    tables: 'Bord',
    floorMap: 'Planlösning',
    online: 'offentlig',
    internal: 'intern',
    reserved: 'reserverad',
    seated: 'sittande',
    alertPax: 'Varna om under min. kapacitet',
    combineTables: 'Kombinera bord',
    cancelCombine: 'Avbryt kombination',
    selectTablesToCombine: 'Välj bord att kombinera',
    pickAtLeast: 'Välj minst 2 bord för att kombinera dem till en bokningsbar grupp',
    combinedCapacity: 'Kombinerad kapacitet',
    createCombination: 'Skapa kombination',
    noTablesYet: 'Inga bord ännu',
    addFirstTable: 'Klicka på "+ Skapa" för att lägga till ditt första bord',
    name: 'Namn',
    min: 'Min.',
    max: 'Max.',
    priority: 'Prioritet',
    status: 'Status',
    actions: 'Åtgärder',
    edit: 'Redigera',
    delete: 'Ta bort',
    partOfCombination: 'Del av kombination',
    tableCombinations: 'Bordkombinationer',
    tablesInCombo: 'bord',
    paxTotal: 'personer totalt',
    createTable: 'Skapa bord',
    editTable: 'Redigera bord',
    tableName: 'Bordsnamn / nummer',
    minCapacity: 'Min. kapacitet',
    maxCapacity: 'Max. kapacitet',
    tableAvailability: 'Bordstillgänglighet',
    onlineVisible: '🟢 Offentlig - Synlig för allmänheten',
    internalOnly: '🟣 Intern - Endast för servitörer',
    notes: 'Anteckningar (valfritt)',
    cancel: 'Avbryt',
    saveChanges: 'Spara ändringar',
    createTableBtn: 'Skapa bord',
    saving: 'Sparar…',
    creating: 'Skapar…',
    createTableCombination: 'Skapa bordkombination',
    tablesSelected: 'bord valda',
    tablesInThisCombination: 'Bord i denna kombination',
    totalCombinedCapacity: 'Total kombinerad kapacitet',
    avgPerTable: 'gen. personer/bord',
    combinationName: 'Kombinationsnamn',
    namePlaceholder: 't.ex. VIP-sektion, Stor grupp (7 bord), Terrassgrupp',
    thisNameAppears: 'Detta namn visas vid bokning av stora grupper',
    saveCombination: 'Spara kombination',
    noTablesToMap: 'Inga bord att kartlägga',
    addTablesFirst: 'Lägg till bord i Bord-fliken först',
    deleteTable: 'Ta bort detta bord?',
    removeCombination: 'Ta bort denna bordkombination?',
    accessDenied: 'Åtkomst nekad.',
    failedSave: 'Kunde inte spara bordet. Försök igen.',
    failedCombination: 'Kunde inte spara kombinationen.',
    lowerPriority: 'Lägre = högre prioritet',
    windowSeat: 't.ex. Fönsterplats, rullstolsanpassad',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    editTableTitle: 'Redigera bord',
    createTableTitle: 'Skapa bord',
    table: 'Bord',
    noTables: 'Inga bord',
    addFirst: 'Lägg till ditt första bord',
  },
  de: {
    tableManagement: 'Tischverwaltung',
    selectRestaurant: 'Wähle ein Restaurant, um dessen Tische zu verwalten',
    noRestaurantsFound: 'Keine Restaurants gefunden',
    back: 'Zurück',
    create: 'Erstellen',
    tables: 'Tische',
    floorMap: 'Grundriss',
    online: 'öffentlich',
    internal: 'intern',
    reserved: 'reserviert',
    seated: 'besetzt',
    alertPax: 'Bei Unterschreitung der Mindestkapazität warnen',
    combineTables: 'Tische kombinieren',
    cancelCombine: 'Kombination abbrechen',
    selectTablesToCombine: 'Wähle Tische zum Kombinieren',
    pickAtLeast: 'Wähle mindestens 2 Tische, um sie zu einer buchbaren Gruppe zu kombinieren',
    combinedCapacity: 'Kombinierte Kapazität',
    createCombination: 'Kombination erstellen',
    noTablesYet: 'Noch keine Tische',
    addFirstTable: 'Klicke auf "+ Erstellen", um deinen ersten Tisch hinzuzufügen',
    name: 'Name',
    min: 'Min.',
    max: 'Max.',
    priority: 'Priorität',
    status: 'Status',
    actions: 'Aktionen',
    edit: 'Bearbeiten',
    delete: 'Löschen',
    partOfCombination: 'Teil einer Kombination',
    tableCombinations: 'Tischkombinationen',
    tablesInCombo: 'Tische',
    paxTotal: 'Personen gesamt',
    createTable: 'Tisch erstellen',
    editTable: 'Tisch bearbeiten',
    tableName: 'Tischname / Nummer',
    minCapacity: 'Min. Kapazität',
    maxCapacity: 'Max. Kapazität',
    tableAvailability: 'Tischverfügbarkeit',
    onlineVisible: '🟢 Öffentlich - Für Gäste sichtbar',
    internalOnly: '🟣 Intern - Nur für Kellner',
    notes: 'Notizen (optional)',
    cancel: 'Abbrechen',
    saveChanges: 'Änderungen speichern',
    createTableBtn: 'Tisch erstellen',
    saving: 'Speichern…',
    creating: 'Erstellen…',
    createTableCombination: 'Tischkombination erstellen',
    tablesSelected: 'Tische ausgewählt',
    tablesInThisCombination: 'Tische in dieser Kombination',
    totalCombinedCapacity: 'Gesamtkapazität',
    avgPerTable: 'Ø Personen/Tisch',
    combinationName: 'Kombinationsname',
    namePlaceholder: 'z.B. VIP-Bereich, Große Gruppe (7 Tische), Terrassengruppe',
    thisNameAppears: 'Dieser Name erscheint bei der Buchung großer Gruppen',
    saveCombination: 'Kombination speichern',
    noTablesToMap: 'Keine Tische zum Kartieren',
    addTablesFirst: 'Füge zuerst Tische in der Tische-Tabelle hinzu',
    deleteTable: 'Diesen Tisch löschen?',
    removeCombination: 'Diese Tischkombination entfernen?',
    accessDenied: 'Zugriff verweigert.',
    failedSave: 'Speichern des Tisches fehlgeschlagen. Bitte erneut versuchen.',
    failedCombination: 'Speichern der Kombination fehlgeschlagen.',
    lowerPriority: 'Niedriger = höhere Priorität',
    windowSeat: 'z.B. Fensterplatz, rollstuhlgerecht',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    editTableTitle: 'Tisch bearbeiten',
    createTableTitle: 'Tisch erstellen',
    table: 'Tisch',
    noTables: 'Keine Tische',
    addFirst: 'Füge deinen ersten Tisch hinzu',
  },
};

const TABLE_SIZES = {
  square:    { w: 80,  h: 80  },
  rectangle: { w: 130, h: 70  },
  round:     { w: 80,  h: 80  },
  bar:       { w: 160, h: 50  },
};

// Table color zones — matches the reference screenshot's colored sections
const ZONE_COLORS = [
  { id: "none",   label: "Default",  fill: null,      stroke: null      },
  { id: "green",  label: "Green",    fill: "#bbf7d0", stroke: "#22c55e" },
  { id: "yellow", label: "Yellow",   fill: "#fef08a", stroke: "#eab308" },
  { id: "pink",   label: "Pink",     fill: "#fbcfe8", stroke: "#ec4899" },
  { id: "purple", label: "Purple",   fill: "#ddd6fe", stroke: "#8b5cf6" },
  { id: "blue",   label: "Blue",     fill: "#bfdbfe", stroke: "#3b82f6" },
  { id: "orange", label: "Orange",   fill: "#fed7aa", stroke: "#f97316" },
  { id: "white",  label: "White",    fill: "#f1f5f9", stroke: "#94a3b8" },
];

// Decorative element types
// Decor categories
const DECOR_CATEGORIES = [
  { id: "furniture", label: "🛋 Furniture" },
  { id: "fixtures",  label: "🏠 Fixtures"  },
];

const DECOR_TYPES = [
  // Furniture
  { id: "sofa",           label: "Sofa",           cat: "furniture" },
  { id: "sofa_l",         label: "L-Sofa",         cat: "furniture" },
  { id: "armchair",       label: "Armchair",       cat: "furniture" },
  { id: "bench",          label: "Bench",          cat: "furniture" },
  { id: "lounge_chair",   label: "Lounge chair",   cat: "furniture" },
  // Fixtures
  { id: "bar_counter",    label: "Bar counter",    cat: "fixtures"  },
  { id: "bar_round",      label: "Bar (round)",    cat: "fixtures"  },
  { id: "reception",      label: "Reception desk", cat: "fixtures"  },
  { id: "divider",        label: "Wall divider",   cat: "fixtures"  },
  { id: "pillar",         label: "Pillar",         cat: "fixtures"  },
];

const MODES = { SELECT: "select", WALL: "wall", DECOR: "decor", PAN: "pan" };

// ─── Status overrides (when table is actively used) ─────────────────────────────
  const activeStatusFill = () => {
    return null;
  };

  const activeStatusStroke = (t) => {
    if (t.online === false) return "#a855f7";
    return null;
  };

function getTableColors(table, zone) {
  const aFill   = activeStatusFill(table);
  const aStroke = activeStatusStroke(table);
  const zObj    = ZONE_COLORS.find((z) => z.id === (zone || "none")) || ZONE_COLORS[0];
  return {
    fill:   aFill   || zObj.fill   || "#f1f5f9",
    stroke: aStroke || zObj.stroke || "#94a3b8",
  };
}

// ─── Chair helpers ──────────────────────────────────────────────────────────────
function circleChairs(cx, cy, r, n) {
  if (!n || n <= 0) return [];
  const orbitR = r + CHAIR_GAP + CHAIR_H / 2;
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { cx: cx + orbitR * Math.cos(a), cy: cy + orbitR * Math.sin(a), deg: (a * 180) / Math.PI + 90 };
  });
}
function rectChairs(tx, ty, tw, th, n) {
  if (!n || n <= 0) return [];
  const perTop    = Math.max(1, Math.ceil(n / 4));
  const perBottom = Math.max(1, Math.ceil(n / 4));
  const rem       = n - perTop - perBottom;
  const perLeft   = rem > 0 ? Math.ceil(rem / 2) : 0;
  const perRight  = rem > 0 ? rem - perLeft : 0;
  const chairs    = [];
  for (let i = 0; i < perTop;    i++) chairs.push({ x: tx + ((i+1)/(perTop+1))    * tw - CHAIR_W/2, y: ty - CHAIR_GAP - CHAIR_H, isH: true  });
  for (let i = 0; i < perBottom; i++) chairs.push({ x: tx + ((i+1)/(perBottom+1)) * tw - CHAIR_W/2, y: ty + th + CHAIR_GAP,      isH: true  });
  for (let i = 0; i < perLeft;   i++) chairs.push({ x: tx - CHAIR_GAP - CHAIR_H,  y: ty + ((i+1)/(perLeft+1))  * th - CHAIR_W/2, isH: false });
  for (let i = 0; i < perRight;  i++) chairs.push({ x: tx + tw + CHAIR_GAP,        y: ty + ((i+1)/(perRight+1)) * th - CHAIR_W/2, isH: false });
  return chairs;
}

// ─── Decorative SVG renderers ───────────────────────────────────────────────────
function DecorElement({ d, isSelected }) {
  const w   = d.w   || 60;
  const h   = d.h   || 60;
  const rot = d.rot || 0;
  const cx  = d.x + w / 2;
  const cy  = d.y + h / 2;

  // Selection ring — always axis-aligned around bounding box, then rotated with element
  const SelRing = () => isSelected ? (
    <rect x={d.x - 8} y={d.y - 8} width={w + 16} height={h + 16}
      fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="5 3" rx={8} />
  ) : null;

  // Wrap everything in a rotation group around its own center
  const render = () => {
    switch (d.type) {

      // ── PLANTS ───────────────────────────────────────────────────
      case "plant_round": {
        const r = w / 2;
        return <>
          <SelRing />
          <circle cx={cx} cy={cy} r={r} fill="#14532d" opacity={0.9} />
          <circle cx={cx-r*.3} cy={cy-r*.25} r={r*.42} fill="#15803d" />
          <circle cx={cx+r*.3} cy={cy-r*.25} r={r*.42} fill="#15803d" />
          <circle cx={cx}      cy={cy+r*.3}  r={r*.42} fill="#15803d" />
          <circle cx={cx-r*.4} cy={cy+r*.1}  r={r*.28} fill="#22c55e" opacity={0.7} />
          <circle cx={cx+r*.4} cy={cy+r*.1}  r={r*.28} fill="#22c55e" opacity={0.7} />
          <circle cx={cx}      cy={cy-r*.45} r={r*.28} fill="#22c55e" opacity={0.7} />
        </>;
      }

      case "plant_tall": {
        const bx = cx, by = d.y + h;
        return <>
          <SelRing />
          <ellipse cx={bx} cy={by - 6} rx={w*.28} ry={h*.08} fill="#78350f" />
          <rect x={bx-3} y={d.y+h*.35} width={6} height={h*.6} rx={3} fill="#166534" />
          <ellipse cx={bx} cy={d.y+h*.3} rx={w*.42} ry={h*.38} fill="#166534" opacity={0.95} />
          <ellipse cx={bx-w*.3} cy={d.y+h*.5} rx={w*.22} ry={h*.32} fill="#15803d" opacity={0.85}
            transform={`rotate(-30,${bx-w*.3},${d.y+h*.5})`} />
          <ellipse cx={bx+w*.3} cy={d.y+h*.5} rx={w*.22} ry={h*.32} fill="#15803d" opacity={0.85}
            transform={`rotate(30,${bx+w*.3},${d.y+h*.5})`} />
          <circle cx={bx} cy={d.y+h*.18} r={w*.18} fill="#22c55e" opacity={0.6} />
        </>;
      }

      case "plant_cactus": {
        return <>
          <SelRing />
          <ellipse cx={cx} cy={d.y+h*.88} rx={w*.3} ry={h*.08} fill="#78350f" />
          <rect x={cx-w*.12} y={d.y+h*.2} width={w*.24} height={h*.72} rx={w*.1} fill="#166534" />
          <rect x={cx-w*.38} y={d.y+h*.35} width={w*.28} height={h*.2} rx={w*.08} fill="#166534" />
          <rect x={cx+w*.1}  y={d.y+h*.45} width={w*.28} height={h*.2} rx={w*.08} fill="#166534" />
          <circle cx={cx} cy={d.y+h*.18} r={w*.1} fill="#f472b6" />
          <circle cx={cx-w*.26} cy={d.y+h*.32} r={w*.07} fill="#f472b6" />
          <circle cx={cx+w*.26} cy={d.y+h*.42} r={w*.07} fill="#f472b6" />
        </>;
      }

      case "plant_fern": {
        return <>
          <SelRing />
          <ellipse cx={cx} cy={d.y+h*.88} rx={w*.32} ry={h*.1} fill="#92400e" />
          <ellipse cx={cx} cy={d.y+h*.88} rx={w*.28} ry={h*.09} fill="#78350f" />
          {[[-35,-0.3,0.6],[0,-0.5,0.45],[35,-0.3,0.6],[-20,-0.15,0.75],[20,-0.15,0.75]].map(([ang,fx,fy],i)=>(
            <ellipse key={i} cx={cx+w*fx*0.5} cy={d.y+h*fy}
              rx={w*.22} ry={h*.18}
              fill={i%2===0?"#15803d":"#166534"} opacity={0.9}
              transform={`rotate(${ang},${cx+w*fx*0.5},${d.y+h*fy})`} />
          ))}
        </>;
      }

      case "plant_hedge": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y+h*.3} width={w} height={h*.7} rx={4} fill="#14532d" />
          {Array.from({length:Math.max(2,Math.round(w/28))},(_,i)=>{
            const bx = d.x + (i+0.5)*(w/Math.max(2,Math.round(w/28)));
            return <ellipse key={i} cx={bx} cy={d.y+h*.32} rx={w/(Math.max(2,Math.round(w/28))*1.3)} ry={h*.28}
              fill={i%2===0?"#15803d":"#166534"} />;
          })}
        </>;
      }

      // ── FURNITURE ─────────────────────────────────────────────────
      case "sofa": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y+h*.5} width={w} height={h*.5} rx={h*.15} fill="#3b0764" />
          <rect x={d.x} y={d.y} width={w} height={h*.6} rx={h*.12} fill="#4c1d95" stroke="#7c3aed" strokeWidth={2} />
          {Array.from({length:Math.max(2,Math.round(w/45))},(_,i)=>{
            const seg = w/Math.max(2,Math.round(w/45));
            return <rect key={i} x={d.x+i*seg+4} y={d.y+6} width={seg-8} height={h*.5-8} rx={6} fill="#5b21b6" />;
          })}
          <rect x={d.x} y={d.y} width={h*.14} height={h*.62} rx={4} fill="#6d28d9" />
          <rect x={d.x+w-h*.14} y={d.y} width={h*.14} height={h*.62} rx={4} fill="#6d28d9" />
        </>;
      }

      case "sofa_l": {
        const sw = w, sh = h;
        return <>
          <SelRing />
          <rect x={d.x} y={d.y} width={sw*.65} height={sh} rx={8} fill="#4c1d95" stroke="#7c3aed" strokeWidth={2} />
          <rect x={d.x+sw*.6} y={d.y+sh*.45} width={sw*.4} height={sh*.55} rx={8} fill="#4c1d95" stroke="#7c3aed" strokeWidth={2} />
          <rect x={d.x+6} y={d.y+6} width={sw*.55} height={sh*.55} rx={5} fill="#5b21b6" />
          <rect x={d.x+sw*.66} y={d.y+sh*.5} width={sw*.3} height={sh*.42} rx={5} fill="#5b21b6" />
        </>;
      }

      case "armchair": {
        const r2 = Math.min(w,h)*0.5;
        return <>
          <SelRing />
          <rect x={d.x} y={d.y+h*.4} width={w} height={h*.6} rx={h*.15} fill="#1e3a5f" />
          <rect x={d.x+w*.1} y={d.y+h*.1} width={w*.8} height={h*.55} rx={h*.12} fill="#1d4ed8" stroke="#3b82f6" strokeWidth={1.5} />
          <rect x={d.x} y={d.y+h*.1} width={w*.18} height={h*.55} rx={6} fill="#2563eb" />
          <rect x={d.x+w*.82} y={d.y+h*.1} width={w*.18} height={h*.55} rx={6} fill="#2563eb" />
        </>;
      }

      case "bench": {
        return <>
          <SelRing />
          <rect x={d.x+w*.06} y={d.y+h*.55} width={w*.88} height={h*.12} rx={3} fill="#78350f" />
          <rect x={d.x+w*.06} y={d.y+h*.7}  width={w*.88} height={h*.08} rx={2} fill="#92400e" />
          <rect x={d.x+w*.08} y={d.y+h*.78} width={w*.05} height={h*.18} rx={2} fill="#78350f" />
          <rect x={d.x+w*.87} y={d.y+h*.78} width={w*.05} height={h*.18} rx={2} fill="#78350f" />
          <rect x={d.x} y={d.y} width={w} height={h*.52} rx={6} fill="#92400e" stroke="#78350f" strokeWidth={1.5} />
          <rect x={d.x+6} y={d.y+6} width={w-12} height={h*.4} rx={4} fill="#a16207" opacity={0.7} />
        </>;
      }

      case "lounge_chair": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y+h*.3} width={w} height={h*.7} rx={h*.18} fill="#134e4a" />
          <rect x={d.x+w*.05} y={d.y} width={w*.9} height={h*.45} rx={h*.12} fill="#0f766e" stroke="#14b8a6" strokeWidth={1.5} />
          <ellipse cx={cx} cy={d.y+h*.22} rx={w*.3} ry={h*.18} fill="#14b8a6" opacity={0.5} />
        </>;
      }

      // ── FIXTURES ──────────────────────────────────────────────────
      case "bar_counter": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y} width={w} height={h} rx={6} fill="#44403c" stroke="#78716c" strokeWidth={2} />
          <rect x={d.x+4} y={d.y+4} width={w-8} height={h-8} rx={4} fill="#57534e" />
          <rect x={d.x+8} y={d.y+8} width={w-16} height={h*.35} rx={3} fill="#78716c" opacity={0.5} />
          <text x={cx} y={d.y+h*.7} textAnchor="middle" fontSize={Math.max(10,h*.28)} fontWeight="700" fill="#e7e5e4"
            style={{fontFamily:"system-ui,sans-serif",pointerEvents:"none"}}>BAR</text>
        </>;
      }

      case "bar_round": {
        const r = Math.min(w,h)/2;
        return <>
          <SelRing />
          <circle cx={cx} cy={cy} r={r} fill="#44403c" stroke="#78716c" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r*.75} fill="#57534e" />
          <circle cx={cx} cy={cy} r={r*.4}  fill="#78716c" opacity={0.6} />
          <text x={cx} y={cy+5} textAnchor="middle" fontSize={r*.4} fontWeight="700" fill="#e7e5e4"
            style={{fontFamily:"system-ui,sans-serif",pointerEvents:"none"}}>BAR</text>
        </>;
      }

      case "reception": {
        return <>
          <SelRing />
          <path d={`M${d.x} ${d.y+h} L${d.x} ${d.y+h*.3} Q${d.x} ${d.y} ${d.x+w*.12} ${d.y} L${d.x+w*.88} ${d.y} Q${d.x+w} ${d.y} ${d.x+w} ${d.y+h*.3} L${d.x+w} ${d.y+h} Z`}
            fill="#1e293b" stroke="#334155" strokeWidth={2} />
          <rect x={d.x+6} y={d.y+h*.08} width={w-12} height={h*.35} rx={4} fill="#0f172a" />
          <rect x={d.x+w*.15} y={d.y+h*.15} width={w*.3} height={h*.2} rx={3} fill="#1d4ed8" opacity={0.8} />
          <rect x={d.x+w*.55} y={d.y+h*.15} width={w*.3} height={h*.2} rx={3} fill="#334155" opacity={0.8} />
          <rect x={d.x+8} y={d.y+h*.5} width={w-16} height={h*.1} rx={2} fill="#334155" />
        </>;
      }

      case "divider": {
        return <>
          {isSelected && <rect x={d.x-6} y={d.y-6} width={w+12} height={h+12} fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="5 3" rx={4} />}
          <rect x={d.x} y={d.y} width={w} height={h} rx={4} fill="#374151" stroke="#4b5563" strokeWidth={1.5} />
          <rect x={d.x+w*.25} y={d.y+h*.1} width={w*.5} height={h*.8} rx={2} fill="#4b5563" opacity={0.4} />
        </>;
      }

      case "pillar": {
        const r3 = Math.min(w,h)*0.42;
        return <>
          <SelRing />
          <circle cx={cx} cy={cy} r={r3+4} fill="#374151" stroke="#4b5563" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r3}   fill="#4b5563" />
          <circle cx={cx} cy={cy} r={r3*.6} fill="#6b7280" opacity={0.5} />
        </>;
      }

      case "stage": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y} width={w} height={h} rx={6} fill="#1c1917" stroke="#44403c" strokeWidth={2} />
          <rect x={d.x+6} y={d.y+6} width={w-12} height={h-12} rx={4} fill="#292524" />
          {Array.from({length:4},(_,i)=>(
            <circle key={i} cx={d.x+w*.15+i*(w*.25)} cy={d.y+h*.3} r={h*.1}
              fill={["#fbbf24","#f87171","#60a5fa","#a78bfa"][i]} opacity={0.9} />
          ))}
          <rect x={d.x+w*.1} y={d.y+h*.55} width={w*.8} height={h*.3} rx={3} fill="#44403c" />
        </>;
      }

      // ── MISC ──────────────────────────────────────────────────────
      case "fountain": {
        const r4 = Math.min(w,h)*0.48;
        return <>
          <SelRing />
          <circle cx={cx} cy={cy} r={r4}   fill="#0c4a6e" stroke="#0284c7" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={r4*.7} fill="#075985" />
          <circle cx={cx} cy={cy} r={r4*.35} fill="#0369a1" stroke="#38bdf8" strokeWidth={1} />
          <circle cx={cx} cy={cy} r={r4*.15} fill="#7dd3fc" opacity={0.9} />
          {Array.from({length:6},(_,i)=>{
            const a = (i/6)*2*Math.PI;
            return <ellipse key={i}
              cx={cx+r4*.5*Math.cos(a)} cy={cy+r4*.5*Math.sin(a)}
              rx={r4*.08} ry={r4*.18}
              fill="#38bdf8" opacity={0.7}
              transform={`rotate(${i*60},${cx+r4*.5*Math.cos(a)},${cy+r4*.5*Math.sin(a)})`} />;
          })}
        </>;
      }

      case "dj_booth": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y} width={w} height={h} rx={8} fill="#0f172a" stroke="#1e293b" strokeWidth={2} />
          <rect x={d.x+6} y={d.y+6} width={w-12} height={h*.55} rx={4} fill="#1e293b" />
          {Array.from({length:3},(_,i)=>(
            <circle key={i} cx={d.x+w*.2+i*(w*.3)} cy={d.y+h*.28} r={w*.09}
              fill={["#f43f5e","#8b5cf6","#06b6d4"][i]} opacity={0.9} />
          ))}
          <rect x={d.x+8} y={d.y+h*.68} width={w-16} height={h*.08} rx={2} fill="#334155" />
          <rect x={d.x+w*.15} y={d.y+h*.78} width={w*.7} height={h*.14} rx={3} fill="#1e293b" />
          <rect x={d.x+w*.2} y={d.y+h*.8} width={w*.15} height={h*.1} rx={2} fill="#64748b" />
          <rect x={d.x+w*.65} y={d.y+h*.8} width={w*.15} height={h*.1} rx={2} fill="#64748b" />
          <text x={cx} y={d.y+h*.62} textAnchor="middle" fontSize={Math.max(8,w*.1)} fontWeight="700" fill="#94a3b8"
            style={{fontFamily:"system-ui,sans-serif",pointerEvents:"none"}}>DJ</text>
        </>;
      }

      case "fire_pit": {
        const r5 = Math.min(w,h)*0.48;
        return <>
          <SelRing />
          <circle cx={cx} cy={cy} r={r5}    fill="#292524" stroke="#78350f" strokeWidth={3} />
          <circle cx={cx} cy={cy} r={r5*.75} fill="#1c1917" />
          <ellipse cx={cx} cy={cy+r5*.1} rx={r5*.5} ry={r5*.35} fill="#dc2626" opacity={0.9} />
          <ellipse cx={cx-r5*.15} cy={cy-r5*.1} rx={r5*.3} ry={r5*.45} fill="#f97316" opacity={0.85} />
          <ellipse cx={cx+r5*.15} cy={cy-r5*.15} rx={r5*.25} ry={r5*.4}  fill="#fbbf24" opacity={0.9} />
          <ellipse cx={cx} cy={cy-r5*.25} rx={r5*.15} ry={r5*.28} fill="#fef08a" opacity={0.8} />
        </>;
      }

      case "rug": {
        return <>
          <SelRing />
          <rect x={d.x} y={d.y} width={w} height={h} rx={h*.15} fill="#7f1d1d" stroke="#991b1b" strokeWidth={2} />
          <rect x={d.x+w*.08} y={d.y+h*.12} width={w*.84} height={h*.76} rx={h*.1} fill="#991b1b" />
          <rect x={d.x+w*.16} y={d.y+h*.22} width={w*.68} height={h*.56} rx={h*.08} fill="#b91c1c" />
          <ellipse cx={cx} cy={cy} rx={w*.22} ry={h*.22} fill="#dc2626" />
          {[0,90,180,270].map((ang,i)=>(
            <rect key={i} x={cx-w*.04} y={d.y+h*.28} width={w*.08} height={h*.18} rx={2}
              fill="#ef4444" opacity={0.7}
              transform={`rotate(${ang},${cx},${cy})`} />
          ))}
        </>;
      }

      default: return null;
    }
  };

  return (
    <g transform={`rotate(${rot},${cx},${cy})`}>
      {render()}
    </g>
  );
}

// ─── FloorPlanEditor ───────────────────────────────────────────────────────────
function FloorPlanEditor({ tables, restaurantId, collectionName, positions, setPositions, shapes, setShapes, zones, setZones, scales, setScales, rots, setRots }) {
  // Language support for map editor
  const [lang] = useState(localStorage.getItem('app_lang') || 'en');
  
  // ─── i18n for map editor ──────────────────────────────────────────────────────
  const t = (key) => {
    const mapEditorI18n = {
      en: {
        tools: 'Tools',
        select: 'Select',
        pan: 'Pan',
        wall: 'Wall',
        decor: 'Decor',
        category: 'Category',
        zoom: 'Zoom',
        in: 'In',
        out: 'Out',
        reset: 'Reset',
        snapGrid: 'Snap grid',
        saveMap: 'Save Map',
        saved: 'Saved!',
        saving: 'Saving…',
        canvas: 'Canvas',
        shape: 'Shape',
        zone: 'Zone',
        size: 'Size',
        rotate: 'Rotate',
        resetTransform: 'Reset',
        removeFromMap: 'Remove from map',
        thickness: 'Thickness',
        thin: 'Thin',
        normal: 'Normal',
        thick: 'Thick',
        shorter: 'Shorter',
        longer: 'Longer',
        delete: 'Delete',
        bg: 'BG',
        grid: 'Grid',
        dots: 'Dots',
        lines: 'Lines',
        none: 'None',
        clickDragWall: 'Click & drag to draw a wall',
        clickPlaceDecor: 'Click to place:',
        dragPan: 'Drag to pan the canvas',
        selectHint: 'Click to select · Drag to move · Del removes wall/decor · Scroll to zoom',
        scrollZoom: 'Scroll to zoom · Pan tool to navigate · Select a table to change shape & zone color · Del removes wall/decor',
        custom: 'Custom',
        default: 'Default',
        green: 'Green',
        yellow: 'Yellow',
        pink: 'Pink',
        purple: 'Purple',
        blue: 'Blue',
        orange: 'Orange',
        white: 'White',
      },
      fi: {
        tools: 'Työkalut',
        select: 'Valitse',
        pan: 'Siirrä',
        wall: 'Seinä',
        decor: 'Sisustus',
        category: 'Kategoria',
        zoom: 'Zoomaus',
        in: 'Sisään',
        out: 'Ulos',
        reset: 'Palauta',
        snapGrid: 'Tartu ruudukkoon',
        saveMap: 'Tallenna kartta',
        saved: 'Tallennettu!',
        saving: 'Tallennetaan…',
        canvas: 'Kangas',
        shape: 'Muoto',
        zone: 'Vyöhyke',
        size: 'Koko',
        rotate: 'Kierrä',
        resetTransform: 'Palauta',
        removeFromMap: 'Poista kartalta',
        thickness: 'Paksuus',
        thin: 'Ohut',
        normal: 'Normaali',
        thick: 'Paksu',
        shorter: 'Lyhyempi',
        longer: 'Pidempi',
        delete: 'Poista',
        bg: 'Tausta',
        grid: 'Ruudukko',
        dots: 'Pisteet',
        lines: 'Viivat',
        none: 'Ei mitään',
        clickDragWall: 'Napsauta & vedä piirtääksesi seinän',
        clickPlaceDecor: 'Napsauta sijoittaaksesi:',
        dragPan: 'Vedä siirtääksesi kangasta',
        selectHint: 'Napsauta valitaksesi · Vedä siirtääksesi · Del poistaa seinän/sisustuksen · Rullaa zoomataksesi',
        scrollZoom: 'Rullaa zoomataksesi · Siirrä-työkalu navigointiin · Valitse pöytä muuttaaksesi muotoa & vyöhykkeen väriä · Del poistaa seinän/sisustuksen',
        custom: 'Mukautettu',
        default: 'Oletus',
        green: 'Vihreä',
        yellow: 'Keltainen',
        pink: 'Pinkki',
        purple: 'Violetti',
        blue: 'Sininen',
        orange: 'Oranssi',
        white: 'Valkoinen',
      },
      no: {
        tools: 'Verktøy',
        select: 'Velg',
        pan: 'Panorer',
        wall: 'Vegg',
        decor: 'Dekor',
        category: 'Kategori',
        zoom: 'Zoom',
        in: 'Inn',
        out: 'Ut',
        reset: 'Tilbakestill',
        snapGrid: 'Fest til rutenett',
        saveMap: 'Lagre kart',
        saved: 'Lagret!',
        saving: 'Lagrer…',
        canvas: 'Lerret',
        shape: 'Form',
        zone: 'Sone',
        size: 'Størrelse',
        rotate: 'Roter',
        resetTransform: 'Tilbakestill',
        removeFromMap: 'Fjern fra kart',
        thickness: 'Tykkelse',
        thin: 'Tynn',
        normal: 'Normal',
        thick: 'Tyk',
        shorter: 'Kortere',
        longer: 'Lengre',
        delete: 'Slett',
        bg: 'Bakgrunn',
        grid: 'Rutenett',
        dots: 'Prikker',
        lines: 'Linjer',
        none: 'Ingen',
        clickDragWall: 'Klikk & dra for å tegne en vegg',
        clickPlaceDecor: 'Klikk for å plassere:',
        dragPan: 'Dra for å panorer',
        selectHint: 'Klikk for å velge · Dra for å flytte · Del fjerner vegg/dekor · Rull for å zoome',
        scrollZoom: 'Rull for å zoome · Panoreringsverktøy for navigering · Velg et bord for å endre form & sonefarge · Del fjerner vegg/dekor',
        custom: 'Egendefinert',
        default: 'Standard',
        green: 'Grønn',
        yellow: 'Gul',
        pink: 'Rosa',
        purple: 'Lilla',
        blue: 'Blå',
        orange: 'Oransje',
        white: 'Hvit',
      },
      sv: {
        tools: 'Verktyg',
        select: 'Välj',
        pan: 'Panorera',
        wall: 'Vägg',
        decor: 'Dekor',
        category: 'Kategori',
        zoom: 'Zoom',
        in: 'In',
        out: 'Ut',
        reset: 'Återställ',
        snapGrid: 'Fäst till rutnät',
        saveMap: 'Spara karta',
        saved: 'Sparad!',
        saving: 'Sparar…',
        canvas: 'Duk',
        shape: 'Form',
        zone: 'Zon',
        size: 'Storlek',
        rotate: 'Rotera',
        resetTransform: 'Återställ',
        removeFromMap: 'Ta bort från karta',
        thickness: 'Tjocklek',
        thin: 'Tunn',
        normal: 'Normal',
        thick: 'Tjock',
        shorter: 'Kortare',
        longer: 'Längre',
        delete: 'Ta bort',
        bg: 'Bakgrund',
        grid: 'Rutnät',
        dots: 'Prickar',
        lines: 'Linjer',
        none: 'Ingen',
        clickDragWall: 'Klicka & dra för att rita en vägg',
        clickPlaceDecor: 'Klicka för att placera:',
        dragPan: 'Dra för att panorera',
        selectHint: 'Klicka för att välja · Dra för att flytta · Del tar bort vägg/dekor · Rulla för att zooma',
        scrollZoom: 'Rulla för att zooma · Panorera-verktyg för navigering · Välj ett bord för att ändra form & zonfärg · Del tar bort vägg/dekor',
        custom: 'Anpassad',
        default: 'Standard',
        green: 'Grön',
        yellow: 'Gul',
        pink: 'Rosa',
        purple: 'Lila',
        blue: 'Blå',
        orange: 'Orange',
        white: 'Vit',
      },
      de: {
        tools: 'Werkzeuge',
        select: 'Auswählen',
        pan: 'Verschieben',
        wall: 'Wand',
        decor: 'Dekor',
        category: 'Kategorie',
        zoom: 'Zoom',
        in: 'Rein',
        out: 'Raus',
        reset: 'Zurücksetzen',
        snapGrid: 'Am Raster einrasten',
        saveMap: 'Karte speichern',
        saved: 'Gespeichert!',
        saving: 'Speichern…',
        canvas: 'Leinwand',
        shape: 'Form',
        zone: 'Zone',
        size: 'Größe',
        rotate: 'Drehen',
        resetTransform: 'Zurücksetzen',
        removeFromMap: 'Von Karte entfernen',
        thickness: 'Dicke',
        thin: 'Dünn',
        normal: 'Normal',
        thick: 'Dick',
        shorter: 'Kürzer',
        longer: 'Länger',
        delete: 'Löschen',
        bg: 'Hintergrund',
        grid: 'Raster',
        dots: 'Punkte',
        lines: 'Linien',
        none: 'Keine',
        clickDragWall: 'Klicken & ziehen, um eine Wand zu zeichnen',
        clickPlaceDecor: 'Klicken zum Platzieren:',
        dragPan: 'Ziehen zum Verschieben',
        selectHint: 'Klicken zum Auswählen · Ziehen zum Bewegen · Del entfernt Wand/Dekor · Scrollen zum Zoomen',
        scrollZoom: 'Scrollen zum Zoomen · Verschieben-Werkzeug zum Navigieren · Wähle einen Tisch, um Form & Zonenfarbe zu ändern · Del entfernt Wand/Dekor',
        custom: 'Benutzerdefiniert',
        default: 'Standard',
        green: 'Grün',
        yellow: 'Gelb',
        pink: 'Rosa',
        purple: 'Lila',
        blue: 'Blau',
        orange: 'Orange',
        white: 'Weiß',
      },
    };
    return (mapEditorI18n[lang] && mapEditorI18n[lang][key]) || (mapEditorI18n.en && mapEditorI18n.en[key]) || key;
  };

  const svgRef  = useRef(null);
  const wrapRef = useRef(null);

  // positions, shapes, zones are lifted to parent — passed as props
  const [walls,     setWalls]     = useState([]);
  const [decors,    setDecors]    = useState([]);   // decorative elements

  const [mode,        setMode]        = useState(MODES.SELECT);
  const [decorType,   setDecorType]   = useState("sofa");
  const [decorCat,    setDecorCat]    = useState("furniture");
  const [zoom,        setZoom]        = useState(1);
  const [pan,         setPan]         = useState({ x: 0, y: 0 });
  const [selectedId,  setSelectedId]  = useState(null);
  const [selType,     setSelType]     = useState(null); // "table"|"wall"|"decor"
  const [gridSnap,    setGridSnap]    = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [wallPreview, setWallPreview] = useState(null);

  const dragRef    = useRef(null);
  const wallDraft  = useRef(null);
  const panDragRef = useRef(null);

  // Canvas customization — user-adjustable
  const [canvasSize, setCanvasSize] = useState({ w: 1600, h: 1000 });
  const [canvasBg,   setCanvasBg]   = useState("#1a1a2e");
  const [gridColor,  setGridColor]  = useState("#2d2d4e");
  const [gridStyle,  setGridStyle]  = useState("dots"); // "dots" | "lines" | "none"
  const CANVAS = canvasSize;

  // ── Load ──
  useEffect(() => {
    if (!restaurantId || !tables || tables.length === 0) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      try {
        const mapPath = `${collectionName}/${restaurantId}/tableMap/layout`;
        console.log("📐 Loading floor map from:", mapPath);
        const snap = await getDoc(doc(db, collectionName, restaurantId, "tableMap", "layout"));
        // Helper: auto-place any tables that have no saved position
        const fillMissingPositions = (savedPos, savedShapes, savedZones) => {
          const filledPos = { ...savedPos };
          const filledShapes = { ...savedShapes };
          const filledZones = { ...savedZones };
          // Collect all currently occupied grid slots
          const occupiedSlots = new Set(
            Object.values(filledPos).map(p => `${Math.round(p.x/200)}_${Math.round(p.y/200)}`)
          );
          let slotIdx = 0;
          tables.forEach((t) => {
            if (!t?.id) return;
            if (filledPos[t.id]) return; // already has a position
            // Find next free slot
            let col, row;
            do {
              col = slotIdx % 6;
              row = Math.floor(slotIdx / 6);
              slotIdx++;
            } while (occupiedSlots.has(`${col}_${row}`));
            filledPos[t.id]    = { x: 80 + col * 200, y: 100 + row * 200 };
            filledShapes[t.id] = filledShapes[t.id] || "square";
            filledZones[t.id]  = filledZones[t.id]  || "none";
            console.log(`📍 Auto-placed missing table "${t.name}" at slot (${col}, ${row})`);
          });
          return { filledPos, filledShapes, filledZones };
        };

        if (snap.exists()) {
          const d = snap.data();
          console.log("✅ Floor map loaded:", { positions: Object.keys(d.positions||{}).length, walls: (d.walls||[]).length, decors: (d.decors||[]).length });
          const { filledPos, filledShapes, filledZones } = fillMissingPositions(
            d.positions || {}, d.shapes || {}, d.zones || {}
          );
          setPositions(filledPos);
          setShapes(filledShapes);
          setZones(filledZones);
          setWalls(d.walls   || []);
          setDecors(d.decors || []);
          if (d.canvasSize) setCanvasSize(d.canvasSize);
          if (d.canvasBg)   setCanvasBg(d.canvasBg);
          if (d.gridColor)  setGridColor(d.gridColor);
          if (d.gridStyle)  setGridStyle(d.gridStyle);
          if (d.scales) setScales(d.scales);
          if (d.rots)   setRots(d.rots);
        } else {
          console.log("ℹ️ No saved map found, using auto-layout");
          const { filledPos, filledShapes, filledZones } = fillMissingPositions({}, {}, {});
          setPositions(filledPos);
          setShapes(filledShapes);
          setZones(filledZones);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [restaurantId, collectionName, tables.length]); // re-run when table count changes so new tables get auto-placed

  const snapV = useCallback((v) => gridSnap ? Math.round(v / GRID) * GRID : v, [gridSnap]);

  const clientToSVG = useCallback((cx, cy) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const r = svgRef.current.getBoundingClientRect();
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  }, [pan, zoom]);

  // ── Hit tests ──
  const hitTable = useCallback((sx, sy) => {
    if (!tables || !positions) return null;
    return [...tables].reverse().find((t) => {
      if (!t?.id) return false;
      const p = positions[t.id]; if (!p) return false;
      const sh = shapes[t.id] || "square";
      const sz = TABLE_SIZES[sh] || TABLE_SIZES.square;
      const sc = (scales && scales[t.id]) || 1;
      const sw2 = sz.w * sc, sh2 = sz.h * sc;
      if (sh === "round") return Math.hypot(sx-(p.x+sw2/2), sy-(p.y+sh2/2)) <= sw2/2;
      return sx >= p.x && sx <= p.x+sw2 && sy >= p.y && sy <= p.y+sh2;
    }) || null;
  }, [tables, positions, shapes]);

  const hitWall = useCallback((sx, sy) => {
    if (!walls) return null;
    return [...walls].reverse().find((w) => {
      const dx = w.x2-w.x1, dy = w.y2-w.y1, len = Math.hypot(dx, dy);
      if (len === 0) return false;
      const tc = Math.max(0, Math.min(1, ((sx-w.x1)*dx+(sy-w.y1)*dy)/(len*len)));
      return Math.hypot(sx-(w.x1+tc*dx), sy-(w.y1+tc*dy)) <= (w.thick||6)+5;
    }) || null;
  }, [walls]);

  const hitDecor = useCallback((sx, sy) => {
    if (!decors) return null;
    return [...decors].reverse().find((d) => {
      const w = d.w || 60, h = d.h || 60;
      return sx >= d.x && sx <= d.x+w && sy >= d.y && sy <= d.y+h;
    }) || null;
  }, [decors]);

  // ── onDown ──
  const onDown = useCallback((e) => {
    if (e.touches) e.preventDefault();
    const src = e.touches?.[0] || e;
    const { x, y } = clientToSVG(src.clientX, src.clientY);
    const sx = snapV(x), sy = snapV(y);

    if (mode === MODES.PAN) {
      panDragRef.current = { startX: src.clientX - pan.x, startY: src.clientY - pan.y };
      return;
    }
    if (mode === MODES.WALL) {
      wallDraft.current = { id: Date.now(), x1: sx, y1: sy };
      setWallPreview({ x1: sx, y1: sy, x2: sx, y2: sy });
      return;
    }
    if (mode === MODES.DECOR) {
      // Place a new decorative element
      const decorDefaults = {
        plant_round:  { w: 60,  h: 60  },
        plant_tall:   { w: 44,  h: 90  },
        plant_cactus: { w: 44,  h: 80  },
        plant_fern:   { w: 60,  h: 60  },
        plant_hedge:  { w: 140, h: 50  },
        sofa:         { w: 130, h: 60  },
        sofa_l:       { w: 120, h: 100 },
        armchair:     { w: 60,  h: 60  },
        bench:        { w: 110, h: 50  },
        lounge_chair: { w: 70,  h: 55  },
        bar_counter:  { w: 160, h: 55  },
        bar_round:    { w: 80,  h: 80  },
        reception:    { w: 140, h: 70  },
        divider:      { w: 12,  h: 120 },
        pillar:       { w: 40,  h: 40  },
        stage:        { w: 200, h: 100 },
        fountain:     { w: 80,  h: 80  },
        dj_booth:     { w: 130, h: 80  },
        fire_pit:     { w: 70,  h: 70  },
        rug:          { w: 160, h: 100 },
      };
      const def = decorDefaults[decorType] || { w: 60, h: 60 };
      setDecors((prev) => [...prev, { id: Date.now(), type: decorType, x: sx, y: sy, rot: 0, ...def }]);
      return;
    }
    // SELECT
    const tbl = hitTable(x, y);
    if (tbl) {
      setSelectedId(tbl.id); setSelType("table");
      const p = positions[tbl.id] || { x: 0, y: 0 };
      dragRef.current = { type: "table", id: tbl.id, offX: x-p.x, offY: y-p.y };
      return;
    }
    const dec = hitDecor(x, y);
    if (dec) {
      setSelectedId(dec.id); setSelType("decor");
      dragRef.current = { type: "decor", id: dec.id, offX: x-dec.x, offY: y-dec.y };
      return;
    }
    const wl = hitWall(x, y);
    if (wl) {
      setSelectedId(wl.id); setSelType("wall");
      dragRef.current = { type: "wall", id: wl.id, offX: x-wl.x1, offY: y-wl.y1, dx: wl.x2-wl.x1, dy: wl.y2-wl.y1 };
      return;
    }
    setSelectedId(null); setSelType(null);
  }, [mode, pan, snapV, clientToSVG, hitTable, hitWall, hitDecor, positions, decorType]);

  // ── onMove ──
  const onMove = useCallback((e) => {
    if (e.touches) e.preventDefault();
    const src = e.touches?.[0] || e;
    if (mode === MODES.PAN && panDragRef.current) {
      setPan({ x: src.clientX - panDragRef.current.startX, y: src.clientY - panDragRef.current.startY });
      return;
    }
    if (mode === MODES.WALL && wallDraft.current) {
      const { x, y } = clientToSVG(src.clientX, src.clientY);
      setWallPreview({ ...wallDraft.current, x2: snapV(x), y2: snapV(y) });
      return;
    }
    if (!dragRef.current) return;
    const { x, y } = clientToSVG(src.clientX, src.clientY);
    const d = dragRef.current;
    if (d.type === "table") {
      const sz = TABLE_SIZES[shapes[d.id] || "square"] || TABLE_SIZES.square;
      const sc = (scales && scales[d.id]) || 1;
      setPositions((prev) => ({ ...prev, [d.id]: {
        x: snapV(x - d.offX),
        y: snapV(y - d.offY),
      }}));
    } else if (d.type === "decor") {
      setDecors((prev) => prev.map((dc) => dc.id === d.id
        ? { ...dc, x: snapV(x-d.offX), y: snapV(y-d.offY) } : dc));
    } else if (d.type === "wall") {
      const nx1 = snapV(x-d.offX), ny1 = snapV(y-d.offY);
      setWalls((prev) => prev.map((w) => w.id === d.id
        ? { ...w, x1: nx1, y1: ny1, x2: nx1+d.dx, y2: ny1+d.dy } : w));
    }
  }, [mode, clientToSVG, snapV, shapes]);

  // ── onUp ──
  const onUp = useCallback(() => {
    const draft = wallDraft.current;
    const preview = wallPreview;
    if (mode === MODES.WALL && draft && preview) {
      const len = Math.hypot(preview.x2-preview.x1, preview.y2-preview.y1);
      if (len > 10) {
        const wallId = draft.id;
        setWalls((prev) => [...prev, { ...preview, id: wallId, thick: 8 }]);
      }
      wallDraft.current = null;
      setWallPreview(null);
    }
    panDragRef.current = null;
    dragRef.current    = null;
  }, [mode, wallPreview]);

  // ── Wheel zoom ──
  const onWheel = useCallback((e) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.25, Math.min(4, z * (e.deltaY > 0 ? 0.9 : 1.1))));
  }, []);

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Non-passive touch
  useEffect(() => {
    const svg = svgRef.current; if (!svg) return;
    svg.addEventListener("touchstart", onDown, { passive: false });
    svg.addEventListener("touchmove",  onMove, { passive: false });
    svg.addEventListener("touchend",   onUp,   { passive: false });
    return () => {
      svg.removeEventListener("touchstart", onDown);
      svg.removeEventListener("touchmove",  onMove);
      svg.removeEventListener("touchend",   onUp);
    };
  }, [onDown, onMove, onUp]);

  // Delete key
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    if (selType === "wall")  setWalls((p)  => p.filter((w) => w.id !== selectedId));
    if (selType === "decor") setDecors((p) => p.filter((d) => d.id !== selectedId));
    setSelectedId(null); setSelType(null);
  }, [selectedId, selType]);

  useEffect(() => {
    const h = (e) => { if (e.key === "Delete" || e.key === "Backspace") deleteSelected(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [deleteSelected]);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    const mapPath = `${collectionName}/${restaurantId}/tableMap/layout`;
    console.log("💾 Saving floor map to:", mapPath);
    try {
      await setDoc(doc(db, collectionName, restaurantId, "tableMap", "layout"),
        { positions, shapes, zones, walls, decors, scales, rots, canvasSize, canvasBg, gridColor, gridStyle, updatedAt: new Date() });
      console.log("✅ Floor map saved to:", mapPath);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("❌ Save failed:", mapPath, e);
      alert(`Save failed: ${e.message}\n\nCheck Firestore rules for: ${mapPath}`);
    }
    finally { setSaving(false); }
  };

  const selectedTable = selType === "table" ? (tables||[]).find((t) => t?.id === selectedId) : null;
  const selectedWall  = selType === "wall"  ? walls.find((w) => w.id === selectedId)  : null;
  const selectedDecor = selType === "decor" ? decors.find((d) => d.id === selectedId) : null;

  const modeButtons = [
    { key: MODES.SELECT, label: t('select'),  iconD: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" },
    { key: MODES.PAN,    label: t('pan'),     iconD: "M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" },
    { key: MODES.WALL,   label: t('wall'),    iconD: "M4 6h16M4 12h16M4 18h7" },
    { key: MODES.DECOR,  label: t('decor'),   iconD: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" },
  ];

  const [showCanvasPanel, setShowCanvasPanel] = useState(false);

  const CANVAS_PRESETS = [
    { label: "Small",  w: 1200, h: 800  },
    { label: "Medium", w: 1600, h: 1000 },
    { label: "Large",  w: 2200, h: 1400 },
    { label: "XL",     w: 3000, h: 2000 },
  ];

  const BG_PRESETS = [
    { label: "Dark",   color: "#1a1a2e", grid: "#2d2d4e" },
    { label: "Darker", color: "#0f0f1a", grid: "#1e1e3a" },
    { label: "Slate",  color: "#1e293b", grid: "#334155" },
    { label: "Stone",  color: "#1c1917", grid: "#292524" },
    { label: "Forest", color: "#052e16", grid: "#14532d" },
    { label: "Navy",   color: "#0c1445", grid: "#1e3a8a" },
    { label: "Light",  color: "#f8fafc", grid: "#e2e8f0" },
    { label: "White",  color: "#ffffff", grid: "#d1d5db" },
  ];

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" />
    </div>
  );

  return (
    <div className="flex gap-3" style={{ height: "calc(100vh - 210px)", minHeight: 540 }}>

      {/* ── Left sidebar ── */}
      <div className="flex flex-col gap-2 w-[140px] shrink-0">

        {/* Tools */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-2 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">{t('tools')}</p>
          {modeButtons.map(({ key, label, iconD }) => (
            <button key={key} onClick={() => setMode(key)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                mode === key ? "bg-[#fe8a24] text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
              }`}>
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconD} />
              </svg>
              {label}
            </button>
          ))}
        </div>

        {/* Decor picker — only shown in DECOR mode */}
        {mode === MODES.DECOR && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 p-2 flex flex-col gap-1">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">{t('category')}</p>
            {DECOR_CATEGORIES.map(({ id, label }) => (
              <button key={id} onClick={() => setDecorCat(id)}
                className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all ${
                  decorCat === id ? "bg-[#fe8a24] text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}>
                {label}
              </button>
            ))}
            <div className="border-t border-gray-700 mt-1 pt-1 flex flex-col gap-0.5">
              {DECOR_TYPES.filter(t => t.cat === decorCat).map(({ id, label }) => (
                <button key={id} onClick={() => setDecorType(id)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all ${
                    decorType === id ? "bg-gray-600 text-white" : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Zoom */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-2 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-1 mb-1">{t('zoom')}</p>
          {[
            { label: t('in'),    fn: () => setZoom((z) => Math.min(4, +(z+0.15).toFixed(2))), iconD: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" },
            { label: t('out'),   fn: () => setZoom((z) => Math.max(0.25, +(z-0.15).toFixed(2))), iconD: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" },
            { label: t('reset'), fn: () => { setZoom(1); setPan({ x:0, y:0 }); }, iconD: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" },
          ].map(({ label, fn, iconD }) => (
            <button key={label} onClick={fn}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-all">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconD} />
              </svg>
              {label}
            </button>
          ))}
          <div className="text-center text-[11px] text-gray-500 mt-0.5">{Math.round(zoom*100)}%</div>
        </div>

        {/* Snap */}
        <div className="bg-gray-900 rounded-xl border border-gray-700 p-2">
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer px-1">
            <input type="checkbox" checked={gridSnap} onChange={(e) => setGridSnap(e.target.checked)} className="accent-[#fe8a24] w-3.5 h-3.5" />
            {t('snapGrid')}
          </label>
        </div>

        {/* Save */}
        <button onClick={handleSave} disabled={saving}
          className="bg-[#fe8a24] text-white px-3 py-2.5 rounded-xl font-medium hover:bg-[#e07a1f] transition-colors flex items-center justify-center gap-2 text-xs disabled:opacity-60">
          {saving ? <><span className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full" />{t('saving')}</>
           : saved  ? <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>{t('saved')}</>
           : <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>{t('saveMap')}</>}
        </button>

        {/* Canvas settings */}
        <button onClick={() => setShowCanvasPanel(p => !p)}
          className={`px-3 py-2.5 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 text-xs border ${
            showCanvasPanel ? "bg-gray-700 border-gray-500 text-white" : "bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500"
          }`}>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          {t('canvas')}
        </button>
      </div>

      {/* ── Canvas area ── */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">

        {/* Properties bar */}
        {(selectedTable || selectedWall || selectedDecor) && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-2.5 flex items-center gap-3 flex-wrap">
            {selectedTable && (
              <>
                <span className="text-sm font-semibold text-white">{selectedTable.name}</span>
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('shape')}:</span>
                {Object.keys(TABLE_SIZES).map((s) => (
                  <button key={s} onClick={() => setShapes((p) => ({ ...p, [selectedId]: s }))}
                    className={`text-xs px-2.5 py-1 rounded-lg border capitalize font-medium transition-colors ${
                      (shapes[selectedId]||"square") === s ? "bg-[#fe8a24] text-white border-[#fe8a24]" : "border-gray-600 text-gray-400 hover:border-[#fe8a24] hover:text-white"
                    }`}>{s}</button>
                ))}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('zone')}:</span>
                {ZONE_COLORS.map((z) => {
                  const labelMap = {
                    none: t('default'),
                    green: t('green'),
                    yellow: t('yellow'),
                    pink: t('pink'),
                    purple: t('purple'),
                    blue: t('blue'),
                    orange: t('orange'),
                    white: t('white'),
                  };
                  return (
                    <button key={z.id} onClick={() => setZones((p) => ({ ...p, [selectedId]: z.id }))}
                      title={labelMap[z.id] || z.label}
                      style={{
                        background: z.fill || "#374151",
                        border: `2px solid ${(zones[selectedId]||"none") === z.id ? "#fe8a24" : (z.stroke||"#4b5563")}`,
                        outline: (zones[selectedId]||"none") === z.id ? "2px solid #fe8a24" : "none",
                        outlineOffset: 1,
                      }}
                      className="w-5 h-5 rounded-md transition-all" />
                  );
                })}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('size')}:</span>
                {[0.6, 0.8, 1, 1.25, 1.5, 2].map((s) => (
                  <button key={s} onClick={() => setScales((p) => ({ ...p, [selectedId]: s }))}
                    className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                      Math.abs((scales[selectedId]||1) - s) < 0.01 ? "bg-[#fe8a24] text-white border-[#fe8a24]" : "border-gray-600 text-gray-400 hover:border-[#fe8a24] hover:text-white"
                    }`}>{s === 1 ? "1×" : `${s}×`}</button>
                ))}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('rotate')}:</span>
                <button onClick={() => setRots((p) => ({ ...p, [selectedId]: ((p[selectedId]||0) - 45 + 360) % 360 }))}
                  className="w-7 h-7 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center text-sm font-bold">↺</button>
                <span className="text-xs text-gray-400 min-w-[32px] text-center">{rots[selectedId]||0}°</span>
                <button onClick={() => setRots((p) => ({ ...p, [selectedId]: ((p[selectedId]||0) + 45) % 360 }))}
                  className="w-7 h-7 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center text-sm font-bold">↻</button>
                <button onClick={() => { setRots((p) => ({ ...p, [selectedId]: 0 })); setScales((p) => ({ ...p, [selectedId]: 1 })); }}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700">{t('resetTransform')}</button>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-gray-500">{selectedTable.minCapacity}–{selectedTable.maxCapacity} pax</span>
                  <span className="text-gray-600">|</span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove "${selectedTable.name}" from the map? (Table data is kept, only map position is cleared)`)) {
                        setPositions((p) => { const n={...p}; delete n[selectedId]; return n; });
                        setShapes((p)    => { const n={...p}; delete n[selectedId]; return n; });
                        setZones((p)     => { const n={...p}; delete n[selectedId]; return n; });
                        setRots((p)      => { const n={...p}; delete n[selectedId]; return n; });
                        setScales((p)    => { const n={...p}; delete n[selectedId]; return n; });
                        setSelectedId(null); setSelType(null);
                      }
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg border border-red-700 text-red-400 hover:bg-red-900 font-medium transition-colors"
                  >{t('removeFromMap')}</button>
                </div>
              </>
            )}
            {selectedWall && (
              <>
                <span className="text-sm font-semibold text-white">{t('wall')}</span>
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('thickness')}:</span>
                {[4,8,14].map((t2) => (
                  <button key={t2} onClick={() => setWalls((p) => p.map((w) => w.id===selectedId ? {...w,thick:t2} : w))}
                    className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                      (selectedWall.thick||8)===t2 ? "bg-gray-200 text-gray-900 border-gray-200" : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}>{t2===4?t('thin'):t2===8?t('normal'):t('thick')}</button>
                ))}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('rotate')}:</span>
                {[-90,-45,45,90].map((deg) => (
                  <button key={deg} onClick={() => setWalls((p) => p.map((w) => {
                    if (w.id !== selectedId) return w;
                    // Rotate endpoints around wall midpoint
                    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
                    const rad = (deg * Math.PI) / 180;
                    const cos = Math.cos(rad), sin = Math.sin(rad);
                    const rx1 = cos*(w.x1-mx) - sin*(w.y1-my) + mx;
                    const ry1 = sin*(w.x1-mx) + cos*(w.y1-my) + my;
                    const rx2 = cos*(w.x2-mx) - sin*(w.y2-my) + mx;
                    const ry2 = sin*(w.x2-mx) + cos*(w.y2-my) + my;
                    return { ...w, x1: Math.round(rx1), y1: Math.round(ry1), x2: Math.round(rx2), y2: Math.round(ry2) };
                  }))}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 font-medium transition-colors">
                    {deg > 0 ? `+${deg}°` : `${deg}°`}
                  </button>
                ))}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('size')}:</span>
                {[0.5, 1.5, 2].map((factor) => (
                  <button key={factor} onClick={() => setWalls((p) => p.map((w) => {
                    if (w.id !== selectedId) return w;
                    const mx = (w.x1 + w.x2) / 2, my = (w.y1 + w.y2) / 2;
                    const dx = (w.x2 - w.x1) * factor / 2, dy = (w.y2 - w.y1) * factor / 2;
                    return { ...w, x1: Math.round(mx - dx), y1: Math.round(my - dy), x2: Math.round(mx + dx), y2: Math.round(my + dy) };
                  }))}
                    className="text-xs px-2.5 py-1 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 font-medium transition-colors">
                    {factor < 1 ? t('shorter') : factor === 1.5 ? t('longer') : "2×"}
                  </button>
                ))}
                <button onClick={deleteSelected} className="ml-auto text-xs px-2.5 py-1 rounded-lg border border-red-700 text-red-400 hover:bg-red-900 font-medium">{t('delete')}</button>
              </>
            )}
            {selectedDecor && (
              <>
                <span className="text-sm font-semibold text-white capitalize">{selectedDecor.type.replace(/_/g," ")}</span>
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('size')}:</span>
                {[40,60,80,100,140,180,220].map((v) => (
                  <button key={v} onClick={() => setDecors((p) => p.map((d) => d.id===selectedId ? {...d,w:v,h:Math.round(v*(d.h||60)/(d.w||60))} : d))}
                    className={`text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                      (selectedDecor.w||60)===v ? "bg-gray-200 text-gray-900 border-gray-200" : "border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}>{v}</button>
                ))}
                <span className="text-gray-600">|</span>
                <span className="text-xs text-gray-400">{t('rotate')}:</span>
                <button onClick={() => setDecors((p) => p.map((d) => d.id===selectedId ? {...d,rot:((d.rot||0)-45+360)%360} : d))}
                  className="w-7 h-7 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center text-sm font-bold" title="Rotate -45°">↺</button>
                <span className="text-xs text-gray-400 min-w-[32px] text-center">{selectedDecor.rot||0}°</span>
                <button onClick={() => setDecors((p) => p.map((d) => d.id===selectedId ? {...d,rot:((d.rot||0)+45)%360} : d))}
                  className="w-7 h-7 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 flex items-center justify-center text-sm font-bold" title="Rotate +45°">↻</button>
                <button onClick={() => setDecors((p) => p.map((d) => d.id===selectedId ? {...d,rot:0} : d))}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-600 text-gray-400 hover:bg-gray-700">{t('resetTransform')}</button>
                <button onClick={deleteSelected} className="ml-auto text-xs px-2.5 py-1 rounded-lg border border-red-700 text-red-400 hover:bg-red-900 font-medium">{t('delete')}</button>
              </>
            )}
          </div>
        )}

        {/* Mode hint */}
        <div className="px-1 h-6 flex items-center">
          {mode === MODES.WALL  && <span className="text-xs text-blue-400 bg-blue-950 px-3 py-0.5 rounded-full">{t('clickDragWall')}</span>}
          {mode === MODES.DECOR && <span className="text-xs text-emerald-400 bg-emerald-950 px-3 py-0.5 rounded-full">{t('clickPlaceDecor')} {DECOR_TYPES.find(d=>d.id===decorType)?.label}</span>}
          {mode === MODES.PAN   && <span className="text-xs text-gray-400 bg-gray-800 px-3 py-0.5 rounded-full">{t('dragPan')}</span>}
          {mode === MODES.SELECT && <span className="text-xs text-gray-500">{t('selectHint')}</span>}
        </div>

        {/* Canvas settings panel — shows when Canvas button clicked */}
        {showCanvasPanel && (
          <div className="bg-gray-900 rounded-xl border border-gray-700 px-4 py-3 flex items-center gap-4 flex-wrap">
            {/* Size */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('size')}:</span>
              {CANVAS_PRESETS.map(p => (
                <button key={p.label} onClick={() => setCanvasSize({ w: p.w, h: p.h })}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    canvasSize.w === p.w ? "bg-[#fe8a24] text-white border-[#fe8a24]" : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
                  }`}>{p.label}</button>
              ))}
              {/* Custom size */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{t('custom')}</span>
                <input type="number" value={canvasSize.w} min={800} max={5000} step={100}
                  onChange={e => setCanvasSize(p => ({ ...p, w: Math.max(800, parseInt(e.target.value)||1600) }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded px-1.5 py-1 focus:outline-none focus:border-[#fe8a24]" />
                <span className="text-gray-600 text-xs">×</span>
                <input type="number" value={canvasSize.h} min={600} max={4000} step={100}
                  onChange={e => setCanvasSize(p => ({ ...p, h: Math.max(600, parseInt(e.target.value)||1000) }))}
                  className="w-16 bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded px-1.5 py-1 focus:outline-none focus:border-[#fe8a24]" />
                <span className="text-gray-500 text-[10px]">px</span>
              </div>
            </div>
            <div className="w-px h-5 bg-gray-700" />
            {/* Background presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('bg')}:</span>
              {BG_PRESETS.map(p => (
                <button key={p.label} onClick={() => { setCanvasBg(p.color); setGridColor(p.grid); }}
                  title={p.label}
                  className={`w-6 h-6 rounded-lg border-2 transition-all ${canvasBg === p.color ? "border-[#fe8a24] scale-110" : "border-gray-600 hover:border-gray-400"}`}
                  style={{ backgroundColor: p.color }} />
              ))}
              {/* Custom color picker */}
              <label className="cursor-pointer" title="Custom color">
                <input type="color" value={canvasBg}
                  onChange={e => setCanvasBg(e.target.value)}
                  className="w-6 h-6 rounded-lg border border-gray-600 cursor-pointer bg-transparent" />
              </label>
            </div>
            <div className="w-px h-5 bg-gray-700" />
            {/* Grid style */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{t('grid')}:</span>
              {[["dots",t('dots')],["lines",t('lines')],["none",t('none')]].map(([val,lbl]) => (
                <button key={val} onClick={() => setGridStyle(val)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    gridStyle === val ? "bg-gray-600 text-white border-gray-500" : "border-gray-600 text-gray-400 hover:border-gray-400 hover:text-white"
                  }`}>{lbl}</button>
              ))}
            </div>
            <div className="text-xs text-gray-500 ml-auto">
              {canvasSize.w} × {canvasSize.h}
            </div>
          </div>
        )}

        {/* SVG canvas */}
        <div ref={wrapRef}
          className="flex-1 rounded-2xl overflow-hidden border border-gray-700"
          style={{
            background: canvasBg,
            cursor: mode===MODES.PAN ? "grab" : mode===MODES.WALL ? "crosshair" : mode===MODES.DECOR ? "cell" : "default",
          }}
        >
          <svg ref={svgRef}
            style={{ width:"100%", height:"100%", display:"block", userSelect:"none" }}
            onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          >
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

              {/* Canvas floor — fills beyond CANVAS bounds so no visible edge */}
              <rect x={-5000} y={-5000} width={CANVAS.w+10000} height={CANVAS.h+10000} fill={canvasBg} />

              {/* Grid — draws across full 5000×5000 area regardless of CANVAS size */}
              {gridStyle !== "none" && gridStyle === "dots" && Array.from({ length: Math.ceil((CANVAS.h+2000)/GRID) }).map((_,r) =>
                Array.from({ length: Math.ceil((CANVAS.w+2000)/GRID) }).map((_,c2) => (
                  <circle key={`g${r}-${c2}`} cx={c2*GRID} cy={r*GRID} r={0.8} fill={gridColor} />
                ))
              )}
              {gridStyle === "lines" && <>
                {Array.from({ length: Math.ceil((CANVAS.w+2000)/GRID) }).map((_,c2) => (
                  <line key={`vl${c2}`} x1={c2*GRID} y1={-500} x2={c2*GRID} y2={CANVAS.h+500} stroke={gridColor} strokeWidth={0.5} opacity={0.6} />
                ))}
                {Array.from({ length: Math.ceil((CANVAS.h+2000)/GRID) }).map((_,r) => (
                  <line key={`hl${r}`} x1={-500} y1={r*GRID} x2={CANVAS.w+500} y2={r*GRID} stroke={gridColor} strokeWidth={0.5} opacity={0.6} />
                ))}
              </>}
              {/* Soft boundary indicator — subtle glow, not a hard box */}
              <rect x={0} y={0} width={CANVAS.w} height={CANVAS.h}
                fill="none" stroke={gridColor} strokeWidth={1.5} opacity={0.25} rx={4}
                strokeDasharray="12 6" />

              {/* Walls */}
              {walls.map((w) => (
                <g key={w.id}>
                  <line x1={w.x1} y1={w.y1} x2={w.x2} y2={w.y2}
                    stroke={selectedId===w.id ? "#fe8a24" : "#e2e8f0"}
                    strokeWidth={w.thick||8} strokeLinecap="round" />
                  {selectedId===w.id && (
                    <>
                      <circle cx={w.x1} cy={w.y1} r={6} fill="#1a1a2e" stroke="#fe8a24" strokeWidth={2} />
                      <circle cx={w.x2} cy={w.y2} r={6} fill="#1a1a2e" stroke="#fe8a24" strokeWidth={2} />
                    </>
                  )}
                </g>
              ))}

              {/* Wall preview */}
              {wallPreview && (
                <line x1={wallPreview.x1} y1={wallPreview.y1} x2={wallPreview.x2} y2={wallPreview.y2}
                  stroke="#e2e8f0" strokeWidth={8} strokeLinecap="round" strokeDasharray="10 5" opacity={0.4} />
              )}

              {/* Decorative elements */}
              {decors.map((d) => (
                <DecorElement key={d.id} d={d} isSelected={selectedId===d.id} />
              ))}

              {/* Tables */}
              {(tables||[]).map((table) => {
                if (!table?.id) return null;
                const pos = positions[table.id]; if (!pos) return null;
                const shape = shapes[table.id] || "square";
                const sz    = TABLE_SIZES[shape] || TABLE_SIZES.square;
                const scale = scales[table.id] || 1;
                const rot   = rots[table.id]   || 0;
                const sw = sz.w * scale, sh = sz.h * scale;
                const { w, h } = { w: sw, h: sh };
                const cx  = pos.x + w/2, cy = pos.y + h/2;
                const pax = Math.max(0, table.maxCapacity || 0);
                const zone = zones[table.id] || "none";
                const { fill, stroke } = getTableColors(table, zone);
                const isSel = selectedId === table.id;

                return (
                  <g key={table.id} transform={rot ? `rotate(${rot},${cx},${cy})` : undefined}
                    style={{ cursor: mode===MODES.SELECT ? "grab" : "default" }}>
                    {/* Chairs */}
                    {shape === "round"
                      ? circleChairs(cx, cy, w/2, pax).map((c,i) => (
                          <g key={i} transform={`rotate(${c.deg},${c.cx},${c.cy})`}>
                            <rect x={c.cx-CHAIR_W/2} y={c.cy-CHAIR_H/2} width={CHAIR_W} height={CHAIR_H}
                              rx={4} fill="#475569" stroke="#334155" strokeWidth={1} />
                          </g>
                        ))
                      : rectChairs(pos.x, pos.y, w, h, pax).map((c,i) =>
                          c.isH
                            ? <rect key={i} x={c.x} y={c.y} width={CHAIR_W} height={CHAIR_H} rx={4} fill="#475569" stroke="#334155" strokeWidth={1} />
                            : <g key={i} transform={`rotate(90,${c.x+CHAIR_H/2},${c.y+CHAIR_W/2})`}>
                                <rect x={c.x} y={c.y} width={CHAIR_H} height={CHAIR_W} rx={4} fill="#475569" stroke="#334155" strokeWidth={1} />
                              </g>
                        )
                    }

                    {/* Selection ring */}
                    {isSel && (shape==="round"
                      ? <circle cx={cx} cy={cy} r={w/2+7} fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="5 3" />
                      : <rect x={pos.x-7} y={pos.y-7} width={w+14} height={h+14} fill="none" stroke="#fe8a24" strokeWidth={2} strokeDasharray="5 3" rx={14} />
                    )}

                    {/* Table surface */}
                    {shape==="round"
                      ? <circle cx={cx} cy={cy} r={w/2} fill={fill} stroke={stroke} strokeWidth={3} />
                      : <rect x={pos.x} y={pos.y} width={w} height={h} rx={10} fill={fill} stroke={stroke} strokeWidth={3} />
                    }

                    {/* Table name only */}
                    <text x={cx} y={cy+6} textAnchor="middle"
                      fontSize={shape==="rectangle" ? 16 : 18} fontWeight="700"
                      fill="#111827"
                      style={{ fontFamily:"system-ui, sans-serif", pointerEvents:"none" }}>
                      {table.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        <p className="text-xs text-gray-500 text-right">{t('scrollZoom')}</p>
      </div>
    </div>
  );
}

// ─── Main TableManagement ───────────────────────────────────────────────────────
export default function TableManagement() {
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

  const [restaurants,        setRestaurants]        = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [tables,             setTables]             = useState([]);
  // Floor map state — lifted so handleSave can auto-place new tables
  const [mapPositions,       setMapPositions]       = useState({});
  const [mapShapes,          setMapShapes]          = useState({});
  const [mapZones,           setMapZones]           = useState({});
  const [mapScales,          setMapScales]          = useState({}); // tableId → scale multiplier (1.0 = default)
  const [mapRots,            setMapRots]            = useState({}); // tableId → rotation degrees
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingTables,      setLoadingTables]      = useState(false);
  const [currentTime,        setCurrentTime]        = useState(new Date());
  const [showModal,          setShowModal]          = useState(false);
  const [editingTable,       setEditingTable]       = useState(null);
  const [savingTable,        setSavingTable]        = useState(false);
  const [showAlertPax,       setShowAlertPax]       = useState(true);
  const [activeTab,          setActiveTab]          = useState("list");
  const [form, setForm] = useState({ name:"", minCapacity:1, maxCapacity:2, priority:0, online:true, notes:"" });
  // Table combination
  const [combineMode,        setCombineMode]        = useState(false);
  const [selectedForCombine, setSelectedForCombine] = useState([]);
  const [combinations,       setCombinations]       = useState([]);   // [{id, name, tableIds, minCapacity, maxCapacity}]
  const [showCombineModal,   setShowCombineModal]   = useState(false);
  const [combineName,        setCombineName]        = useState("");
  const [savingCombine,      setSavingCombine]      = useState(false);
  const staffRestaurantId = sessionStorage.getItem("staffRestaurantId");
  const staffRole         = sessionStorage.getItem("staffRole");
  const isStaff           = !!staffRestaurantId;
  const canManage         = !isStaff || staffRole === 'admin' || staffRole === 'manager';
  
  useEffect(() => {
    const run = async () => {
      setLoadingRestaurants(true);
      try {
        const user = auth.currentUser; if (!user) return;

        // ── Staff: load only their assigned restaurant ──────────────
        if (isStaff) {
          const snap = await getDoc(doc(db, "restaurants", staffRestaurantId));
          if (snap.exists()) {
            const restaurant = { id: snap.id, ...snap.data(), _collection: "restaurants" };
            setRestaurants([restaurant]);
            // Auto-select and load tables for staff
            setSelectedRestaurant(restaurant);
            fetchTables(restaurant.id, restaurant);
          }
          setLoadingRestaurants(false);
          return;
        }

        // ── Owner: load all owned restaurants ───────────────────────
        const [s1,s2] = await Promise.all([
          getDocs(query(collection(db,"restaurants"),   where("Owner_ID","==",user.uid))),
          getDocs(query(collection(db,"TestRestaurant"),where("Owner_ID","==",user.uid))),
        ]);
        setRestaurants([
          ...s1.docs.map((d)=>({id:d.id,...d.data(),_collection:"restaurants"})),
          ...s2.docs.map((d)=>({id:d.id,...d.data(),_collection:"TestRestaurant"})),
        ]);
      } catch(e){ console.error(e); } finally { setLoadingRestaurants(false); }
    };
    run();
  }, [isStaff, staffRestaurantId]);

  useEffect(() => {
    const iv = setInterval(()=>setCurrentTime(new Date()),60000);
    return ()=>clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!selectedRestaurant || tables.length===0) return;
    const now = new Date();
    tables.forEach(async (t) => {
      if (!t?.id || t.current_status!=="reserved") return;
      const rd = t.reserved_date?.toDate?.() || (t.reserved_date ? new Date(t.reserved_date) : null);
      if (!rd) return;
      if (now > new Date(rd.getTime()+(t.reserved_duration_minutes||120)*60000)) {
        const col = selectedRestaurant._collection||"restaurants";
        try {
          await updateDoc(doc(db,col,selectedRestaurant.id,"tables",t.id),
            {current_status:null,reserved_by:null,reserved_date:null,reserved_guests:null,reserved_duration_minutes:null,reserved_source:null});
          setTables(prev=>prev.map(x=>x.id===t.id?{...x,current_status:null,reserved_by:null,reserved_date:null,reserved_guests:null}:x));
        } catch(e){ console.error(e); }
      }
    });
  }, [currentTime, tables, selectedRestaurant]);

const fetchTables = async (id, r) => {
  setLoadingTables(true);
  try {
    const user = auth.currentUser; if (!user) return;
    const rd = r||selectedRestaurant;
    if (!rd) { setTables([]); return; }
    if (!isStaff && rd.Owner_ID !== user.uid) { setTables([]); return; }
      const col = rd._collection||"restaurants";
      const snap = await getDocs(collection(db,col,id,"tables"));
      const tableData = snap.docs.map(d=>({id:d.id,...d.data()}));
      setTables(tableData);
      // Also load combinations
      try {
        const combSnap = await getDocs(collection(db,col,id,"tableCombinations"));
        setCombinations(combSnap.docs.map(d=>({id:d.id,...d.data()})));
      } catch(e){ console.error("combinations load error:",e); }
    } catch(e){ console.error(e); setTables([]); }
    finally { setLoadingTables(false); }
  };

  const handleSelectRestaurant = (r) => {
    const user = auth.currentUser;
    if (!user) { alert(t('accessDenied')); return; }
    // Staff are pre-validated via sessionStorage — skip Owner_ID check
    if (!isStaff && r.Owner_ID !== user.uid) { alert(t('accessDenied')); return; }
    setSelectedRestaurant(r); setActiveTab("list");
    setMapPositions({}); setMapShapes({}); setMapZones({}); setMapScales({}); setMapRots({});
    fetchTables(r.id,r);
  };

  const openAdd  = () => { setEditingTable(null); setForm({name:"",minCapacity:1,maxCapacity:2,priority:0,online:true,notes:""}); setShowModal(true); };
  const openEdit = (t) => { setEditingTable(t); setForm({name:t.name,minCapacity:t.minCapacity,maxCapacity:t.maxCapacity,priority:t.priority,online:t.online!==false,notes:t.notes||""}); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.toString().trim()) return;
    const user = auth.currentUser;
    if (!user) { alert(t('accessDenied')); return; }
    if (!isStaff && selectedRestaurant?.Owner_ID !== user.uid) { alert(t('accessDenied')); return; }
    const col = selectedRestaurant?._collection||"restaurants";
    setSavingTable(true);
    try {
      if (editingTable) {
        await updateDoc(doc(db,col,selectedRestaurant.id,"tables",editingTable.id),form);
        setTables(prev=>prev.map(t=>t.id===editingTable.id?{...t,...form}:t));
      } else {
        const ref = await addDoc(collection(db,col,selectedRestaurant.id,"tables"),{...form,createdAt:new Date()});
        const newTable = {id:ref.id,...form};
        setTables(prev=>{
          const updated = [...prev, newTable];
          // Auto-place new table: find a free spot after existing tables
          const idx = updated.length - 1;
          const col2 = 5;
          const autoX = 80 + (idx % col2) * 200;
          const autoY = 100 + Math.floor(idx / col2) * 200;
          setMapPositions(p => ({...p, [ref.id]: {x: autoX, y: autoY}}));
          setMapShapes(s => ({...s, [ref.id]: "square"}));
          setMapZones(z => ({...z, [ref.id]: "none"}));
          setMapScales(s => ({...s, [ref.id]: 1}));
          setMapRots(r => ({...r, [ref.id]: 0}));
          return updated;
        });
      }
      setShowModal(false);
    } catch(e){
      console.error(e);
      alert(t('failedSave'));
    } finally {
      setSavingTable(false);
    }
  };

  const handleSaveCombination = async () => {
    if (!combineName.trim() || selectedForCombine.length < 2) return;
    const user = auth.currentUser;
    if (!user || selectedRestaurant?.Owner_ID !== user.uid) { alert(t('accessDenied')); return; }
    const col = selectedRestaurant?._collection || "restaurants";
    setSavingCombine(true);
    try {
      const selectedTables = tables.filter(t => selectedForCombine.includes(t.id));
      const totalMin = selectedTables.reduce((s,t) => s + (t.minCapacity||0), 0);
      const totalMax = selectedTables.reduce((s,t) => s + (t.maxCapacity||0), 0);
      const data = {
        name: combineName.trim(),
        tableIds: selectedForCombine,
        tableNames: selectedTables.map(t => t.name),
        minCapacity: totalMin,
        maxCapacity: totalMax,
        createdAt: new Date(),
      };
      const ref = await addDoc(collection(db, col, selectedRestaurant.id, "tableCombinations"), data);
      setCombinations(prev => [...prev, { id: ref.id, ...data }]);
      setShowCombineModal(false);
      setCombineMode(false);
      setSelectedForCombine([]);
      setCombineName("");
    } catch(e) { console.error(e); alert(t('failedCombination')); }
    finally { setSavingCombine(false); }
  };

  const handleDeleteCombination = async (id) => {
    if (!window.confirm(t('removeCombination'))) return;
    const user = auth.currentUser;
    if (!user || selectedRestaurant?.Owner_ID !== user.uid) return;
    const col = selectedRestaurant?._collection || "restaurants";
    try {
      await deleteDoc(doc(db, col, selectedRestaurant.id, "tableCombinations", id));
      setCombinations(prev => prev.filter(c => c.id !== id));
    } catch(e) { console.error(e); }
  };

  const toggleSelectForCombine = (id) => {
    setSelectedForCombine(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deleteTable'))) return;
    const user = auth.currentUser;
    if (!user) { alert(t('accessDenied')); return; }
    if (!isStaff && selectedRestaurant?.Owner_ID !== user.uid) { alert(t('accessDenied')); return; }
    const col = selectedRestaurant?._collection||"restaurants";
    try {
      await deleteDoc(doc(db,col,selectedRestaurant.id,"tables",id));
      setTables(prev=>prev.filter(t=>t.id!==id));
      setMapPositions(p=>{const n={...p};delete n[id];return n;});
      setMapShapes(s=>{const n={...s};delete n[id];return n;});
      setMapZones(z=>{const n={...z};delete n[id];return n;});
      setMapScales(s=>{const n={...s};delete n[id];return n;});
      setMapRots(r=>{const n={...r};delete n[id];return n;});
    }
    catch(e){ console.error(e); }
  };

  const toggleOnline = async (t) => {
    const user = auth.currentUser; if (!user) return;
    if (!isStaff && selectedRestaurant?.Owner_ID !== user.uid) return;
      const col = selectedRestaurant?._collection||"restaurants";
    try {
      await updateDoc(doc(db,col,selectedRestaurant.id,"tables",t.id),{online:!t.online});
      setTables(prev=>prev.map(x=>x.id===t.id?{...x,online:!x.online}:x));
    } catch(e){ console.error(e); }
  };

  const updatePriority = async (t, p) => {
    const user = auth.currentUser; if (!user) return;
    if (!isStaff && selectedRestaurant?.Owner_ID !== user.uid) return;
    const col = selectedRestaurant?._collection||"restaurants";
    try {
      await updateDoc(doc(db,col,selectedRestaurant.id,"tables",t.id),{priority:p});
      setTables(prev=>prev.map(x=>x.id===t.id?{...x,priority:p}:x));
    } catch(e){ console.error(e); }
  };

    const badge = (table) => {
      return (
        <button
          onClick={() => toggleOnline(table)}
          className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors ${
            table.online
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-purple-100 text-purple-700 hover:bg-purple-200"
          }`}
        >
          {table.online ? t('online') : t('internal')}
        </button>
      );
    };

  if (!selectedRestaurant) return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">{t('tableManagement')}</h1>
      <p className="text-gray-500 text-sm mb-6">{t('selectRestaurant')}</p>
      {loadingRestaurants ? (
        <div className="flex justify-center items-center h-48"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" /></div>
      ) : restaurants.length===0 ? (
        <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">{t('noRestaurantsFound')}</p></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {restaurants.map((r)=>(
            <button key={r.id} onClick={()=>handleSelectRestaurant(r)}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-[#fe8a24] hover:shadow-md transition-all text-left overflow-hidden group">
              <div className="h-36 w-full overflow-hidden bg-gray-100">
                {r.Image ? <img src={r.Image} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <svg className="h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M6 7v10M18 7v10M4 17h4M16 17h4" /></svg>
                    </div>}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 text-base">{r.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{r.Type}</p>
                <p className="text-xs text-gray-400 mt-1">{r.Location}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.restaurant_activation?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
                    {r.restaurant_activation ? t('active') : t('inactive')}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">{r.serviceType}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <button onClick={()=>{setSelectedRestaurant(null);setTables([]);}}
            className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 hover:text-[#fe8a24] hover:border-[#fe8a24] px-3 py-2 rounded-xl shadow-sm transition-all text-sm font-medium group">
            <svg className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            {t('back')}
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{selectedRestaurant.name}</h1>
            <p className="text-gray-400 text-xs mt-0.5">{selectedRestaurant.Type} · {selectedRestaurant.Location}</p>
          </div>
        </div>
        {activeTab==="list" && canManage && <button onClick={openAdd} className="bg-[#fe8a24] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#e07a1f] transition-colors text-sm">+ {t('create')}</button>}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 bg-gray-100 rounded-xl p-1 w-fit">
        {[{key:"list",label:t('tables'),d:"M4 6h16M4 10h16M4 14h16M4 18h16"},{key:"map",label:t('floorMap'),d:"M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"}].map(({key,label,d})=>(
          <button key={key} onClick={()=>setActiveTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab===key?"bg-white text-gray-800 shadow-sm":"text-gray-500 hover:text-gray-700"}`}>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} /></svg>
            {label}
          </button>
        ))}
      </div>

      {activeTab==="list" && (
        <>
          {/* Top controls */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> {t('online')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> {t('internal')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> {t('reserved')}</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> {t('seated')}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={showAlertPax} onChange={(e)=>setShowAlertPax(e.target.checked)} className="accent-[#fe8a24] w-4 h-4" />
                {t('alertPax')}
              </label>
              {/* Combine mode toggle */}
              <button
                onClick={() => { setCombineMode(m => !m); setSelectedForCombine([]); }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  combineMode
                    ? "bg-orange-50 border-[#fe8a24] text-[#fe8a24]"
                    : "bg-white border-gray-300 text-gray-600 hover:border-[#fe8a24] hover:text-[#fe8a24]"
                }`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {combineMode ? t('cancelCombine') : t('combineTables')}
              </button>
            </div>
          </div>

          {/* Combine mode banner */}
          {combineMode && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm font-semibold text-orange-700">
                  {t('selectTablesToCombine')}
                  {selectedForCombine.length > 0 && (
                    <span className="ml-2 bg-[#fe8a24] text-white text-xs px-2 py-0.5 rounded-full">{selectedForCombine.length} {t('tablesSelected')}</span>
                  )}
                </p>
                <p className="text-xs text-orange-500 mt-0.5">
                  {selectedForCombine.length < 2
                    ? t('pickAtLeast')
                    : `${t('combinedCapacity')}: ${tables.filter(t=>selectedForCombine.includes(t.id)).reduce((s,t)=>s+(t.minCapacity||0),0)}–${tables.filter(t=>selectedForCombine.includes(t.id)).reduce((s,t)=>s+(t.maxCapacity||0),0)} pax`
                  }
                </p>
              </div>
              <button
                onClick={() => { if (selectedForCombine.length >= 2) { setCombineName(""); setShowCombineModal(true); } }}
                disabled={selectedForCombine.length < 2}
                className="px-4 py-2 bg-[#fe8a24] text-white rounded-lg text-sm font-medium hover:bg-[#e07a1f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('createCombination')} →
              </button>
            </div>
          )}

          {loadingTables ? (
            <div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" /></div>
          ) : tables.length===0 ? (
            <div className="text-center py-16 text-gray-400">
              <svg className="mx-auto h-12 w-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7h18M6 7v10M18 7v10M4 17h4M16 17h4" /></svg>
              <p className="text-lg font-medium">{t('noTablesYet')}</p><p className="text-sm mt-1">{t('addFirstTable')}</p>
            </div>
          ) : (
            <>
              {/* Tables list */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                <div className="grid grid-cols-[28px_1fr_100px_100px_120px_130px_80px] gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <span></span>
                  <span>{t('name')}</span><span>{t('min')}</span><span>{t('max')}</span><span>{t('priority')}</span><span>{t('status')}</span><span>{t('actions')}</span>
                </div>
                {tables.map((table) => {
                  const isSelected = selectedForCombine.includes(table.id);
                  const isInCombo  = combinations.some(c => c.tableIds.includes(table.id));
                  return (
                    <div
                      key={table.id}
                      onClick={() => combineMode && toggleSelectForCombine(table.id)}
                      className={`grid grid-cols-[28px_1fr_100px_100px_120px_130px_80px] gap-2 px-4 py-3 border-b border-gray-100 items-center text-sm transition-colors
                        ${combineMode ? "cursor-pointer" : ""}
                        ${isSelected ? "bg-orange-50 border-l-4 border-l-[#fe8a24]" : ""}
                        ${!isSelected && table.current_status==="seated" ? "bg-red-50/30" : ""}
                        ${!isSelected && combineMode ? "hover:bg-orange-50/40" : ""}
                        ${!combineMode ? "hover:bg-gray-50" : ""}
                      `}
                    >
                      <div className="flex items-center justify-center">
                        {combineMode ? (
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                            isSelected ? "bg-[#fe8a24] border-[#fe8a24]" : "border-gray-300"
                          }`}>
                            {isSelected && <svg className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        ) : isInCombo ? (
                          <span title={t('partOfCombination')}>
                            <svg className="h-4 w-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          </span>
                        ) : <span />}
                      </div>
                      <span className="font-medium text-gray-800">{table.name}</span>
                      <span className="text-gray-600">{table.minCapacity}</span>
                      <span className="text-gray-600">{table.maxCapacity}</span>
                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={()=>updatePriority(table,Math.max(0,table.priority-1))} className="w-7 h-7 rounded-lg border border-gray-300 hover:bg-[#fe8a24] hover:text-white hover:border-[#fe8a24] transition-colors flex items-center justify-center font-medium">−</button>
                        <span className="w-8 text-center font-semibold">{table.priority}</span>
                        <button onClick={()=>updatePriority(table,table.priority+1)} className="w-7 h-7 rounded-lg border border-gray-300 hover:bg-[#fe8a24] hover:text-white hover:border-[#fe8a24] transition-colors flex items-center justify-center font-medium">+</button>
                      </div>
                      <div onClick={e => e.stopPropagation()}>{badge(table)}</div>
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <button onClick={()=>openEdit(table)} className="text-gray-400 hover:text-[#fe8a24]" title={t('edit')}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={()=>handleDelete(table.id)} className="text-gray-400 hover:text-red-500" title={t('delete')}><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Combinations section */}
              {combinations.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    {t('tableCombinations')}
                  </h3>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {combinations.map((combo) => {
                      const comboTables = tables.filter(t => combo.tableIds.includes(t.id));
                      return (
                        <div key={combo.id} className="px-4 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                          {/* Row 1: name + capacity + status + delete */}
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-semibold text-gray-800 text-sm">{combo.name}</span>
                              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                {combo.tableIds.length} {t('tablesInCombo')}
                              </span>
                              <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                                {combo.minCapacity}–{combo.maxCapacity} {t('paxTotal')}
                              </span>
                            </div>
                            <button onClick={()=>handleDeleteCombination(combo.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title={t('delete')}>
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                          {/* Row 2: table badges — wraps for any number */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(combo.tableNames || comboTables.map(t=>t.name)).map((n, i) => {
                              const tbl = comboTables[i];
                              return (
                                <span key={i} className="text-xs px-2.5 py-1 rounded-lg font-semibold border bg-blue-100 text-blue-700 border-blue-200">
                                  {n}
                                  {tbl && <span className="ml-1 font-normal opacity-70">{tbl.minCapacity}–{tbl.maxCapacity}</span>}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab==="map" && (
        loadingTables ? <div className="flex justify-center h-64 items-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#fe8a24]" /></div>
        : tables.length===0 ? <div className="text-center py-16 text-gray-400"><p className="text-lg font-medium">{t('noTablesToMap')}</p><p className="text-sm mt-1">{t('addTablesFirst')}</p></div>
        : <FloorPlanEditor
            tables={tables}
            restaurantId={selectedRestaurant.id}
            collectionName={selectedRestaurant._collection||"restaurants"}
            positions={mapPositions}
            setPositions={setMapPositions}
            shapes={mapShapes}
            setShapes={setMapShapes}
            zones={mapZones}
            setZones={setMapZones}
            scales={mapScales}
            setScales={setMapScales}
            rots={mapRots}
            setRots={setMapRots}
          />
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{editingTable ? t('editTable') : t('createTable')}</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">{t('tableName')}</label>
                <input type="text" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. 1, VIP, Bar 1"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('minCapacity')}</label>
                  <input type="number" min={1} value={form.minCapacity} onChange={(e)=>setForm({...form,minCapacity:parseInt(e.target.value)})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">{t('maxCapacity')}</label>
                  <input type="number" min={1} value={form.maxCapacity} onChange={(e)=>setForm({...form,maxCapacity:parseInt(e.target.value)})}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('priority')}</label>
                <div className="mt-1 flex items-center gap-3">
                  <button type="button" onClick={()=>setForm({...form,priority:Math.max(0,form.priority-1)})} className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-[#fe8a24] hover:text-white hover:border-[#fe8a24] transition-colors flex items-center justify-center text-lg font-medium">−</button>
                  <span className="w-10 text-center text-sm font-semibold text-gray-800">{form.priority}</span>
                  <button type="button" onClick={()=>setForm({...form,priority:form.priority+1})} className="w-9 h-9 rounded-lg border border-gray-300 hover:bg-[#fe8a24] hover:text-white hover:border-[#fe8a24] transition-colors flex items-center justify-center text-lg font-medium">+</button>
                </div>
                <p className="text-xs text-gray-400 mt-1">{t('lowerPriority')}</p>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
                <div>
                  <p className="text-sm font-medium text-gray-700">{t('tableAvailability')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{form.online ? t('onlineVisible') : t('internalOnly')}</p>
                </div>
                <button type="button" onClick={()=>setForm({...form,online:!form.online})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.online?"bg-green-500":"bg-purple-500"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.online?"translate-x-6":"translate-x-1"}`} />
                </button>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">{t('notes')}</label>
                <textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} placeholder={t('windowSeat')} rows={2}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={()=>setShowModal(false)} disabled={savingTable}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                {t('cancel')}
              </button>
              <button onClick={handleSave} disabled={savingTable}
                className="flex-1 bg-[#fe8a24] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e07a1f] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {savingTable ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />
                    {editingTable ? t('saving') : t('creating')}
                  </>
                ) : (
                  editingTable ? t('saveChanges') : t('createTableBtn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Combine modal ── */}
      {showCombineModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-800 mb-1">{t('createTableCombination')}</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedForCombine.length} {t('tablesSelected')}
            </p>

            {/* Selected tables grid — handles any number */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('tablesInThisCombination')}</p>
              <div className="flex flex-wrap gap-2">
                {tables.filter(table => selectedForCombine.includes(table.id)).map(table => (
                  <div key={table.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-sm font-bold text-blue-700">{table.name}</span>
                    <span className="text-xs text-blue-400">{table.minCapacity}–{table.maxCapacity} pax</span>
                    <button
                      onClick={() => toggleSelectForCombine(table.id)}
                      className="ml-1 text-blue-300 hover:text-red-400 transition-colors"
                      title={t('delete')}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {selectedForCombine.length < 2 && (
                <p className="text-xs text-red-400 mt-2">{t('pickAtLeast')}</p>
              )}
            </div>

            {/* Combined capacity summary */}
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">{t('totalCombinedCapacity')}</p>
                  <p className="text-3xl font-bold text-blue-700 mt-0.5">
                    {tables.filter(t=>selectedForCombine.includes(t.id)).reduce((s,t)=>s+(t.minCapacity||0),0)}
                    <span className="text-lg mx-1 font-normal text-blue-400">–</span>
                    {tables.filter(t=>selectedForCombine.includes(t.id)).reduce((s,t)=>s+(t.maxCapacity||0),0)}
                    <span className="text-base font-normal text-blue-500 ml-1">pax</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-400">{selectedForCombine.length} {t('tablesInCombo')}</p>
                  <p className="text-xs text-blue-400 mt-0.5">
                    {t('avgPerTable')} {selectedForCombine.length > 0
                      ? Math.round(tables.filter(t=>selectedForCombine.includes(t.id)).reduce((s,t)=>s+(t.maxCapacity||0),0) / selectedForCombine.length)
                      : 0}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">{t('combinationName')}</label>
              <input
                type="text"
                value={combineName}
                onChange={(e)=>setCombineName(e.target.value)}
                placeholder={t('namePlaceholder')}
                autoFocus
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
              />
              <p className="text-xs text-gray-400 mt-1">{t('thisNameAppears')}</p>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => { setShowCombineModal(false); setCombineName(""); }}
                disabled={savingCombine}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >{t('cancel')}</button>
              <button
                onClick={handleSaveCombination}
                disabled={savingCombine || !combineName.trim() || selectedForCombine.length < 2}
                className="flex-1 bg-[#fe8a24] text-white rounded-lg py-2 text-sm font-medium hover:bg-[#e07a1f] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingCombine
                  ? <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block" />{t('saving')}</>
                  : `${t('saveCombination')} (${selectedForCombine.length} ${t('tablesInCombo')})`
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}