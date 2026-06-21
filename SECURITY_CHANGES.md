# Backend Security Hardening — Change Log

All changes are on branch `claude/setup-boq-system-phase1-abM89`.  
No existing functionality was broken. The frontend requires no changes.

---

## 1. Authentication

**What changed:** Password policy tightened from 6 to 8+ characters, now requires at least one uppercase letter and one number. All auth inputs (register, login, forgot-password, reset-password) are validated with Zod before the controller runs.

**Why it matters:** Short, simple passwords are cracked in seconds by automated tools. Zod validation ensures malformed data never reaches the database layer.

**Files:** `middleware/zodValidate.js` (new), `routes/auth.js`

---

## 2. Authorization (Role-Based Access Control)

**What changed:** Every write operation on estimates, invoices, site reports, and historical projects now checks the user's role before proceeding. Users with the `client` role can read but cannot create, edit, or delete anything.

| Role             | Read | Create | Edit | Delete |
|------------------|------|--------|------|--------|
| `admin`          | ✅   | ✅     | ✅   | ✅     |
| `qs`             | ✅   | ✅     | ✅   | ✅     |
| `project_manager`| ✅   | ✅     | ✅   | ✅     |
| `client`         | ✅   | ❌     | ❌   | ❌     |

**Why it matters:** Previously any authenticated user could delete or modify any record. A client logging in could erase the company's entire estimate history.

**Files:** `routes/estimates.js`, `routes/invoices.js`, `routes/siteReports.js`, `routes/historicalProjects.js`

---

## 3. API Security

**What changed:**
- **Helmet** added — automatically sets 12+ HTTP security headers (X-Frame-Options, X-Content-Type-Options, HSTS, CSP referrer policy, etc.)
- **Global rate limiter** applied to all `/api/*` routes — 120 requests per minute per IP
- **API versioning** — all routes available at both `/api/v1/*` (new standard) and `/api/*` (backward-compatible alias, so the frontend needs no changes)
- **Body size limit** — `express.json({ limit: '10kb' })` prevents large-payload denial-of-service attacks

**Why it matters:** Without Helmet, browsers receive no guidance on how to handle the API responses. Without a body limit, an attacker can send a 50 MB payload and freeze the Node process.

**Files:** `index.js`

---

## 4. Database Security

**What changed:**
- **express-mongo-sanitize** added — strips `$` and `.` characters from all incoming request bodies and query strings
- All existing queries already filter by `companyId` — this was confirmed during audit and left intact

**Why it matters:** Without sanitization, an attacker can send `{ "email": { "$gt": "" } }` to bypass login checks entirely (NoSQL injection). The sanitizer removes these operators before they reach Mongoose.

**Files:** `index.js`

---

## 5. Input Validation

**What changed:** New `middleware/zodValidate.js` provides Zod-based validation for all key routes. Validated and coerced data replaces `req.body` so controllers always receive clean, typed inputs.

**Schemas covered:**
- `register` — name (2–100 chars), valid email, password (8+ chars, uppercase, digit)
- `login` — valid email, non-empty password
- `forgotPassword` — valid email
- `resetPassword` — same password rules as register
- `estimate` — project name required, line items validated
- `invoice` — title required, line items validated

**Why it matters:** Controllers that trust `req.body` directly are vulnerable to unexpected types, oversized strings, and missing fields that cause 500 errors or corrupt data.

**Files:** `middleware/zodValidate.js` (new), `routes/auth.js`, `routes/estimates.js`, `routes/invoices.js`

---

## 6. Rate Limiting

**What changed:**
- `authLimiter` (10 attempts / 15 min per IP) is now **actually applied** to `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password/:token`, and `/auth/google`
- `apiLimiter` (120 req / 60 sec per IP) is now **actually applied** globally to all `/api/*` routes

**Why it matters:** These limiters were defined in `rateLimiter.js` but were never wired up — they had zero effect. Without them, an attacker could run unlimited login attempts against any account.

