import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

import DashboardHome from "./components/DashboardHome";
import ManageUsers from "./components/ManageUsers";
import Settings from "./components/Settings";
import ManageRestaurantPage from "./components/ManageRestaurantPage"; 
import PointsSystemScreen from "./PointsSystemScreen";
import TestAccountRequestsPage from "./components/TestAccountRequestsPage";
import { getAuth, signOut } from "firebase/auth";

// ---- i18n dictionaries (static)
const I18N = {
  en: { 
    dashboardHome: 'Dashboard Home', 
    manageUsers: 'Manage Users', 
    manageRestaurants: 'Manage Restaurants', 
    pointsSystem: 'Points System', 
    testAccountRequests: 'Test Account Requests',
    settings: 'Settings' 
  },
  fi: { 
    dashboardHome: 'Hallintapaneeli', 
    manageUsers: 'Hallinnoi käyttäjiä', 
    manageRestaurants: 'Hallinnoi ravintoloita', 
    pointsSystem: 'Pistejärjestelmä', 
    testAccountRequests: 'Testikäyttäjäpyynnöt',
    settings: 'Asetukset' 
  },
  no: { 
    dashboardHome: 'Dashbord', 
    manageUsers: 'Administrer brukere', 
    manageRestaurants: 'Administrer restauranter', 
    pointsSystem: 'Poengsystem', 
    testAccountRequests: 'Testkontoforespørsler',
    settings: 'Innstillinger' 
  },
  sv: { 
    dashboardHome: 'Instrumentpanel', 
    manageUsers: 'Hantera användare', 
    manageRestaurants: 'Hantera restauranger', 
    pointsSystem: 'Poängsystem', 
    testAccountRequests: 'Testkontoförfrågningar',
    settings: 'Inställningar' 
  },
  de: { 
    dashboardHome: 'Dashboard', 
    manageUsers: 'Benutzer verwalten', 
    manageRestaurants: 'Restaurants verwalten', 
    pointsSystem: 'Punktesystem', 
    testAccountRequests: 'Testkonto-Anfragen',
    settings: 'Einstellungen' 
  },
};

export default function SuperAdminDashboard() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ---- Language hooks
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;

  // Active menu item stores the TRANSLATED label so Sidebar can set it directly
  const [activeItem, setActiveItem] = useState(t('dashboardHome'));

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

  // When language changes, if the current active item is one of the known tabs in the OLD language,
  // remap it to the new language label to keep the visible selection consistent.
  useEffect(() => {
    const mapToKey = (label) => {
      // Try to map the current label to a canonical key by checking all languages
      for (const [code, dict] of Object.entries(I18N)) {
        for (const [key, value] of Object.entries(dict)) {
          if (value === label) return key;
        }
      }
      return null;
    };
    const key = mapToKey(activeItem);
    if (key) setActiveItem(t(key));
  }, [lang]);

  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const renderContent = () => {
    switch (activeItem) {
      case t('dashboardHome'):
        return <DashboardHome />;
      case t('manageUsers'):
        return <ManageUsers />;
      case t('settings'):
        return <Settings />;
      case t('manageRestaurants'):
        return <ManageRestaurantPage />;
      case t('pointsSystem'):
        return <PointsSystemScreen/>;
      case t('testAccountRequests'):
        return <TestAccountRequestsPage />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 w-full max-w-full overflow-hidden">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
        handleLogout={handleLogout} 
      />

      <main className="flex flex-col flex-grow overflow-auto">
        <Header 
          activeItem={activeItem} 
          handleLogout={handleLogout} 
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
        />
        <div className="flex-grow p-6">{renderContent()}</div>
      </main>
    </div>
  );
}