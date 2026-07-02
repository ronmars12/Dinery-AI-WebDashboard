import React, { useState, useEffect } from "react";
import logo from "../assets/dinery-logo.png";
import { CIcon } from "@coreui/icons-react";
import { cilRestaurant } from "@coreui/icons";
import { FiChevronLeft, FiChevronRight, FiMenu, FiLogOut } from "react-icons/fi";
import { getAuth, signOut } from "firebase/auth";

const I18N = {
  en: {
    Dashboard: "Dashboard",
    Analytics: "Analytics",
    Restaurant: "Restaurant",
    Offers: "Offers",
    CRM: "CRM",
    "Booking Page": "Booking Page",
    "Reservation Software": "Reservation Software",
    "Table Management": "Table Management",
    "Reservation Link": "Reservation Link",
    Timesheet: "Timesheet",
    "Account Settings": "Account Settings",
    minimize: "Minimize sidebar",
    expand: "Expand sidebar",
    hide: "Hide sidebar",
    logout: "Logout",
    dineyAITagline: "MEALS, ONLY SMARTER",
    copyright: "©",
    version: "v1.0.0",
  },
  fi: {
    Dashboard: "Kojelauta",
    Analytics: "Analytiikka",
    Restaurant: "Ravintola",
    Offers: "Tarjoukset",
    CRM: "CRM",
    "Booking Page": "Varaussivu",
    "Reservation Software": "Varausohjelmisto",
    "Table Management": "Pöytähallinta",
    "Reservation Link": "Varauslinkki",
    Timesheet: "Työaikataulu",
    "Account Settings": "Tiliasetukset",
    minimize: "Pienennä sivupalkki",
    expand: "Laajenna sivupalkki",
    hide: "Piilota sivupalkki",
    logout: "Kirjaudu ulos",
    dineyAITagline: "ATERIAT, VAIN ÄLYKKÄÄMMIN",
    copyright: "©",
    version: "v1.0.0",
  },
  no: {
    Dashboard: "Dashbord",
    Analytics: "Analyse",
    Restaurant: "Restaurant",
    Offers: "Tilbud",
    CRM: "CRM",
    "Booking Page": "Bestillingsside",
    "Reservation Software": "Reserveringsprogramvare",
    "Table Management": "Bordadministrasjon",
    "Reservation Link": "Reservasjonslenke",
    Timesheet: "Timeliste",
    "Account Settings": "Kontoinnstillinger",
    minimize: "Minimer sidefelt",
    expand: "Utvid sidefelt",
    hide: "Skjul sidefelt",
    logout: "Logg ut",
    dineyAITagline: "MÅLTIDER, BARE SMARTERE",
    copyright: "©",
    version: "v1.0.0",
  },
  sv: {
    Dashboard: "Instrumentpanel",
    Analytics: "Analys",
    Restaurant: "Restaurang",
    Offers: "Erbjudanden",
    CRM: "CRM",
    "Booking Page": "Bokningssida",
    "Reservation Software": "Bokningsprogramvara",
    "Table Management": "Bordshantering",
    "Reservation Link": "Bokningslänk",
    Timesheet: "Tidrapport",
    "Account Settings": "Kontoinställningar",
    minimize: "Minimera sidofält",
    expand: "Expandera sidofält",
    hide: "Dölj sidofält",
    logout: "Logga ut",
    dineyAITagline: "MÅLTIDER, BARA SMARTARE",
    copyright: "©",
    version: "v1.0.0",
  },
  de: {
    Dashboard: "Armaturenbrett",
    Analytics: "Analytik",
    Restaurant: "Restaurant",
    Offers: "Angebote",
    CRM: "CRM",
    "Booking Page": "Buchungsseite",
    "Reservation Software": "Buchungssoftware",
    "Table Management": "Tischverwaltung",
    "Reservation Link": "Reservierungslink",
    Timesheet: "Stundenzettel",
    "Account Settings": "Kontoeinstellungen",
    minimize: "Seitenleiste minimieren",
    expand: "Seitenleiste erweitern",
    hide: "Seitenleiste ausblenden",
    logout: "Abmelden",
    dineyAITagline: "MAHLZEITEN, NUR INTELLIGENTER",
    copyright: "©",
    version: "v1.0.0",
  },
};

