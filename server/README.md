# Texlore Server

Node.js + Express + TypeScript backend for the Texlore e-commerce platform.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server with hot reload (`tsx watch`) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS in production |
| `npm run seed` | Seed initial admin + categories + products |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint source |

## Environment

Every env var in `.env.example` is validated at boot by `src/config/env.ts` (zod schema).
Missing or invalid values will cause the server to exit immediately with a clear error.

## Folder Structure

```
src/
├── config/          # env, db, cloudinary, mailer, razorpay
├── controllers/     # thin — parse req, call service, respond
├── routes/          # route -> validator -> auth -> controller
├── models/          # Mongoose schemas
├── middlewares/     # auth, admin, rate limit, security, errors
├── services/        # business logic (auth, order, payment, email...)
├── validators/      # express-validator / zod schemas
├── helpers/         # pure helpers (OTP gen, price calc, ...)
├── utils/           # ApiError, apiResponse, logger, asyncHandler
├── templates/       # HTML email templates
├── jobs/            # scheduled tasks (OTP cleanup, trash purge)
├── types/           # shared TS types
├── app.ts           # Express app composition
└── index.ts         # bootstrap: env -> db -> cloudinary -> smtp -> listen
```

## API Envelope

All responses follow:

```jsonc
// success
{ "success": true, "message": "OK", "data": { ... }, "errors": null }
// failure
{ "success": false, "message": "...", "data": null, "errors": [ ... ] | null }
```

Enforced by `utils/apiResponse.ts` — never return raw objects.

## Health Check

- `GET /health` — infrastructure liveness
- `GET /api/v1/health` — API v1 readiness

## Milestone 1 status ✅

- [x] Folder structure, env validation (zod, fail-fast), DB/Cloudinary/SMTP connections
- [x] Global security, rate limiters, standard response envelope, winston logger, graceful shutdown

## Milestone 2 status ✅ (Auth)

### Models (all with indexes, TTLs, `toJSON` scrubbing)
- `User` — bcrypt-hashed password, addresses embedded, unique (email) + unique (countryCode+phone)
- `Admin` — bcrypt-hashed password + secretKey, permissions[], failedAttempts, accountLockedUntil, loginHistory[]
- `RefreshToken` — server-side registry with jti, audience, revocation + TTL auto-cleanup
- `Otp` — one collection, three purposes (signup, password_reset, admin_login); bcrypt-hashed codes; TTL

### Services
- `otp.service.ts` — issue with resend cooldown + max resends; verify with attempt cap + single-use
- `auth.service.ts` — signup request/verify, login, forgot request/reset, refresh rotation with reuse detection
- `admin-auth.service.ts` — 5-factor preLogin + completeLogin, 5-attempt lockout for 15 min, history capping
- `email.service.ts` — Nodemailer wrapper with structured logging

### Endpoints (all with express-validator + rate limits)
```
POST /api/v1/auth/signup/request        → sends OTP
POST /api/v1/auth/signup/verify         → creates user, sets refresh cookie, returns access token
POST /api/v1/auth/signup/resend         → resend OTP (cooldown + max enforced)
POST /api/v1/auth/login                 → sets refresh cookie, returns access token
POST /api/v1/auth/refresh               → rotates refresh, returns new access
POST /api/v1/auth/logout                → revokes refresh, clears cookie
GET  /api/v1/auth/me                    → current user profile
POST /api/v1/auth/forgot/request        → sends reset OTP (silent for unknown emails)
POST /api/v1/auth/forgot/reset          → resets password, invalidates all refresh tokens

POST /api/v1/admin/auth/login/prepare   → verify 4 static factors, send OTP
POST /api/v1/admin/auth/login/verify    → verify OTP, issue admin tokens
POST /api/v1/admin/auth/refresh
POST /api/v1/admin/auth/logout
GET  /api/v1/admin/auth/me
```

### Emails delivered
- User signup OTP (subject includes preview)
- Password reset OTP
- Admin login OTP
- Welcome (on successful signup)
- Admin notification: new user signup (goes to ADMIN_EMAIL)

### Seed script
`npm run seed` bootstraps a single admin from `ADMIN_*` env vars (hashes password + secret key with bcrypt 12 rounds). Rerun safely — it upserts.

## Milestone 3 status ✅ (Categories + Products)

### New models
- `Category` — soft-delete via `deletedAt`, partial-unique slug index, image (Cloudinary asset), `productCount` denorm
- `Product` — 1..7 Cloudinary images, 1..N size variations each with independent stock/price/discount, primary variation enforced by `pre('save')` hook, denormalized `minPrice`/`maxDiscountPercent`/`totalStock`, text index on name+description+tags, auto-flips to `out_of_stock` when totalStock hits 0

### Services
- `category.service.ts` — create/update/list (admin+public)/delete with 3 modes (`empty` | `move` | `cascade`) / restore; refreshes `productCount` denorm on every write; Cloudinary sync on image replace
- `product.service.ts` — create with rollback of Cloudinary uploads on failure; update supports add/remove/reorder images atomically; soft-delete + restore + hard-delete (for trash purge job in a later milestone)

