# Texlore Client

React 19 + Vite + TypeScript SPA. Contains both the user-facing storefront
and the admin dashboard (routed under `/admin/*`, not linked anywhere public).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run typecheck` | TS type-check without emit |

## Environment

Copy `.env.example` \u2192 `.env`. All client env vars must be prefixed `VITE_`
and are **inlined at build time** \u2014 never place secrets here.

## Design System (M1)

Luxury palette lives in `tailwind.config.ts`:

| Token | Hex | Usage |
|---|---|---|
| `midnight-900` | `#0B1B3A` | Primary, headings, dark surfaces |
| `emerald-500` | `#1F7A4D` | Secondary, success accents |
| `gold-500` | `#D4AF37` | Luxury accent, CTAs |
| `ivory` | `#FBF7F0` | Page background |
| `pearl` | `#FFFFFF` | Cards |
| `charcoal-500` | `#2F2F38` | Body text |

Fonts: **Cormorant Garamond** (display) + **Manrope** (body), loaded from Google Fonts in `index.html`.

Reusable component classes are declared in `src/styles/index.css` (`.btn-primary`, `.btn-gold`, `.btn-ghost`, `.card`, `.container-lux`, `.skeleton`).

## Folder Structure

```
src/
├── pages/          # route components (Home, Category, Product, ...)
├── components/     # reusable UI (Button, ProductCard, ...)
├── layouts/        # PublicLayout, AdminLayout
├── hooks/          # useAuth, useCart, ...
├── context/        # React contexts
├── store/          # Redux Toolkit slices + persist
├── features/       # feature-scoped slices
├── services/       # per-domain API service classes
├── api/            # low-level fetchers
├── lib/            # http client, utils
├── utils/          # pure utilities (formatting, ...)
├── styles/         # global css
├── types/          # shared TS types
├── assets/         # local images, svgs
├── App.tsx
└── main.tsx
```

## Milestone 1 status ✅

- Vite + React 19 + TS + Tailwind, luxury palette + typography, reusable primitives, Axios base

## Milestone 2 status ✅ (Auth)

### Routes
| Path | Page | Notes |
|---|---|---|
| `/` | Landing placeholder | Real Home lands in M6 |
| `/login` | User login | react-hook-form + toast + back-to-referrer |
| `/signup` | User signup | Two-step: form → OTP (SMTP via backend) |
| `/forgot-password` | Reset password | Two-step: email → OTP + new password |
| `/admin/login` | Admin 5-factor login | Name + Email + Password + Secret Key → OTP |
| `/admin/dashboard` | Placeholder | Full dashboard in M7. Route guarded by `RequireAdmin` |

### State
- Redux Toolkit + redux-persist (persists only session flags + profile — NOT access tokens)
- Access tokens live in `lib/http.ts` memory; refresh tokens live in httpOnly signed cookies
- On page load, `BootAuth` silently refreshes both user + admin sessions

### HTTP client
- Attaches Bearer token per-audience (`user` / `admin`) via `config.audience`
- Single-flight refresh on 401 with retry (skips login/refresh/logout endpoints)

### UI components introduced
- `AuthShell` — two-panel luxury auth layout (dark theme variant for admin)
- `Input` — with error state, password reveal, left icon
- `Button` — primary / gold / ghost variants with loading state
- `OtpInput` — segmented 6-digit input with paste + arrow-key navigation

### Verified
- `npm run typecheck` — zero errors
- `npm run build` — production Vite build succeeds, code-splits per route (~84 KB gz main)

## Milestone 3 status ✅ (Catalog wiring)

- `services/catalog.service.ts` — public catalog API (list categories, list products, get by slug, related)
- `services/admin-catalog.service.ts` — admin CRUD for categories + products (multipart handling, JSON payload for products)
- `types/catalog.ts` — full type coverage: `CategoryPublic`, `ProductCardData`, `ProductDetail`, `SizeVariation`, `Paginated<T>`
- Landing placeholder now **fetches real data from the API** — categories grid + featured products grid with skeleton loading, discount badges, INR formatting

The landing serves as an end-to-end smoke test: run `npm run seed` on the server and reload the client — you'll see the real 4 categories + 8 latest products from your database, images loading from your Cloudinary account.

## Milestone 4 status ✅ (Cart / Address / Contact)

