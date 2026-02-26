# AI Hustle Engine Website Setup

**Domain:** ai-hustle.advancedmedias.com  
**Server:** 145.223.74.253 (srv1307230)  
**Local Path:** `/home/clawd/clawd/projects/ai-hustle-website/`

---

## Step 1: DNS Configuration

Add a CNAME record in your AdvancedMedias.com DNS settings:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | ai-hustle | srv1307230.openclaw.ai. | 3600 |

**OR** use an A record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | ai-hustle | 145.223.74.253 | 3600 |

---

## Step 2: Nginx Configuration

Create a new nginx config file:

```bash
sudo nano /etc/nginx/sites-available/ai-hustle.advancedmedias.com
```

Add this configuration:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name ai-hustle.advancedmedias.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai-hustle.advancedmedias.com;

    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/ai-hustle.advancedmedias.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ai-hustle.advancedmedias.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Static files (landing page, member area, admin)
    location / {
        root /home/clawd/clawd/projects/ai-hustle-website/public;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # API server (Node.js on port 3457)
    location /api/ {
        proxy_pass http://localhost:3457/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Stripe webhook endpoint (raw body needed)
    location /api/payments/webhook {
        proxy_pass http://localhost:3457/payments/webhook;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-hustle.advancedmedias.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 3: SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d ai-hustle.advancedmedias.com
```

Follow the prompts to obtain and install the SSL certificate.

---

## Step 4: Start the API Server

The API server needs to run on port 3457. Create a systemd service:

```bash
sudo nano /etc/systemd/system/ai-hustle-api.service
```

Add:

```ini
[Unit]
Description=AI Hustle Engine API
After=network.target

[Service]
Type=simple
User=clawd
WorkingDirectory=/home/clawd/clawd/projects/ai-hustle-website/api
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3457

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-hustle-api
sudo systemctl start ai-hustle-api
```

Check status:

```bash
sudo systemctl status ai-hustle-api
```

---

## Step 5: Environment Variables

Create a `.env` file in `/home/clawd/clawd/projects/ai-hustle-website/api/`:

```
# Server
NODE_ENV=production
PORT=3457
FRONTEND_URL=https://ai-hustle.advancedmedias.com

# Database (SQLite auto-creates)
DB_PATH=./data/ai-hustle.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_ACCELERATOR=price_...
STRIPE_PRICE_INNER_CIRCLE=price_...

# SendGrid (for admin emails)
SENDGRID_API_KEY=SG.xxx
N8N_ADMIN_EMAIL_WEBHOOK=https://n8n.frnd.us/webhook/admin-email

# Admin
ADMIN_SECRET_KEY=your-admin-secret-key
```

---

## File Structure

```
/home/clawd/clawd/projects/ai-hustle-website/
├── public/                    # Static files (served by nginx)
│   ├── index.html            # Sales page
│   ├── member/               # Member area
│   │   ├── dashboard.html
│   │   └── module.html
│   └── admin/                # Admin dashboard
│       └── index.html
├── api/                       # Node.js API
│   ├── server.js
│   ├── database.js
│   ├── package.json
│   ├── course-content.json
│   ├── prompt-vault.json
│   └── routes/
│       ├── payments.js
│       └── admin.js
└── data/                      # SQLite database (auto-created)
```

---

## Verification Checklist

After setup, verify:

- [ ] DNS resolves: `nslookup ai-hustle.advancedmedias.com`
- [ ] HTTPS works: `curl https://ai-hustle.advancedmedias.com`
- [ ] API responds: `curl https://ai-hustle.advancedmedias.com/api/health`
- [ ] Stripe webhooks configured in Stripe dashboard
- [ ] SendGrid sender authentication configured

---

## Next Steps

1. **Get API Keys:**
   - Stripe (secret key + webhook secret)
   - SendGrid (for transactional emails)

2. **Configure Stripe Webhooks:**
   - Endpoint: `https://ai-hustle.advancedmedias.com/api/payments/webhook`
   - Events: `checkout.session.completed`

3. **Test Purchase Flow:**
   - Use Stripe test mode
   - Verify user creation
   - Check email delivery

4. **Launch:**
   - Switch Stripe to live mode
   - Enable real emails
   - Announce to your audience