**Files:** `routes/auth.js`, `index.js`

---

## 7. Environment Security

**What confirmed:** All secrets (`JWT_SECRET`, `MONGO_URI`, `GOOGLE_CLIENT_ID`, `CLOUDINARY_*`, `EMAIL_*`) remain in `.env` files only. No secrets appear in any frontend file. The frontend only receives `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` (the Google client ID is intentionally public — it's used in the browser OAuth flow).

**No changes required.**

---

## 8. Error Handling

**What changed:** `errorHandler.js` now returns safe, generic messages in production.

| Scenario | Before | After (production) |
|----------|--------|--------------------|
| 500 internal error | Leaked `err.message` | `"An unexpected error occurred. Please try again later."` |
| Mongoose CastError | Leaked field names | `"Invalid resource identifier"` |
| Mongoose ValidationError | Leaked schema details | Clean `{ field, message }` array |
| JWT error | Leaked token internals | `"Invalid token"` or `"Token has expired"` |
| Duplicate key | Already safe | `"A record with that value already exists"` |

**Why it matters:** Stack traces and internal error messages tell attackers exactly which fields exist, what the schema looks like, and which versions of libraries are running.

**Files:** `middleware/errorHandler.js`

---

## 9. Logging

**What changed:**
- **Winston** was missing from `package.json` despite `logger.js` requiring it — now installed
- All login events now log: user ID, email, IP address, and outcome
  - Successful login → `info`
  - Wrong password / unknown email → `warn`
  - Deactivated account login attempt → `warn`
  - Google OAuth events → `info` / `warn`
- Password reset requests and completions are logged
- Admin account deletions are logged at `warn` level

**Why it matters:** Without login logging there is no way to detect a brute-force attack or investigate a compromised account after the fact.

**Files:** `controllers/authController.js`, `utils/logger.js`, `package.json`

---

## 10. App Store / GDPR Compliance

**What changed:** New endpoint `DELETE /api/auth/me` — permanently deletes the authenticated user's account and all company data.

**What gets deleted:**
- All estimates
- All invoices
- All site reports
- All historical projects
- All other users in the same company
- The company record itself
- The requesting user's own record

**Why it matters:** Apple App Store and Google Play both require apps to offer in-app account deletion. GDPR's "right to erasure" requires the ability to delete all personal data on request.

**Files:** `controllers/authController.js` (`deleteAccount`), `routes/auth.js`

---

## 11. Broken Audit Logger (Bug Fix)

**What changed:** `auditLogger.js` was importing `require('../models/AuditLog')` but that model file did not exist. The `try/catch` wrapper silently swallowed the error on every request, meaning zero audit events were ever written to the database.

**Fix:** Created `models/AuditLog.js` (with 90-day TTL index) and rewrote `auditLogger.js` with a clean API: `auditLogger.info()`, `auditLogger.warn()`, `auditLogger.error()`.

**Files:** `models/AuditLog.js` (new), `utils/auditLogger.js`

---

## 12. Duplicate `authorize` Function (Bug Fix)

**What changed:** `authorize()` existed in both `middleware/auth.js` and `middleware/rbac.js`. The `rbac.js` version leaked role names in its error message: `"Access denied. Requires role: admin or qs"` — this tells attackers exactly which roles exist and which routes they protect.

**Fix:** `rbac.js` is now a thin re-export of the canonical `authorize` from `auth.js`. All existing imports from `rbac.js` continue to work with no changes. The error message is now simply `"Insufficient permissions"`.

**Files:** `middleware/rbac.js`

---

## Packages Added

| Package | Purpose |
|---------|---------|
| `helmet` | HTTP security headers |
| `express-mongo-sanitize` | NoSQL injection prevention |
| `hpp` | HTTP parameter pollution prevention |
| `express-rate-limit` | Rate limiting (was used but not installed) |
| `express-validator` | Input validation helpers (was used but not installed) |
| `zod` | Schema-based input validation |
| `winston` | Structured logging (was used but not installed) |
