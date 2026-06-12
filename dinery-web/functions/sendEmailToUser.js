// functions/sendEmailToUser.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

const db = admin.firestore();

module.exports = functions.https.onRequest((req, res) =>
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send({ error: "Only POST requests are allowed" });
      }

      const { email, title, body, created_at } = req.body;

      if (!email || !title || !body || !created_at) {
        return res.status(400).send({
          error: "Missing email, title, body, or created_at",
        });
      }

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>${title}</h2>
          <p>${body}</p>
          <p><strong>Reservation Date:</strong> ${created_at}</p>
        </div>
      `;

      // Add to mail collection for Firebase Email Extension
      await db.collection('mail').add({
        to: [email],
        message: {
          subject: title,
          html: htmlContent,
        },
      });

      console.log(`✅ Email queued for: ${email}`);
      return res.status(200).send({ success: true });
    } catch (error) {
      console.error("❌ Error queueing email:", error);
      return res.status(500).send({ error: error.message });
    }
  })
);