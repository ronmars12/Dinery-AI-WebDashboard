import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../../../firebase";
import { FiUser, FiShield, FiUsers, FiSettings, FiShoppingCart, FiTrendingUp } from "react-icons/fi";

export default function ManageRestaurantPage() {
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem("app_lang") || "en");

  const I18N = {
    en: {
      analytics: "Analytics",
      superAdminDashboard: "Super Admin Dashboard",
      totalUsers: "Total Users",
      restaurantOwners: "Restaurant Owners",
      regularUsers: "Regular Users",
      activeUsers: "Active Users",
      totalRestaurants: "Total Restaurants",
      fromLastMonth: "from last month",
    },
    fi: {
      analytics: "Analytiikka",
      superAdminDashboard: "Pääylläpitäjän koontinäyttö",
      totalUsers: "Käyttäjiä yhteensä",
      restaurantOwners: "Ravintoloiden omistajat",
      regularUsers: "Peruskäyttäjät",
      activeUsers: "Aktiiviset käyttäjät",
      totalRestaurants: "Ravintoloita yhteensä",
      fromLastMonth: "viime kuusta",
    },
    no: {
      analytics: "Analyse",
      superAdminDashboard: "Superadmin-dashbord",
      totalUsers: "Brukere totalt",
      restaurantOwners: "Restauranteiere",
      regularUsers: "Vanlige brukere",
      activeUsers: "Aktive brukere",
      totalRestaurants: "Restauranter totalt",
      fromLastMonth: "fra forrige måned",
    },
    sv: {
      analytics: "Analys",
      superAdminDashboard: "Superadmin-instrumentpanel",
      totalUsers: "Användare totalt",
      restaurantOwners: "Restaurangägare",
      regularUsers: "Vanliga användare",
      activeUsers: "Aktiva användare",
      totalRestaurants: "Restauranger totalt",
      fromLastMonth: "från förra månaden",
    },
    de: {
      analytics: "Analyse",
      superAdminDashboard: "Super-Admin-Dashboard",
      totalUsers: "Benutzer gesamt",
      restaurantOwners: "Restaurantbesitzer",
      regularUsers: "Reguläre Benutzer",
      activeUsers: "Aktive Benutzer",
      totalRestaurants: "Restaurants gesamt",
      fromLastMonth: "gegenüber letztem Monat",
    },
  };

  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;

  useEffect(() => {
    const onLangEvent = (e) => {
      if (typeof e?.detail === "string") setLang(e.detail);
    };
    window.addEventListener("app:setLanguage", onLangEvent);
    return () => window.removeEventListener("app:setLanguage", onLangEvent);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("app_lang");
    if (saved) setLang(saved);
    const onStorage = (e) => {
      if (e.key === "app_lang") setLang(e.newValue || "en");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---- Data fetch
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [userSnapshot, restaurantSnapshot] = await Promise.all([
          getDocs(collection(firestore, "users")),
          getDocs(collection(firestore, "restaurants")),
        ]);

        setUsers(userSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setRestaurants(
          restaurantSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // Analytics stats with growth indicators
  const stats = [
    {
      title: t("totalUsers"),
      value: users.length,
      icon: <FiUsers className="text-3xl" />,
      color: "bg-gradient-to-br from-blue-500 to-blue-600",
      trend: "12%",
    },
    {
      title: t("restaurantOwners"),
      value: users.filter((u) => u.role?.toLowerCase() === "owner").length,
      icon: <FiShield className="text-3xl" />,
      color: "bg-gradient-to-br from-orange-500 to-orange-600",
      trend: "8%",
    },
    {
      title: t("regularUsers"),
      value: users.filter((u) => !u.role || u.role.toLowerCase() === "user").length,
      icon: <FiUser className="text-3xl" />,
      color: "bg-gradient-to-br from-gray-500 to-gray-600",
      trend: "15%",
    },
    {
      title: t("activeUsers"),
      value: users.filter((u) => u.isActive !== false).length,
      icon: <FiSettings className="text-3xl" />,
      color: "bg-gradient-to-br from-green-500 to-green-600",
      trend: "5%",
    },
    {
      title: t("totalRestaurants"),
      value: restaurants.length,
      icon: <FiShoppingCart className="text-3xl" />,
      color: "bg-gradient-to-br from-red-500 to-red-600",
      trend: "20%",
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("analytics")}</h1>
      <p className="text-gray-600 mb-8">{t("superAdminDashboard")}</p>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden"
          >
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={`${stat.color} text-white p-3 rounded-lg`}>{stat.icon}</div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                <span className="flex items-center text-green-500">
                  <FiTrendingUp className="mr-1" />
                  {stat.trend} {t("fromLastMonth")}
                </span>
              </div>
            </div>
            <div className={`h-1 ${stat.color}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}