### New services + types
- `services/cart.service.ts` — full cart CRUD (get, add, updateQty, remove, clear, applyCoupon, removeCoupon)
- `services/address.service.ts` — CRUD + setDefault
- `services/contact.service.ts` — homepage form submission
- `types/commerce.ts` — `CartSnapshot`, `CartLine`, `CartCoupon`, `Address`, `AddressInput`

### New Redux + hook
- `store/cart.slice.ts` — mirrors server snapshots; persists only `cachedItemCount` so the header badge is instantly correct on reload
- `hooks/useCart` — centralized cart operations with toast feedback and auto-clean notifications when server drops stale items

### New pages
- `/cart` (`CartPage`) — real cart with quantity +/−, remove, coupon apply/remove with badge, live subtotal / discount / shipping / total, "Proceed to checkout" wired to `/checkout` (M5)
- `/addresses` (`AddressBookPage`) — full CRUD with default-address handling and edit modal

### New components
- `components/BackButton.tsx` — reusable back navigation used on every internal page
- `components/ContactSection.tsx` — the ONE homepage Get-in-Touch form (per spec, never placed on other pages)

### Wiring
- `App.tsx` — silent cart hydration after login/refresh, cart cleared on logout
- Landing placeholder now embeds the ContactSection at the bottom and shows Cart / Addresses shortcuts when signed in

## Milestone 5 status ✅ (Razorpay + Orders)

### New services + types
- `services/payment.service.ts` — createOrder / verify / fail
- `services/order.service.ts` — list / get / cancel + invoice URL builder
- `lib/razorpay.ts` — on-demand loader for `https://checkout.razorpay.com/v1/checkout.js` with typed `RazorpayOptions` and `RazorpayResponse`
- `types/order.ts` — `Order`, `OrderItem`, `OrderAddress`, `OrderStatus`, timeline entries

### New pages
- `/checkout` — address picker, order review, live totals, opens Razorpay Checkout modal, wires ondismiss/failure to `/payments/fail`, calls `/payments/verify` in the success handler, navigates to `/order-success/:orderNumber` only after backend confirms
- `/order-success/:orderNumber` — verification-confirmed success screen with download invoice + track order buttons; refreshes cart mirror (server already cleared it)
- `/orders` — paginated order history with colored status pills
- `/orders/:orderNumber` — full detail: items, address, totals, payment ID, PDF invoice download, cancel button for pre-shipping states, chronological timeline

### Wiring
- `App.tsx` — 4 new lazy-loaded routes
- Checkout preloads the Razorpay script on mount for instant modal open
- Failure paths (dismissal, `payment.failed` event, verify error) all call `/payments/fail` so no zombie Payment rows accumulate

### Verified
- Signature verification tested against 4 cases (valid / wrong sig / tampered order / wrong secret) — all behave correctly
- Server + client both type-check clean, both build successfully

## Milestone 6 status ✅ (Storefront)

### New layout + shared components
- `layouts/PublicLayout.tsx` — wraps every non-admin route; scroll-to-top on navigation (except anchor links)
- `components/Header.tsx` — sticky header, **transparent over the hero + solid on scroll or on any non-home route**. Nav, search, currency pill (INR ↔ USD), cart badge with count, user avatar dropdown (Profile / Orders / Cart / Addresses / Logout). Full-screen mobile drawer with Framer Motion transitions. Auto-hides "Join Us" once logged in per spec
- `components/Footer.tsx` — 4-column midnight footer with shop links, company links, contact info, social icons
- `components/Logo.tsx` — reusable brand mark (light + dark variants)
- `components/ProductCard.tsx` — reusable card with hover elevation, discount / new-arrival / bestseller badges, out-of-stock overlay, staggered scroll-reveal animation
- `components/PriceDisplay.tsx` — **currency-aware** price with strikethrough + discount percentage
- `components/Breadcrumb.tsx` — reusable with Home icon
- `context/CurrencyContext.tsx` — INR base with USD display conversion, persisted in localStorage, drives every price rendered through `PriceDisplay`

