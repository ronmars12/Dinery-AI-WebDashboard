// functions/sendToUser.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

module.exports = functions.https.onRequest((req, res) =>
  cors(req, res, async () => {
    try {
      if (req.method !== "POST") {
        return res.status(405).send({ error: "Only POST requests are allowed" });
      }

      const { token, title, body, created_at } = req.body;
      
      if (!token || !title || !body || !created_at) {
        return res.status(400).send({
          error: "Missing token, title, body, or created_at",
        });
      }

      const message = {
        notification: {
          title,
          body: `${body} — Reservation Date: ${created_at}`,
        },
        token,
      };

      await admin.messaging().send(message);
      console.log(`✅ Notification sent to token: ${token}`);
      
      return res.status(200).send({ success: true });
    } catch (error) {
      console.error("❌ Error sending notification:", error);
      return res.status(500).send({ error: error.message });
    }
  })
);