// functions/deleteStaffAccount.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

const deleteStaffAccount = onCall(
{
    enforceAppCheck: false,
    cors: [
    // Local development
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
    console.log("🔵 Cloud Function 'deleteStaffAccount' called");
    console.log("📊 Request data:", request.data);
    console.log("👤 Auth user:", request.auth?.uid);
    
    if (!request.auth) {
      console.error("❌ No authentication found");
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const uid = request.data?.uid ?? "";
    console.log(`🎯 Target UID to delete: ${uid}`);
    
    if (!uid) {
      console.error("❌ No UID provided");
      throw new HttpsError("invalid-argument", "User UID is required.");
    }

    // Prevent users from deleting themselves
    if (request.auth.uid === uid) {
      console.error(`❌ User ${request.auth.uid} tried to delete themselves`);
      throw new HttpsError("permission-denied", "Cannot delete your own account.");
    }

    try {
      console.log(`🔄 Attempting to delete auth user: ${uid}`);
      await admin.auth().deleteUser(uid);
      console.log(`✅ SUCCESS: Deleted auth user: ${uid} by caller: ${request.auth.uid}`);
      return { success: true, message: "User deleted successfully" };
      
    } catch (err) {
      console.error(`❌ Failed to delete auth user ${uid}:`, err);
      console.error("Error code:", err.code);
      console.error("Error message:", err.message);
      
      if (err.code === "auth/user-not-found") {
        console.log(`⚠️ User ${uid} not found in Auth, treating as success`);
        return { success: true, message: "User not found in Auth" };
      }
      
      throw new HttpsError("internal", err.message || "Failed to delete user account.");
    }
  }
);

module.exports = { deleteStaffAccount };