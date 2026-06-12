import React, { useState, useEffect } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { firestore } from "../../../firebase";
import {
  FiEdit2,
  FiTrash2,
  FiUser,
  FiMail,
  FiPhone,
  FiShield,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiSearch,
  FiFilter,
  FiMoreVertical,
  FiUserPlus,
  FiDownload,
  FiSettings,
} from "react-icons/fi";
import { RiUser3Line } from "react-icons/ri";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterRole, setFilterRole] = useState("all");
  const [confirmingId, setConfirmingId] = useState(null);
  const handleConfirmUser = async (user) => {
    if (!user || !user.id) return;
    try {
      setConfirmingId(user.id);
      // Update Firestore flag
      await updateDoc(doc(firestore, "users", user.id), {
        User_confirm: true,
      });
      // Update local users list
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, User_confirm: true } : u
        )
      );
      // Update selected user in modal
      setSelectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, User_confirm: true } : prev
      );
    } catch (err) {
      console.error("Error confirming user:", err);
      alert("Failed to confirm user. Please try again.");
    } finally {
      setConfirmingId(null);
    }
  };
  const usersPerPage = 8;

  // ---- Language / i18n ----
  const [lang, setLang] = useState(localStorage.getItem('app_lang') || 'en');
  const I18N = {
    en: {
      userManagement: 'User Management',
      userManagementDesc: 'Manage all user accounts and their permissions',
      totalUsers: 'Total Users',
      restaurantOwners: 'Restaurant Owners',
      users: 'Users',
      activeUsers: 'Active Users',
      searchUsersPh: 'Search users by name, email, or role...',
      allRoles: 'All Roles',
      ownersRoleOpt: 'Restaurant Owners',
      usersRoleOpt: 'Users',
      noUsersFound: 'No users found',
      tryAdjustSearch: 'Try adjusting your search or filter criteria',
      addFirstUser: 'Get started by adding your first user',
      addFirstUserBtn: 'Add First User',
      previous: 'Previous',
      next: 'Next',
      userProfile: 'User Profile',
      adminView: 'Administrative View',
      personalInfo: 'Personal Information',
      firstName: 'First Name',
      lastName: 'Last Name',
      middleName: 'Middle Name',
      contact: 'Contact',
      noEmail: 'No email',
      restaurantOwner: 'Restaurant Owner',
      standardUser: 'Standard User',
      roleUser: 'User',
      umsFooter: 'User Management System',
    },
    fi: {
      userManagement: 'Käyttäjähallinta',
      userManagementDesc: 'Hallitse kaikkia käyttäjätilejä ja niiden käyttöoikeuksia',
      totalUsers: 'Käyttäjiä yhteensä',
      restaurantOwners: 'Ravintoloiden omistajat',
      users: 'Käyttäjät',
      activeUsers: 'Aktiiviset käyttäjät',
      searchUsersPh: 'Hae käyttäjiä nimen, sähköpostin tai roolin perusteella...',
      allRoles: 'Kaikki roolit',
      ownersRoleOpt: 'Ravintoloiden omistajat',
      usersRoleOpt: 'Käyttäjät',
      noUsersFound: 'Käyttäjiä ei löytynyt',
      tryAdjustSearch: 'Yritä muuttaa hakua tai suodatinta',
      addFirstUser: 'Aloita lisäämällä ensimmäinen käyttäjä',
      addFirstUserBtn: 'Lisää ensimmäinen käyttäjä',
      previous: 'Edellinen',
      next: 'Seuraava',
      userProfile: 'Käyttäjäprofiili',
      adminView: 'Ylläpitäjän näkymä',
      personalInfo: 'Henkilötiedot',
      firstName: 'Etunimi',
      lastName: 'Sukunimi',
      middleName: 'Toinen nimi',
      contact: 'Yhteystieto',
      noEmail: 'Ei sähköpostia',
      restaurantOwner: 'Ravintolan omistaja',
      standardUser: 'Peruskäyttäjä',
      roleUser: 'Käyttäjä',
      umsFooter: 'Käyttäjähallintajärjestelmä',
    },
    no: {
      userManagement: 'Brukeradministrasjon',
      userManagementDesc: 'Administrer alle brukerkontoer og deres tillatelser',
      totalUsers: 'Totalt antall brukere',
      restaurantOwners: 'Restauranteiere',
      users: 'Brukere',
      activeUsers: 'Aktive brukere',
      searchUsersPh: 'Søk etter brukere via navn, e‑post eller rolle...',
      allRoles: 'Alle roller',
      ownersRoleOpt: 'Restauranteiere',
      usersRoleOpt: 'Brukere',
      noUsersFound: 'Ingen brukere funnet',
      tryAdjustSearch: 'Prøv å endre søk eller filter',
      addFirstUser: 'Begynn med å legge til din første bruker',
      addFirstUserBtn: 'Legg til første bruker',
      previous: 'Forrige',
      next: 'Neste',
      userProfile: 'Brukerprofil',
      adminView: 'Administrativ visning',
      personalInfo: 'Personinformasjon',
      firstName: 'Fornavn',
      lastName: 'Etternavn',
      middleName: 'Mellomnavn',
      contact: 'Kontakt',
      noEmail: 'Ingen e‑post',
      restaurantOwner: 'Restauranteier',
      standardUser: 'Standardbruker',
      roleUser: 'Bruker',
      umsFooter: 'Brukeradministrasjonssystem',
    },
    sv: {
      userManagement: 'Användarhantering',
      userManagementDesc: 'Hantera alla användarkonton och deras behörigheter',
      totalUsers: 'Totalt antal användare',
      restaurantOwners: 'Restaurangägare',
      users: 'Användare',
      activeUsers: 'Aktiva användare',
      searchUsersPh: 'Sök användare via namn, e‑post eller roll...',
      allRoles: 'Alla roller',
      ownersRoleOpt: 'Restaurangägare',
      usersRoleOpt: 'Användare',
      noUsersFound: 'Inga användare hittades',
      tryAdjustSearch: 'Försök justera din sökning eller filter',
      addFirstUser: 'Börja med att lägga till din första användare',
      addFirstUserBtn: 'Lägg till första användare',
      previous: 'Föregående',
      next: 'Nästa',
      userProfile: 'Användarprofil',
      adminView: 'Administrativ vy',
      personalInfo: 'Personuppgifter',
      firstName: 'Förnamn',
      lastName: 'Efternamn',
      middleName: 'Mellannamn',
      contact: 'Kontakt',
      noEmail: 'Ingen e‑post',
      restaurantOwner: 'Restaurangägare',
      standardUser: 'Standardanvändare',
      roleUser: 'Användare',
      umsFooter: 'Användarhanteringssystem',
    },
    de: {
      userManagement: 'Benutzerverwaltung',
      userManagementDesc: 'Verwalten Sie alle Benutzerkonten und deren Berechtigungen',
      totalUsers: 'Benutzer gesamt',
      restaurantOwners: 'Restaurantbesitzer',
      users: 'Benutzer',
      activeUsers: 'Aktive Benutzer',
      searchUsersPh: 'Benutzer nach Name, E‑Mail oder Rolle suchen...',
      allRoles: 'Alle Rollen',
      ownersRoleOpt: 'Restaurantbesitzer',
      usersRoleOpt: 'Benutzer',
      noUsersFound: 'Keine Benutzer gefunden',
      tryAdjustSearch: 'Passen Sie Ihre Suche oder Filter an',
      addFirstUser: 'Fügen Sie zunächst einen Benutzer hinzu',
      addFirstUserBtn: 'Ersten Benutzer hinzufügen',
      previous: 'Zurück',
      next: 'Weiter',
      userProfile: 'Benutzerprofil',
      adminView: 'Administrationsansicht',
      personalInfo: 'Persönliche Informationen',
      firstName: 'Vorname',
      lastName: 'Nachname',
      middleName: 'Zweiter Vorname',
      contact: 'Kontakt',
      noEmail: 'Keine E‑Mail',
      restaurantOwner: 'Restaurantbesitzer',
      standardUser: 'Standardbenutzer',
      roleUser: 'Benutzer',
      umsFooter: 'Benutzerverwaltungssystem',
    },
  };
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

  // Helper: Build a human-friendly display name from multiple sources
  const capitalize = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : "");
  const getDisplayName = (u) => {
    if (!u) return "User";
    // Prefer explicit name fields
    const fromParts = [u.first_name, u.middle_name, u.last_name]
      .filter(Boolean)
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .join(" ")
      .replace(/\s+/g, " ");
    if (fromParts) return fromParts;

    // Fallback to displayName field
    if (u.displayName && String(u.displayName).trim().length > 0) {
      return String(u.displayName).trim();
    }

    // Derive from email local-part
    if (u.email) {
      const local = String(u.email).split("@")[0];
      if (local) {
        return local
          .replace(/[._-]+/g, " ")
          .split(" ")
          .filter(Boolean)
          .map((w) => capitalize(w.toLowerCase()))
          .join(" ");
      }
    }

    // Final fallback
    return "User";
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const querySnapshot = await getDocs(collection(firestore, "users"));
        const userList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setUsers(userList);
      } catch (error) {
        console.error("Error fetching users:", error);
      }
      setLoading(false);
    };

    fetchUsers();
  }, []);

  // Filter users based on search term and role
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.role?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole =
      filterRole === "all" ||
      (filterRole === "restaurant owner"
        ? user.role?.toLowerCase() === "owner"
        : user.role?.toLowerCase() === filterRole.toLowerCase());

    return matchesSearch && matchesRole;
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const getRoleIcon = (role) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return <FiShield className="text-amber-600" />;
      default:
        return <RiUser3Line className="text-slate-600" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role?.toLowerCase()) {
      case "owner":
        return "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800 border-amber-200";
      default:
        return "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800 border-slate-200";
    }
  };

  const isUserConfirmed = (user) => {
    if (!user) return false;
    return user.User_confirm === true || user.user_confirm === true || user.userConfirm === true;
  };

  const closeModal = () => setSelectedUser(null);

  // Stats calculation
  const stats = {
    total: users.length,
    owners: users.filter((u) => u.role?.toLowerCase() === "owner").length,
    users: users.filter((u) => !u.role || u.role?.toLowerCase() === "user").length,
    active: users.filter((u) => u.isActive !== false).length,
    inactive: users.filter((u) => u.isActive === false).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-[#fe8318]">{t('userManagement')}</h1>
              <p className="text-sm text-slate-500 font-medium">{t('userManagementDesc')}</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('totalUsers')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl">
                  <FiUser className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('restaurantOwners')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.owners}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                  <FiShield className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('users')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.users}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-slate-500 to-gray-500 rounded-xl">
                  <RiUser3Line className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">{t('activeUsers')}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{stats.active}</p>
                </div>
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
                  <FiSettings className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg mt-8">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
              <div className="relative flex-1">
                <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder={t('searchUsersPh')}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80 backdrop-blur-sm transition-all duration-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Filter Dropdown */}
              <div className="relative">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="appearance-none bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                >
                  <option value="all">{t('allRoles')}</option>
                  <option value="restaurant owner">{t('ownersRoleOpt')}</option>
                  <option value="user">{t('usersRoleOpt')}</option>
                </select>
                <FiFilter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredUsers.length === 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-12 text-center border border-white/20">
            <div className="mx-auto h-24 w-24 bg-gradient-to-r from-slate-100 to-gray-100 rounded-full flex items-center justify-center mb-6">
              <FiUser className="h-12 w-12 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('noUsersFound')}</h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || filterRole !== "all"
                ? t('tryAdjustSearch')
                : t('addFirstUser')}
            </p>
            <button className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl">
              <FiUserPlus className="mr-2 h-4 w-4" />
              {t('addFirstUserBtn')}
            </button>
          </div>
        )}

        {/* User Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {!loading &&
            currentUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setSelectedUser(user)}
                className="group bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl border border-white/20 overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:bg-white/80"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-slate-100 to-gray-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg group-hover:shadow-xl transition-all duration-300">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <FiUser className="text-2xl text-slate-400" />
                        )}
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg border border-white/20">
                        {getRoleIcon(user.role)}
                      </div>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-slate-100 rounded-lg transition-all duration-200">
                      <FiMoreVertical className="h-4 w-4 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors duration-200">
                        {getDisplayName(user)}
                      </h3>
                      <p className="text-sm text-slate-500 truncate flex items-center">
                        <FiMail className="mr-2 h-3 w-3" />
                        {user.email || t('noEmail')}
                      </p>
                      {user.contact && (
                        <p className="text-sm text-slate-500 truncate flex items-center">
                          <FiPhone className="mr-2 h-3 w-3" />
                          {user.contact}
                        </p>
                      )}
                    </div>

                    <div>
                      <span
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getRoleBadge(
                          user.role
                        )}`}
                      >
                        {user.role === 'owner'
                          ? t('restaurantOwner')
                          : user.role === 'user'
                          ? t('roleUser')
                          : user.role || t('roleUser')}
                      </span>
                      {isUserConfirmed(user) && (
                        <span className="inline-flex items-center ml-2 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700 border border-green-200">
                          Confirmed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

       
       {/* Pagination */}
        {totalPages > 1 && (
        <div className="mt-8 flex justify-center items-center space-x-2">
            <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded border ${
                currentPage === 1
                ? "text-gray-400 border-gray-300 cursor-not-allowed"
                : "text-gray-700 border-gray-500 hover:bg-gray-100"
            }`}
            aria-label="Previous Page"
            >
            {t('previous')}
            </button>

            {/* Show page numbers with max 5 visible */}
            {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => {
                if (totalPages <= 5) return true; // show all if <=5 pages
                if (currentPage <= 3) return page <= 5; // first 5 if near start
                if (currentPage >= totalPages - 2) return page > totalPages - 5; // last 5 if near end
                return Math.abs(page - currentPage) <= 2; // 2 pages before and after current
            })
            .map(page => (
                <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-1 rounded border ${
                    currentPage === page
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-700 border-gray-500 hover:bg-gray-100"
                }`}
                aria-current={currentPage === page ? "page" : undefined}
                >
                {page}
                </button>
            ))
            }

            <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className={`px-3 py-1 rounded border ${
                currentPage === totalPages
                ? "text-gray-400 border-gray-300 cursor-not-allowed"
                : "text-gray-700 border-gray-500 hover:bg-gray-100"
            }`}
            aria-label="Next Page"
            >
            {t('next')}
            </button>
        </div>
        )}


        {/* User Details Modal */}

        {selectedUser && (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
        >
            <div
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            >
            {/* ID Card Header */}
            <div className="bg-[#fe871d] p-6 text-white">
                <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">{t('userProfile')}</h2>
                    <p className="text-orange-100">{t('adminView')}</p>
                </div>
                <button
                    onClick={closeModal}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200"
                >
                    <FiX className="h-6 w-6" />
                </button>
                </div>
            </div>

            {/* ID Card Body */}
            <div className="p-8">
                <div className="flex flex-col items-center">
                {/* Profile Photo */}
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-slate-100 to-gray-200 flex items-center justify-center overflow-hidden shadow-lg border-4 border-white">
                    {selectedUser.photoURL ? (
                        <img
                        src={selectedUser.photoURL}
                        alt={selectedUser.displayName}
                        className="w-full h-full object-cover"
                        />
                    ) : (
                        <FiUser className="text-5xl text-slate-400" />
                    )}
                    </div>
                    <div className="absolute -bottom-3 -right-3 bg-white rounded-full p-2 shadow-xl border-4 border-white">
                    {getRoleIcon(selectedUser.role)}
                    </div>
                </div>

                {/* User Info */}
                <div className="w-full text-center">
                    <h3 className="text-2xl font-bold text-slate-900 mb-1">
                    {getDisplayName(selectedUser)}
                    </h3>
                    <p className="text-slate-600 mb-4">{selectedUser.email || t('noEmail')}</p>
                    
                    <div className="mb-6 flex items-center justify-center gap-2">
                      <span
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                          selectedUser.role === "owner"
                            ? "bg-gradient-to-r from-amber-100 to-orange-100 text-amber-800"
                            : "bg-gradient-to-r from-slate-100 to-gray-100 text-slate-800"
                        }`}
                      >
                        {selectedUser.role === "owner"
                          ? t('restaurantOwner')
                          : selectedUser.role === "user"
                          ? t('standardUser')
                          : selectedUser.role || t('roleUser')}
                      </span>
                      {isUserConfirmed(selectedUser) && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                          Confirmed
                        </span>
                      )}
                    </div>
                    {!isUserConfirmed(selectedUser) && (
                      <button
                        onClick={() => handleConfirmUser(selectedUser)}
                        disabled={confirmingId === selectedUser.id}
                        className="mb-6 inline-flex items-center px-5 py-2 rounded-full text-sm font-semibold bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                      >
                        {confirmingId === selectedUser.id ? "Confirming..." : "Confirm User"}
                      </button>
                    )}

                    {/* Personal Info Section */}
                    <div className="bg-orange-50 rounded-xl p-5 mb-6">
                    <h4 className="text-sm font-semibold text-orange-700 uppercase tracking-wider mb-3 flex items-center justify-center">
                        <FiUser className="mr-2" /> {t('personalInfo')}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <p className="text-xs text-orange-600">{t('firstName')}</p>
                        <p className="font-medium text-slate-800">{selectedUser.first_name || "N/A"}</p>
                        </div>
                        <div>
                        <p className="text-xs text-orange-600">{t('lastName')}</p>
                        <p className="font-medium text-slate-800">{selectedUser.last_name || "N/A"}</p>
                        </div>
                        <div>
                        <p className="text-xs text-orange-600">{t('middleName')}</p>
                        <p className="font-medium text-slate-800">{selectedUser.middle_name || "N/A"}</p>
                        </div>
                        <div>
                        <p className="text-xs text-orange-600">{t('contact')}</p>
                        <p className="font-medium text-slate-800">{selectedUser.contact || "N/A"}</p>
                        </div>
                    </div>
                    </div>
                </div>
                </div>
            </div>

            {/* ID Card Footer */}
            <div className="bg-orange-100 px-6 py-4 border-t border-orange-200 text-center">
                <span className="text-xs text-orange-700">{t('umsFooter')}</span>
            </div>
            </div>
        </div>
        )}

      </div>
    </div>
  );
}
