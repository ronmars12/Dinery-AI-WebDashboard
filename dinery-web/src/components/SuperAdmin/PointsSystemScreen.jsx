import React, { useMemo, useState } from "react";
import {
  FiPlus as Plus,
  FiEdit2 as Pencil,
  FiTrash2 as Trash2,
  FiSave as Save,
  FiStar as Star,
  FiSearch as Search,
  FiChevronDown as ChevronDown,
  FiX as X,
} from "react-icons/fi";
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
} from "firebase/firestore";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

const BRAND = "#fc8722";

const RULE_TYPES = [
  "1st registration",
  "1st Coupon Confirmation",
  "Normal Coupon Confirmation",
  "Completed Restaurant Reservation",
  "Daily App Usage",
  "Commision Points After Succesful Coupons Confirmation",
];

// ---- i18n dictionaries (static data ok at module scope)
const I18N = {
  en: {
    pointsSystem: 'Points System',
    pointsSystemDesc: 'Configure tiers, earning rules, rewards, and manage member points.',
    tabsOverview: 'Overview',
    tabsRules: 'Rules',
    tabsUsers: 'Users',
    kpiTotal: 'Total Members',
    kpiBronze: 'Bronze Members',
    kpiSilver: 'Silver Members',
    kpiGold: 'Gold Members',
    tierThresholds: 'Tier Thresholds',
    threshold: 'Threshold',
    discountPct: 'Discount %',
    discountNote: 'Applies as a discount for this tier.',
    tiersInfo: 'Members move up tiers when their total points meet or exceed the threshold.',
    editRule: 'Edit Rule',
    createRule: 'Create Rule',
    ruleName: 'Rule Name',
    selectRule: 'Select a rule…',
    ruleListHelp: 'Rules marked with ✓ are already added and cannot be added again.',
    points: 'Points',
    pointsPh: 'e.g., 10',
    notesOpt: 'Notes (optional)',
    notesPh: 'Describe how points are earned',
    update: 'Update',
    save: 'Save',
    cancel: 'Cancel',
    earningRules: 'Earning Rules',
    name: 'Name',
    notes: 'Notes',
    actions: 'Actions',
    noRulesYet: 'No rules yet. Create one on the left.',
    searchUserPh: 'Search name or email…',
    zeroResult: '0 result',
    of: 'of',
    email: 'Email',
    tier: 'Tier',
    viewPointsHistory: 'View points history',
    noName: '(no name)',
    adjustPoints: 'Adjust Points',
    noUsersFound: 'No users found.',
    page: 'Page',
    prev: 'Prev',
    next: 'Next',
    pointsHistory: 'Points History —',
    currentTotal: 'Current total',
    pts: 'pts',
    date: 'Date',
    delta: 'Delta',
    before: 'Before',
    after: 'After',
    reason: 'Reason',
    source: 'Source',
    noEntriesYet: 'No entries yet.',
    close: 'Close',
    adjustPointsTitle: 'Adjust Points —',
    amountCanBeNegative: 'Amount (can be negative)',
    amountPh: 'e.g., 50 or -30',
    apply: 'Apply',
    bronze: 'Bronze',
    silver: 'Silver',
    gold: 'Gold',
    image: 'image',
    selectPercent: 'Select %',
    saveTiers: 'Save tiers',
  },
  fi: {
    pointsSystem: 'Pistejärjestelmä',
    pointsSystemDesc: 'Määritä tasot, ansaintasäännöt, palkinnot ja hallitse pisteitä.',
    tabsOverview: 'Yleiskatsaus',
    tabsRules: 'Säännöt',
    tabsUsers: 'Käyttäjät',
    kpiTotal: 'Jäseniä yhteensä',
    kpiBronze: 'Pronssijäseniä',
    kpiSilver: 'Hopeajäseniä',
    kpiGold: 'Kultajäseniä',
    tierThresholds: 'Tasojen rajat',
    threshold: 'Kynnys',
    discountPct: 'Alennus %',
    discountNote: 'Koskee tämän tason alennusta.',
    tiersInfo: 'Jäsenet nousevat tasoihin, kun kokonaispisteet saavuttavat rajan.',
    editRule: 'Muokkaa sääntöä',
    createRule: 'Luo sääntö',
    ruleName: 'Säännön nimi',
    selectRule: 'Valitse sääntö…',
    ruleListHelp: '✓ merkityt säännöt on jo lisätty eikä niitä voi lisätä uudelleen.',
    points: 'Pisteet',
    pointsPh: 'esim. 10',
    notesOpt: 'Huomautukset (valinnainen)',
    notesPh: 'Kuvaile, miten pisteet ansaitaan',
    update: 'Päivitä',
    save: 'Tallenna',
    cancel: 'Peruuta',
    earningRules: 'Ansaintasäännöt',
    name: 'Nimi',
    notes: 'Huomautukset',
    actions: 'Toiminnot',
    noRulesYet: 'Ei sääntöjä vielä. Luo vasemmalla.',
    searchUserPh: 'Hae nimeä tai sähköpostia…',
    zeroResult: '0 tulosta',
    of: '/',
    email: 'Sähköposti',
    tier: 'Taso',
    viewPointsHistory: 'Näytä pistehistoria',
    noName: '(ei nimeä)',
    adjustPoints: 'Säädä pisteitä',
    noUsersFound: 'Käyttäjiä ei löytynyt.',
    page: 'Sivu',
    prev: 'Edellinen',
    next: 'Seuraava',
    pointsHistory: 'Pistehistoria —',
    currentTotal: 'Nykyinen yhteensä',
    pts: 'p',
    date: 'Päivä',
    delta: 'Muutos',
    before: 'Ennen',
    after: 'Jälkeen',
    reason: 'Syy',
    source: 'Lähde',
    noEntriesYet: 'Ei merkintöjä vielä.',
    close: 'Sulje',
    adjustPointsTitle: 'Säädä pisteitä —',
    amountCanBeNegative: 'Määrä (voi olla negatiivinen)',
    amountPh: 'esim., 50 tai -30',
    apply: 'Hyväksy',
    bronze: 'Pronssi',
    silver: 'Hopea',
    gold: 'Kulta',
    image: 'kuva',
    selectPercent: 'Valitse %',
    saveTiers: 'Tallenna tasot',
  },
  no: {
    pointsSystem: 'Poengsystem',
    pointsSystemDesc: 'Konfigurer nivåer, regler, belønninger og administrer poeng.',
    tabsOverview: 'Oversikt',
    tabsRules: 'Regler',
    tabsUsers: 'Brukere',
    kpiTotal: 'Totalt antall medlemmer',
    kpiBronze: 'Bronsemedlemmer',
    kpiSilver: 'Sølvmedlemmer',
    kpiGold: 'Gullmedlemmer',
    tierThresholds: 'Nivågrenser',
    threshold: 'Grense',
    discountPct: 'Rabatt %',
    discountNote: 'Gjelder rabatt for dette nivået.',
    tiersInfo: 'Medlemmer går opp når totalpoengene når grensen.',
    editRule: 'Rediger regel',
    createRule: 'Opprett regel',
    ruleName: 'Regelnavn',
    selectRule: 'Velg en regel…',
    ruleListHelp: 'Regler med ✓ er allerede lagt til og kan ikke legges til igjen.',
    points: 'Poeng',
    pointsPh: 'f.eks. 10',
    notesOpt: 'Notater (valgfritt)',
    notesPh: 'Beskriv hvordan poeng opptjenes',
    update: 'Oppdater',
    save: 'Lagre',
    cancel: 'Avbryt',
    earningRules: 'Opptjeningsregler',
    name: 'Navn',
    notes: 'Notater',
    actions: 'Handlinger',
    noRulesYet: 'Ingen regler ennå. Opprett til venstre.',
    searchUserPh: 'Søk navn eller e‑post…',
    zeroResult: '0 treff',
    of: 'av',
    email: 'E‑post',
    tier: 'Nivå',
    viewPointsHistory: 'Vis poenghistorikk',
    noName: '(uten navn)',
    adjustPoints: 'Juster poeng',
    noUsersFound: 'Ingen brukere funnet.',
    page: 'Side',
    prev: 'Forrige',
    next: 'Neste',
    pointsHistory: 'Poenghistorikk —',
    currentTotal: 'Nåværende sum',
    pts: 'poeng',
    date: 'Dato',
    delta: 'Delta',
    before: 'Før',
    after: 'Etter',
    reason: 'Årsak',
    source: 'Kilde',
    noEntriesYet: 'Ingen oppføringer ennå.',
    close: 'Lukk',
    adjustPointsTitle: 'Juster poeng —',
    amountCanBeNegative: 'Beløp (kan være negativt)',
    amountPh: 'f.eks., 50 eller -30',
    apply: 'Bruk',
    bronze: 'Bronse',
    silver: 'Sølv',
    gold: 'Gull',
    image: 'bilde',
    selectPercent: 'Velg %',
    saveTiers: 'Lagre nivåer',
  },
  sv: {
    pointsSystem: 'Poängsystem',
    pointsSystemDesc: 'Konfigurera nivåer, regler, belöningar och hantera poäng.',
    tabsOverview: 'Översikt',
    tabsRules: 'Regler',
    tabsUsers: 'Användare',
    kpiTotal: 'Totalt antal medlemmar',
    kpiBronze: 'Bronsmedlemmar',
    kpiSilver: 'Silvermedlemmar',
    kpiGold: 'Guldmedlemmar',
    tierThresholds: 'Nivågränser',
    threshold: 'Tröskel',
    discountPct: 'Rabatt %',
    discountNote: 'Gäller rabatt för denna nivå.',
    tiersInfo: 'Medlemmar går upp när totalpoängen når gränsen.',
    editRule: 'Redigera regel',
    createRule: 'Skapa regel',
    ruleName: 'Regelnamn',
    selectRule: 'Välj en regel…',
    ruleListHelp: 'Regler markerade med ✓ är redan tillagda och kan inte läggas till igen.',
    points: 'Poäng',
    pointsPh: 't.ex. 10',
    notesOpt: 'Anteckningar (valfritt)',
    notesPh: 'Beskriv hur poäng tjänas',
    update: 'Uppdatera',
    save: 'Spara',
    cancel: 'Avbryt',
    earningRules: 'Intjäningsregler',
    name: 'Namn',
    notes: 'Anteckningar',
    actions: 'Åtgärder',
    noRulesYet: 'Inga regler ännu. Skapa till vänster.',
    searchUserPh: 'Sök namn eller e‑post…',
    zeroResult: '0 resultat',
    of: 'av',
    email: 'E‑post',
    tier: 'Nivå',
    viewPointsHistory: 'Visa poänghistorik',
    noName: '(inget namn)',
    adjustPoints: 'Justera poäng',
    noUsersFound: 'Inga användare hittades.',
    page: 'Sida',
    prev: 'Föregående',
    next: 'Nästa',
    pointsHistory: 'Poänghistorik —',
    currentTotal: 'Aktuell summa',
    pts: 'p',
    date: 'Datum',
    delta: 'Delta',
    before: 'Före',
    after: 'Efter',
    reason: 'Orsak',
    source: 'Källa',
    noEntriesYet: 'Inga poster ännu.',
    close: 'Stäng',
    adjustPointsTitle: 'Justera poäng —',
    amountCanBeNegative: 'Belopp (kan vara negativt)',
    amountPh: 't.ex., 50 eller -30',
    apply: 'Verkställ',
    bronze: 'Brons',
    silver: 'Silver',
    gold: 'Guld',
    image: 'bild',
    selectPercent: 'Välj %',
    saveTiers: 'Spara nivåer',
  },
  de: {
    pointsSystem: 'Punktesystem',
    pointsSystemDesc: 'Konfigurieren Sie Stufen, Regeln, Belohnungen und verwalten Sie Punkte.',
    tabsOverview: 'Übersicht',
    tabsRules: 'Regeln',
    tabsUsers: 'Benutzer',
    kpiTotal: 'Mitglieder insgesamt',
    kpiBronze: 'Bronze-Mitglieder',
    kpiSilver: 'Silber-Mitglieder',
    kpiGold: 'Gold-Mitglieder',
    tierThresholds: 'Stufengrenzen',
    threshold: 'Schwelle',
    discountPct: 'Rabatt %',
    discountNote: 'Gilt als Rabatt für diese Stufe.',
    tiersInfo: 'Mitglieder steigen auf, wenn die Gesamtpunkte die Schwelle erreichen.',
    editRule: 'Regel bearbeiten',
    createRule: 'Regel erstellen',
    ruleName: 'Regelname',
    selectRule: 'Regel auswählen…',
    ruleListHelp: 'Mit ✓ markierte Regeln sind bereits hinzugefügt und können nicht erneut hinzugefügt werden.',
    points: 'Punkte',
    pointsPh: 'z. B. 10',
    notesOpt: 'Notizen (optional)',
    notesPh: 'Beschreiben Sie, wie Punkte verdient werden',
    update: 'Aktualisieren',
    save: 'Speichern',
    cancel: 'Abbrechen',
    earningRules: 'Punkte-Regeln',
    name: 'Name',
    notes: 'Notizen',
    actions: 'Aktionen',
    noRulesYet: 'Noch keine Regeln. Erstellen Sie links eine.',
    searchUserPh: 'Suche nach Name oder E‑Mail…',
    zeroResult: '0 Ergebnisse',
    of: 'von',
    email: 'E‑Mail',
    tier: 'Stufe',
    viewPointsHistory: 'Punkthistorie anzeigen',
    noName: '(kein Name)',
    adjustPoints: 'Punkte anpassen',
    noUsersFound: 'Keine Benutzer gefunden.',
    page: 'Seite',
    prev: 'Zurück',
    next: 'Weiter',
    pointsHistory: 'Punkthistorie —',
    currentTotal: 'Aktueller Stand',
    pts: 'Pkt',
    date: 'Datum',
    delta: 'Delta',
    before: 'Vorher',
    after: 'Nachher',
    reason: 'Grund',
    source: 'Quelle',
    noEntriesYet: 'Noch keine Einträge.',
    close: 'Schließen',
    adjustPointsTitle: 'Punkte anpassen —',
    amountCanBeNegative: 'Betrag (kann negativ sein)',
    amountPh: 'z. B., 50 oder -30',
    apply: 'Übernehmen',
    bronze: 'Bronze',
    silver: 'Silber',
    gold: 'Gold',
    image: 'Bild',
    selectPercent: 'Prozent wählen',
    saveTiers: 'Stufen speichern',
  },
};

