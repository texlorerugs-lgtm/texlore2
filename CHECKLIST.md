# Texlore — Final Production Verification Checklist

This is the go-live gate. Do not declare the project complete until every
row is checked. Test on a real deployed staging environment (M8's
`DEPLOYMENT.md`), not `localhost`, wherever it's practical.

The checklist is grouped by concern. **300 items** total.

Legend:
- Server / Client / Both — where the item is verified
- 🔴 blocker · 🟠 important · 🟢 nice-to-have

---

## A. Infrastructure & Environment (25)

1. [ ] 🔴 `.env` file exists on the server and is git-ignored
2. [ ] 🔴 Every var in `server/.env.example` is present with a real value
3. [ ] 🔴 Server refuses to boot with a missing var (verified once)
4. [ ] 🔴 `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are different, ≥ 64 chars
5. [ ] 🔴 `COOKIE_SECRET` ≥ 32 chars, unique
6. [ ] 🔴 `ADMIN_PASSWORD` is strong (≥12 chars, mixed case, digit, special)
7. [ ] 🔴 `ADMIN_SECRET_KEY` is unrelated to the password, ≥16 chars
8. [ ] 🔴 `NODE_ENV=production` on the deployed server
9. [ ] 🔴 `CLIENT_URL` matches the actual frontend origin
10. [ ] 🔴 `API_BASE_URL` matches the actual API origin
11. [ ] 🔴 MongoDB Atlas IP allow-list contains the backend host
12. [ ] 🔴 Mongo connection URI targets the `texlore` database
13. [ ] 🟠 Atlas daily backups enabled
14. [ ] 🔴 Cloudinary credentials verified (server boot logs show `✅ Cloudinary connected`)
15. [ ] 🔴 SMTP credentials verified (server boot logs show `✅ SMTP connected`)
16. [ ] 🔴 SMTP `from` address matches domain / passes SPF
17. [ ] 🟠 SPF / DKIM / DMARC set for the sending domain
18. [ ] 🔴 Razorpay Test Mode keys work in staging; Live Mode keys ready for prod
19. [ ] 🔴 Razorpay webhook secret matches server env
20. [ ] 🔴 Razorpay webhook URL registered: `https://api.<domain>/api/v1/payments/webhook`
21. [ ] 🔴 Webhook events: `payment.captured`, `payment.authorized`, `payment.failed`
22. [ ] 🔴 HTTPS enforced on both frontend and API (no plain HTTP)
23. [ ] 🔴 Frontend build (`vite build`) succeeds with zero warnings/errors
24. [ ] 🔴 Backend build (`tsc + tsc-alias`) succeeds
25. [ ] 🟠 Logs stream to a persistent location (Render/Railway logs OK)

---

## B. Authentication — user (25)

26. [ ] 🔴 Signup fails without OTP
27. [ ] 🔴 OTP is 6 digits, generated with `crypto.randomInt`
28. [ ] 🔴 OTP is bcrypt-hashed in the DB (`Otp.codeHash`)
29. [ ] 🔴 OTP expires after 5 minutes (Mongo TTL index visible)
30. [ ] 🔴 OTP is single-use (deleted on verify)
31. [ ] 🔴 Resend cooldown enforced (60 s) — try immediately, get 429
32. [ ] 🔴 Max 3 resends per active window
33. [ ] 🔴 Duplicate email at signup is rejected
34. [ ] 🔴 Duplicate phone (countryCode + phone) at signup is rejected
35. [ ] 🔴 Password strength enforced (8+, upper, lower, digit, special)
36. [ ] 🔴 Passwords bcrypt-hashed (12 rounds), never returned in API
37. [ ] 🔴 Login without correct password fails
38. [ ] 🔴 Login response returns access token + user profile
39. [ ] 🔴 Refresh cookie is httpOnly, signed, `SameSite=none; Secure` in prod
40. [ ] 🔴 Refresh token stored server-side with jti; rotation on each refresh
41. [ ] 🔴 Reuse of a revoked refresh token invalidates ALL sessions
42. [ ] 🔴 Access token expiry short (15 m default)
43. [ ] 🔴 Refresh token expiry 7 d default
44. [ ] 🔴 Logout clears cookie and revokes refresh row
45. [ ] 🔴 Forgot-password OTP arrives via SMTP
46. [ ] 🔴 Forgot-password success invalidates all existing refresh tokens
47. [ ] 🔴 Blocked user cannot sign in
48. [ ] 🔴 Unverified user cannot sign in
49. [ ] 🟠 Auth rate limiter blocks >10 attempts / 15 min
50. [ ] 🟠 Silent refresh on page reload keeps the user signed in

