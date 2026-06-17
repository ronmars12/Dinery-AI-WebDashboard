// functions/sendEmail.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const resendApiKey = defineSecret("RESEND_API_KEY");

const sendEmail = onCall(
  {
    secrets: [resendApiKey],
    enforceAppCheck: false,
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://dinery-9c261.web.app",
      "https://dinery-9c261.firebaseapp.com",
      "https://dinery-ai.netlify.app"
    ],
    region: "asia-southeast1",  // ← UNCOMMENT THIS LINE
    timeoutSeconds: 60,
  },
  async (request) => {
    console.log("🔵 Cloud Function 'sendEmail' called");
    console.log("📧 To:", request.data?.to);
    console.log("📧 Subject:", request.data?.subject);
    
    // Check authentication
    if (!request.auth) {
      console.error("❌ No authentication found");
      throw new HttpsError("unauthenticated", "Must be signed in.");
    }

    const { to, subject, html, text, from, replyTo } = request.data;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      console.error("❌ Missing required fields");
      throw new HttpsError("invalid-argument", "Missing required fields: to, subject, html/text.");
    }

    // For testing - if no API key, simulate email sending
    if (!resendApiKey.value()) {
      console.warn("⚠️ No RESEND_API_KEY found, simulating email sending");
      console.log("📧 SIMULATED EMAIL:");
      console.log("  To:", to);
      console.log("  Subject:", subject);
      console.log("  HTML length:", html?.length || 0);
      
      // Return success even without actual email sending
      return { 
        success: true, 
        id: "simulated-" + Date.now(),
        message: "Email simulated - configure RESEND_API_KEY for actual emails"
      };
    }

    try {
      console.log("🔄 Attempting to send email via Resend...");
      
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey.value()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: from ?? "Dinery AI <no-reply@mail.dinery.ai>",
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || undefined,
          text: text || undefined,
          reply_to: replyTo,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("❌ Resend API error:", error);
        
        // Don't throw error, just log it - allow user creation to continue
        console.warn("⚠️ Email failed but continuing with user creation");
        return { 
          success: false, 
          error: error.message,
          message: "Email sending failed but user was created"
        };
      }

      const result = await response.json();
      console.log(`✅ Email sent successfully! ID: ${result.id}`);
      return { success: true, id: result.id, message: "Email sent successfully" };
      
    } catch (err) {
      console.error("❌ Unexpected error sending email:", err);
      
      // Return success anyway to not block user creation
      return { 
        success: false, 
        error: err.message,
        message: "Email sending failed but user was created"
      };
    }
  }
);

module.exports = { sendEmail };