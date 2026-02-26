/**
 * Email Service — AI Hustle Engine
 * Uses SendGrid for transactional emails
 */

const https = require('https');
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = 'noreply@advancedmedias.com';
const FROM_NAME = 'AI Hustle Engine';
const SITE_URL = process.env.FRONTEND_URL || 'https://ai-hustle.advancedmedias.com';

const TIER_NAMES = {
  starter: 'AI Hustle Starter Kit',
  accelerator: 'AI Hustle Accelerator',
  inner_circle: 'AI Hustle Inner Circle'
};

// Core send function
function sendEmail(to, subject, html, text) {
  return new Promise((resolve, reject) => {
    if (!SENDGRID_API_KEY) {
      console.warn('[email] SENDGRID_API_KEY missing — skipping email to', to);
      return resolve({ success: false, reason: 'no_api_key' });
    }
    const body = JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: text || subject },
        { type: 'text/html',  value: html }
      ]
    });
    const req = https.request({
      hostname: 'api.sendgrid.com',
      path: '/v3/mail/send',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[email] Sent to', to, '— status', res.statusCode);
          resolve({ success: true });
        } else {
          console.error('[email] SendGrid error', res.statusCode, data);
          resolve({ success: false, statusCode: res.statusCode, error: data });
        }
      });
    });
    req.on('error', err => { console.error('[email] Request error:', err); resolve({ success: false, error: err.message }); });
    req.write(body);
    req.end();
  });
}

