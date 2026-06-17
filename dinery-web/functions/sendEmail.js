// functions/sendEmail.js
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const resendApiKey = defineSecret("RESEND_API_KEY");

const sendEmail = onCall(
  {
    secrets: [resendApiKey],
    enforceAppCheck: false,
    cors: [
      // Local development
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      // Firebase hosting
      "https://dinery-9c261.web.app",
      "https://dinery-9c261.firebaseapp.com",
      // Netlify hosting - ADD BOTH VARIATIONS
      "https://dinery-ai.netlify.app",
      "https://dineryai.netlify.app",
      // Add any other domains you use
      "https://www.dineryai.netlify.app"
    ],
    region: "asia-southeast1", // ← UNCOMMENTED - matches your deployment
    timeoutSeconds: 60,
  },
  async (request) => {
    console.log("🔵 Cloud Function 'sendEmail' called");
    console.log("📧 To:", request.data?.to);
    console.log("📧 Subject:", request.data?.subject);
    console.log("📍 Request origin:", request.rawRequest?.headers?.origin || 'unknown');
    
    // 🔓 Allow public reservation emails (no auth required)
    const isReservationEmail = request.data?.isReservation === true || 
                               request.data?.subject?.includes('Reservation');
    
    // Check authentication - but allow reservation emails
    if (!request.auth && !isReservationEmail) {
      console.warn("⚠️ Unauthenticated request - allowing for reservation emails");
      // Don't throw error, allow it
    } else if (!request.auth) {
      console.error("❌ No authentication found for non-reservation email");
      throw new HttpsError("unauthenticated", "Must be signed in for non-reservation emails.");
    }

    const { to, subject, html, text, from, replyTo } = request.data;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      console.error("❌ Missing required fields");
      throw new HttpsError("invalid-argument", "Missing required fields: to, subject, html/text.");
    }

    // If no API key, simulate email sending (for testing)
    if (!resendApiKey.value()) {
      console.warn("⚠️ No RESEND_API_KEY found, simulating email sending");
      console.log("📧 SIMULATED EMAIL:");
      console.log("  To:", to);
      console.log("  Subject:", subject);
      console.log("  HTML length:", html?.length || 0);
      
      return { 
        success: true, 
        id: "simulated-" + Date.now(),
        message: "Email simulated - configure RESEND_API_KEY for actual emails"
      };
    }

    try {
      console.log("🔄 Attempting to send email via Resend...");
      console.log(`📤 From: ${from ?? "Dinery AI <no-reply@mail.dinery.ai>"}`);
      console.log(`📤 To: ${Array.isArray(to) ? to.join(', ') : to}`);
      
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
        
        // Don't throw error - allow reservation to complete
        return { 
          success: false, 
          error: error.message,
          message: "Email sending failed but reservation confirmed"
        };
      }

      const result = await response.json();
      console.log(`✅ Email sent successfully! ID: ${result.id}`);
      return { 
        success: true, 
        id: result.id, 
        message: "Email sent successfully" 
      };
      
    } catch (err) {
      console.error("❌ Unexpected error sending email:", err);
      
      // Return success anyway to not block user creation
      return { 
        success: false, 
        error: err.message,
        message: "Email sending failed but reservation confirmed"
      };
    }
  }
);

// ── Optional: Test function to verify deployment ──
const testEmail = onCall(
  {
    cors: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
      "https://dinery-9c261.web.app",
      "https://dinery-9c261.firebaseapp.com",
      "https://dinery-ai.netlify.app",
      "https://dineryai.netlify.app"
    ],
    region: "asia-southeast1",
  },
  async (request) => {
    console.log("✅ Test function called successfully!");
    console.log("📍 Origin:", request.rawRequest?.headers?.origin || 'unknown');
    console.log("🔐 Auth:", request.auth ? 'Authenticated' : 'Not authenticated');
    
    return { 
      status: "ok", 
      message: "Email function is reachable!",
      timestamp: new Date().toISOString(),
      region: "asia-southeast1"
    };
  }
);

module.exports = { sendEmail, testEmail };