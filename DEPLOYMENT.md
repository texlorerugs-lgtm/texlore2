# Texlore — Production Deployment Guide

This guide walks you through taking Texlore from local development to a fully
functioning production deployment.

**Recommended stack:**

| Layer | Provider | Cost tier |
|---|---|---|
| Frontend | Vercel or Netlify | Free (Hobby) |
| Backend | Render, Railway, or DigitalOcean App Platform | ~$7/mo |
| Database | MongoDB Atlas | Free (M0) |
| Images | Cloudinary | Free tier fine |
| Email | Gmail SMTP (App Password) / SendGrid | Free |
| Payments | Razorpay | Per-transaction |
| Domain / SSL | Cloudflare + your registrar | ~$10/yr |

---

## 0. Prerequisites checklist

- [ ] Domain name purchased (e.g. `texlore.com`)
- [ ] MongoDB Atlas account + project created
- [ ] Cloudinary account with API credentials
- [ ] Razorpay account (KYC completed for live keys; test keys work for staging)
- [ ] SMTP credentials (Gmail App Password: https://myaccount.google.com/apppasswords)
- [ ] GitHub repository with the Texlore code pushed

---

## 1. MongoDB Atlas

1. Create a free **M0** cluster in the region nearest your users.
2. **Database Access** → add a database user with a strong password
   (`Read and write to any database` role).
3. **Network Access** → add:
   - `0.0.0.0/0` for now (open to internet) or, better,
   - The specific outbound IPs of your Render/Railway service.
4. **Connect → Drivers** → copy the connection string. Replace
   `<username>` and `<password>` and append `/texlore` before the query
   string:

   ```
   mongodb+srv://texlore_user:<password>@cluster0.mongodb.net/texlore?retryWrites=true&w=majority
   ```

5. Enable **Backup** (free daily snapshots on M0+).

---

## 2. Cloudinary

1. Sign up → Dashboard → copy:
   - `Cloud name`
   - `API Key`
   - `API Secret`
2. In **Settings → Upload**, no changes required — the app uses signed uploads
   directly from the server.
3. (Optional) **Settings → Security → Restricted media types**: allow only
   `image` to prevent abuse.

---

## 3. SMTP

### Option A — Gmail (fastest)

1. Enable 2-Step Verification on the Google account.
2. https://myaccount.google.com/apppasswords → generate a 16-character app
   password.
3. Use:
   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=587`
   - `SMTP_SECURE=false`
   - `SMTP_USER=texlorerug@gmail.com`
   - `SMTP_PASS=<the 16-char app password>`

### Option B — SendGrid / Mailgun / AWS SES

Get their SMTP relay credentials. Update the four `SMTP_*` env vars the
same way. Deliverability is dramatically better than Gmail past ~100
emails/day.

---

## 4. Razorpay

1. https://dashboard.razorpay.com → sign in.
2. Complete KYC if you're going live. For test mode you can skip.
3. **Account & Settings → API Keys** → generate keys.
   - `RAZORPAY_KEY_ID` — starts with `rzp_test_…` or `rzp_live_…`
   - `RAZORPAY_KEY_SECRET` — copy immediately (shown once)
4. **Webhooks → Add new webhook:**
   - URL: `https://your-domain.example/api/v1/payments/webhook`
   - Alert email: `texlorerug@gmail.com`
   - Secret: generate a strong random string; put it in `RAZORPAY_WEBHOOK_SECRET`
   - Events to subscribe:
     - `payment.captured`
     - `payment.authorized`
     - `payment.failed`
5. Test in Test Mode using card `4111 1111 1111 1111`, any CVV, any future
   expiry, OTP `1234`.

---

## 5. Backend — Render / Railway / DigitalOcean

The server is a plain Node/Express app; any Node host works. Below shows
**Render** because it's zero-config and free-friendly.

### Render steps

1. **New → Web Service** → connect your GitHub repo.
2. **Root directory:** `server`
3. **Build command:** `npm ci && npm run build`
4. **Start command:** `npm start`
5. **Environment:** Node 20
6. **Instance type:** Starter ($7/mo) — the free tier sleeps and will break
   the webhook.
7. Under **Environment → Environment Variables**, add every variable in
   `server/.env.example`. Critical:

   | Variable | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` (Render sets `$PORT` automatically; the app reads it) |
   | `API_BASE_URL` | `https://api.your-domain.example` |
   | `CLIENT_URL` | `https://your-domain.example` |
   | `MONGO_URI` | (from step 1) |
   | `JWT_ACCESS_SECRET` | `openssl rand -base64 64` |
   | `JWT_REFRESH_SECRET` | different `openssl rand -base64 64` |
   | `COOKIE_SECRET` | 32+ char random string |
   | `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_SECRET_KEY` | your admin bootstrap |
   | `CLOUDINARY_*` | (from step 2) |
   | `SMTP_*` | (from step 3) |
   | `RAZORPAY_*` | (from step 4) |

8. **Add a custom domain** → `api.your-domain.example` and follow the
   CNAME instructions. Render provisions SSL automatically.
9. Deploy. The server refuses to boot on missing env vars — you'll see a
   clear listing in logs if anything is missing.
10. Once healthy, run the seed once via the Render shell:

    ```bash
    npm run seed
    ```

    This creates the initial admin + 4 categories + 20 products with real
    Cloudinary imagery.

### Alternative — Railway

- Create a new project → deploy from GitHub → set root to `/server`.
- Build: `npm ci && npm run build`
- Start: `npm start`
- Same env vars.

### Alternative — DigitalOcean App Platform

- App Spec: Node, root `/server`, HTTP port `5000`.
- Same env vars.

---

## 6. Frontend — Vercel / Netlify

### Vercel steps

1. **Add New Project** → import the GitHub repo.
2. **Root directory:** `client`
3. **Framework preset:** Vite (auto-detected)
4. **Build command:** `npm run build`
5. **Output directory:** `dist`
6. **Environment Variables:**

   | Variable | Value |
   |---|---|
   | `VITE_API_URL` | `https://api.your-domain.example/api/v1` |
   | `VITE_APP_NAME` | `Texlore` |
   | `VITE_DEFAULT_CURRENCY` | `INR` |
   | `VITE_SUPPORTED_CURRENCIES` | `INR,USD` |
   | `VITE_RAZORPAY_KEY_ID` | your Razorpay **public** key |

7. Assign the root domain (`texlore.com`) and `www` redirect.
8. Deploy.

### SPA fallback

Vercel and Netlify auto-handle client-side routing. If you deploy behind an
Nginx/S3+CloudFront setup, make sure every unknown path serves `index.html`
so React Router can handle it.

### Update robots.txt + sitemap.xml

Both files in `client/public/` are seeded with `https://your-domain.example`.
Edit them to your real domain before your first production deploy.

---

## 7. Post-deploy verification

Run these smoke tests, in order, once both services are live:

1. **Health:** `curl https://api.your-domain.example/health` → returns
   `{"success":true,"data":{"status":"ok"...}}`
2. **Signup:** Register a real account on `/signup` and confirm the OTP
   email lands within 30 seconds.
3. **Login + browse:** Sign in, open a product page, check the image zoom.
4. **Cart + coupon:** Add a rug to cart. Create a test coupon in
   `/admin/coupons`; apply it on `/cart`. Confirm the total drops.
5. **Checkout (Razorpay Test Mode):** Pay with test card
   `4111 1111 1111 1111`. Confirm:
   - Modal closes on success
   - Redirected to `/order-success/TXL-…`
   - Confirmation email arrives with **PDF invoice attached**
   - Admin gets the new-order email
   - `/admin/orders` shows the order
   - Product's stock is decremented in `/admin/products`
6. **Webhook:** In Razorpay dashboard → Webhooks → find the delivery for
   the payment → confirm `200 OK` response.
7. **Failure path:** Start another payment, close the Razorpay modal. Confirm:
   - No order created
   - No email sent
   - Stock unchanged
   - Payment row shows `status=failed` in DB
8. **Admin lockout:** Try wrong admin password 5 times. Confirm the account
   locks for 15 minutes.
9. **Refresh survives reload:** With a signed-in user tab open, force-refresh.
   The user should stay signed in (silent refresh via httpOnly cookie).
10. **CORS + credentials:** Open the client from your production domain and
    ensure API calls succeed. If you see CORS errors, `CLIENT_URL` on the
    server env is wrong.

---

## 8. Ongoing operations

- **Log rotation:** Winston writes to `logs/*.log` — bind-mount to a volume
  or ship to a log aggregator (Betterstack, Datadog, Papertrail).
- **Backups:** Atlas takes snapshots automatically; also run periodic
  `mongodump` if you need offsite copies.
- **Uptime monitoring:** UptimeRobot or BetterUptime hitting `/health` every
  5 minutes.
- **Rotating secrets:** Change any of the `ADMIN_*` env vars, re-run
  `npm run seed`, restart the service. The seed script upserts admin
  credentials idempotently.

---

## 9. Cost napkin math (small business)

| Line | Monthly |
|---|---|
| Vercel Hobby (frontend) | $0 |
| Render Starter (backend) | $7 |
| MongoDB Atlas M0 | $0 |
| Cloudinary Free (25 GB) | $0 |
| Domain (~$10/yr) | ~$1 |
| Razorpay | per-transaction (~2%) |
| **Total fixed** | **~$8/month** |

Scale up incrementally: Render `Standard` ($25/mo) once you have >20 orders
per day; Atlas M10 ($9/mo) when data volume warrants indexes and backups.
