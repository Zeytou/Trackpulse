const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ error: 'Webhook invalide' });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata.user_id;

    await supabase
      .from('profiles')
      .update({ plan: 'beta', stripe_customer_id: session.customer })
      .eq('id', userId);
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', profile.id);
    }
  }

  return res.status(200).json({ received: true });
};
