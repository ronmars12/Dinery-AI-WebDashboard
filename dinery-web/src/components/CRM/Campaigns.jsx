import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { firestore } from "../../firebase";
import facebookLogo from "../../assets/facebook.png";
import instagramLogo from "../../assets/instagram.png";
import googleLogo from "../../assets/google-logo.png";
import qrCodeLogo from "../../assets/qr-code.png";

// ─── i18n Translations ──────────────────────────────────────────────────────────
const i18n = {
  en: {
    // Page titles
    campaigns: 'Campaigns',
    createTrackableLinks: 'Create trackable offer links for Facebook, Instagram, Google Ads, QR codes, and more.',
    newCampaign: 'New Campaign',
    // Campaign card
    clicks: 'Clicks',
    bookings: 'Bookings',
    redeemed: 'Redeemed',
    copied: 'Copied!',
    copy: 'Copy',
    showQRCode: 'Show QR code',
    hideQRCode: 'Hide QR code',
    downloadQR: 'Download QR image',
    // Create modal
    campaignName: 'Campaign Name',
    campaignNamePlaceholder: 'e.g. Summer Facebook Promo',
    channel: 'Channel',
    offer: 'Offer',
    noActiveOffers: 'No active offers found. Create one in the Offers tab first.',
    selectOffer: '— Select an offer —',
    createCampaign: 'Create Campaign',
    creating: 'Creating…',
    cancel: 'Cancel',
    // Errors
    giveCampaignName: 'Give the campaign a name.',
    selectOfferToAttach: 'Select an offer to attach.',
    failedToCreate: 'Failed to create campaign: ',
    // Delete
    deleteCampaign: 'Delete this campaign? Its stats will no longer be trackable.',
    // Empty state
    noCampaignsYet: 'No campaigns yet',
    createOneToGetLink: 'Create one to get a trackable link for Facebook, Instagram, QR codes, or ads.',
    // Loading
    loading: 'Loading…',
    // Channel labels
    facebook: 'Facebook',
    instagram: 'Instagram',
    googleAds: 'Google Ads',
    qrCodeFlyer: 'QR Code / Flyer',
    other: 'Other',
  },
  fi: {
    campaigns: 'Kampanjat',
    createTrackableLinks: 'Luo seurattavia tarjouslinkkejä Facebookiin, Instagramiin, Google Ads -mainoksiin, QR-koodeihin ja muihin.',
    newCampaign: 'Uusi kampanja',
    clicks: 'Klikkaukset',
    bookings: 'Varaukset',
    redeemed: 'Lunastetut',
    copied: 'Kopioitu!',
    copy: 'Kopioi',
    showQRCode: 'Näytä QR-koodi',
    hideQRCode: 'Piilota QR-koodi',
    downloadQR: 'Lataa QR-kuva',
    campaignName: 'Kampanjan nimi',
    campaignNamePlaceholder: 'esim. Kesä Facebook -kampanja',
    channel: 'Kanava',
    offer: 'Tarjous',
    noActiveOffers: 'Aktiivisia tarjouksia ei löytynyt. Luo ensin tarjous Tarjoukset-välilehdellä.',
    selectOffer: '— Valitse tarjous —',
    createCampaign: 'Luo kampanja',
    creating: 'Luodaan…',
    cancel: 'Peruuta',
    giveCampaignName: 'Anna kampanjalle nimi.',
    selectOfferToAttach: 'Valitse tarjous liitettäväksi.',
    failedToCreate: 'Kampanjan luominen epäonnistui: ',
    deleteCampaign: 'Poista tämä kampanja? Sen tilastoja ei voida enää seurata.',
    noCampaignsYet: 'Ei vielä kampanjoita',
    createOneToGetLink: 'Luo kampanja saadaksesi seurattavan linkin Facebookiin, Instagramiin, QR-koodeihin tai mainoksiin.',
    loading: 'Ladataan…',
    facebook: 'Facebook',
    instagram: 'Instagram',
    googleAds: 'Google Ads',
    qrCodeFlyer: 'QR-koodi / Mainos',
    other: 'Muu',
  },
  no: {
    campaigns: 'Kampanjer',
    createTrackableLinks: 'Lag sporbare tilbudslenker for Facebook, Instagram, Google Ads, QR-koder og mer.',
    newCampaign: 'Ny kampanje',
    clicks: 'Klikk',
    bookings: 'Bestillinger',
    redeemed: 'Innløst',
    copied: 'Kopiert!',
    copy: 'Kopier',
    showQRCode: 'Vis QR-kode',
    hideQRCode: 'Skjul QR-kode',
    downloadQR: 'Last ned QR-bilde',
    campaignName: 'Kampanjenavn',
    campaignNamePlaceholder: 'f.eks. Sommer Facebook-kampanje',
    channel: 'Kanal',
    offer: 'Tilbud',
    noActiveOffers: 'Ingen aktive tilbud funnet. Opprett et i Tilbud-fanen først.',
    selectOffer: '— Velg et tilbud —',
    createCampaign: 'Opprett kampanje',
    creating: 'Oppretter…',
    cancel: 'Avbryt',
    giveCampaignName: 'Gi kampanjen et navn.',
    selectOfferToAttach: 'Velg et tilbud å feste.',
    failedToCreate: 'Kunne ikke opprette kampanje: ',
    deleteCampaign: 'Slett denne kampanjen? Statistikken vil ikke lenger kunne spores.',
    noCampaignsYet: 'Ingen kampanjer ennå',
    createOneToGetLink: 'Opprett en for å få en sporbar lenke for Facebook, Instagram, QR-koder eller annonser.',
    loading: 'Laster…',
    facebook: 'Facebook',
    instagram: 'Instagram',
    googleAds: 'Google Ads',
    qrCodeFlyer: 'QR-kode / Flyer',
    other: 'Annet',
  },
  sv: {
    campaigns: 'Kampanjer',
    createTrackableLinks: 'Skapa spårbara erbjudandelänkar för Facebook, Instagram, Google Ads, QR-koder och mer.',
    newCampaign: 'Ny kampanj',
    clicks: 'Klick',
    bookings: 'Bokningar',
    redeemed: 'Inlösta',
    copied: 'Kopierad!',
    copy: 'Kopiera',
    showQRCode: 'Visa QR-kod',
    hideQRCode: 'Dölj QR-kod',
    downloadQR: 'Ladda ner QR-bild',
    campaignName: 'Kampanjnamn',
    campaignNamePlaceholder: 't.ex. Sommar Facebook-kampanj',
    channel: 'Kanal',
    offer: 'Erbjudande',
    noActiveOffers: 'Inga aktiva erbjudanden hittades. Skapa ett i Erbjudanden-fliken först.',
    selectOffer: '— Välj ett erbjudande —',
    createCampaign: 'Skapa kampanj',
    creating: 'Skapar…',
    cancel: 'Avbryt',
    giveCampaignName: 'Ge kampanjen ett namn.',
    selectOfferToAttach: 'Välj ett erbjudande att bifoga.',
    failedToCreate: 'Kunde inte skapa kampanj: ',
    deleteCampaign: 'Ta bort denna kampanj? Dess statistik kommer inte längre att kunna spåras.',
    noCampaignsYet: 'Inga kampanjer ännu',
    createOneToGetLink: 'Skapa en för att få en spårbar länk för Facebook, Instagram, QR-koder eller annonser.',
    loading: 'Laddar…',
    facebook: 'Facebook',
    instagram: 'Instagram',
    googleAds: 'Google Ads',
    qrCodeFlyer: 'QR-kod / Flyer',
    other: 'Annat',
  },
  de: {
    campaigns: 'Kampagnen',
    createTrackableLinks: 'Erstellen Sie verfolgbare Angebotslinks für Facebook, Instagram, Google Ads, QR-Codes und mehr.',
    newCampaign: 'Neue Kampagne',
    clicks: 'Klicks',
    bookings: 'Buchungen',
    redeemed: 'Eingelöst',
    copied: 'Kopiert!',
    copy: 'Kopieren',
    showQRCode: 'QR-Code anzeigen',
    hideQRCode: 'QR-Code ausblenden',
    downloadQR: 'QR-Bild herunterladen',
    campaignName: 'Kampagnenname',
    campaignNamePlaceholder: 'z.B. Sommer Facebook-Kampagne',
    channel: 'Kanal',
    offer: 'Angebot',
    noActiveOffers: 'Keine aktiven Angebote gefunden. Erstellen Sie zuerst eines im Angebote-Tab.',
    selectOffer: '— Angebot auswählen —',
    createCampaign: 'Kampagne erstellen',
    creating: 'Erstelle…',
    cancel: 'Abbrechen',
    giveCampaignName: 'Geben Sie der Kampagne einen Namen.',
    selectOfferToAttach: 'Wählen Sie ein Angebot zum Anhängen.',
    failedToCreate: 'Kampagne konnte nicht erstellt werden: ',
    deleteCampaign: 'Diese Kampagne löschen? Ihre Statistiken können nicht mehr verfolgt werden.',
    noCampaignsYet: 'Noch keine Kampagnen',
    createOneToGetLink: 'Erstellen Sie eine, um einen verfolgbaren Link für Facebook, Instagram, QR-Codes oder Anzeigen zu erhalten.',
    loading: 'Lade…',
    facebook: 'Facebook',
    instagram: 'Instagram',
    googleAds: 'Google Ads',
    qrCodeFlyer: 'QR-Code / Flyer',
    other: 'Sonstiges',
  },
};

