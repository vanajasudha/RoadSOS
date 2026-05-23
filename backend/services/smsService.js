const https = require('https');

// Mask all but last 4 digits of a phone number to avoid logging PII
const maskPhone = p => {
  const s = String(p).replace(/\D/g, '');
  return s.length > 4 ? `${'*'.repeat(s.length - 4)}${s.slice(-4)}` : '****';
};

// ── MSG91 SMS sender with console fallback ────────────────────────────────────
const sendSMS = async (phone, message) => {
  const authKey = process.env.MSG91_AUTH_KEY;

  if (!authKey) {
    // No MSG91 key — log delivery in dev only; never log full phone or auth keys
    console.log(`[SMS FALLBACK] to=${maskPhone(phone)} | No MSG91_AUTH_KEY configured`);
    return {success: false, fallback: true};
  }

  const senderId = process.env.MSG91_SENDER_ID || 'ROADSS';
  const route    = process.env.MSG91_ROUTE    || '4';

  // Normalize to E.164 format without +
  const digits    = phone.replace(/\D/g, '');
  const fullPhone = digits.startsWith('91') ? digits : `91${digits}`;

  const payload = JSON.stringify({
    sender: senderId,
    route,
    country: '91',
    sms: [{message, to: [fullPhone]}],
  });

  return new Promise(resolve => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.msg91.com',
        path: '/api/v2/sendsms',
        headers: {
          authkey: authKey,
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(payload),
        },
      },
      res => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const ok = parsed.type === 'success';
            if (!ok) {console.warn('[SMS] MSG91 response:', parsed);}
            resolve({success: ok, data: parsed});
          } catch {
            resolve({success: false, raw: body});
          }
        });
      },
    );
    req.on('error', err => {
      console.error('[SMS] Request error:', err.message);
      resolve({success: false, error: err.message});
    });
    req.write(payload);
    req.end();
  });
};

// ── Message templates ─────────────────────────────────────────────────────────
const buildHospitalMessage = (location, userPhone, userName) => {
  const mapsLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  return (
    `EMERGENCY ALERT from ROADSoS.\n` +
    `Possible road accident detected.\n` +
    `Live location: ${mapsLink}\n` +
    `User phone: ${userPhone || 'Unknown'}` +
    (userName ? `\nUser name: ${userName}` : '') +
    `\nPlease dispatch immediately.\n- ROADSoS Emergency System`
  );
};

const buildContactMessage = (location, userName, userPhone) => {
  const mapsLink = `https://maps.google.com/?q=${location.lat},${location.lng}`;
  return (
    `EMERGENCY: ${userName || 'Someone you know'} triggered a road accident SOS on ROADSoS.\n` +
    `Location: ${mapsLink}\n` +
    `Call them immediately: ${userPhone || 'Check the app'}\n` +
    `- ROADSoS Emergency Alert`
  );
};

module.exports = {sendSMS, buildHospitalMessage, buildContactMessage};
