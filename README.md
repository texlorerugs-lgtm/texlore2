# Texlore — Luxury Carpet E-Commerce Platform

Production-grade e-commerce platform for premium carpets and rugs, built for India + International markets.

- **Frontend:** React 19 + Vite + TypeScript + TailwindCSS + Redux Toolkit + Framer Motion + GSAP
- **Backend:** Node.js LTS + Express + TypeScript + MongoDB Atlas + Mongoose
- **Payments:** Razorpay (INR domestic + international cards / USD)
- **Media:** Cloudinary
- **Email:** Nodemailer (SMTP)
- **Auth:** JWT access + refresh token rotation, bcrypt, OTP via SMTP

---

## Repository Layout

```
texlore/
├── client/          # React 19 + Vite + TS (user site + admin dashboard SPA)
├── server/          # Express + TS backend (REST API)
├── README.md
└── .gitignore
```

Each sub-project has its own `package.json`, `.env.example`, and `README`. See:

- [`server/README.md`](./server/README.md) — API, models, environment
- [`client/README.md`](./client/README.md) — pages, routing, state

---

## Quick Start (local development)

### 1. Prerequisites

- Node.js **20 LTS** or higher
- npm 10+
- A MongoDB Atlas cluster (free tier works)
- A Cloudinary account
- SMTP credentials (Gmail App Password, SendGrid, Mailgun, etc.)
- A Razorpay account (Test Mode keys are fine for development)

### 2. Backend

```bash
cd server
cp .env.example .env      # then fill in real values
npm install
npm run seed              # seeds initial 4 categories + 20 products
npm run dev               # starts on http://localhost:5000
```

The server refuses to boot if any required env var is missing. This is enforced by `src/config/env.ts`.

### 3. Frontend

```bash
cd client
cp .env.example .env
npm install
npm run dev               # starts on http://localhost:5173
```

### 4. Admin access

The admin login page is intentionally **not linked** anywhere in the UI.
Navigate manually to:

```
http://localhost:5173/admin/login
```

You will need Name + Admin Gmail + Password + Secret Key + Email OTP.
The initial admin is created by the seed script using the values in `server/.env`.

---

## Milestone Progress

- [x] **M1** — Scaffold, env validation, DB/Cloudinary/SMTP connections, security middleware
- [x] **M2** — Auth (user signup+OTP, login, forgot password, admin 5-factor login)
- [x] **M3** — Category + Product modules + real seed catalog (4 categories × 5 products)
- [x] **M4** — Cart, Address, Coupon engine, Contact form
- [x] **M5** — Razorpay pipeline (create → verify → order → stock → email), invoices, orders
- [x] **M6** — Storefront (Home, Category, Product w/ zoom, Profile, About, sticky header, currency selector)
- [x] **M7** — Admin dashboard (sidebar, dashboard home w/ charts, categories, products, orders, coupons, customers, messages, analytics, settings)
- [ ] **M8** — Email templates, invoice PDF, SEO, deployment docs, final checklist

---

## Deployment Targets (planned)

- **Frontend:** Vercel or Netlify
- **Backend:** Render, Railway, or DigitalOcean App Platform
- **Database:** MongoDB Atlas
- **Media:** Cloudinary
- **Domain:** HTTPS + SSL required

Full deployment guide will be delivered in Milestone 8.