### New middlewares
- `upload.ts` — multer memory storage, strict mime allow-list (jpeg/jpg/png/webp), 8 MB per file, max 7 files per request
- `admin.requirePermission('category:manage' | 'product:manage')` — enforces admin role permissions

### Endpoints (all validated + permission-gated)
```
Public
GET  /api/v1/categories                        → active categories, sorted by priority
GET  /api/v1/categories/:slug                  → single category by slug
GET  /api/v1/products                          → paginated products (filters: category, price range, featured/trending/newArrival/bestSeller, q, sort)
GET  /api/v1/products/:slug                    → full product detail + category
GET  /api/v1/products/:slug/related            → related products in same category

Admin
GET    /api/v1/admin/categories                → list w/ search, sort, pagination, includeDeleted
GET    /api/v1/admin/categories/:id
GET    /api/v1/admin/categories/:id/delete-impact  → { productCount } — used by the delete-confirm modal
POST   /api/v1/admin/categories                → multipart, `image` file required
PATCH  /api/v1/admin/categories/:id            → multipart, `image` optional
POST   /api/v1/admin/categories/:id/delete     → body: { mode: 'empty'|'move'|'cascade', targetCategoryId? }
POST   /api/v1/admin/categories/:id/restore

GET    /api/v1/admin/products
GET    /api/v1/admin/products/:id
POST   /api/v1/admin/products                  → multipart: files `images[]`, body `payload` (JSON string)
PATCH  /api/v1/admin/products/:id              → multipart, supports adding new images + removeImagePublicIds + reorderPublicIds in payload
POST   /api/v1/admin/products/:id/delete       → soft delete (30-day trash rule)
POST   /api/v1/admin/products/:id/restore
```

### Seed script (`npm run seed`)
- Idempotent — safe to re-run; skips existing categories/products by slug
- Bootstraps admin from `ADMIN_*` env vars
- Uploads all seed images from Unsplash source URLs into your Cloudinary account so the catalog is fully self-contained after seeding
- Seeds exactly **4 categories** (Persian, Modern, Handmade, Luxury) × **5 products** each = 20 products with real descriptions, materials, INR pricing, size variations, and 2–3 images per product

## Milestone 4 status ✅ (Cart / Address / Coupon / Contact)

### New models
- `Cart` — one document per user, stores only `{productId, sizeVariationId, qty}` + `couponCode`; prices come from live products on every read
- `Coupon` — types: `percent`, `fixed`, `free_shipping`; scoped to product/category/user/store; global + per-user usage limits; start/expiry window; soft-delete
- `CouponUsage` — one row per successful order (M5 pipeline writes it); powers per-user limit checks
- `ContactMessage` — persists submission + emailNotified/emailAttempts/lastEmailError for future retry job

### New services
- `cart.service.ts` — `buildCartSnapshot` returns a fully priced view (subtotal / discount / shipping / grandTotal) and auto-cleans stale items on writeBack; `addToCart` clamps to available stock; `applyCoupon` throws if the code is invalid for the current cart
- `coupon.service.ts` — `validateAndComputeCoupon` is the single validation entry point (used by cart, checkout, and M5 order pipeline); admin CRUD + soft-delete + restore
- `address.service.ts` — CRUD on the User document with automatic default-address handling
- `contact.service.ts` — **persist first, email second** — the message is saved even if SMTP fails; per-email 24h soft quota

### New helpers/middlewares
- `helpers/pricing.ts` — `round2`, `netUnitPrice`, `computeShipping` (free above ₹15,000, flat ₹499)
- Dedicated stricter rate limiter for the public contact endpoint (5 per 10 min per IP)

### New endpoints
```
User (requireUser)
GET    /api/v1/cart
POST   /api/v1/cart/items                { productId, sizeVariationId, quantity }
PATCH  /api/v1/cart/items/:itemId        { quantity }
DELETE /api/v1/cart/items/:itemId
POST   /api/v1/cart/clear
POST   /api/v1/cart/coupon               { code }        → applies and re-prices
DELETE /api/v1/cart/coupon
POST   /api/v1/cart/coupon/validate      { code }        → dry-run against current cart

GET    /api/v1/addresses
POST   /api/v1/addresses
PATCH  /api/v1/addresses/:id
DELETE /api/v1/addresses/:id
POST   /api/v1/addresses/:id/default

Public
POST   /api/v1/contact                   → save + notify admin (persists even if email fails)

Admin (requireAdmin + permission)
GET    /api/v1/admin/coupons
GET    /api/v1/admin/coupons/:id
POST   /api/v1/admin/coupons
PATCH  /api/v1/admin/coupons/:id
POST   /api/v1/admin/coupons/:id/delete
POST   /api/v1/admin/coupons/:id/restore

GET    /api/v1/admin/contact
PATCH  /api/v1/admin/contact/:id/status
DELETE /api/v1/admin/contact/:id
```