---

## C. Authentication — admin (20)

51. [ ] 🔴 `/admin/login` is NOT linked from any public page, footer, or sitemap
52. [ ] 🔴 `/admin/*` routes have `<meta name="robots" content="noindex">`
53. [ ] 🔴 Admin login requires all 5 factors: name + email + password + secret key + OTP
54. [ ] 🔴 Missing any factor rejects the login attempt
55. [ ] 🔴 Password check: bcrypt
56. [ ] 🔴 Secret key check: bcrypt
57. [ ] 🔴 Name must match (case-insensitive)
58. [ ] 🔴 5 failed attempts locks the account for 15 minutes
59. [ ] 🔴 Locked account rejects even correct credentials until timeout
60. [ ] 🔴 Admin OTP is separate collection / purpose from user OTP
61. [ ] 🔴 Admin JWT audience = `admin`; user tokens rejected on admin routes
62. [ ] 🔴 Admin refresh cookie name differs from user cookie
63. [ ] 🔴 Admin login page is stateless — no admin data leaks pre-auth
64. [ ] 🔴 Login history captured (up to 20 recent) with IP + userAgent
65. [ ] 🔴 On success `failedAttempts` resets to 0 and `accountLockedUntil` clears
66. [ ] 🔴 Successful login redirects to `/admin/dashboard`
67. [ ] 🔴 Admin logout clears cookie and revokes refresh row
68. [ ] 🔴 No admin credentials in frontend bundle (grep the built JS)
69. [ ] 🔴 Admin password rotation instructions documented (via seed re-run)
70. [ ] 🟠 Admin login page reachable only by typing the URL

---

## D. Security hardening (25)

