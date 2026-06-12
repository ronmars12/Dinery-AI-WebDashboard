import React, { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";

export default function Header({ activeItem, toggleSidebar }) {
  // Map of button labels to codes
  const LABEL_TO_CODE = { Eng: "en", Fin: "fi", Nor: "no", Swed: "sv", Ger: "de" };

  // Track current language from localStorage + events so we can highlight the active button
  const [langCode, setLangCode] = useState(() => localStorage.getItem("app_lang") || "en");

  useEffect(() => {
    // On mount, sync with saved
    const saved = localStorage.getItem("app_lang");
    if (saved && saved !== langCode) setLangCode(saved);

    // Listen for global app:setLanguage events
    const onLangEvent = (e) => {
      if (typeof e?.detail === "string") setLangCode(e.detail);
    };
    window.addEventListener("app:setLanguage", onLangEvent);

    // Listen for storage changes from other tabs/components
    const onStorage = (e) => {
      if (e.key === "app_lang") setLangCode(e.newValue || "en");
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app:setLanguage", onLangEvent);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const handleLanguageChange = (label) => {
    const code = LABEL_TO_CODE[label] || "en";
    localStorage.setItem("app_lang", code);
    setLangCode(code); // update local highlight immediately
    window.dispatchEvent(new CustomEvent("app:setLanguage", { detail: code }));
    console.log("Language changed to:", code);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b-4 border-[#fe8a24] shadow-sm bg-white dark:bg-[#23272f] transition-colors duration-200">
      {/* Hamburger button for mobile */}
      <button
        type="button"
        onClick={toggleSidebar}
        className="md:hidden p-2 rounded hover:bg-[#fe8a24]/20 dark:hover:bg-[#f4f8f3]/20 transition"
        aria-label="Toggle sidebar"
      >
        <svg
          className="h-6 w-6 text-[#fe8a24] dark:text-[#f4f8f3]"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <h1 className="text-[#fe8a24] font-bold text-xl dark:text-[#f4f8f3]">{activeItem}</h1>

      <div className="hidden md:flex items-center space-x-4">
        <div className="text-gray-700 font-semibold dark:text-[#f4f8f3]">Restaurant Owner Panel</div>

        {/* Language Buttons */}
        <div className="flex items-center space-x-2">
          {["Eng", "Fin", "Nor", "Swed", "Ger"].map((label) => {
            const code = LABEL_TO_CODE[label] || "en";
            const isActive = code === langCode; // highlight the currently selected language
            return (
              <button
                key={label}
                onClick={() => handleLanguageChange(label)}
                className={`px-2 py-1 text-sm border border-[#fe8a24] rounded font-semibold transition ${
                  isActive ? 'bg-[#fe8a24] text-white' : 'text-[#fe8a24] hover:bg-[#fe8a24]/20'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="p-2 rounded hover:bg-[#fe8a24]/20 dark:hover:bg-[#f4f8f3]/20 transition"
          title="Logout"
          aria-label="Logout"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-[#fe8a24] dark:text-[#f4f8f3]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h4a2 2 0 012 2v1"
            />
          </svg>
        </button>
      </div>
    </header>
  );
}
