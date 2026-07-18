// functions/createStaffAccount.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const createStaffAccount = onCall(
  {
    enforceAppCheck: false,
    region: "asia-southeast1",
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      // Firebase hosting
      "https://dinery-9c261.web.app",
      "https://dinery-9c261.firebaseapp.com",
      // Netlify hosting
      "https://dinery-ai.netlify.app",
      "https://dineryai.netlify.app",
      "https://www.dineryai.netlify.app",
      // Custom domain(s)
      "https://dashboard.dinery.ai",
      "https://dinery.ai",
      "https://booking.dinery.ai", 
      "https://www.dinery.ai",
    ],
    timeoutSeconds: 60,
  },
  async (request) => {
    console.log("🔵 Cloud Function 'createStaffAccount' called");
    console.log("📊 Request data email:", request.data?.email);
    console.log("👤 Auth user:", request.auth?.uid);

    if (!request.auth) {
      console.error("❌ No authentication found");
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    // Clean up email (trim and lowercase)
    let email = request.data?.email ?? "";
    email = email.trim().toLowerCase();

    const password    = request.data?.password    ?? "";
    const displayName = request.data?.displayName ?? "";

    console.log(`📧 Processed email: ${email}`);

    if (!email || !password) {
      throw new HttpsError("invalid-argument", "Email and password are required.");
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error(`❌ Invalid email format: ${email}`);
      throw new HttpsError("invalid-argument", `Invalid email address format: ${email}`);
    }

    try {
      const userRecord = await admin.auth().createUser({
        email:         email,
        password:      password,
        displayName:   displayName,
        emailVerified: false,
      });

      console.log(`✅ Created auth user: ${userRecord.uid} for ${email}`);
      return { uid: userRecord.uid };

    } catch (err) {
      console.error("❌ createStaffAccount error:", err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);

      if (err.code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "This email is already in use.");
      }

      if (err.code === "auth/invalid-email") {
        throw new HttpsError("invalid-argument", `Invalid email address: ${email}`);
      }

      if (err.code === "auth/weak-password") {
        throw new HttpsError("invalid-argument", "Password is too weak. Use at least 6 characters.");
      }

      throw new HttpsError("internal", err.message || "Failed to create account.");
    }
  }
);

module.exports = { createStaffAccount };