71. [ ] 🔴 Helmet enabled (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
72. [ ] 🔴 CORS restricted to `CLIENT_URL` only, with credentials
73. [ ] 🔴 Cookie parser uses signed cookies with `COOKIE_SECRET`
74. [ ] 🔴 Mongo sanitization enabled (`express-mongo-sanitize`)
75. [ ] 🔴 XSS clean enabled (`xss-clean`)
76. [ ] 🔴 HTTP parameter pollution guard enabled (`hpp`)
77. [ ] 🔴 Global rate limit: 200 req / 15 min per IP
78. [ ] 🔴 Auth rate limit: 10 req / 15 min per IP
79. [ ] 🔴 OTP-issue rate limit: 3 req / min per IP
80. [ ] 🔴 Contact-form rate limit: 5 req / 10 min per IP
81. [ ] 🔴 Multer file type allow-list: jpeg / jpg / png / webp only
82. [ ] 🔴 Multer file size cap: 8 MB per image
83. [ ] 🔴 Multer file count cap: 7 per request
84. [ ] 🔴 SVG uploads rejected (or sanitized)
85. [ ] 🔴 EXE / ZIP / PHP / JS uploads rejected
86. [ ] 🔴 All API responses use the standard envelope
87. [ ] 🔴 Global error handler never leaks stack traces to clients
88. [ ] 🔴 Mongo `code:11000` mapped to a friendly 409 conflict
89. [ ] 🔴 Mongoose validation errors mapped to 400 with field details
90. [ ] 🔴 JWT errors mapped to 401
91. [ ] 🔴 Compression middleware enabled
92. [ ] 🔴 Trust proxy set to 1 (so rate limiter reads correct IP)
93. [ ] 🔴 `x-powered-by` header removed
94. [ ] 🟠 Content Security Policy set at CDN / meta level
95. [ ] 🟠 HSTS enabled (min 6 months) at the domain

---

## E. Database (20)

96. [ ] 🔴 MongoDB Atlas, not local Mongo (in production)
97. [ ] 🔴 All 15 collections exist: users, admins, categories, products, orders, payments, coupons, couponUsages, carts, addresses (embedded), contactMessages, refreshTokens, otps, (analytics-derived), (settings-planned)
98. [ ] 🔴 Every collection has appropriate indexes (unique + query)
99. [ ] 🔴 Every collection has `timestamps: true`
100. [ ] 🔴 Slugs use **partial** unique index (soft-deleted rows don't clash)
101. [ ] 🔴 OTP TTL index removes expired documents automatically
102. [ ] 🔴 RefreshToken TTL index removes expired tokens
103. [ ] 🔴 User: unique index on `email`
104. [ ] 🔴 User: unique compound index on (`countryCode`, `phone`)
105. [ ] 🔴 Passwords marked `select: false`
106. [ ] 🔴 Admin `passwordHash` + `secretKeyHash` marked `select: false`
107. [ ] 🔴 `toJSON` scrubs `passwordHash`, `secretKeyHash`, `_id → id`
108. [ ] 🔴 Order snapshots (address, prices) frozen at creation time
109. [ ] 🔴 Product `pre('save')` recomputes minPrice / totalStock / status
110. [ ] 🔴 Product ensures exactly one `isPrimary` size variation
111. [ ] 🔴 Text index on product name / description / tags (search works)
112. [ ] 🔴 No product / category is ever hard-deleted from admin UI
113. [ ] 🔴 Stock never goes negative (`$gte` guard on decrement)
114. [ ] 🟠 Explain plans checked on the top 3 slowest queries
115. [ ] 🟢 A restore-from-backup drill has been run once

---

## F. Cart & pricing (15)

116. [ ] 🔴 Server is the single source of truth for money
117. [ ] 🔴 Cart snapshot recomputes prices from live product on every read
118. [ ] 🔴 Client never posts prices — only productId + sizeId + qty
119. [ ] 🔴 Stale items auto-drop (product deleted / size gone / stock=0) and flag `autoCleaned=true`
120. [ ] 🔴 Quantity clamped to available stock on add and update
121. [ ] 🔴 Quantity max = 20 per line
122. [ ] 🔴 Coupon applies re-price on read; invalid coupon silently detaches
123. [ ] 🔴 Free-shipping coupon zeroes shipping regardless of subtotal
124. [ ] 🔴 Percent coupon caps at `maxDiscountAmount` if configured
125. [ ] 🔴 Fixed coupon capped by eligible subtotal
126. [ ] 🔴 Scope filters (product / category / user) all enforced
127. [ ] 🔴 Per-user coupon limit enforced via `CouponUsage` count
128. [ ] 🔴 Global coupon usageLimit enforced
129. [ ] 🔴 Coupon expiry window enforced (startsAt / expiresAt)
130. [ ] 🔴 Shipping rule: free above ₹15,000, flat ₹499 below

---

## G. Payments — the STRICT flow (25)

131. [ ] 🔴 Order is **never** created before signature verification
132. [ ] 🔴 `POST /payments/create-order` requires login
133. [ ] 🔴 create-order validates cart + address + stock right before creating the gateway order
134. [ ] 🔴 create-order stores a Payment row with `status=created` and the full priced quote
135. [ ] 🔴 create-order returns Razorpay `order_id` + `amountMinor` + `currency` + public key
136. [ ] 🔴 Client opens Razorpay Checkout modal with these values
137. [ ] 🔴 HMAC-SHA256 verifies signature on callback
138. [ ] 🔴 Signature comparison uses `crypto.timingSafeEqual`
139. [ ] 🔴 Invalid signature → Payment `failed` + 400 + no order
140. [ ] 🔴 Valid signature → Payment `verified` + fulfilment
141. [ ] 🔴 Fulfilment decrements stock atomically per size variation
142. [ ] 🔴 Any line stock failure → rollback all decrements → refund/reconcile
143. [ ] 🔴 Order created with unique `orderNumber` + `invoiceNumber`
144. [ ] 🔴 CouponUsage recorded on successful order
145. [ ] 🔴 Cart cleared server-side after order created
146. [ ] 🔴 Confirmation email fired (fire-and-forget) with PDF invoice attached
147. [ ] 🔴 Admin notification email fired
148. [ ] 🔴 Webhook is HMAC-verified with `RAZORPAY_WEBHOOK_SECRET`
149. [ ] 🔴 Webhook cross-checks gateway amount vs stored `amountMinor`
150. [ ] 🔴 Amount mismatch → mark failed, log critical, don't fulfil
151. [ ] 🔴 `fulfilOrder` is idempotent (webhook + client callback race safe)
152. [ ] 🔴 Payment failure path (`/payments/fail`) marks Payment failed
153. [ ] 🔴 Payment failure path never touches stock or creates order
154. [ ] 🔴 Success page (`/order-success/:num`) only reachable via real verified order
155. [ ] 🔴 PDF invoice downloadable at `/orders/:num/invoice`

---

## H. Orders — user + admin (15)

156. [ ] 🔴 User can view their own orders only (`/orders`)
157. [ ] 🔴 User can see full order detail (`/orders/:num`)
158. [ ] 🔴 User can download their own invoice PDF
159. [ ] 🔴 User can cancel pending / confirmed / preparing orders only
160. [ ] 🔴 Cancellation restores stock (guarded by `stockRestored` flag)
161. [ ] 🔴 Cancellation triggers status email
162. [ ] 🔴 Admin cannot manually edit paid amount
163. [ ] 🔴 Admin cannot manually change payment status
164. [ ] 🔴 Admin can change order status through the enum
165. [ ] 🔴 Status change appends a `timeline[]` entry with actor
166. [ ] 🔴 Meaningful status transitions email the customer
167. [ ] 🔴 Admin cancel/refund on unshipped order restores stock
168. [ ] 🔴 Admin cannot delete completed orders
169. [ ] 🔴 Tracking number + courier saved on the order
170. [ ] 🔴 Admin invoice download works

---

## I. Catalog — categories + products (25)

171. [ ] 🔴 Manage Categories page exists in admin
172. [ ] 🔴 Admin can create custom categories (any name)
173. [ ] 🔴 Category duplicate name (case-insensitive) rejected
174. [ ] 🔴 Category image uploaded via device gallery, not URL input
175. [ ] 🔴 Category image stored in Cloudinary with URL + publicId
176. [ ] 🔴 Deleting a non-empty category shows Move / Cascade / Cancel modal
177. [ ] 🔴 Move mode reassigns products atomically
178. [ ] 🔴 Cascade mode soft-deletes all products in the category
179. [ ] 🔴 Restoring a soft-deleted category regenerates its slug if needed
180. [ ] 🔴 Manage Products page exists in admin
181. [ ] 🔴 Product image upload opens device picker
182. [ ] 🔴 Product image count: 1–7 enforced client and server
183. [ ] 🔴 Image add + remove + reorder atomically in the form
184. [ ] 🔴 Removed images are also deleted from Cloudinary (after DB save)
185. [ ] 🔴 Failed product create rolls back all Cloudinary uploads
186. [ ] 🔴 Size variations: 1..N, each with independent stock
187. [ ] 🔴 Exactly one primary size enforced by `pre('save')`
188. [ ] 🔴 Discount % capped 0..90
189. [ ] 🔴 Auto out-of-stock when totalStock=0 (unless hidden/discontinued)
190. [ ] 🔴 Auto available when totalStock>0 and previously out-of-stock
191. [ ] 🔴 Slugs unique among live products (partial index)
192. [ ] 🔴 Public product listing paginates (max 60 per page)
193. [ ] 🔴 Public product search (`?q=`) uses text index
194. [ ] 🔴 Category listing loads only that category's products (server filter)
195. [ ] 🔴 Related products query returns same-category live products

---

## J. Storefront UI/UX (25)

196. [ ] 🔴 Header transparent over home hero, solid on scroll and other routes
197. [ ] 🔴 "Join Us" replaced by user avatar dropdown after login
198. [ ] 🔴 Cart badge shows the correct item count
199. [ ] 🔴 Search icon leads to `/shop`
200. [ ] 🔴 Currency selector switches between INR ↔ USD (persisted)
201. [ ] 🔴 Every internal page has a working Back button
202. [ ] 🔴 Home page contains exactly the 7 sections in spec order
203. [ ] 🔴 Get-in-Touch form appears ONLY on Home
204. [ ] 🔴 Product cards: 1 / 2 / 4 columns on mobile / tablet / desktop
205. [ ] 🔴 Product card equal-height grid, no overflow
206. [ ] 🔴 Product images support click-to-zoom (mouse + pinch + fullscreen)
207. [ ] 🔴 Size selection updates price + stock + weight immediately
208. [ ] 🔴 Add-to-cart as guest → login → returns to same product
209. [ ] 🔴 Buy-now as guest → login → back to product → then to cart
210. [ ] 🔴 Checkout requires an address; can't proceed without one
211. [ ] 🔴 Success page shows Order ID, Payment ID, ETA, invoice link
212. [ ] 🔴 404 page is styled and gives return paths
213. [ ] 🔴 Every page has a unique `<title>` and meta description
214. [ ] 🔴 Every page has Open Graph + Twitter card tags
215. [ ] 🔴 `noindex` set on all `/admin/*`, `/cart`, `/checkout`, `/orders*`, `/profile`, `/addresses`, `/order-success/*`
216. [ ] 🔴 `robots.txt` + `sitemap.xml` present in `/public/`
217. [ ] 🔴 Site works on mobile 320px, tablet 768px, laptop 1024px, desktop 1440px
218. [ ] 🔴 No horizontal scroll on any viewport
219. [ ] 🔴 Toast notifications used everywhere — no `alert()`
220. [ ] 🔴 Loading state on every async button (spinner + "Please wait")

---

## K. Admin dashboard (25)

221. [ ] 🔴 Sidebar has all 10 items from spec, in order
222. [ ] 🔴 Dashboard home shows revenue cards, order counts, top selling, low stock, recent orders
223. [ ] 🔴 Revenue chart renders with real data
224. [ ] 🔴 Manage Categories: add / edit / delete / restore / hide / search / pagination
225. [ ] 🔴 Manage Products: filters (category, status, trashed), search, pagination
226. [ ] 🔴 Product form: multi-image with remove + NEW markers
227. [ ] 🔴 Product form: dynamic size-variation rows with primary star
228. [ ] 🔴 Product form: featured / trending / newArrival / bestSeller toggles
229. [ ] 🔴 Order table: filters (status, search), pagination
230. [ ] 🔴 Order detail: items, address, timeline, status updater
231. [ ] 🔴 Coupon builder supports percent / fixed / free_shipping
232. [ ] 🔴 Coupon builder supports limits, expiry, per-user cap
233. [ ] 🔴 Customer table: search, filter (all/active/blocked/verified/unverified)
234. [ ] 🔴 Customer table shows joined orderCount + totalSpent
235. [ ] 🔴 Customer block / unblock works
236. [ ] 🔴 Messages inbox: list + selected, mark-read/replied/resolved/archived, delete, reply-by-email
237. [ ] 🔴 Analytics: range selector, revenue chart, orders chart, top selling list
238. [ ] 🔴 Settings: integration status + defaults
239. [ ] 🔴 Admin profile shows permissions and rotation instructions
240. [ ] 🔴 Sidebar collapses to drawer on mobile
241. [ ] 🔴 "View storefront" link opens the public site in a new tab
242. [ ] 🔴 No horizontal scroll on any admin viewport
243. [ ] 🔴 Every admin table has an empty state
244. [ ] 🔴 Every admin table has a loading skeleton
245. [ ] 🔴 Every admin form has proper error messages

---

## L. Emails (15)

246. [ ] 🔴 Signup OTP email received within 30 seconds
247. [ ] 🔴 Password-reset OTP email received
248. [ ] 🔴 Admin-login OTP email received
249. [ ] 🔴 Welcome email received after signup
250. [ ] 🔴 Admin new-signup notification received at `ADMIN_EMAIL`
251. [ ] 🔴 Order confirmation email received (with PDF invoice attached)
252. [ ] 🔴 Admin new-order email received at `ADMIN_EMAIL`
253. [ ] 🔴 Order status transition emails received (shipped / delivered / cancelled etc.)
254. [ ] 🔴 Contact-form admin notification received
255. [ ] 🔴 All emails render correctly in Gmail web
256. [ ] 🟠 All emails render correctly on iPhone Mail
257. [ ] 🟠 All emails render correctly on Outlook
258. [ ] 🔴 No SMTP credentials logged
259. [ ] 🔴 Contact-form persistence is unaffected by SMTP failure
260. [ ] 🟠 SPF / DKIM alignment passes at mail-tester.com (score ≥ 8)

---

## M. Performance (15)

261. [ ] 🟠 Lighthouse Performance ≥ 90 on Home
262. [ ] 🟠 Lighthouse Accessibility ≥ 95
263. [ ] 🟠 Lighthouse Best Practices ≥ 95
264. [ ] 🟠 Lighthouse SEO ≥ 95
265. [ ] 🟠 LCP < 2.5 s on 4G
266. [ ] 🟠 CLS < 0.1
267. [ ] 🟠 TTFB < 800 ms (from user's region)
268. [ ] 🔴 Route-based code splitting enabled
269. [ ] 🔴 Images have `loading="lazy"` (except hero)
270. [ ] 🔴 Cloudinary auto-format + auto-quality applied
271. [ ] 🟠 Fonts preconnected (Google Fonts `preconnect` present)
272. [ ] 🟠 Main vendor chunks separated (react, redux, motion)
273. [ ] 🔴 API response < 300 ms for reads on Atlas region
274. [ ] 🔴 Search API < 500 ms
275. [ ] 🔴 Image upload < 3 s from broadband

---

## N. Accessibility (10)

276. [ ] 🟠 All interactive elements reachable by keyboard (Tab)
277. [ ] 🟠 Visible focus ring on all focusable elements
278. [ ] 🟠 Every image has meaningful `alt` (or `alt=""` if decorative)
279. [ ] 🟠 Form fields have associated `<label>`
280. [ ] 🟠 Buttons have `aria-label` when icon-only
281. [ ] 🟠 Color contrast ≥ 4.5:1 for body text
282. [ ] 🟠 Semantic HTML used throughout (nav / main / article / footer)
283. [ ] 🟠 Modal traps focus and ESC to close (verified on Modal component)
284. [ ] 🟠 No auto-playing audio / video
285. [ ] 🟠 Site usable at 200% zoom

---

## O. Deployment (10)

286. [ ] 🔴 Backend deployed to a paid tier (no sleep)
287. [ ] 🔴 Frontend deployed with SPA fallback (unknown paths → index.html)
288. [ ] 🔴 Custom domain configured on frontend with SSL
289. [ ] 🔴 API subdomain configured with SSL
290. [ ] 🔴 CORS `CLIENT_URL` matches the deployed frontend
291. [ ] 🔴 Razorpay webhook returns 200 in dashboard for a real test payment
292. [ ] 🔴 Seed script run once against production DB (admin + 4 cat + 20 prod)
293. [ ] 🔴 robots.txt + sitemap.xml updated with real domain
294. [ ] 🟠 Uptime monitor set (5-min interval on `/health`)
295. [ ] 🟠 Log aggregation configured

---

## P. Final acceptance (5)

296. [ ] 🔴 A brand-new user can signup → verify OTP → shop → checkout → receive email + invoice, end to end
297. [ ] 🔴 An admin can login (5-factor) → create a category → create a product → publish it → change an order's status → see it reflected in the customer's account
298. [ ] 🔴 Failed payment leaves no order, no stock change, no email
299. [ ] 🔴 Documentation covers everything: `README.md`, `server/README.md`, `client/README.md`, `DEPLOYMENT.md`, `CHECKLIST.md`
300. [ ] 🔴 Zero secrets committed to the repo (verified with `git log -p | grep -iE 'password|secret|api_key' | head`)

---

## Green-light rule

Only tick **300/300** before declaring the project complete for production.
