import React, { useState, useEffect } from "react";
import { FiLogOut } from "react-icons/fi";

export default function Header({ activeItem, toggleSidebar, handleLogout }) {
  const [langCode, setLangCode] = useState(() => localStorage.getItem('app_lang') || 'en');
  const LANG_LABELS = [
    { code: 'en', label: 'Eng' },
    { code: 'fi', label: 'Fin' },
    { code: 'no', label: 'Nor' },
    { code: 'sv', label: 'Swed' },
    { code: 'de', label: 'Ger' },
  ];

  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (saved && saved !== langCode) setLangCode(saved);

    const onLangEvent = (e) => {
      if (typeof e?.detail === 'string') setLangCode(e.detail);
    };
    window.addEventListener('app:setLanguage', onLangEvent);

    const onStorage = (e) => {
      if (e.key === 'app_lang') setLangCode(e.newValue || 'en');
    };
    window.addEventListener('storage', onStorage);

    return () => {
      window.removeEventListener('app:setLanguage', onLangEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleLanguageChange = (code) => {
    localStorage.setItem('app_lang', code);
    setLangCode(code);
    window.dispatchEvent(new CustomEvent('app:setLanguage', { detail: code }));
  };
  return (
    <header className="flex items-center justify-between px-6 py-3 border-b-4 border-[#fe8a24] shadow-sm bg-[#23272f] text-[#f4f8f3] font-poppins">
      {/* Hamburger button for mobile */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="md:hidden p-2 rounded hover:bg-[#fe8a24]/20 transition"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-6 w-6 text-[#fe8a24]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Title */}
      <h1 className="text-xl font-bold">{activeItem}</h1>

      {/* Language buttons and Logout Icon */}
      <div className="flex items-center space-x-4">
        <div className="flex space-x-2 mr-4">
          {LANG_LABELS.map(({ code, label }) => {
            const isActive = code === langCode;
            return (
              <button
                key={code}
                onClick={() => handleLanguageChange(code)}
                className={`px-2 py-1 rounded text-sm font-semibold transition border border-[#fe8a24] ${
                  isActive ? 'bg-[#fe8a24] text-white' : 'text-[#fe8a24] hover:bg-[#fe8a24]/20'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleLogout}  
          className="p-2 rounded hover:bg-[#fe8a24]/20 transition"
          aria-label="Logout"
          title="Logout"
        >
          <FiLogOut className="text-[#fe8a24] h-6 w-6" />
        </button>
      </div>
    </header>
  );
}
