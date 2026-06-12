// src/components/MainDashboard.jsx

import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MainContent from "./MainContent";

import { doc, onSnapshot } from "firebase/firestore";
import { firestore } from "../firebase";

export default function MainDashboard() {
  const [activeItem, setActiveItem] = useState("Dashboard");
  const [showSidebar, setShowSidebar] = useState(false);
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false);
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);

  // Update banner states
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");

  // Listen for app version updates
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(firestore, "app_config", "version"),
      (snapshot) => {
        if (!snapshot.exists()) return;

        const firestoreVersion = snapshot.data().version;

        // Version already accepted by user
        const savedVersion = localStorage.getItem(
          "accepted_app_version"
        );

        // Show banner if Firestore version is different
        if (firestoreVersion !== savedVersion) {
          setLatestVersion(firestoreVersion);
          setShowUpdateBanner(true);
        } else {
          setShowUpdateBanner(false);
        }
      },
      (error) => {
        console.error("Version listener error:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Reload and save accepted version
  const handleReload = () => {
    localStorage.setItem(
      "accepted_app_version",
      latestVersion
    );

    window.location.reload();
  };

  const toggleSidebar = () => setShowSidebar((prev) => !prev);

  const closeSidebar = () => setShowSidebar(false);

  return (
    <div className="flex h-screen w-full font-sans overflow-hidden">
      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-all duration-300 ease-in-out
          md:relative md:translate-x-0
          ${showSidebar ? "translate-x-0" : "-translate-x-full"}
          ${
            isSidebarHidden
              ? "w-12"
              : isSidebarMinimized
              ? "w-20"
              : "w-64"
          }
        `}
      >
        <Sidebar
          activeItem={activeItem}
          setActiveItem={(item) => {
            setActiveItem(item);
            closeSidebar();
          }}
          isMinimized={isSidebarMinimized}
          setIsMinimized={setIsSidebarMinimized}
          isHidden={isSidebarHidden}
          setIsHidden={setIsSidebarHidden}
        />
      </div>

      {/* Mobile Overlay */}
      {showSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Update Banner */}
        {showUpdateBanner && (
          <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-3 flex items-center justify-between z-50">
            <div>
              <p className="text-sm font-semibold text-yellow-900">
                A new version is available
              </p>

              <p className="text-xs text-yellow-700">
                Please reload the page to update the system.
              </p>
            </div>

            <button
              onClick={handleReload}
              className="ml-4 rounded-md bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 transition"
            >
              Reload
            </button>
          </div>
        )}

        <Header
          activeItem={activeItem}
          toggleSidebar={toggleSidebar}
          isSidebarMinimized={isSidebarMinimized}
          isSidebarHidden={isSidebarHidden}
        />

        <MainContent
          activeItem={activeItem}
          isSidebarMinimized={isSidebarMinimized}
          isSidebarHidden={isSidebarHidden}
        />
      </div>
    </div>
  );
}