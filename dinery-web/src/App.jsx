// App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, firestore } from "./firebase";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./ThemeContext"; 
import Login from "./authentication/Login";
import MainDashboard from "./components/MainDashboard";
import SuperAdminDashboard from "./components/SuperAdmin/SuperAdminDashboard";
import PublicReservationPage from "./components/ReservationLinks/Publicreservationpage";
import dineryLogo from "./assets/dinery-logo.png";
import ManageReservationPage from "./components/ReservationLinks/ManageReservationPage";
import FeedbackPage from "./components/ReservationLinks/FeedbackPage";

console.log('=== ENVIRONMENT VARIABLES TEST ===');
console.log('Growth Price ID:', import.meta.env.VITE_STRIPE_GROWTH_PRICE_ID);
console.log('Professional Price ID:', import.meta.env.VITE_STRIPE_PROFESSIONAL_PRICE_ID);
console.log('All env vars:', import.meta.env);
console.log('===================================');

function AnimatedRoutes({ user, role }) {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/reserve/:restaurantId" element={<PublicReservationPage />} />
        <Route path="/manage-reservation/:reservationId" element={<ManageReservationPage />} />
        <Route path="/feedback/:reservationId" element={<FeedbackPage />} />

        {/* ── AUTH ROUTES ── */}
        {!user && (
          <>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        )}
        {user && (
          <>
            {role === "Admin" ? (
              <Route path="/*" element={<SuperAdminDashboard />} />
            ) : (
              <Route path="/*" element={<MainDashboard />} />
            )}
          </>
        )}
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDocRef = doc(firestore, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const userRole = userData.role || null;

            if (userRole && userRole.toLowerCase() === "owner") {
              const isConfirmed =
                userData.User_confirm === true ||
                userData.user_confirm === true ||
                userData.userConfirm === true;

              if (!isConfirmed) {
                await auth.signOut();
                setUser(null);
                setRole(null);
                setCheckingStatus(false);
                return;
              }
            }

            setRole(userRole);
            setUser(currentUser);
          } else {
            setRole(null);
            setUser(currentUser);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
          setUser(currentUser);
        }
      } else {
        setUser(null);
        setRole(null);
      }

      setCheckingStatus(false);
    });

    return unsubscribe;
  }, []);

  if (checkingStatus) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse flex flex-col items-center">
          <img src={dineryLogo} alt="Dinery Logo" className="w-50 h-50 mb-4" />
          <p className="text-gray-600">Loading Dinery...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <ThemeProvider> {/* Move ThemeProvider INSIDE Router */}
        <AnimatedRoutes user={user} role={role} />
      </ThemeProvider>
    </Router>
  );
}