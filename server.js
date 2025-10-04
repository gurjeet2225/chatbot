const express = require("express");
const bodyParser = require("body-parser");
const twilio = require("twilio");

const app = express();
app.use(bodyParser.json());

// replace these with your Twilio account details
const accountSid = "ACa74aa94e88283f49b0efa78aadc44720";
const authToken = "H45BYKLRNX15D5JFEXFAKHSZ";
const client = new twilio(accountSid, authToken);

app.post("/send-sms", async (req, res) => {
  try {
    const { number, message } = req.body;
    const sms = await client.messages.create({
      body: message,
      to: `+${number}`,           // number with country code
      from: "918427748780"  // your Twilio number
    });
    res.json({ success: true, sid: sms.sid });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("🚀 SMS server running at http://localhost:3000"));