### New pages
- `/` (**HomePage**) — real luxury Home per Part 2 spec: hero with parallax overlay + animated headline, categories grid (4 cards with hover zoom), Why Texlore (4 feature cards), Featured Products, About Texlore section with weaver imagery + stat card, ContactSection (only here — never elsewhere), footer
- `/shop` and `/category/:slug` (**CategoryPage**) — same component, single-category filter driven by URL params (`?q&sort&min&max&page`). Filter drawer + sort dropdown, pagination, empty/loading states
- `/product/:slug` (**ProductDetailPage**) — full gallery with prev/next arrows, thumbnail strip, click-to-zoom via `react-medium-image-zoom` (pinch + mouse + fullscreen), size picker updating price/stock live, quantity stepper clamped to stock, Add to cart + Buy now buttons (auto-redirect to login preserving intent), collapsible Specifications / Care / Shipping panels, Related products carousel, share button
- `/about` (**AboutPage**) — brand story page with animated imagery and 3 stat cards
- `/profile` (**ProfilePage**) — avatar, verified badge, member-since date, quick links to Orders / Addresses / Cart, change-password + logout actions
- `*` (**NotFoundPage**) — luxury 404 with return-home / shop CTAs

### Wiring
- `App.tsx` — `CurrencyProvider` wraps the tree; all public routes now render inside `PublicLayout` (so header + footer are consistent); auth pages keep their own two-panel layout (no header/footer); admin pages unchanged
- Removed `LandingPlaceholder.tsx` — replaced by the real `HomePage`

### Verified
- `tsc -b` = 0 errors
- `vite build` = 0 errors, 6.11s. Every new page code-splits (HomePage 4.7 KB gz, ProductDetail 9.4 KB gz including zoom library, CategoryPage 2.4 KB gz)

## Milestone 7 status ✅ (Admin dashboard)

### New layout + shared admin components
- `layouts/AdminLayout.tsx` — persistent midnight sidebar with route highlighting, sticky header showing avatar + "View storefront" quick-open, collapsible mobile drawer with Framer Motion transitions
- `components/admin/PageHeader` — title / subtitle / actions
- `components/admin/StatCard` — 4 accent variants (gold / emerald / red / midnight)
- `components/admin/StatusPill` — 20+ colour-coded statuses for orders / contact / coupons / customers / products / categories
- `components/admin/Pagination` — prev / next with disabled states
- `components/admin/Modal` — Framer Motion modal with backdrop + ESC-to-close
- `components/admin/SearchBar` — reusable rounded search input
- `components/admin/RevenueChart` — dependency-free SVG area chart with gradient fill and horizontal grid

### New services
- `admin-analytics.service.ts` — summary / revenue series / top products / low stock / recent orders
- `admin-customers.service.ts` — list + block
- `admin-orders.service.ts` — list / get / update status / invoice URL
- `admin-contact.service.ts` — list / update status / delete

### New pages (all under `/admin/*` inside `AdminLayout`)
- `/admin/dashboard` — StatCard grid (revenue / orders / customers / AOV + products / active coupons / new messages), 30-day revenue chart, recent orders + top selling + low stock
- `/admin/categories` — grid view, add/edit modal with real image upload preview, delete modal with move / cascade impact check (uses M3 backend), restore for trashed
- `/admin/products` — filterable grid (category / status / trashed), add/edit modal with:
  - image add/remove with NEW badges (up to 7)
  - dynamic size-variation editor with primary star toggle and per-row delete
  - full attribute set (material / origin / shape / color / weight / pile / knot density / construction / warranty)
  - featured / trending / new-arrival / bestseller toggles
  - tags + SEO fields
- `/admin/orders` — filterable table (status + search), links to detail
- `/admin/orders/:id` — items + totals + address + timeline + status updater (courier, tracking, note) with customer-email side-effect
- `/admin/coupons` — table + form modal supporting all coupon types (percent / fixed / free_shipping), limits, expiry, active toggle
- `/admin/customers` — table with orders + spend joined, block/unblock action
- `/admin/messages` — split-view inbox: list + selected message with mark-read/replied/resolved/archived + delete + reply-by-mail
- `/admin/analytics` — range selector (7 / 30 / 90 / 180 days), revenue chart, orders-per-day chart, top-selling table
- `/admin/settings` — read-only integration status + defaults
- `/admin/profile` — admin bio + permissions pill grid + rotation instructions

### Verified
- `tsc -b` = 0 errors on first pass
- `vite build` = 0 errors, 6.3s. Every admin page code-splits (dashboard 2.5 KB gz · categories 3.3 KB gz · products 4.8 KB gz · coupons 3 KB gz · analytics 1.3 KB gz · layout 2.5 KB gz)

Next: M8 delivers the final production polish — remaining email templates, deployment guide, and the 300-point self-verification checklist.
