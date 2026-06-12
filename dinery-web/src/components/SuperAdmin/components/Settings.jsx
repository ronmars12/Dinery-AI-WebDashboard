import React, { useEffect, useMemo, useState } from "react";
import { User, Edit3, Save, X, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import {
  getAuth,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";


const BRAND = "#f0862d";

// ---- i18n dictionaries (EN / FI / NO / SV / DE)
const I18N = {
  en: {
    settings: 'Settings',
    noProfile: 'No profile document found for this user.',
    errorTitle: 'Settings',
    accountSettings: 'Account Settings',
    accountSubtitle: 'Manage your profile and security preferences',
    editProfile: 'Edit Profile',
    saveChanges: 'Save Changes',
    cancel: 'Cancel',
    profileInformation: 'Profile Information',
    emailAddress: 'Email Address',
    displayName: 'Display Name',
    firstName: 'First Name',
    middleName: 'Middle Name',
    lastName: 'Last Name',
    contactNumber: 'Contact Number',
    securitySettings: 'Security Settings',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmNewPassword: 'Confirm New Password',
    updating: 'Updating...',
    updatePassword: 'Update Password',
    accountDetails: 'Account Details',
    role: 'Role',
    accountStatus: 'Account Status',
    active: 'Active',
    inactive: 'Inactive',
    lastUpdated: 'Last Updated',
    profileUpdated: 'Profile updated successfully!',
    reqCurrentNew: 'Please enter your current and new password.',
    pwdMinLen: 'New password must be at least 6 characters.',
    pwdMismatch: 'New password and confirmation do not match.',
    pwdUpdated: 'Password updated successfully!',
    noAuthUser: 'No authenticated user.'
  },
  fi: {
    settings: 'Asetukset',
    noProfile: 'Tälle käyttäjälle ei löytynyt profiiliasiakirjaa.',
    errorTitle: 'Asetukset',
    accountSettings: 'Tiliasetukset',
    accountSubtitle: 'Hallitse profiiliasi ja tietoturva-asetuksia',
    editProfile: 'Muokkaa profiilia',
    saveChanges: 'Tallenna muutokset',
    cancel: 'Peruuta',
    profileInformation: 'Profiilitiedot',
    emailAddress: 'Sähköpostiosoite',
    displayName: 'Näyttönimi',
    firstName: 'Etunimi',
    middleName: 'Toinen nimi',
    lastName: 'Sukunimi',
    contactNumber: 'Puhelinnumero',
    securitySettings: 'Tietoturva-asetukset',
    currentPassword: 'Nykyinen salasana',
    newPassword: 'Uusi salasana',
    confirmNewPassword: 'Vahvista uusi salasana',
    updating: 'Päivitetään...',
    updatePassword: 'Vaihda salasana',
    accountDetails: 'Tilin tiedot',
    role: 'Rooli',
    accountStatus: 'Tilin tila',
    active: 'Aktiivinen',
    inactive: 'Ei aktiivinen',
    lastUpdated: 'Viimeksi päivitetty',
    profileUpdated: 'Profiili päivitetty!',
    reqCurrentNew: 'Anna nykyinen ja uusi salasana.',
    pwdMinLen: 'Uuden salasanan vähimmäispituus on 6 merkkiä.',
    pwdMismatch: 'Uusi salasana ja vahvistus eivät täsmää.',
    pwdUpdated: 'Salasana päivitetty!',
    noAuthUser: 'Ei tunnistautunutta käyttäjää.'
  },
  no: {
    settings: 'Innstillinger',
    noProfile: 'Ingen profildokument funnet for denne brukeren.',
    errorTitle: 'Innstillinger',
    accountSettings: 'Kontoinnstillinger',
    accountSubtitle: 'Administrer profil og sikkerhetsinnstillinger',
    editProfile: 'Rediger profil',
    saveChanges: 'Lagre endringer',
    cancel: 'Avbryt',
    profileInformation: 'Profilinformasjon',
    emailAddress: 'E‑postadresse',
    displayName: 'Visningsnavn',
    firstName: 'Fornavn',
    middleName: 'Mellomnavn',
    lastName: 'Etternavn',
    contactNumber: 'Telefonnummer',
    securitySettings: 'Sikkerhetsinnstillinger',
    currentPassword: 'Nåværende passord',
    newPassword: 'Nytt passord',
    confirmNewPassword: 'Bekreft nytt passord',
    updating: 'Oppdaterer...',
    updatePassword: 'Oppdater passord',
    accountDetails: 'Kontodetaljer',
    role: 'Rolle',
    accountStatus: 'Kontostatus',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    lastUpdated: 'Sist oppdatert',
    profileUpdated: 'Profilen ble oppdatert!',
    reqCurrentNew: 'Skriv inn nåværende og nytt passord.',
    pwdMinLen: 'Nytt passord må ha minst 6 tegn.',
    pwdMismatch: 'Nytt passord og bekreftelse stemmer ikke.',
    pwdUpdated: 'Passord oppdatert!',
    noAuthUser: 'Ingen autentisert bruker.'
  },
  sv: {
    settings: 'Inställningar',
    noProfile: 'Inget profildokument hittades för den här användaren.',
    errorTitle: 'Inställningar',
    accountSettings: 'Kontoinställningar',
    accountSubtitle: 'Hantera din profil och säkerhet',
    editProfile: 'Redigera profil',
    saveChanges: 'Spara ändringar',
    cancel: 'Avbryt',
    profileInformation: 'Profilinformation',
    emailAddress: 'E‑postadress',
    displayName: 'Visningsnamn',
    firstName: 'Förnamn',
    middleName: 'Mellannamn',
    lastName: 'Efternamn',
    contactNumber: 'Telefonnummer',
    securitySettings: 'Säkerhetsinställningar',
    currentPassword: 'Nuvarande lösenord',
    newPassword: 'Nytt lösenord',
    confirmNewPassword: 'Bekräfta nytt lösenord',
    updating: 'Uppdaterar...',
    updatePassword: 'Uppdatera lösenord',
    accountDetails: 'Kontouppgifter',
    role: 'Roll',
    accountStatus: 'Kontostatus',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    lastUpdated: 'Senast uppdaterad',
    profileUpdated: 'Profil uppdaterad!',
    reqCurrentNew: 'Ange nuvarande och nytt lösenord.',
    pwdMinLen: 'Nytt lösenord måste vara minst 6 tecken.',
    pwdMismatch: 'Nytt lösenord och bekräftelse matchar inte.',
    pwdUpdated: 'Lösenord uppdaterat!',
    noAuthUser: 'Ingen autentiserad användare.'
  },
  de: {
    settings: 'Einstellungen',
    noProfile: 'Kein Profildokument für diesen Benutzer gefunden.',
    errorTitle: 'Einstellungen',
    accountSettings: 'Kontoeinstellungen',
    accountSubtitle: 'Verwalten Sie Profil und Sicherheitseinstellungen',
    editProfile: 'Profil bearbeiten',
    saveChanges: 'Änderungen speichern',
    cancel: 'Abbrechen',
    profileInformation: 'Profilinformationen',
    emailAddress: 'E‑Mail-Adresse',
    displayName: 'Anzeigename',
    firstName: 'Vorname',
    middleName: 'Zweiter Vorname',
    lastName: 'Nachname',
    contactNumber: 'Telefonnummer',
    securitySettings: 'Sicherheitseinstellungen',
    currentPassword: 'Aktuelles Passwort',
    newPassword: 'Neues Passwort',
    confirmNewPassword: 'Neues Passwort bestätigen',
    updating: 'Wird aktualisiert...',
    updatePassword: 'Passwort aktualisieren',
    accountDetails: 'Kontodetails',
    role: 'Rolle',
    accountStatus: 'Kontostatus',
    active: 'Aktiv',
    inactive: 'Inaktiv',
    lastUpdated: 'Zuletzt aktualisiert',
    profileUpdated: 'Profil erfolgreich aktualisiert!',
    reqCurrentNew: 'Bitte aktuelles und neues Passwort eingeben.',
    pwdMinLen: 'Neues Passwort muss mindestens 6 Zeichen haben.',
    pwdMismatch: 'Neues Passwort und Bestätigung stimmen nicht überein.',
    pwdUpdated: 'Passwort erfolgreich aktualisiert!',
    noAuthUser: 'Kein authentifizierter Benutzer.'
  },
};

export default function Settings() {
  const auth = useMemo(() => getAuth(), []);
  const db = useMemo(() => getFirestore(), []);
  const user = auth.currentUser;

  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  useEffect(() => {
    const handler = (e) => { if (typeof e?.detail === 'string') setLang(e.detail); };
    window.addEventListener('app:setLanguage', handler);
    return () => window.removeEventListener('app:setLanguage', handler);
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved) setLang(saved);
    const onStorage = (e) => { if (e.key === 'app_lang') setLang(e.newValue || 'en'); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Change password state
  const [curPwd, setCurPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdMsg, setPwdMsg] = useState("");
  const [pwdMsgType, setPwdMsgType] = useState("");

  useEffect(() => {
    if (!user) {
      setError(t('noAuthUser'));
      setLoading(false);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setProfile(
        snap.exists()
          ? {
              id: snap.id,
              ...snap.data(),
            }
          : null
      );
      setLoading(false);
    }, (e) => {
      setError(e.message || String(e));
      setLoading(false);
    });
    return unsub;
  }, [db, user]);

  const [form, setForm] = useState({});
  useEffect(() => {
    if (profile) {
      setForm({
        displayName: profile.displayName || "",
        first_name: profile.first_name || "",
        middle_name: profile.middle_name || "",
        last_name: profile.last_name || "",
        contact: profile.contact || "",
      });
    }
  }, [profile]);

  const saveProfile = async () => {
    if (!user || !profile) return;
    setError("");
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        ...form,
        updated_at: serverTimestamp(),
      });
      setEditMode(false);
      setPwdMsg(t('profileUpdated'));
      setPwdMsgType("success");
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (e) {
      setError(e.message || String(e));
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg("");
    setError("");
    if (!user) {
      setError(t('noAuthUser'));
      return;
    }
    if (!curPwd || !newPwd) {
      setPwdMsg(t('reqCurrentNew'));
      setPwdMsgType("error");
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg(t('pwdMinLen'));
      setPwdMsgType("error");
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdMsg(t('pwdMismatch'));
      setPwdMsgType("error");
      return;
    }
    try {
      setPwdBusy(true);
      const cred = EmailAuthProvider.credential(user.email || "", curPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      setPwdMsg(t('pwdUpdated'));
      setPwdMsgType("success");
      setCurPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setPwdMsg(""), 3000);
    } catch (e) {
      setPwdMsg(e.message || String(e));
      setPwdMsgType("error");
    } finally {
      setPwdBusy(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-32 mb-6"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold mb-4" style={{ color: BRAND }}>{t('settings')}</h1>
            <p>{t('noProfile')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-3xl font-bold mb-4" style={{ color: BRAND }}>{t('errorTitle')}</h1>
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full" style={{ backgroundColor: `${BRAND}15` }}>
                <User className="w-8 h-8" style={{ color: BRAND }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: BRAND }}>{t('accountSettings')}</h1>
                <p className="text-gray-600 mt-1">{t('accountSubtitle')}</p>
              </div>
            </div>
            {!editMode ? (
              <button
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
                style={{ backgroundColor: BRAND }}
                onClick={() => setEditMode(true)}
              >
                <Edit3 className="w-4 h-4" />
                {t('editProfile')}
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
                  style={{ backgroundColor: BRAND }}
                  onClick={saveProfile}
                >
                  <Save className="w-4 h-4" />
                  {t('saveChanges')}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 border-2 font-medium transition-all duration-200 hover:bg-gray-50"
                  style={{ borderColor: BRAND, color: BRAND }}
                  onClick={() => {
                    setEditMode(false);
                    setForm({
                      displayName: profile.displayName || "",
                      first_name: profile.first_name || "",
                      middle_name: profile.middle_name || "",
                      last_name: profile.last_name || "",
                      contact: profile.contact || "",
                    });
                  }}
                >
                  <X className="w-4 h-4" />
                  {t('cancel')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-2 h-6 rounded-full" style={{ backgroundColor: BRAND }}></div>
                {t('profileInformation')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ReadOrEdit
                  label={t('emailAddress')}
                  value={profile.email || user?.email || ""}
                  readOnly
                  icon="📧"
                />
                <ReadOrEdit
                  label={t('displayName')}
                  value={form.displayName}
                  onChange={(v) => setForm((s) => ({ ...s, displayName: v }))}
                  editing={editMode}
                  icon="👤"
                />
                <ReadOrEdit
                  label={t('firstName')}
                  value={form.first_name}
                  onChange={(v) => setForm((s) => ({ ...s, first_name: v }))}
                  editing={editMode}
                  icon="✨"
                />
                <ReadOrEdit
                  label={t('middleName')}
                  value={form.middle_name}
                  onChange={(v) => setForm((s) => ({ ...s, middle_name: v }))}
                  editing={editMode}
                  icon="✨"
                />
                <ReadOrEdit
                  label={t('lastName')}
                  value={form.last_name}
                  onChange={(v) => setForm((s) => ({ ...s, last_name: v }))}
                  editing={editMode}
                  icon="✨"
                />
                <ReadOrEdit
                  label={t('contactNumber')}
                  value={form.contact}
                  onChange={(v) => setForm((s) => ({ ...s, contact: v }))}
                  editing={editMode}
                  icon="📞"
                />
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-3">
                <div className="w-2 h-6 rounded-full" style={{ backgroundColor: BRAND }}></div>
                {t('securitySettings')}
              </h2>
              
              <div className="space-y-4">
                <PasswordInput
                  label={t('currentPassword')}
                  value={curPwd}
                  onChange={(e) => setCurPwd(e.target.value)}
                  show={showPasswords.current}
                  onToggleVisibility={() => togglePasswordVisibility('current')}
                />
                <PasswordInput
                  label={t('newPassword')}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  show={showPasswords.new}
                  onToggleVisibility={() => togglePasswordVisibility('new')}
                />
                <PasswordInput
                  label={t('confirmNewPassword')}
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  show={showPasswords.confirm}
                  onToggleVisibility={() => togglePasswordVisibility('confirm')}
                />
                
                {pwdMsg && (
                  <div className={`flex items-center gap-3 p-4 rounded-xl ${
                    pwdMsgType === 'success' 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}>
                    {pwdMsgType === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    <p className={pwdMsgType === 'success' ? 'text-green-700' : 'text-red-700'}>
                      {pwdMsg}
                    </p>
                  </div>
                )}
                
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-white font-medium transition-all duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  style={{ backgroundColor: BRAND }}
                  onClick={handleChangePassword}
                  disabled={pwdBusy}
                >
                  <Lock className="w-4 h-4" />
                  {pwdBusy ? t('updating') : t('updatePassword')}
                </button>
              </div>
            </div>
          </div>

          {/* Account Details Sidebar */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-lg font-semibold mb-4">{t('accountDetails')}</h3>
              <div className="space-y-4">
                <InfoItem label={t('role')} value={profile.role || "—"} />
                <InfoItem 
                  label={t('accountStatus')} 
                  value={profile.user_setup ? t('active') : t('inactive')}
                  valueColor={profile.user_setup ? "text-green-600" : "text-orange-600"}
                />
                <InfoItem 
                  label={t('lastUpdated')} 
                  value={profile.updated_at?.toDate?.().toLocaleDateString?.() || "—"} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReadOrEdit({ label, value, onChange, editing = false, readOnly = false, icon }) {
  if (readOnly) return <ReadOnly label={label} value={value} icon={icon} />;
  
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      {editing ? (
        <input
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 focus:outline-none"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        />
      ) : (
        <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
          {value || "—"}
        </div>
      )}
    </div>
  );
}

function ReadOnly({ label, value, icon }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        {icon && <span>{icon}</span>}
        {label}
      </label>
      <div className="px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900">
        {value || "—"}
      </div>
    </div>
  );
}

function PasswordInput({ label, value, onChange, show, onToggleVisibility }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
        <Lock className="w-4 h-4" />
        {label}
      </label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 pr-12 transition-all duration-200 focus:border-orange-300 focus:ring-4 focus:ring-orange-100 focus:outline-none"
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors duration-200"
          onClick={onToggleVisibility}
        >
          {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}

function InfoItem({ label, value, valueColor = "text-gray-900" }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${valueColor}`}>{value}</span>
    </div>
  );
}