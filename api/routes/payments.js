const express = require('express');
const router = express.Router();
const db = require('../database');
const { sendWelcomeEmail, sendReceiptEmail } = require('../email-service');

// Stripe configuration
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

let stripe;
if (STRIPE_SECRET_KEY) {
  stripe = require('stripe')(STRIPE_SECRET_KEY);
}

// Price IDs for each tier (to be configured in Stripe dashboard)
const PRICE_IDS = {
  starter: process.env.STRIPE_PRICE_STARTER,
  accelerator: process.env.STRIPE_PRICE_ACCELERATOR,
  inner_circle: process.env.STRIPE_PRICE_INNER_CIRCLE
};

// Tier amounts (fallback if price IDs not set)
const TIER_AMOUNTS = {
  starter: 2700,      // $27.00
  accelerator: 9700,  // $97.00
  inner_circle: 29700 // $297.00
};

// Create checkout session
router.post('/create-checkout-session', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Payment processing not configured' 
      });
    }

    const { tier, email, success_url, cancel_url } = req.body;
    
    if (!tier || !['starter', 'accelerator', 'inner_circle'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier selected' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    // Build line items
    const lineItems = [];
    
    if (PRICE_IDS[tier]) {
      // Use pre-configured price ID
      lineItems.push({
        price: PRICE_IDS[tier],
        quantity: 1
      });
    } else {
      // Create price on the fly
      const tierNames = {
        starter: 'AI Hustle Engine - Starter Kit',
        accelerator: 'AI Hustle Engine - Accelerator',
        inner_circle: 'AI Hustle Engine - Inner Circle'
      };
      
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: tierNames[tier],
            description: 'Complete AI income generation system'
          },
          unit_amount: TIER_AMOUNTS[tier]
        },
        quantity: 1
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: success_url || `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL}/pricing`,
      customer_email: email,
      metadata: {
        tier: tier,
        email: email
      }
    });

    res.json({ sessionId: session.id, url: session.url });
    
  } catch (err) {
    console.error('Checkout session error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  let event;
  
  try {
    if (STRIPE_WEBHOOK_SECRET) {
      const signature = req.headers['stripe-signature'];
      event = stripe.webhooks.constructEvent(req.body, signature, STRIPE_WEBHOOK_SECRET);
    } else {
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payment
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    try {
      const { tier, email } = session.metadata;
      
      // Create or get user
      let user = db.getUserByEmail.get(email.toLowerCase());
      
      if (!user) {
        // Create new user
        const bcrypt = require('bcryptjs');
        const tempPassword = Math.random().toString(36).substring(2, 15);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        db.createUser.run(email.toLowerCase(), null, hashedPassword);
        user = db.getUserByEmail.get(email.toLowerCase());
      }
      
      // Record purchase
      db.createPurchase.run(
        user.id,
        tier,
        TIER_AMOUNTS[tier],
        session.payment_intent,
        'completed'
      );
      
      console.log(`Payment successful for ${email}, tier: ${tier}`);
      
      // Send welcome + receipt emails
      try {
        await sendWelcomeEmail(user, tier);
        await sendReceiptEmail(user, tier, TIER_AMOUNTS[tier] / 100);
        console.log(`Welcome + receipt emails sent to ${email}`);
      } catch (emailErr) {
        console.error('Email send failed (non-fatal):', emailErr.message);
      }
      
    } catch (err) {
      console.error('Error processing successful payment:', err);
    }
  }

  res.json({ received: true });
});

// Get purchase status
router.get('/purchase-status', async (req, res) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }
    
    const user = db.getUserByEmail.get(email.toLowerCase());
    
    if (!user) {
      return res.json({ hasPurchased: false });
    }
    
    const purchases = db.getPurchasesByUser.all(user.id);
    const hasPurchased = purchases.length > 0;
    const highestTier = purchases.length > 0 
      ? purchases.sort((a, b) => b.id - a.id)[0].tier 
      : null;
    
    res.json({
      hasPurchased,
      tier: highestTier,
      purchases: purchases.map(p => ({
        tier: p.tier,
        date: p.purchased_at,
        amount: p.amount_cents / 100
      }))
    });
    
  } catch (err) {
    console.error('Purchase status error:', err);
    res.status(500).json({ error: 'Failed to check purchase status' });
  }
});

// Upgrade tier (for existing customers)
router.post('/upgrade', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Payment processing not configured' });
    }

    const { currentTier, targetTier, email } = req.body;
    
    // Calculate upgrade price (difference between tiers)
    const upgradeAmounts = {
      'starter:accelerator': 7000,      // $70 (97-27)
      'starter:inner_circle': 27000,    // $270 (297-27)
      'accelerator:inner_circle': 20000 // $200 (297-97)
    };
    
    const upgradeKey = `${currentTier}:${targetTier}`;
    const amount = upgradeAmounts[upgradeKey];
    
    if (!amount) {
      return res.status(400).json({ error: 'Invalid upgrade path' });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AI Hustle Engine - Upgrade to ${targetTier}`,
            description: `Upgrade from ${currentTier} to ${targetTier}`
          },
          unit_amount: amount
        },
        quantity: 1
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/upgrade-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/pricing`,
      customer_email: email,
      metadata: {
        tier: targetTier,
        email: email,
        upgrade: 'true',
        from_tier: currentTier
      }
    });

    res.json({ sessionId: session.id, url: session.url });
    
  } catch (err) {
    console.error('Upgrade error:', err);
    res.status(500).json({ error: 'Failed to create upgrade session' });
  }
});

module.exports = router;
