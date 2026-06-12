import React, { useState, useEffect } from "react";
import logo from "../../assets/dinery-logo.png"; // Your logo path
import { getAuth, signOut } from "firebase/auth";
import {
  FiHome,
  FiUsers,
  FiMapPin,
  FiSettings,
  FiLogOut,
  FiClipboard,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

// i18n dictionaries for sidebar labels
const I18N = {
  en: {
    dashboardHome: 'Dashboard Home',
    manageUsers: 'Manage Users',
    manageRestaurants: 'Manage Restaurants',
    pointsSystem: 'Points System',
    testAccountRequests: 'Test Account Requests',
    settings: 'Settings',
    minimize: 'Minimize sidebar',
    expand: 'Expand sidebar',
    logout: 'Logout',
    dineyAITagline: 'MEALS, ONLY SMARTER',
    copyright: '©',
    version: 'v1.0.0'
  },
  fi: {
    dashboardHome: 'Hallintapaneeli',
    manageUsers: 'Hallinnoi käyttäjiä',
    manageRestaurants: 'Hallinnoi ravintoloita',
    pointsSystem: 'Pistejärjestelmä',
    testAccountRequests: 'Testikäyttäjäpyynnöt',
    settings: 'Asetukset',
    minimize: 'Pienennä sivupalkki',
    expand: 'Laajenna sivupalkki',
    logout: 'Kirjaudu ulos',
    dineyAITagline: 'ATERIAT, VAIN ÄLYKKÄÄMMIN',
    copyright: '©',
    version: 'v1.0.0'
  },
  no: {
    dashboardHome: 'Dashbord',
    manageUsers: 'Administrer brukere',
    manageRestaurants: 'Administrer restauranter',
    pointsSystem: 'Poengsystem',
    testAccountRequests: 'Testkontoforespørsler',
    settings: 'Innstillinger',
    minimize: 'Minimer sidefelt',
    expand: 'Utvid sidefelt',
    logout: 'Logg ut',
    dineyAITagline: 'MÅLTIDER, BARE SMARTERE',
    copyright: '©',
    version: 'v1.0.0'
  },
  sv: {
    dashboardHome: 'Instrumentpanel',
    manageUsers: 'Hantera användare',
    manageRestaurants: 'Hantera restauranger',
    pointsSystem: 'Poängsystem',
    testAccountRequests: 'Testkontoförfrågningar',
    settings: 'Inställningar',
    minimize: 'Minimera sidofält',
    expand: 'Expandera sidofält',
    logout: 'Logga ut',
    dineyAITagline: 'MÅLTIDER, BARA SMARTARE',
    copyright: '©',
    version: 'v1.0.0'
  },
  de: {
    dashboardHome: 'Dashboard',
    manageUsers: 'Benutzer verwalten',
    manageRestaurants: 'Restaurants verwalten',
    pointsSystem: 'Punktesystem',
    testAccountRequests: 'Testkonto-Anfragen',
    settings: 'Einstellungen',
    minimize: 'Seitenleiste minimieren',
    expand: 'Seitenleiste erweitern',
    logout: 'Abmelden',
    dineyAITagline: 'MAHLZEITEN, NUR INTELLIGENTER',
    copyright: '©',
    version: 'v1.0.0'
  },
};

const navItems = [
  { key: 'dashboardHome', icon: <FiHome /> },
  { key: 'manageUsers', icon: <FiUsers /> },
  { key: 'manageRestaurants', icon: <FiMapPin /> },
  { key: 'pointsSystem', icon: <FiSettings /> },
  { key: 'testAccountRequests', icon: <FiClipboard /> },
  { key: 'settings', icon: <FiSettings /> },
];

export default function Sidebar({ activeItem, setActiveItem, isMinimized, setIsMinimized }) {
  const auth = getAuth();
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      // Redirect or UI update if needed, e.g. window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <aside
      className={`flex flex-col bg-[#23272f] text-[#f4f8f3] font-poppins h-full border-r border-[#23272f]/20 transition-all duration-300 ${
        isMinimized ? 'w-20' : 'w-64'
      }`}
    >
      {/* Minimize Toggle Button */}
      <button
        onClick={() => setIsMinimized && setIsMinimized(!isMinimized)}
        className="absolute -right-3 top-16 bg-[#fe8a24] text-[#23272f] rounded-full p-2 shadow-lg hover:bg-[#fe8a24]/90 transition-colors z-10 hidden md:block"
        aria-label={isMinimized ? t('expand') : t('minimize')}
      >
        {isMinimized ? (
          <FiChevronRight className="h-4 w-4" />
        ) : (
          <FiChevronLeft className="h-4 w-4" />
        )}
      </button>

      {/* Logo */}
      <div className={`mb-8 flex flex-col items-center transition-all duration-300 ${
        isMinimized ? 'pt-6 px-2' : 'pt-6 px-4'
      }`}>
        <div className={`rounded-full bg-[#f4f8f3] shadow-lg transition-all duration-300 ${
          isMinimized ? 'p-1.5 mb-2' : 'p-2 mb-3'
        }`}>
          <img
            src={logo}
            alt="Dinery.ai Logo"
            className={`object-contain transition-all duration-300 ${
              isMinimized ? 'w-12 h-12' : 'w-28 h-28'
            }`}
          />
        </div>
        {!isMinimized && (
          <>
            <h2 className="text-xl font-bold text-[#f4f8f3]">DINERY.AI</h2>
            <p className="text-[#fe8a24] text-sm font-medium">{t('dineyAITagline')}</p>
          </>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const label = t(item.key);
          const isActive = activeItem === label;
          return (
            <button
              key={item.key}
              onClick={() => setActiveItem && setActiveItem(label)}
              className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 text-sm ${
                isMinimized ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-[#fe8a24] text-[#23272f] font-semibold shadow-md'
                  : 'hover:bg-[#23272f]/80 text-[#f4f8f3]/90 hover:text-white'
              }`}
              title={isMinimized ? label : ''}
            >
              <span className={`text-xl ${
                isMinimized ? '' : 'mr-3'
              } ${
                isActive ? 'text-[#23272f]' : 'text-[#fe8a24]'
              }`}>
                {item.icon}
              </span>
              {!isMinimized && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      {/* Logout Button */}
      <div className="px-3 mt-auto mb-4">
        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-sm text-[#f4f8f3]/70 hover:text-white hover:bg-[#23272f]/80 ${
            isMinimized ? 'justify-center' : ''
          }`}
          title={isMinimized ? t('logout') : ''}
        >
          <FiLogOut className={`text-xl ${isMinimized ? '' : 'mr-3'} text-[#fe8a24]`} />
          {!isMinimized && <span>{t('logout')}</span>}
        </button>
      </div>

      {/* Footer */}
      {!isMinimized && (
        <div className="p-4 border-t border-[#23272f]/20">
          <div className="flex items-center justify-between text-xs text-[#f4f8f3]/60">
            <span>{t('copyright')} 2025 Dinery.AI</span>
            <span>{t('version')}</span>
          </div>
        </div>
      )}
      
      {/* Minimized Footer - Just copyright symbol */}
      {isMinimized && (
        <div className="p-4 border-t border-[#23272f]/20 flex justify-center">
          <span className="text-xs text-[#f4f8f3]/60">{t('copyright')}</span>
        </div>
      )}
    </aside>
  );
}