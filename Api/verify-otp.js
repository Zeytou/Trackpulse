const { createClient } = require('@supabase/supabase-js');

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

  const { email, code, name, password } = req.body;
  if (!email || !code) return res.status(400).json({ error: 'Email et code requis' });

  const { data: otpData, error: otpError } = await supabase
    .from('otp_codes')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (otpError || !otpData) return res.status(400).json({ error: 'Code invalide ou expiré' });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name }
  });

  if (authError) {
    if (authError.message.includes('already')) {
      return res.status(400).json({ error: 'Ce compte existe déjà. Connecte-toi.' });
    }
    return res.status(500).json({ error: authError.message });
  }

  await supabase.from('otp_codes').delete().eq('email', email);

  return res.status(200).json({
    success: true,
    user: { id: authData.user.id, email, name }
  });
};