const navItems = [
  { label: "Dashboard", displayLabel: "Analytics", icon: <DashboardIcon />,          staffAllowed: true,  managerAllowed: true  },
  { label: "Restaurant",                            icon: <RestaurantIcon />,          staffAllowed: false, managerAllowed: true  },
  { label: "Offers",                                icon: <OffersIcon />,              staffAllowed: false, managerAllowed: true  },
  { label: "CRM",                                   icon: <CRMIcon />,                 staffAllowed: false, managerAllowed: true  },
  { label: "Reservation Software",                  icon: <ReservationSoftwareIcon />, staffAllowed: true,  managerAllowed: true  },
  { label: "Table Management",                      icon: <TableManagementIcon />,     staffAllowed: false, managerAllowed: true  },
  { label: "Reservation Link",                      icon: <ReservationLinkIcon />,     staffAllowed: false, managerAllowed: true  },
  { label: "Timesheet",                             icon: <TimesheetIcon />,           staffAllowed: false, managerAllowed: true  },
  { label: "Account Settings",                      icon: <SettingsIcon />,            staffAllowed: true,  managerAllowed: true  },
];

export default function Sidebar({
  activeItem,
  setActiveItem,
  isMinimized,
  setIsMinimized,
  isHidden,
  setIsHidden,
}) {
  const auth = getAuth();
  const [lang, setLang] = useState(localStorage.getItem("app_lang") || "en");
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  const [isStaff]   = useState(() => !!sessionStorage.getItem("staffRestaurantId"));
  const [staffRole] = useState(() => sessionStorage.getItem("staffRole") || "");

  useEffect(() => {
    const handler = (e) => {
      if (typeof e?.detail === "string") setLang(e.detail);
    };

    window.addEventListener("app:setLanguage", handler);

    const onStorage = (e) => {
      if (e.key === "app_lang") setLang(e.newValue || "en");
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:setLanguage", handler);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleHide = () => {
    setIsHidden(!isHidden);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (isHidden) {
    return (
      <div className="relative h-full">
        <div className="h-full w-12 bg-[#23272f] border-r border-[#23272f]/20 flex flex-col items-center py-4">
          <button
            onClick={toggleHide}
            className="bg-[#fe8a24] text-[#23272f] rounded-full p-2 shadow-lg hover:bg-[#fe8a24]/90 transition-colors"
            aria-label={t("expand")}
            title={t("expand")}
          >
            <FiChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-8">
            <div className="w-8 h-8 rounded-full bg-[#f4f8f3] p-1 shadow-lg">
              <img
                src={logo}
                alt="Dinery.ai Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      className={`flex flex-col bg-[#23272f] text-[#f4f8f3] font-poppins h-full border-r border-[#23272f]/20 transition-all duration-300 relative ${
        isMinimized ? "w-20" : "w-64"
      }`}
    >
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggleMinimize}
          className="bg-[#fe8a24] text-[#23272f] rounded-full p-1.5 shadow-lg hover:bg-[#fe8a24]/90 transition-colors hidden md:block"
          aria-label={isMinimized ? t("expand") : t("minimize")}
          title={isMinimized ? t("expand") : t("minimize")}
        >
          {isMinimized ? (
            <FiChevronRight className="h-4 w-4" />
          ) : (
            <FiChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <div
        className={`mb-8 flex flex-col items-center transition-all duration-300 ${
          isMinimized ? "pt-12 px-2" : "pt-12 px-4"
        }`}
      >
        <div
          className={`rounded-full bg-[#f4f8f3] shadow-lg transition-all duration-300 ${
            isMinimized ? "p-1.5 mb-2" : "p-2 mb-3"
          }`}
        >
          <img
            src={logo}
            alt="Dinery.ai Logo"
            className={`object-contain transition-all duration-300 ${
              isMinimized ? "w-12 h-12" : "w-28 h-28"
            }`}
          />
        </div>

        {!isMinimized && (
          <>
            <h2 className="text-xl font-bold text-[#f4f8f3]">DINERY.AI</h2>
            <p className="text-[#fe8a24] text-sm font-medium">
              {t("dineyAITagline")}
            </p>
          </>
        )}
      </div>

      <nav className="flex flex-col flex-1 px-3 space-y-1">
        {navItems
          .filter((item) => {
            if (!isStaff) return true;
            if (staffRole === "manager" || staffRole === "admin") return item.managerAllowed;
            return item.staffAllowed;
          })
          .map((item) => {
            const isActive = activeItem === item.label;
            const visibleLabel = item.displayLabel || item.label;

            return (
              <button
                key={item.label}
                onClick={() => setActiveItem && setActiveItem(item.label)}
                className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 text-sm ${
                  isMinimized ? "justify-center" : ""
                } ${
                  isActive
                    ? "bg-[#fe8a24] text-[#23272f] font-semibold shadow-md"
                    : "hover:bg-[#23272f]/80 text-[#f4f8f3]/90 hover:text-white"
                }`}
                title={isMinimized ? t(visibleLabel) : ""}
              >
                <span
                  className={`text-xl ${isMinimized ? "" : "mr-3"} ${
                    isActive ? "text-[#23272f]" : "text-[#fe8a24]"
                  }`}
                >
                  {item.icon}
                </span>

                {!isMinimized && <span>{t(visibleLabel)}</span>}
              </button>
            );
          })}
      </nav>

      <div className="px-3 mt-auto mb-4 space-y-2">
        <button
          onClick={toggleHide}
          className={`flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-sm text-[#f4f8f3]/70 hover:text-white hover:bg-[#23272f]/80 ${
            isMinimized ? "justify-center" : ""
          }`}
          title={isMinimized ? t("hide") : ""}
        >
          <FiMenu
            className={`text-xl ${isMinimized ? "" : "mr-3"} text-[#fe8a24]`}
          />
          {!isMinimized && <span>{t("hide")}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`flex items-center w-full px-3 py-3 rounded-lg transition-all duration-200 text-sm text-[#f4f8f3]/70 hover:text-white hover:bg-[#23272f]/80 ${
            isMinimized ? "justify-center" : ""
          }`}
          title={isMinimized ? t("logout") : ""}
        >
          <FiLogOut
            className={`text-xl ${isMinimized ? "" : "mr-3"} text-[#fe8a24]`}
          />
          {!isMinimized && <span>{t("logout")}</span>}
        </button>
      </div>

      {!isMinimized && (
        <div className="p-4 border-t border-[#23272f]/20">
          <div className="flex items-center justify-between text-xs text-[#f4f8f3]/60">
            <span>{t("copyright")} 2025 Dinery.AI</span>
            <span>{t("version")}</span>
          </div>
        </div>
      )}

      {isMinimized && (
        <div className="p-4 border-t border-[#23272f]/20 flex justify-center">
          <span className="text-xs text-[#f4f8f3]/60">{t("copyright")}</span>
        </div>
      )}
    </aside>
  );
}

// ─── Icon Components ──────────────────────────────────────────────────────────

function DashboardIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function RestaurantIcon({ className = "h-5 w-5" }) {
  return <CIcon icon={cilRestaurant} className={className} />;
}

function OffersIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z"
      />
    </svg>
  );
}

function CRMIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function ReservationSoftwareIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function TableManagementIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7v10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 7v10" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 17h4" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 17h4" />
    </svg>
  );
}

function ReservationLinkIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function TimesheetIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 3h6v4H9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6M9 16h4"
      />
    </svg>
  );
}

function SettingsIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}