const TRACK_CLICK_URL = "https://asia-southeast1-dinery-9c261.cloudfunctions.net/trackOfferClick";
const RESERVE_BASE_URL = "https://dashboard.dinery.ai";

const CHANNELS = [
  { value: "facebook", label: "Facebook", logo: facebookLogo, color: "#1877f2" },
  { value: "instagram", label: "Instagram", logo: instagramLogo, color: "#e1306c" },
  { value: "google_ads", label: "Google Ads", logo: googleLogo, color: "#4285f4" },
  { value: "qr_code", label: "QR Code / Flyer", logo: qrCodeLogo, color: "#fe8a24" },
  { value: "other", label: "Other", logo: null, icon: "🔗", color: "#6b7280" },
];

function channelInfo(value) {
  return CHANNELS.find((c) => c.value === value) || CHANNELS[CHANNELS.length - 1];
}

function pct(numerator, denominator) {
  if (!denominator) return "0%";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

// ─── Create Campaign Modal ──────────────────────────────────────────────────

function CreateCampaignModal({ restaurantId, collectionName, offers, onClose, onCreated, t }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState("facebook");
  const [selectedOfferId, setSelectedOfferId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) { setError(t('giveCampaignName')); return; }
    if (!selectedOfferId) { setError(t('selectOfferToAttach')); return; }
    setError("");
    setSaving(true);
    try {
      const offer = offers.find((o) => o.id === selectedOfferId);
      const docRef = await addDoc(collection(firestore, "campaigns"), {
        restaurantId,
        collectionName,
        name: name.trim(),
        channel,
        offerId: offer.id,
        offerCode: offer.offer_id,
        offerName: offer.offer_name,
        createdAt: new Date(),
      });
      const link =
        `${TRACK_CLICK_URL}?restaurantId=${encodeURIComponent(restaurantId)}` +
        `&offer=${encodeURIComponent(offer.offer_id)}` +
        `&offerId=${encodeURIComponent(offer.id)}` +
        `&campaignId=${encodeURIComponent(docRef.id)}` +
        `&source=${encodeURIComponent(channel)}`;
      onCreated({ id: docRef.id, restaurantId, collectionName, name: name.trim(), channel, offerId: offer.id, offerCode: offer.offer_id, offerName: offer.offer_name, link, createdAt: new Date() });
      onClose();
    } catch (e) {
      console.error(e);
      setError(t('failedToCreate') + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Get translated channel labels
  const getChannelLabel = (value) => {
    const labels = {
      facebook: t('facebook'),
      instagram: t('instagram'),
      google_ads: t('googleAds'),
      qr_code: t('qrCodeFlyer'),
      other: t('other'),
    };
    return labels[value] || value;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{t('newCampaign')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('campaignName')}</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={t('campaignNamePlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('channel')}</label>
            <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setChannel(c.value)}
                  className={`flex flex-col items-center gap-1.5 py-2.5 rounded-lg border-2 text-xs font-medium transition-colors ${channel === c.value ? "border-[#fe8a24] bg-orange-50 text-[#fe8a24]" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                >
                  {c.logo ? (
                    <img src={c.logo} alt={getChannelLabel(c.value)} className="w-5 h-5 object-contain" />
                  ) : (
                    <span className="text-lg">{c.icon}</span>
                  )}
                  {getChannelLabel(c.value)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('offer')}</label>
            {offers.length === 0 ? (
              <p className="text-sm text-gray-400">{t('noActiveOffers')}</p>
            ) : (
              <select
                value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#fe8a24]"
              >
                <option value="">{t('selectOffer')}</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>{o.offer_id}: {o.offer_name}{o.discount_percent ? ` (${o.discount_percent}% off)` : ""}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm hover:bg-gray-50">{t('cancel')}</button>
          <button
            onClick={handleCreate} disabled={saving || offers.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-[#fe8a24] text-white rounded-lg text-sm font-semibold hover:bg-[#e07a1f] disabled:opacity-50"
          >
            {saving ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> {t('creating')}</> : t('createCampaign')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Campaign Card ──────────────────────────────────────────────────────────

function CampaignCard({ campaign, onDelete, t }) {
  const [stats, setStats] = useState({ clicks: 0, bookings: 0, redeemed: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const info = channelInfo(campaign.channel);

  // Get translated channel label
  const getChannelLabel = (value) => {
    const labels = {
      facebook: t('facebook'),
      instagram: t('instagram'),
      google_ads: t('googleAds'),
      qr_code: t('qrCodeFlyer'),
      other: t('other'),
    };
    return labels[value] || value;
  };

  const link =
    campaign.link ||
    `${TRACK_CLICK_URL}?restaurantId=${encodeURIComponent(campaign.restaurantId)}` +
    `&offer=${encodeURIComponent(campaign.offerCode)}` +
    `&offerId=${encodeURIComponent(campaign.offerId)}` +
    `&campaignId=${encodeURIComponent(campaign.id)}` +
    `&source=${encodeURIComponent(campaign.channel)}`;

  useEffect(() => {
    const load = async () => {
      setLoadingStats(true);
      try {
        const clicksSnap = await getDocs(query(collection(firestore, "offer_clicks"), where("campaignId", "==", campaign.id)));
        const resSnap = await getDocs(query(collection(firestore, "reservations"), where("offer_campaign_id", "==", campaign.id)));
        const bookings = resSnap.docs.length;
        const redeemed = resSnap.docs.filter((d) => d.data().status === "completed").length;
        setStats({ clicks: clicksSnap.docs.length, bookings, redeemed });
      } catch (e) {
        console.error("Campaign stats load error:", e);
      } finally {
        setLoadingStats(false);
      }
    };
    load();
  }, [campaign.id]);

  const copyLink = () => {
    navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {info.logo ? (
            <img src={info.logo} alt={getChannelLabel(campaign.channel)} className="w-7 h-7 object-contain flex-shrink-0 mt-0.5" />
          ) : (
            <span className="text-2xl flex-shrink-0">{info.icon}</span>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{campaign.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{getChannelLabel(campaign.channel)} · {campaign.offerCode}: {campaign.offerName}</p>
          </div>
        </div>
        <button onClick={() => onDelete(campaign.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <div className="px-5 py-4">
        {loadingStats ? (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300" /> {t('loading')}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.clicks}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('clicks')}</p>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{stats.bookings}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('bookings')} <span className="normal-case">({pct(stats.bookings, stats.clicks)})</span></p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">{stats.redeemed}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{t('redeemed')}</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-3">
          <span className="flex-1 text-xs text-gray-600 font-mono truncate">{link}</span>
          <button onClick={copyLink} className={`text-xs font-semibold px-2.5 py-1 rounded-md flex-shrink-0 transition-colors ${copied ? "bg-green-500 text-white" : "bg-[#fe8a24] text-white hover:bg-[#e07a1f]"}`}>
            {copied ? t('copied') : t('copy')}
          </button>
        </div>

        <button onClick={() => setShowQR((v) => !v)} className="text-xs font-medium text-[#fe8a24] hover:underline">
          {showQR ? t('hideQRCode') : t('showQRCode')}
        </button>
        {showQR && (
          <div className="mt-3 flex flex-col items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <img src={qrUrl} alt="Campaign QR code" className="w-40 h-40" />
            <a href={qrUrl} download={`${campaign.name.replace(/\s+/g, "_")}_qr.png`} className="text-xs font-medium text-[#fe8a24] hover:underline">{t('downloadQR')}</a>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Campaigns Tab ─────────────────────────────────────────────────────

export default function Campaigns({ restaurantId, collectionName = "restaurants" }) {
  // ── Language ──────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState(() => localStorage.getItem('app_lang') || 'en');
  
  const t = (key) => {
    return (i18n[lang] && i18n[lang][key]) || (i18n.en && i18n.en[key]) || key;
  };

  useEffect(() => {
    const handler = (e) => {
      const code = e?.detail;
      if (typeof code === 'string') setLang(code);
    };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);

  const [campaigns, setCampaigns] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [campSnap, offerSnap] = await Promise.all([
        getDocs(query(collection(firestore, "campaigns"), where("restaurantId", "==", restaurantId))),
        getDocs(collection(firestore, collectionName, restaurantId, "offer")),
      ]);
      setCampaigns(campSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    const todayStr = new Date().toISOString().slice(0, 10);
      const activeOffers = offerSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((o) => {
          if (o.is_active === false) return false;
          if (o.end_date && o.end_date < todayStr) return false;
          if (o.start_date && o.start_date > todayStr) return false;
          return true;
        });
      console.log("🔍 Campaigns offer fetch:", { total: offerSnap.docs.length, active: activeOffers.length, all: offerSnap.docs.map(d => d.data()) });
      setOffers(activeOffers);
    } catch (e) {
      console.error("Campaigns load error:", e);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, collectionName]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (campaignId) => {
    if (!window.confirm(t('deleteCampaign'))) return;
    try {
      await deleteDoc(doc(firestore, "campaigns", campaignId));
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (e) {
      console.error("Delete campaign error:", e);
    }
  };

  const handleCreated = (newCampaign) => {
    setCampaigns((prev) => [newCampaign, ...prev]);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fe8a24]" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{t('campaigns')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('createTrackableLinks')}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#fe8a24] text-white text-sm font-semibold rounded-lg hover:bg-[#e07a1f] transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          {t('newCampaign')}
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-10 w-10 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          <p className="text-sm font-medium text-gray-600 mb-1">{t('noCampaignsYet')}</p>
          <p className="text-xs text-gray-400">{t('createOneToGetLink')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} onDelete={handleDelete} t={t} />
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          restaurantId={restaurantId}
          collectionName={collectionName}
          offers={offers}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
          t={t}
        />
      )}
    </div>
  );
}