/* server.js - minimal Express server for Twilio SMS sending
   NOTE: DO NOT commit real credentials. Use environment variables.
   Example: export TWILIO_ACCOUNT_SID=ACxxxx; export TWILIO_AUTH_TOKEN=xxxx; export TWILIO_FROM=+91xxxxx
*/
const express = require('express');
const bodyParser = require('body-parser');
let twilio;
try { twilio = require('twilio'); } catch(e) { console.warn('Twilio not installed; SMS endpoint will error until twilio is installed.'); }

const app = express();
app.use(bodyParser.json());

const accountSid = process.env.TWILIO_ACCOUNT_SID || 'TWILIO_ACCOUNT_SID_HERE';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'TWILIO_AUTH_TOKEN_HERE';
const fromNumber = process.env.TWILIO_FROM || 'TWILIO_FROM_NUMBER';

app.post('/send-sms', async (req, res) => {
  const { number, message } = req.body;
  if (!number || !message) return res.status(400).json({ success:false, error:'number and message required' });
  if (!twilio) return res.status(500).json({ success:false, error:'Twilio library not installed on server' });

  try {
    const client = twilio(accountSid, authToken);
    const sms = await client.messages.create({ body: message, to: number, from: fromNumber });
    res.json({ success:true, sid: sms.sid });
  } catch(err) {
    console.error('Twilio error:', err);
    res.status(500).json({ success:false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`SMS server running on port ${PORT}`));
