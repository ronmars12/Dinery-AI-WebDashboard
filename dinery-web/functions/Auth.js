// functions/Auth.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

const db = admin.firestore();
const auth = admin.auth();

// Generate a strong temporary password
const generateTempPassword = () => {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const nums = "23456789";
  const syms = "!@#$%^&*()-_=+[]{}";
  const all = upper + lower + nums + syms;

  const pick = (pool, n) =>
    Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]).join("");

  const base =
    pick(upper, 3) + pick(lower, 5) + pick(nums, 3) + pick(syms, 2) + pick(all, 3);

  return base
    .split("")
    .sort(() => 0.5 - Math.random())
    .join("");
};

// Main Cloud Function
exports.provisionRestaurantAccount = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    // Only allow POST requests
    if (req.method !== "POST") {
      console.log("❌ Method not allowed:", req.method);
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { email, firstName, lastName, contact, website, plan, password, role } = req.body;

    console.log("📥 Received request for:", email);

    // Validate required fields
    if (!email || !firstName || !lastName || !contact || !password) {
      console.log("❌ Missing required fields");
      return res.status(400).json({
        error: "Missing required fields: email, firstName, lastName, contact, password",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("❌ Invalid email format:", email);
      return res.status(400).json({ error: "Invalid email format" });
    }

    try {
      // Check if user already exists
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(email);
        console.log("⚠️ User already exists:", email);
        return res.status(409).json({
          error: "An account with this email already exists. Please check your inbox for login credentials.",
          uid: userRecord.uid,
          alreadyExists: true
        });
      } catch (error) {
        if (error.code !== "auth/user-not-found") {
          console.error("❌ Error checking existing user:", error);
          throw error;
        }
        console.log("✅ Email available, proceeding with account creation");
      }

      // Use password from request or generate one
      const tempPassword = password || generateTempPassword();

      // Determine the role (default to "Owner" if not provided)
      const userRole = role || "Owner";

      console.log("🔐 Creating Firebase Auth user...");

      // Create Firebase Auth user
      userRecord = await auth.createUser({
        email: email,
        password: tempPassword,
        displayName: `${firstName} ${lastName}`.trim(),
        emailVerified: false
      });

      console.log(`✅ Auth user created with UID: ${userRecord.uid}`);

      // Set custom claims for the user with the specified role
      await auth.setCustomUserClaims(userRecord.uid, {
        role: userRole,
        plan: (plan || "starter").toLowerCase(),
      });

      console.log(`✅ Custom claims set for ${userRecord.uid} with role: ${userRole}`);

      // Create Firestore user document
      const userData = {
        email: email,
        first_name: firstName,
        last_name: lastName,
        contact: contact,
        website: website || "",
        displayName: `${firstName} ${lastName}`.trim(),
        photoURL: "",
        role: userRole,
        plan: (plan || "starter").toLowerCase(),
        user_setup: true,
        accountStatus: "pending_approval",
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(userRecord.uid).set(userData);

      console.log(`✅ Firestore document created for ${userRecord.uid}`);

      // Return success response with CRITICAL FLAGS that frontend checks
      const response = {
        success: true,
        created: true,  // CRITICAL: Frontend checks this
        uid: userRecord.uid,  // CRITICAL: Frontend checks this
        message: `${userRole} account created successfully`,
        role: userRole,
        plan: (plan || "starter").toLowerCase(),
        user: {  // Additional info
          uid: userRecord.uid,
          email: email,
          displayName: `${firstName} ${lastName}`.trim(),
          role: userRole
        }
      };

      console.log("✅ Account creation successful:", response);

      return res.status(200).json(response);

    } catch (error) {
      console.error("❌ Error provisioning restaurant account:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        stack: error.stack
      });

      if (error.code === "auth/email-already-exists") {
        return res.status(409).json({
          error: "An account with this email already exists",
          alreadyExists: true
        });
      }

      if (error.code === "auth/invalid-password") {
        return res.status(400).json({
          error: "Password does not meet requirements. Must be at least 6 characters.",
        });
      }

      return res.status(500).json({
        error: `Failed to create restaurant account: ${error.message}`,
        details: error.code || "unknown_error"
      });
    }
  });
});