// Helper to generate a document ID from the rule name
const ruleIdFromName = (name) =>
  (name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/**
 * PointsSystemScreen
 * - In-memory state for smooth UX; replace with Firestore in TODO sections.
 * - Tailwind-based, drop-in component.
 */
export default function PointsSystemScreen() {
  // -------------------- Demo / local state --------------------
  // Use stable tab keys so language switches don’t break selection
  const [activeTab, setActiveTab] = useState('overview');

  const [tiers, setTiers] = useState({ bronze: 0, silver: 0, gold: 0 });
  const [tierImages, setTierImages] = useState({ bronze: "", silver: "", gold: "" });
  const [tierDiscounts, setTierDiscounts] = useState({ bronze: 0, silver: 0, gold: 0 });
  const db = getFirestore();

  // ---- Language hooks (listen to header buttons and localStorage)
  const [lang, setLang] = React.useState(localStorage.getItem('app_lang') || 'en');
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  React.useEffect(() => {
    const handler = (e) => { if (typeof e?.detail === 'string') setLang(e.detail); };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);
  React.useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => { if (e.key === 'app_lang') setLang(e.newValue || 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Subscribe to tiers config: /pointsConfig/tiers
  React.useEffect(() => {
    const ref = doc(db, "pointsConfig", "tiers");
    return onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTiers({
          bronze: Number(data.bronze || 0),
          silver: Number(data.silver || 0),
          gold: Number(data.gold || 0),
        });
        setTierImages({
          bronze: data.bronzeImageURL || "",
          silver: data.silverImageURL || "",
          gold: data.goldImageURL || "",
        });
        setTierDiscounts({
          bronze: Number(data.bronzeDiscount || 0),
          silver: Number(data.silverDiscount || 0),
          gold: Number(data.goldDiscount || 0),
        });
      } else {
        // default if no config yet
        setTiers({ bronze: 0, silver: 0, gold: 0 });
        setTierImages({ bronze: "", silver: "", gold: "" });
        setTierDiscounts({ bronze: 0, silver: 0, gold: 0 });
      }
    });
  }, [db]);

  const [rules, setRules] = useState([]);
  React.useEffect(() => {
    const qRef = query(collection(db, "pointsRules"), orderBy("name"));
    return onSnapshot(qRef, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRules(items);
    });
  }, [db]);

  // Memoized set of existing rule names
  const existingRuleNames = React.useMemo(() => new Set(rules.map((r) => r.name)), [rules]);


  const [users, setUsers] = useState([]);
  React.useEffect(() => {
    const ref = collection(db, "users");
    return onSnapshot(ref, (snap) => {
      const items = snap.docs.map((d) => {
        const data = d.data() || {};
        return {
          id: d.id,
          name: data.name || data.displayName || "",
          email: data.email || "",
          points: Number(data.pointsTotal || 0),
          role: (data.role || "").toString(),
        };
      });
      setUsers(items);
    });
  }, [db]);

  // Points totals sourced from /pointsLedger/{uid}.pointsTotal
  const [ledgerTotals, setLedgerTotals] = useState({});
  React.useEffect(() => {
    const ref = collection(db, "pointsLedger");
    return onSnapshot(ref, (snap) => {
      const map = {};
      snap.forEach((d) => {
        const data = d.data() || {};
        const total = Number(data.pointsTotal || 0);
        map[d.id] = { pointsTotal: total };
      });
      setLedgerTotals(map);
    });
  }, [db]);

  // -------------------- Derived helpers --------------------
  const getTier = (pts) => {
    const p = Number(pts || 0);
    const g = Number(tiers.gold || 0);
    const s = Number(tiers.silver || 0);
    // If gold/silver are not configured, fall back gracefully
    if (!Number.isFinite(g) && !Number.isFinite(s)) return "Bronze";
    if (p >= g) return "Gold";
    if (p >= s) return "Silver";
    return "Bronze";
  };

  const tierBadge = (tier) => {
    const base =
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
    if (tier === "Gold") return `${base} bg-yellow-100 text-yellow-800`;
    if (tier === "Silver") return `${base} bg-gray-100 text-gray-700`;
    return `${base} bg-orange-100 text-orange-800`;
  };

  // -------------------- Tabs UI --------------------
  const TAB_KEYS = ['overview', 'rules', 'users'];
  const tabLabel = (key) => (
    key === 'overview' ? t('tabsOverview') : key === 'rules' ? t('tabsRules') : t('tabsUsers')
  );

  // -------------------- Overview --------------------
    const members = users.filter((u) => (u.role || "").toLowerCase() === "users");
    const totalMembers = members.length;
    const membersWithPoints = members.map((u) => ({
      ...u,
      points: Number(ledgerTotals[u.id]?.pointsTotal || 0),
    }));
    const bronzeCount = membersWithPoints.filter((u) => getTier(u.points) === "Bronze").length;
    const silverCount = membersWithPoints.filter((u) => getTier(u.points) === "Silver").length;
    const goldCount   = membersWithPoints.filter((u) => getTier(u.points) === "Gold").length;

  // -------------------- Rules CRUD --------------------
  const [ruleForm, setRuleForm] = useState({ id: null, name: "", points: 0, notes: "" });

  const handleSaveRule = async () => {
    if (!ruleForm.name) return;
    if (!ruleForm.id && existingRuleNames.has(ruleForm.name)) {
      alert("This rule already exists. Choose a different rule or edit the existing one.");
      return;
    }

    const newId = ruleIdFromName(ruleForm.name);

    if (ruleForm.id) {
      // Editing existing rule
      if (ruleForm.id === newId) {
        // ID unchanged: simple update
        await updateDoc(doc(db, "pointsRules", ruleForm.id), {
          name: ruleForm.name,
          points: Number(ruleForm.points || 0),
          notes: ruleForm.notes || "",
          updatedAt: serverTimestamp(),
        });
      } else {
        // ID changed (name changed): create new doc with newId then delete old
        const newRef = doc(db, "pointsRules", newId);
        const exists = await getDoc(newRef);
        if (exists.exists()) {
          alert("A rule with this name already exists. Choose a different name.");
          return;
        }
        await setDoc(newRef, {
          name: ruleForm.name,
          points: Number(ruleForm.points || 0),
          notes: ruleForm.notes || "",
          createdAt: serverTimestamp(),
        });
        await deleteDoc(doc(db, "pointsRules", ruleForm.id));
      }
    } else {
      // Creating new rule with name as ID
      const newRef = doc(db, "pointsRules", newId);
      const exists = await getDoc(newRef);
      if (exists.exists()) {
        alert("A rule with this name already exists.");
        return;
      }
      await setDoc(newRef, {
        name: ruleForm.name,
        points: Number(ruleForm.points || 0),
        notes: ruleForm.notes || "",
        createdAt: serverTimestamp(),
      });
    }

    setRuleForm({ id: null, name: "", points: 0, notes: "" });
  };

  const handleEditRule = (r) => setRuleForm(r);
  const handleDeleteRule = async (id) => {
    await deleteDoc(doc(db, "pointsRules", id));
  };


  // -------------------- Adjust Points Modal --------------------
  const [adjustUser, setAdjustUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState("");

  const applyAdjustPoints = async () => {
  if (!adjustUser) return;

  const uid = adjustUser.id;
  const ledgerUserRef = doc(db, "pointsLedger", uid);
  const entriesCol = collection(ledgerUserRef, "entries");
  const delta = Number(adjustAmount || 0);

  await runTransaction(db, async (tx) => {
    const ledgerSnap = await tx.get(ledgerUserRef);
    const current = ledgerSnap.exists() ? Number(ledgerSnap.data().pointsTotal || 0) : 0;
    const next = Math.max(0, current + delta);

    // Upsert the user's ledger doc with the new total
    tx.set(
      ledgerUserRef,
      {
        uid,
        pointsTotal: next,
        updated_at: serverTimestamp(),
      },
      { merge: true }
    );

    // Append an entry to the ledger entries subcollection
    tx.set(doc(entriesCol), {
      delta,
      reason: adjustReason || "",
      before: current,
      after: next,
      ts: serverTimestamp(),
    });
  });

  setAdjustUser(null);
  setAdjustAmount(0);
  setAdjustReason("");
};

  // -------------------- Users Search --------------------
  const [userQuery, setUserQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const filteredUsers = useMemo(() => {
  const withPoints = users.map((u) => ({
      ...u,
      points: Number(ledgerTotals[u.id]?.pointsTotal || 0),
    }));
    const q = userQuery.trim().toLowerCase();
    if (!q) return withPoints;
    return withPoints.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
    );
  }, [userQuery, users, ledgerTotals]);

    // Pagination derived values
    const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
    const paginatedUsers = useMemo(() => {
      const start = (page - 1) * pageSize;
      return filteredUsers.slice(start, start + pageSize);
    }, [filteredUsers, page]);

    // Reset to page 1 whenever the query changes
    React.useEffect(() => {
      setPage(1);
    }, [userQuery]);

    // Clamp page when the results length changes
    React.useEffect(() => {
      if (page > totalPages) setPage(totalPages);
    }, [totalPages, page]);

  // -------------------- Tier Save --------------------
  const saveTiers = async () => {
    if (!(tiers.bronze <= tiers.silver && tiers.silver <= tiers.gold)) {
      alert("Please ensure Bronze ≤ Silver ≤ Gold thresholds.");
      return;
    }
    const ref = doc(db, "pointsConfig", "tiers");
    await setDoc(ref, {
      bronze: Number(tiers.bronze || 0),
      silver: Number(tiers.silver || 0),
      gold: Number(tiers.gold || 0),
      bronzeImageURL: tierImages.bronze || "",
      silverImageURL: tierImages.silver || "",
      goldImageURL: tierImages.gold || "",
      bronzeDiscount: Number(tierDiscounts.bronze || 0),
      silverDiscount: Number(tierDiscounts.silver || 0),
      goldDiscount: Number(tierDiscounts.gold || 0),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    alert("Tier thresholds saved.");
  };

  const handleTierImageUpload = async (tierKey, file) => {
    if (!file) return;
    try {
      const storage = getStorage();
      const ext = file.name.split(".").pop() || "jpg";
      const path = `tierImages/${tierKey}-${Date.now()}.${ext}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);
      setTierImages((prev) => ({ ...prev, [tierKey]: url }));
    } catch (e) {
      alert("Failed to upload image: " + (e?.message || e));
    }
  };

  // -------------------- Points History Modal --------------------
  const [ledgerUser, setLedgerUser] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const ledgerUnsubRef = React.useRef(null);

  const openLedgerForUser = (u) => {
    setLedgerUser(u);
    // live subscribe to /pointsLedger/{uid}/entries ordered by ts desc
    if (ledgerUnsubRef.current) {
      ledgerUnsubRef.current();
      ledgerUnsubRef.current = null;
    }
    const entriesRef = collection(db, "pointsLedger", u.id, "entries");
    const qRef = query(entriesRef, orderBy("ts", "desc"));
    ledgerUnsubRef.current = onSnapshot(qRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
      setLedgerEntries(list);
    });
  };

  const closeLedger = () => {
    if (ledgerUnsubRef.current) {
      ledgerUnsubRef.current();
      ledgerUnsubRef.current = null;
    }
    setLedgerUser(null);
    setLedgerEntries([]);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: BRAND }}>{t('pointsSystem')}</h2>
          <p className="text-gray-600">{t('pointsSystemDesc')}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white"
            style={{ backgroundColor: BRAND }}
            onClick={saveTiers}
            title={t('saveTiers')}
          >
            <Save size={16} />
            {t('save')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b">
        <nav className="-mb-px flex flex-wrap gap-2">
          {TAB_KEYS.map((k) => (
            <button
              key={k}
              onClick={() => setActiveTab(k)}
              className={`px-4 py-2 text-sm border-b-2 transition ${
                activeTab === k
                  ? 'font-medium'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
              style={activeTab === k ? { borderColor: BRAND, color: BRAND } : {}}
            >
              {tabLabel(k)}
            </button>
          ))}
        </nav>
      </div>

    {/* Content */}
    {activeTab === 'overview' && (
      <section className="space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <KpiCard title={t('kpiTotal')} value={totalMembers} accentColor="#ef862a" />
          <KpiCard title={t('kpiBronze')} value={bronzeCount} accentColor="#ef862a" />
          <KpiCard title={t('kpiSilver')} value={silverCount} accentColor="#ef862a" />
          <KpiCard title={t('kpiGold')} value={goldCount} accentColor="#ef862a" />
        </div>

        {/* Tiers */}
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-orange-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-orange-50">
              <Star style={{ color: "#ef862a" }} size={20} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{t('tierThresholds')}</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Bronze Tier */}
            <div className="bg-gradient-to-b from-orange-50 to-white rounded-xl p-5 border border-orange-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-md font-bold text-orange-800">{t('bronze')}</div>
                <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              </div>
              <TierImageUpload
                label={t('bronze')}
                currentURL={tierImages.bronze}
                accentColor="#ef862a"
                t={t}
              />
              <div className="mt-4">
                <TierInput
                  label={t('threshold')}
                  value={tiers.bronze}
                  onChange={(v) => setTiers((s) => ({ ...s, bronze: v }))}
                  accentColor="#ef862a"
                />
                <TierDiscountSelect
                  label={t('discountPct')}
                  value={tierDiscounts.bronze}
                  onChange={(v) => setTierDiscounts((s) => ({ ...s, bronze: v }))}
                  t={t}
                />
              </div>
            </div>
            
            {/* Silver Tier */}
            <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl p-5 border border-gray-200 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-md font-bold text-gray-700">{t('silver')}</div>
                <div className="w-3 h-3 rounded-full bg-gray-400"></div>
              </div>
              <TierImageUpload
                label={t('silver')}
                currentURL={tierImages.silver}
                accentColor="#ef862a"
                t={t}
              />
              <div className="mt-4">
                <TierInput
                  label={t('threshold')}
                  value={tiers.silver}
                  onChange={(v) => setTiers((s) => ({ ...s, silver: v }))}
                  accentColor="#ef862a"
                />
                <TierDiscountSelect
                  label={t('discountPct')}
                  value={tierDiscounts.silver}
                  onChange={(v) => setTierDiscounts((s) => ({ ...s, silver: v }))}
                  t={t}
                />
              </div>
            </div>
            
            {/* Gold Tier */}
            <div className="bg-gradient-to-b from-amber-50 to-white rounded-xl p-5 border border-amber-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1">
              <div className="flex items-center justify-between mb-4">
                <div className="text-md font-bold text-amber-700">{t('gold')}</div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              </div>
              <TierImageUpload
                label={t('gold')}
                currentURL={tierImages.gold}
                accentColor="#ef862a"
                t={t}
              />
              <div className="mt-4">
                <TierInput
                  label={t('threshold')}
                  value={tiers.gold}
                  onChange={(v) => setTiers((s) => ({ ...s, gold: v }))}
                  accentColor="#ef862a"
                />
                <TierDiscountSelect
                  label={t('discountPct')}
                  value={tierDiscounts.gold}
                  onChange={(v) => setTierDiscounts((s) => ({ ...s, gold: v }))}
                  t={t}
                />
              </div>
            </div>
          </div>
          
          <p className="text-sm text-gray-500 mt-5 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('tiersInfo')}
          </p>
        </div>
      </section>
    )}

      {activeTab === 'rules' && (
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="bg-white rounded-2xl shadow p-5 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <Plus />
              <h3 className="text-lg font-semibold">
                {ruleForm.id ? t('editRule') : t('createRule')}
              </h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">{t('ruleName')}</label>
                <select
                  className="w-full rounded-xl border px-3 py-2 bg-white"
                  value={ruleForm.name || ""}
                  onChange={(e) => setRuleForm((s) => ({ ...s, name: e.target.value }))}
                >
                  <option value="" disabled>{t('selectRule')}</option>
                  {RULE_TYPES.map((t) => {
                    const added = existingRuleNames.has(t);
                    const isCreating = !ruleForm.id;
                    return (
                      <option key={t} value={t} disabled={isCreating && added}>
                        {added ? `✓ ${t} (added)` : t}
                      </option>
                    );
                  })}
                </select>
                <div className="mt-1 text-xs text-gray-500">{t('ruleListHelp')}</div>
              </div>
            <div>
            <label className="block text-sm text-gray-600 mb-1">{t('points')}</label>
            <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-full rounded-xl border px-3 py-2"
                placeholder={t('pointsPh')}
                value={String(ruleForm.points)}
                onChange={(e) => {
                const onlyNums = (e.target.value || "").replace(/\D/g, "");
                setRuleForm((s) => ({ ...s, points: Number(onlyNums || 0) }));
                }}
            />
            </div>
              <Input
                label={t('notesOpt')}
                placeholder={t('notesPh')}
                value={ruleForm.notes}
                onChange={(e) =>
                  setRuleForm((s) => ({ ...s, notes: e.target.value }))
                }
              />
              <div className="flex items-center gap-2 pt-2">
                <button
                  className="inline-flex items-center gap-2 rounded-xl text-white px-4 py-2 text-sm"
                  style={{ backgroundColor: BRAND }}
                  onClick={handleSaveRule}
                >
                  <Save size={16} />
                  {ruleForm.id ? t('update') : t('save')}
                </button>
                {ruleForm.id && (
                  <button
                    className="rounded-xl px-3 py-2 text-sm border"
                    onClick={() =>
                      setRuleForm({ id: null, name: "", points: 0, notes: "" })
                    }
                  >
                    {t('cancel')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* List */}
          <div className="bg-white rounded-2xl shadow p-5 lg:col-span-2">
            <h3 className="text-lg font-semibold mb-4">{t('earningRules')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">{t('name')}</th>
                    <th className="py-2 pr-4">{t('points')}</th>
                    <th className="py-2 pr-4">{t('notes')}</th>
                    <th className="py-2 pr-4 w-1">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rules.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 pr-4 font-medium">{r.name}</td>
                      <td className="py-2 pr-4">{r.points}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.notes}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-2">
                          <IconButton onClick={() => handleEditRule(r)} title={t('editRule')}>
                            <Pencil size={16} />
                          </IconButton>
                          <IconButton onClick={() => handleDeleteRule(r.id)} title={t('delete') || 'Delete'}>
                            <Trash2 size={16} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {rules.length === 0 && (
                    <tr>
                      <td className="py-6 text-gray-500" colSpan={4}>
                        {t('noRulesYet')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}


      {activeTab === 'users' && (
        <section className="bg-white rounded-2xl shadow p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5" size={16} />
                <input
                  className="pl-8 pr-3 py-2 rounded-xl border w-64 text-sm"
                  placeholder={t('searchUserPh')}
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
             <ChevronDown size={14} />
              {filteredUsers.length === 0
                ? t('zeroResult')
                : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filteredUsers.length)} ${t('of')} ${filteredUsers.length}`}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-4">{t('name')}</th>
                  <th className="py-2 pr-4">{t('email')}</th>
                  <th className="py-2 pr-4">{t('points')}</th>
                  <th className="py-2 pr-4">{t('tier')}</th>
                  <th className="py-2 pr-4 w-1">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
               {paginatedUsers.map((u) => (
                   <tr key={u.id}>
                    <td className="py-2 pr-4 font-medium">
                      <button
                        className="underline decoration-dotted underline-offset-4 hover:text-orange-600"
                        onClick={() => openLedgerForUser(u)}
                        title={t('viewPointsHistory')}
                      >
                        {u.name || t('noName')}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{u.email}</td>
                    <td className="py-2 pr-4">{u.points}</td>
                    <td className="py-2 pr-4">
                      <span className={tierBadge(getTier(u.points))}>
                        <Star size={12} style={{ color: BRAND }} />
                        {getTier(u.points)}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <IconButton onClick={() => setAdjustUser(u)} title={t('adjustPoints')}>
                          <Plus size={16} />
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="py-6 text-gray-500" colSpan={5}>
                      {t('noUsersFound')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-gray-500">
              {t('page')} {page} {t('of')} {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                {t('prev')}
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-lg border disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                {t('next')}
              </button>
            </div>
          </div>

          {/* Points History Modal */}
        {ledgerUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl border border-gray-100">
              {/* Header */}
              <div className="relative">
                <div className="bg-gradient-to-r from-[#fc8722] to-[#ffb37a] px-6 py-5">
                  <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                    {t('pointsHistory')} <span className="opacity-90">{ledgerUser.name}</span>
                  </h3>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="text-sm text-white/85">{t('currentTotal')}</span>
                    <span className="inline-flex items-center rounded-full border border-white/70 px-2.5 py-1 text-sm font-semibold text-white bg-white/10 backdrop-blur">
                      {Number(ledgerTotals[ledgerUser.id]?.pointsTotal || 0).toLocaleString()} {t('pts')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 pb-4 pt-4">
                <div className="rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="max-h-[60vh] overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-gray-50/90 backdrop-blur supports-[backdrop-filter]:bg-gray-50/70 text-gray-600 z-10">
                        <tr className="text-left">
                          <th className="py-3 pl-4 pr-4 font-medium">{t('date')}</th>
                          <th className="py-3 pr-4 font-medium">{t('delta')}</th>
                          <th className="py-3 pr-4 font-medium">{t('before')}</th>
                          <th className="py-3 pr-4 font-medium">{t('after')}</th>
                          <th className="py-3 pr-4 font-medium">{t('reason')}</th>
                          <th className="py-3 pr-4 font-medium">{t('source')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {ledgerEntries.map((e) => {
                          const ts = e.ts?.toDate ? e.ts.toDate() : (e.ts || null);
                          const dateStr = ts ? new Date(ts).toLocaleString() : "";
                          const delta = Number(e.delta || 0);
                          const chipBase = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold";
                          const chip =
                            delta >= 0
                              ? `${chipBase} bg-green-50 text-green-700 ring-1 ring-green-100`
                              : `${chipBase} bg-red-50 text-red-700 ring-1 ring-red-100`;
                          return (
                            <tr key={e.id} className="hover:bg-gray-50/60 odd:bg-gray-50/30 transition-colors">
                              <td className="py-3 pl-4 pr-4 whitespace-nowrap text-gray-800">{dateStr}</td>
                              <td className="py-3 pr-4">
                                <span className={chip}>
                                  {delta >= 0 ? "+" : ""}
                                  {delta}
                                </span>
                              </td>
                              <td className="py-3 pr-4 tabular-nums text-gray-700">{Number(e.before || 0).toLocaleString()}</td>
                              <td className="py-3 pr-4 tabular-nums font-semibold text-gray-900">{Number(e.after || 0).toLocaleString()}</td>
                              <td className="py-3 pr-4 text-gray-600">{e.reason || ""}</td>
                              <td className="py-3 pr-4 text-gray-600">{e.source || ""}</td>
                            </tr>
                          );
                        })}

                        {ledgerEntries.length === 0 && (
                          <tr>
                            <td className="py-10 text-center text-gray-500" colSpan={6}>
                              <div className="mx-auto w-full max-w-xs">
                                <div className="mx-auto mb-3 h-12 w-12 rounded-full border border-dashed border-gray-300 grid place-items-center">
                                  <svg viewBox="0 0 24 24" className="h-6 w-6 text-gray-400">
                                    <path fill="currentColor" d="M12 3a9 9 0 1 0 .001 18.001A9 9 0 0 0 12 3Zm1 5v4l3 1-1 1.732L11 13V8h2Z"/>
                                  </svg>
                                </div>
                                <p className="text-sm">{t('noEntriesYet')}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    className="rounded-xl px-4 py-2 text-sm font-medium text-white shadow-sm"
                    style={{ backgroundColor: BRAND }}
                    onClick={closeLedger}
                  >
                    {t('close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </section>
      )}

      {/* Adjust Points Modal */}
      {adjustUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              {t('adjustPointsTitle')} {adjustUser.name}
            </h3>
            <div className="space-y-3">
            <div>
            <label className="block text-sm text-gray-600 mb-1">{t('amountCanBeNegative')}</label>
            <input
                type="text"
                inputMode="numeric"
                pattern="-?[0-9]*"
                className="w-full rounded-xl border px-3 py-2"
                placeholder={t('amountPh')}
                value={String(adjustAmount)}
                onChange={(e) => {
                const val = (e.target.value || "").replace(/[^0-9-]/g, "");
                // keep only the first leading '-'
                const normalized = val.startsWith('-')
                    ? '-' + val.slice(1).replace(/-/g, '')
                    : val.replace(/-/g, '');
                setAdjustAmount(normalized === '' || normalized === '-' ? 0 : Number(normalized));
                }}
            />
            </div>
              <Input
                label={t('reason')}
                placeholder={t('notesPh')}
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                className="rounded-xl px-3 py-2 text-sm border"
                onClick={() => {
                  setAdjustUser(null);
                  setAdjustAmount(0);
                  setAdjustReason("");
                }}
              >
                {t('cancel')}
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-xl text-white px-4 py-2 text-sm"
                style={{ backgroundColor: BRAND }}
                onClick={applyAdjustPoints}
                disabled={!adjustAmount}
              >
                <Save size={16} />
                {t('apply')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -----------------------------------------------------------
 * Small UI helpers
 * ---------------------------------------------------------*/
function KpiCard({ title, value }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function TierInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type="number"
        className="w-full rounded-xl border px-3 py-2"
        value={value}
        onChange={(e) => onChange(Number(e.target.value || 0))}
        min={0}
      />
    </div>
  );
}

function Input({ label, type = "text", ...props }) {
  return (
    <div>
      {label && <label className="block text-sm text-gray-600 mb-1">{label}</label>}
      <input
        type={type}
        className="w-full rounded-xl border px-3 py-2"
        {...props}
      />
    </div>
  );
}

function IconButton({ children, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-lg border px-2.5 py-1.5 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function TierDiscountSelect({ label, value, onChange, t }) {
  const options = [0,5,10,15,20,25,30,35,40,45,50];
  return (
    <div className="mt-3">
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <select
        className="w-full rounded-xl border px-3 py-2 bg-white"
        value={value ?? ''}
        onChange={(e) => onChange(Number(e.target.value || 0))}
      >
        <option value="" disabled>{t('selectPercent')}</option>
        {options.map((p) => (
          <option key={p} value={p}>{p}%</option>
        ))}
      </select>
      <div className="mt-1 text-xs text-gray-500">{t('discountNote')}</div>
    </div>
  );
}

function TierImageUpload({ label, currentURL, t }) {
  return (
    <div className="mt-2 text-center">
      <div className="mb-1 text-xs text-gray-500">{label} {t('image')}</div>
      {currentURL ? (
        <img
          src={currentURL}
          alt={`${label} tier`}
          className="mx-auto w-24 h-24 object-contain rounded-xl border bg-white shadow-sm"
        />
      ) : (
        <div className="mx-auto w-24 h-24 rounded-xl border border-dashed grid place-items-center text-gray-400 bg-white">
          <span className="text-[10px]">{t('noEntriesYet') === 'No entries yet.' ? 'No image' : t('noEntriesYet')}</span>
        </div>
      )}
    </div>
  );
}