### New email
- Admin contact notification (professional HTML template with escaped user input)

## Milestone 5 status ✅ (Razorpay + Orders + Invoices)

### New models
- `Payment` — one per Razorpay attempt; embeds a full priced **quote** (items, coupon info, address snapshot) taken at create time so the verify step can reconstruct the order without re-reading the cart. Statuses: `created → attempted → verified → captured / failed / refunded`
- `Order` — created only after signature verification. Every field is a snapshot; a `timeline[]` log tracks every status transition; `stockRestored` guards against double-restore

### New services
- `payment.service.ts` — the STRICT pipeline:
  1. `createGatewayOrder` — validate cart + address, snapshot the priced quote, create the Razorpay order
  2. `verifyRazorpaySignature` — HMAC-SHA256 with `crypto.timingSafeEqual` (constant-time). ✅ verified against Razorpay's spec with 4 test cases
  3. `verifyAndFulfil` — signature check → **atomic per-size stock decrement with `$gte` guard + rollback on any failure** → create Order → clear cart → record coupon usage → fire confirmation emails with PDF invoice attached
  4. `handleWebhook` — independent secondary verification path; safe to run alongside the client callback because `fulfilOrder` is idempotent (uses `paymentId → orderId` and `orderId → order` short-circuits). Cross-checks the gateway `amount` against the stored `amountMinor` — refuses fulfilment on mismatch
  5. `markPaymentFailed` — for user-cancelled or gateway-failed cases; never touches stock
- `order.service.ts` — user history + admin management. Cancelling a not-yet-shipped order restores stock. Status changes fire status emails to the customer for all meaningful transitions
- `invoice.service.ts` — brand-styled PDF invoice via pdfkit (streamed to Buffer, attached to confirmation email + served by `GET /orders/:num/invoice`)

### New endpoints
```
User (requireUser)
POST   /api/v1/payments/create-order    { addressId }   → { payment, quote, user }
POST   /api/v1/payments/verify          { gatewayOrderId, gatewayPaymentId, signature }
POST   /api/v1/payments/fail            { gatewayOrderId, reason? }
GET    /api/v1/orders                   → paginated user history
GET    /api/v1/orders/:orderNumber
GET    /api/v1/orders/:orderNumber/invoice   → PDF stream
POST   /api/v1/orders/:orderNumber/cancel    { reason }   → cancels + restores stock

Webhook (raw body, HMAC verified)
POST   /api/v1/payments/webhook               header: x-razorpay-signature

Admin (requireAdmin + order:manage)
GET    /api/v1/admin/orders
GET    /api/v1/admin/orders/:id
GET    /api/v1/admin/orders/:id/invoice
PATCH  /api/v1/admin/orders/:id/status  { status, note?, trackingNumber?, courier? }
```

### New emails
- Order confirmation (to customer, with PDF invoice attachment)
- Admin new-order notification (to `ADMIN_EMAIL`)
- Order status transitions (confirmed / preparing / packed / shipped / out-for-delivery / delivered / cancelled / returned / refunded)

### Enforced rules from the spec
- ✅ Order created ONLY after signature verification (never before)
- ✅ Failed payment → no order, no stock change, no email — just a `failed` Payment row for reconciliation
- ✅ Webhook cross-checks amount against stored quote to prevent amount-tampering
- ✅ Constant-time HMAC comparison (`timingSafeEqual`) to defeat timing side-channels
- ✅ Idempotent fulfilment (webhook + callback race is safe)
- ✅ Atomic stock decrement per size variation using conditional `$inc`; rollback on any line failure
- ✅ Coupon usage recorded only after successful order creation
- ✅ Cart cleared server-side inside the fulfil routine (single source of truth)

## Milestone 7 status ✅ (Admin dashboard backend)

### New service
- `analytics.service.ts` — MongoDB aggregations for the admin dashboard:
  - `getDashboardSummary` — revenue totals (lifetime / today / 30d / AOV), order counts by status, catalog + customer + coupon + message counters
  - `getRevenueSeries(days)` — daily revenue + order-count time series (fills empty days with zeros)
  - `getTopProducts(limit)` — top-selling by units, using order-item aggregation
  - `getLowStockProducts(limit)` — products with 1..5 stock left, sorted ascending
  - `getRecentOrders(limit)` — most recent orders across all statuses
  - `listCustomers(...)` — paginated customer list joined with per-customer orderCount + totalSpent
  - `setCustomerBlocked(id, blocked)` — block / unblock

### New endpoints
```
Admin (requireAdmin + permission)
GET  /api/v1/admin/analytics/summary
GET  /api/v1/admin/analytics/revenue-series?days=30
GET  /api/v1/admin/analytics/top-products?limit=5
GET  /api/v1/admin/analytics/low-stock?limit=10
GET  /api/v1/admin/analytics/recent-orders?limit=5

GET  /api/v1/admin/customers
POST /api/v1/admin/customers/:id/block   { blocked: true|false }
```

Milestone 8 (email templates polish, deployment guide, final 300-point self-verification checklist) is next.