// Base HTML wrapper
function baseHtml(content) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:20px}
  .w{max-width:560px;margin:0 auto}
  .logo{font-size:20px;font-weight:800;color:#7c3aed;margin-bottom:28px;display:block}
  h1{font-size:24px;font-weight:800;color:#fff;margin:0 0 8px}
  h2{font-size:16px;font-weight:700;color:#f0f6fc;margin:0 0 12px}
  p{font-size:15px;color:#8b949e;line-height:1.6;margin:0 0 16px}
  .hero{background:linear-gradient(135deg,#1e1b4b,#312e81);border-radius:12px;padding:30px;text-align:center;margin-bottom:20px}
  .hero h1{color:#fff}.hero p{color:#a5b4fc;margin:0}
  .badge{display:inline-block;background:#7c3aed;color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:14px}
  .box{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:14px}
  ul{margin:0;padding:0;list-style:none}
  li{padding:5px 0;font-size:14px;color:#8b949e;line-height:1.5}
  li strong{color:#f0f6fc}
  .btn{display:block;background:#7c3aed;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;text-align:center;margin:22px 0}
  .creds{background:#0d1117;border:1px solid #7c3aed;border-radius:8px;padding:14px;font-size:13px}
  .creds p{margin:4px 0;color:#8b949e} .creds strong{color:#f0f6fc}
  .footer{text-align:center;color:#484f58;font-size:12px;margin-top:28px;line-height:1.8}
  a{color:#7c3aed}
</style></head><body><div class="w">
  <span class="logo">AI HUSTLE ENGINE</span>
  ${content}
  <div class="footer">
    AI Hustle Engine · AdvancedMedias<br>
    <a href="${SITE_URL}/unsubscribe" style="color:#484f58">Unsubscribe</a>
  </div>
</div></body></html>`;
}

// ── Welcome Email ─────────────────────────────────────────────────────────────

function tierFeatureList(tier) {
  if (tier === 'starter') return [
    '📘 <strong>AI Hustle Playbook</strong> — Complete guide to building AI income streams',
    '💡 <strong>100+ Prompt Vault</strong> — Copy-paste prompts for every business task',
    '✅ <strong>Quick-Start Checklist</strong> — Your 30-step action plan to first income',
    '🛠️ <strong>AI Tool Stack Guide</strong> — The exact tools we use to build AI income'
  ];
  if (tier === 'accelerator') return [
    '🎬 <strong>12-Module Video Course</strong> — Step-by-step training for every AI income model',
    '💡 <strong>100+ Prompt Vault</strong> — Copy-paste prompts for every business task',
    '📄 <strong>Done-For-You Templates</strong> — Proposals, cold emails, SOPs & more',
    '👥 <strong>Private Community</strong> — Connect with other AI hustlers',
    '🎙️ <strong>Weekly Q&A Recordings</strong> — Never miss a live session',
    '📘 <strong>AI Hustle Playbook + Checklist</strong> — Full starter kit included'
  ];
  return [
    '🎬 <strong>Everything in Accelerator</strong> — Full course, community, templates',
    '🤝 <strong>2 × 1-on-1 Coaching Sessions</strong> — We build YOUR business together',
    '💬 <strong>Direct Slack Access</strong> — Message Henry any time',
    '📊 <strong>Monthly Business Audits</strong> — Your AI strategy reviewed monthly',
    '🤖 <strong>Custom AI Assistant Setup</strong> — Built specifically for your business'
  ];
}

async function sendWelcomeEmail(user, tier) {
  const tierName = TIER_NAMES[tier] || 'AI Hustle Engine';
  const loginUrl = `${SITE_URL}/member/dashboard.html`;
  const features = tierFeatureList(tier).map(f => `<li>${f}</li>`).join('');

  const html = baseHtml(`
    <div class="hero">
      <div class="badge">${tierName}</div>
      <h1>Welcome, ${user.name || 'Hustler'}! 🚀</h1>
      <p>You made the smartest move of 2026. Your AI income journey starts now.</p>
    </div>
    <div class="box">
      <h2>🔐 Your Access Details</h2>
      <div class="creds">
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Member Portal:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
        <p><strong>Tier:</strong> ${tierName}</p>
      </div>
    </div>
    <div class="box">
      <h2>✅ What You Get</h2>
      <ul>${features}</ul>
    </div>
    <div class="box">
      <h2>🎯 Your First 3 Steps (do these today)</h2>
      <ul>
        <li>1️⃣ <strong>Log into your member portal</strong> — bookmark it</li>
        <li>2️⃣ <strong>Watch Module 1: The AI Opportunity</strong> — it's 56 seconds, no excuses</li>
        <li>3️⃣ <strong>Pick one prompt from the vault</strong> — use it on a real task right now</li>
      </ul>
    </div>
    <a href="${loginUrl}" class="btn">Access Your Member Portal →</a>
    <p style="text-align:center;font-size:13px">Questions? Just reply to this email.</p>
  `);

  const text = `Welcome to ${tierName}!\n\nLog in: ${loginUrl}\n\nYour first 3 steps:\n1. Log into your member portal\n2. Watch Module 1: The AI Opportunity\n3. Pick one prompt and use it today\n\nReply with any questions.`;

  return sendEmail(user.email, `Welcome to ${tierName} 🚀 — Your access is ready`, html, text);
}

// ── Purchase Receipt ──────────────────────────────────────────────────────────

async function sendReceiptEmail(user, tier, amount) {
  const tierName = TIER_NAMES[tier] || 'AI Hustle Engine';
  const html = baseHtml(`
    <h1>Your Receipt 🧾</h1>
    <p>Thanks for your purchase! Here's your receipt.</p>
    <div class="box">
      <h2>Order Details</h2>
      <ul>
        <li><strong>Product:</strong> ${tierName}</li>
        <li><strong>Amount:</strong> $${amount}</li>
        <li><strong>Email:</strong> ${user.email}</li>
        <li><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</li>
      </ul>
    </div>
    <p>Your welcome email with access details was sent separately. Check your inbox (and spam folder just in case).</p>
    <p>Questions about your order? Reply to this email.</p>
  `);

  const text = `Receipt for ${tierName} — $${amount}\n\nDate: ${new Date().toLocaleDateString()}\nEmail: ${user.email}\n\nYour welcome email with access details was sent separately.`;

  return sendEmail(user.email, `Your AI Hustle Engine Receipt — $${amount}`, html, text);
}

// ── Upsell Email (sent 24h after starter purchase) ────────────────────────────

async function sendStarterUpsellEmail(user) {
  const loginUrl = `${SITE_URL}/member/dashboard.html`;
  const upgradeUrl = `${SITE_URL}/#pricing`;
  const html = baseHtml(`
    <h1>How's it going, ${user.name || 'Hustler'}? 👋</h1>
    <p>It's been 24 hours since you joined the AI Hustle Starter Kit. I wanted to check in.</p>
    <div class="box">
      <h2>Most Starter Kit members ask us one thing...</h2>
      <p style="color:#f0f6fc;font-size:16px;font-style:italic">"Where's the video course? I want to see exactly how you do it step by step."</p>
      <p>That's in the <strong>Accelerator</strong> — our 12-module video course that walks you through every AI income model from scratch.</p>
    </div>
    <div class="box">
      <h2>What you're missing in Starter Kit:</h2>
      <ul>
        <li>🎬 <strong>12 video modules</strong> — watch over my shoulder as I build</li>
        <li>📄 <strong>Done-for-you templates</strong> — copy, paste, send</li>
        <li>👥 <strong>Private community</strong> — 24/7 support from other AI hustlers</li>
        <li>🎙️ <strong>Weekly live Q&A recordings</strong> — all questions answered</li>
      </ul>
    </div>
    <p>Upgrade to Accelerator today for <strong>$97</strong> (just $70 more — your $27 is already applied).</p>
    <a href="${upgradeUrl}" class="btn">Upgrade to Accelerator — $70 Today →</a>
    <p style="text-align:center;font-size:13px">Or <a href="${loginUrl}">continue with your Starter Kit</a> — no pressure.</p>
  `);

  const text = `How's your AI Hustle journey going?\n\nThe Accelerator upgrade is $70 more ($27 already applied).\nIt includes the full 12-module video course, done-for-you templates, and private community.\n\nUpgrade here: ${upgradeUrl}`;

  return sendEmail(user.email, `Your next step after the Starter Kit 🚀`, html, text);
}

// ── Password Reset ────────────────────────────────────────────────────────────

async function sendPasswordResetEmail(user, resetToken) {
  const resetUrl = `${SITE_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;
  const html = baseHtml(`
    <h1>Reset Your Password 🔑</h1>
    <p>We received a password reset request for your AI Hustle Engine account.</p>
    <p>Click the button below to set a new password. This link expires in 1 hour.</p>
    <a href="${resetUrl}" class="btn">Reset My Password →</a>
    <p style="font-size:13px;text-align:center">If you didn't request this, ignore this email — your account is safe.</p>
  `);
  const text = `Reset your AI Hustle Engine password:\n${resetUrl}\n\nThis link expires in 1 hour.`;
  return sendEmail(user.email, 'Reset your AI Hustle Engine password', html, text);
}

module.exports = { sendEmail, sendWelcomeEmail, sendReceiptEmail, sendStarterUpsellEmail, sendPasswordResetEmail };
