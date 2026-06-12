import React, { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, firestore } from "../firebase";
import {
  doc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import logo from "../assets/dinery-logo.png";
import bg from "../assets/background-register.jpg";
import { motion } from "framer-motion";

const MAIL_COLLECTION = "mail"; // default collection used by Firebase Trigger Email

// Generate a strong temporary password
const generateTempPassword = () => {
  // avoids ambiguous chars; includes symbols
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*()-_=+[]{}";
  const all = upper + lower + nums + syms;

  const pick = (pool, n) =>
    Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join("");

  // ensure diversity, then shuffle
  const base =
    pick(upper, 3) + pick(lower, 5) + pick(nums, 3) + pick(syms, 2) + pick(all, 3);

  return base
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};

// Send email via Firebase Trigger Email extension
const sendAccountEmail = async ({ email, password, firstName }) => {
  const subject = "Your Dinery account has been created";

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.6;color:#111;">
      <div style="max-width:560px;margin:0 auto;padding:24px;border:1px solid #eee;border-radius:12px;">
        <div style="text-align:center;margin-bottom:16px;">
          <h2 style="margin:0;color:#ff8d21;">Welcome${firstName ? `, ${firstName}` : ""}!</h2>
        </div>
        <p>Your Dinery account has been successfully created.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> <code style="padding:2px 6px;background:#f6f6f6;border-radius:4px;">${password}</code></p>
        <p style="margin-top:12px;">For security, please sign in and change your password immediately.</p>
        <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />
        <p style="font-size:12px;color:#666;">If you didn't request this, you can ignore this message.</p>
      </div>
    </div>
  `;

  const text = `Welcome${firstName ? `, ${firstName}` : ""}!
Your Dinery account has been successfully created.

Email: ${email}
Temporary Password: ${password}

For security, please sign in and change your password immediately.`;

  await addDoc(collection(firestore, MAIL_COLLECTION), {
    to: [email],
    message: { subject, text, html },
  });
};

export default function Register() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName || !contact) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // 1) Generate secure temp password
      const tempPassword = generateTempPassword();

      // 2) Create Auth user with temp password
      const cred = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const { user } = cred;

      // 3) Create/merge Firestore profile under users/{uid}
      await setDoc(
        doc(firestore, "users", user.uid),
        {
          email,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          contact,
          displayName: `${firstName} ${middleName} ${lastName}`.trim().replace(/\s+/g, " "),
          photoURL: "",
          role: "Owner",
          user_setup: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );

      // 4) Send credentials by email via Trigger Email extension
      await sendAccountEmail({ email, password: tempPassword, firstName });

      // 5) Immediately sign out so the new account is NOT logged in
      await signOut(auth);

      // 6) Show success modal and stay on register page
      setRegisteredEmail(email);
      setShowModal(true);
      
      // 7) Clear form fields
      setEmail("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setContact("");
    } catch (err) {
      console.error("Registration error:", err);
      setError(err?.message || "Registration failed.");
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
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10 backdrop-blur-sm"></div>

      {/* Registration Card */}
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
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Create an Account</h1>
          <p className="text-gray-600 text-sm">Join Dinery to get started</p>
        </motion.div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="p-3 bg-red-50 text-red-600 text-sm rounded border border-red-100 flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </motion.div>
          )}

          {/* Inputs */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="First name"
            />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="Middle name (optional)"
            />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="Last name"
            />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
            <input
              type="tel"
              required
              value={contact}
              onChange={(e) => {
                const numericValue = e.target.value.replace(/\D/g, ""); // digits only
                setContact(numericValue);
              }}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="e.g. 09171234567"
              maxLength={15}
            />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.8 }}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#ff8d21] focus:border-[#ff8d21] transition"
              placeholder="your@email.com"
            />
          </motion.div>

          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 1.1 }}>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-[#ff8d21] to-[#ff6b21] hover:from-[#ff7b21] hover:to-[#ff5a21] text-white font-medium py-2.5 rounded transition shadow-md hover:shadow-lg"
            >
              Create Account
            </button>
          </motion.div>
        </form>

        {/* Footer Links */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center text-sm text-gray-600"
        >
          <p>
            Already have an account?{" "}
            <Link to="/login" className="text-[#ff8d21] hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <p className="mt-2 text-xs text-gray-500">
            By registering, you agree to our Terms and Privacy Policy
          </p>
        </motion.div>
      </motion.div>

      {/* Success Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          {/* Modal Card */}
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2 }}
            className="relative z-10 w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl border border-gray-200"
          >
            <div className="p-6 text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-7 h-7 text-green-600">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Account Created Successfully!</h3>
              <p className="mt-2 text-gray-600">
                Your account credentials have been sent to{" "}
                <span className="font-medium text-gray-900">{registeredEmail}</span>
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Please check your email for your temporary password.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#22c55e] to-[#16a34a] text-white font-medium py-2.5 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  OK
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}