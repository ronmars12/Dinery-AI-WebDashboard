import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth, firestore } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/dinery-logo.png";
import bg from "../assets/background-login.jpg";
import googleLogo from "../assets/google-logo.png";
import appleLogo from "../assets/apple-logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const googleProvider = new GoogleAuthProvider();
  const appleProvider = new OAuthProvider("apple.com");

  const redirectBasedOnRole = async (uid) => {
    try {
      // ── 1. Check users collection first (owners, admins, testers) ──────────
      const userDocRef = doc(firestore, "users", uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const role = (userData.role || "").toLowerCase();

        if (role === "owner") {
          const isConfirmed =
            userData.User_confirm === true ||
            userData.user_confirm === true ||
            userData.userConfirm === true;

          if (!isConfirmed) {
            await auth.signOut();
            setError("PENDING_APPROVAL");
            return;
          }
        }

        if (role === "admin") {
          navigate("/super-admin-dashboard");
        } else if (role === "owner" || role === "tester") {
          navigate("/");
        } else {
          navigate("/");
        }
        return;
      }

        // ── 2. Not in users collection — search across all restaurants for staff ──
        const { collection, query, where, getDocs, collectionGroup } = await import("firebase/firestore");

        // Use collectionGroup to search ALL staff subcollections at once (much faster)
        const staffQuery = query(
          collectionGroup(firestore, "staff"),
          where("uid", "==", uid)
        );

        const staffSnap = await getDocs(staffQuery);

        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          const role = (staffData.role || "staff").toLowerCase();

          // Get the restaurant doc ID from the staff doc path
          // Path is: restaurants/{restaurantId}/staff/{staffDocId}
          const restaurantId = staffDoc.ref.parent.parent.id;

          console.log("✅ Staff found:", { uid, role, restaurantId });

          // Set ALL required sessionStorage values
          sessionStorage.setItem("staffRestaurantId", restaurantId);
          sessionStorage.setItem("staffRole", role);
          sessionStorage.setItem("staffCollection", "restaurants");
          sessionStorage.setItem("staffOwnerId", staffData.Owner_ID || "");

          if (role === "admin" || role === "manager") {
            navigate("/");
          } else {
            navigate("/timesheets"); // or wherever staff should go
          }
          return;
        }
              // ── 3. No doc found anywhere ───────────────────────────────────────────
      console.warn("No user doc found for uid:", uid);
      navigate("/");

    } catch (err) {
      console.error("Error fetching user role:", err);
      navigate("/");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await redirectBasedOnRole(user.uid);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const displayName = user.displayName || "";
      const nameParts = displayName.trim().split(" ");

      const firstName = nameParts[0] || "";
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
      const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

      const userDocRef = doc(firestore, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          displayName,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          contact: "",
          photoURL: user.photoURL || "",
          role: "Owner", // default role for new Google users
          user_setup: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
      await redirectBasedOnRole(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAppleLogin = async () => {
    setError("");
    try {
      const result = await signInWithPopup(auth, appleProvider);
      const user = result.user;
      await redirectBasedOnRole(user.uid);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Login Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="w-full max-w-md bg-white/95 backdrop-blur-sm p-8 rounded-lg shadow-lg border border-white/20 relative z-10"
      >
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <img src={logo} alt="Dinery Logo" className="h-16 object-contain" />
        </motion.div>

        {/* Header Section */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6 text-center"
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome Back</h1>
          <p className="text-gray-600 text-sm">Sign in to your Dinery account</p>
        </motion.div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && error !== "PENDING_APPROVAL" && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100"
            >
              {error}
            </motion.div>
          )}

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="your@email.com"
            />
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700 transition-colors"
              >
                {showPassword ? (
                  // Eye Closed Icon (password visible)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L12 12m-2.122-2.122L7.76 7.76m6.362 6.362L17.24 17.24M7.76 7.76l2.122 2.122m0 0l-2.122-2.122M17.24 17.24L12 12"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3l18 18"></path>
                  </svg>
                ) : (
                  // Eye Open Icon (password hidden)
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                  </svg>
                )}
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 bg-[#ff8d21] text-white font-medium py-2.5 rounded transition shadow-md hover:shadow-lg ${
                isSubmitting ? "opacity-70 cursor-not-allowed" : "hover:bg-[#e67e22]"
              }`}
            >
              {isSubmitting && (
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  ></path>
                </svg>
              )}
              <span>{isSubmitting ? "Signing in..." : "Sign In"}</span>
            </button>
          </motion.div>
        </form>

        {/* Footer Links */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-sm text-gray-600"
        >
          <p className="mt-2">
            <Link to="/forgot-password" className="text-gray-500 hover:text-[#ff8d21] hover:underline">
              Forgot password?
            </Link>
          </p>
        </motion.div>
      {/* Pending Approval Modal */}
      {error === "PENDING_APPROVAL" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-100 mb-4">
                <svg className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Account Pending Approval</h3>
              <p className="text-gray-600 mb-6">
                Your account has not been approved yet. Please contact your administrator for approval.
              </p>
              <button
                onClick={() => setError("")}
                className="w-full bg-[#ff8d21] hover:bg-[#e67e22] text-white font-medium py-2.5 rounded transition"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </motion.div>
    </motion.div>
  );
}