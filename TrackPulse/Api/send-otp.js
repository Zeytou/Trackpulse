const { Resend } = require('resend');
const { createClient } = require('@supabase/supabase-js');

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 3600000);

  const { error: dbError } = await supabase
    .from('otp_codes')
    .upsert({ email, code: otp, expires_at: expires.toISOString() });

  if (dbError) return res.status(500).json({ error: 'Erreur base de données' });

  const { error: emailError } = await resend.emails.send({
    from: 'TrackPulse <onboarding@resend.dev>',
    to: email,
    subject: 'Ton code TrackPulse 🚀',
    html: `
      <div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;background:#0c0b12;color:#ede9ff">
        <h1 style="font-size:24px;font-weight:700">Track<span style="color:#7c5cfc">Pulse</span></h1>
        <p style="color:#7a748f">Bonjour ${name || ''} 👋</p>
        <p style="font-size:16px;margin:24px 0 16px">Ton code de vérification :</p>
        <div style="background:#13121e;border:2px solid #7c5cfc;border-radius:12px;padding:24px;text-align:center">
          <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#7c5cfc">${otp}</div>
        </div>
        <p style="color:#7a748f;font-size:13px;margin-top:20px">Expire dans 1 heure.</p>
      </div>
    `
  });

  if (emailError) return res.status(500).json({ error: 'Erreur envoi email' });

  return res.status(200).json({ success: true });
};