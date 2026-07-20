# PICO BELLO PROJEKTE — BOQ SYSTEM
## Master Project Document · Complete Engineering Handoff

> **Purpose:** This document is the single source of truth for the Pico Bello BOQ platform. It explains what was built, why, how to rebuild it from scratch, every service used, every environment variable, every known issue, and current status. Hand this to any engineer alongside the GitHub repository and they should be fully operational.

---

## TABLE OF CONTENTS

1. [What This System Is](#1-what-this-system-is)
2. [Why We Built It This Way](#2-why-we-built-it-this-way)
3. [Live URLs & GitHub](#3-live-urls--github)
4. [Technology Stack](#4-technology-stack)
5. [Repository Structure](#5-repository-structure)
6. [How to Run It Locally (From Scratch)](#6-how-to-run-it-locally-from-scratch)
7. [All Environment Variables — Every Single One](#7-all-environment-variables--every-single-one)
8. [All External Services Used](#8-all-external-services-used)
9. [Database: All Models & What They Store](#9-database-all-models--what-they-store)
10. [Backend API: Every Route](#10-backend-api-every-route)
11. [Frontend: Every Page & What It Does](#11-frontend-every-page--what-it-does)
12. [User Roles & Permissions](#12-user-roles--permissions)
13. [How to Deploy (Render.com)](#13-how-to-deploy-rendercom)
14. [What Is Currently Working](#14-what-is-currently-working)
15. [What Is Not Working / Known Issues](#15-what-is-not-working--known-issues)
16. [Build History — What Was Done & When](#16-build-history--what-was-done--when)
17. [Suggested Next Improvements](#17-suggested-next-improvements)
18. [Common Problems & How to Fix Them](#18-common-problems--how-to-fix-them)
19. [How to Add a New Feature (Step-by-Step Pattern)](#19-how-to-add-a-new-feature-step-by-step-pattern)
20. [Glossary](#20-glossary)

---

## 1. WHAT THIS SYSTEM IS

**Pico Bello Projekte BOQ System** is a full-stack web application for Nigerian construction and quantity surveying (QS) firms.

### In plain English:
A construction company uses this platform to:
- Create and manage **projects** (buildings being constructed)
- Build a **Bill of Quantities (BOQ)** — the detailed list of every item needed, its cost, and the profit margin
- Send **estimates** and **invoices** to clients and track payments
- Let clients log in through a **client portal** to approve BOQ options and see their invoices
- Track **expenses**, **site reports**, **change orders**, and construction **progress**
- Keep a **pricing intelligence library** of QS rates, artisan labour costs, and material supplier prices
- Manage their **team** with different access levels (admin, QS, project manager, client)
- Generate professional **PDF documents** for invoices and change orders

### Who uses it:
| Role | What they do |
|------|-------------|
| Admin | Full access — manage team, settings, all data |
| QS (Quantity Surveyor) | Build BOQs, manage pricing libraries, create invoices |
| Project Manager | Manage projects, track progress, site reports |
| Client | View their BOQ, approve options, see invoices — read-only portal |

---

## 2. WHY WE BUILT IT THIS WAY

### Why Node.js + Express (not Django, Rails, etc.)?
JavaScript on both frontend and backend means one language, faster development, shared logic.

### Why MongoDB (not PostgreSQL)?
Construction BOQ data is highly variable — each project has different item structures. MongoDB's flexible schema handles this better than rigid SQL tables.

### Why React + Vite (not Next.js)?
This is a private internal tool, not a public-facing site that needs SEO. Vite gives fast development builds. Next.js server-side rendering would add unnecessary complexity.

### Why Tailwind CSS?
Rapid UI development without writing custom CSS files. The entire UI is built with utility classes — no separate stylesheet to maintain.

### Why Render.com (not AWS, Heroku, Vercel)?
Simpler than AWS for a small team. Heroku removed its free tier. Render is affordable, has a simple deployment pipeline from GitHub, and supports Node.js web services and static sites.

### Why separate backend and frontend (not a monolith)?
Allows independent deployment, scaling, and future mobile app development using the same API.

### Why JWT (not sessions)?
Stateless authentication — the backend doesn't store session state in a database. Tokens are verified on every request without a DB lookup.

---

## 3. LIVE URLS & GITHUB

| Item | URL |
|------|-----|
| **GitHub Repository** | https://github.com/tidan1023-web/picobelloprojekte.boq |
| **Production Branch** | `main` — all deploys come from this branch |
| **Dev Branch** | `claude/zen-lovelace-5kwudl` |
| **Backend API (Render)** | https://pico-bello-boq.onrender.com |
| **Frontend (Render)** | *(check Render dashboard for static site URL)* |
| **API Health Check** | https://pico-bello-boq.onrender.com/api/health |
| **Paystack Webhook URL** | https://pico-bello-boq.onrender.com/api/paystack/webhook |

### GitHub branch rules:
- **Never push directly to `main` without testing** — `main` triggers an automatic Render deploy
- Development happens on the dev branch, then merged/pushed to `main` when ready
- Render watches `main` and redeploys automatically on every push

---

## 4. TECHNOLOGY STACK

### Backend
| Package | Version | Purpose |
|---------|---------|---------|
| Node.js | ≥18.0.0 | Runtime |
| Express | 4.18.x | HTTP server framework |
| Mongoose | 8.2.x | MongoDB ODM (object-document mapping) |
| jsonwebtoken | 9.0.x | JWT creation and verification |
| bcryptjs | 2.4.x | Password hashing |
| express-async-errors | 3.1.x | Auto-catches async errors without try/catch everywhere |
| helmet | 8.1.x | Security HTTP headers |
| cors | 2.8.x | Cross-origin request handling |
| express-mongo-sanitize | 2.2.x | Prevents NoSQL injection attacks |
| hpp | 0.2.x | HTTP parameter pollution prevention |
| express-rate-limit | 8.5.x | API rate limiting |
| multer | 1.4.x | File upload handling |
| cloudinary | 1.41.x | Image/file cloud storage |
| pdfkit | 0.15.x | PDF generation (invoices, change orders) |
| nodemailer | 6.9.x | Email sending |
| web-push | 3.6.x | Browser push notifications |
| dotenv | 16.4.x | Environment variable loading |
| winston | 3.19.x | Server-side logging |

### Frontend
| Package | Version | Purpose |
|---------|---------|---------|
| React | 18.2.x | UI framework |
| Vite | 5.1.x | Build tool and dev server |
| React Router DOM | 6.22.x | Client-side routing |
| Axios | 1.6.x | HTTP requests to backend |
| Tailwind CSS | 3.4.x | Utility-first styling |
| Lucide React | 0.323.x | Icon library |
| XLSX | 0.18.x | Excel file import/export |
| @react-oauth/google | 0.12.x | Google OAuth login button |

---

## 5. REPOSITORY STRUCTURE

```
picobelloprojekte.boq/
│
├── backend/                          ← Node.js Express API
│   ├── src/
│   │   ├── index.js                  ← Entry point — registers all routes and middleware
│   │   ├── config/
│   │   │   └── database.js           ← MongoDB connection
│   │   ├── controllers/              ← Business logic (one file per feature)
│   │   │   ├── authController.js
│   │   │   ├── invoiceController.js  ← Also contains paystackWebhook, generatePDF
│   │   │   ├── changeOrderController.js
│   │   │   ├── expenseController.js
│   │   │   └── ... (one per route file)
│   │   ├── middleware/
│   │   │   ├── auth.js               ← JWT verification (protect middleware)
│   │   │   ├── authorize.js          ← Role-based access (authorize('admin','qs'))
│   │   │   ├── errorHandler.js       ← Global error handler
│   │   │   └── rateLimiter.js        ← Express rate limiter config
│   │   ├── models/                   ← Mongoose schemas (28 models)
│   │   ├── routes/                   ← Route definitions (26 files)
│   │   └── services/                 ← Reusable service logic
│   ├── package.json
│   └── .env.example                  ← Template for environment variables
│
├── frontend/                         ← React + Vite SPA
│   ├── src/
│   │   ├── main.jsx                  ← Entry point (renders <App /> into DOM)
│   │   ├── App.jsx                   ← Router setup and all route definitions
│   │   ├── pages/                    ← One file per page/screen (~30 files)
│   │   ├── components/               ← Reusable UI components
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.jsx     ← Main shell (sidebar + topbar)
│   │   │   │   ├── Sidebar.jsx       ← Navigation sidebar
│   │   │   │   └── TopBar.jsx        ← Header with user menu
│   │   │   ├── ProtectedRoute.jsx    ← Redirects unauthenticated users
│   │   │   └── ExcelImport.jsx       ← Reusable Excel file importer
│   │   ├── context/
│   │   │   ├── AuthContext.jsx       ← Global auth state (user, login, logout)
│   │   │   ├── ThemeContext.jsx      ← Light/dark mode
│   │   │   └── ToastContext.jsx      ← Global toast notifications
│   │   └── services/
│   │       └── api.js                ← Axios instance with base URL and auth header
│   ├── public/
│   │   └── logo.png                  ← (placeholder — replace with real logo)
│   ├── vite.config.js                ← Vite + dev proxy to localhost:5000
│   └── tailwind.config.js            ← Tailwind theme (primary colors, animations)
│
├── render.yaml                       ← Render.com deployment configuration
├── MASTER_DOCUMENT.md                ← THIS FILE
└── README.md                         ← Technical overview
```

---

## 6. HOW TO RUN IT LOCALLY (FROM SCRATCH)

Follow every step in order. Do not skip any.

### Prerequisites (install these first)
- **Node.js v18+** — download from https://nodejs.org (choose LTS)
- **Git** — https://git-scm.com
- **MongoDB Atlas account** — https://cloud.mongodb.com (free tier works)
- A code editor (**VS Code** recommended)

---

### Step 1 — Clone the repository
```bash
git clone https://github.com/tidan1023-web/picobelloprojekte.boq.git
cd picobelloprojekte.boq
```

---

### Step 2 — Set up the Backend

```bash
cd backend
npm install
```

Create your environment file:
```bash
cp .env.example .env
```

Then open `.env` and fill in all values (see Section 7 for every variable explained).

**Minimum required to start:**
```
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...your connection string...
JWT_SECRET=any-random-long-string-at-least-32-chars
CLIENT_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

You should see:
```
Pico Bello Estimator API running on port 5000
MongoDB connected
```

Test it: open http://localhost:5000/api/health — should return `{"status":"ok"}`

---

### Step 3 — Set up the Frontend

In a **new terminal window**:
```bash
cd frontend
npm install
```

Create your environment file:
```bash
cp .env.example .env.local
```

Minimum required:
```
VITE_API_URL=http://localhost:5000/api
```

Start the frontend:
```bash
npm run dev
```

Open http://localhost:5173 — you should see the landing page.

---

### Step 4 — Create your first Admin account
1. Go to http://localhost:5173/register
2. Fill in your details
3. The first user to register automatically gets the `admin` role (or this may need to be set directly in MongoDB — check the User model's default role)

---

## 7. ALL ENVIRONMENT VARIABLES — EVERY SINGLE ONE

### Backend `.env`

| Variable | Required? | What it does | How to get it |
|----------|-----------|--------------|---------------|
| `PORT` | Yes | Port the server runs on | Set to `5000` for local, Render sets this automatically in production |
| `NODE_ENV` | Yes | `development` or `production` | Type it manually |
| `MONGODB_URI` | **Critical** | Connection string to your MongoDB Atlas database | MongoDB Atlas → Connect → Drivers → copy the connection string. Replace `<password>` with your DB user password |
| `JWT_SECRET` | **Critical** | Secret key used to sign auth tokens. Keep this private. | Generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_EXPIRES_IN` | Yes | How long login tokens last | `7d` = 7 days. Change to `1d` or `30d` as needed |
| `CLIENT_URL` | Yes | Frontend URL — controls which origins are allowed (CORS) | `http://localhost:5173` for local. `https://your-frontend.onrender.com` for production |
| `CLOUDINARY_CLOUD_NAME` | Optional | Cloud name for Cloudinary image uploads | Cloudinary dashboard → Cloud Name |
| `CLOUDINARY_API_KEY` | Optional | API key for Cloudinary | Cloudinary dashboard → API Keys |
| `CLOUDINARY_API_SECRET` | Optional | API secret for Cloudinary | Cloudinary dashboard → API Keys |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google Sign-In | Google Cloud Console → APIs → OAuth 2.0 Client IDs |
| `VAPID_PUBLIC_KEY` | Optional | For browser push notifications | Run: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Optional | For browser push notifications | Same command as above |
| `VAPID_EMAIL` | Optional | Email in VAPID key registration | Your admin email, prefixed with `mailto:` e.g. `mailto:admin@pico.com` |
| `PAYSTACK_SECRET_KEY` | Optional | For Paystack online payment webhook | Paystack Dashboard → Settings → API Keys → Secret Key |
| `AWS_REGION` | Optional | AWS region for S3 file storage | e.g. `us-east-1` |
| `AWS_ACCESS_KEY_ID` | Optional | AWS credentials for S3 | AWS IAM console |
| `AWS_SECRET_ACCESS_KEY` | Optional | AWS credentials for S3 | AWS IAM console |
| `S3_BUCKET_NAME` | Optional | S3 bucket name for file uploads | Create in AWS S3 console |

### Frontend `.env.local`

| Variable | Required? | What it does | Value |
|----------|-----------|--------------|-------|
| `VITE_API_URL` | Yes | Where the frontend sends API requests | `http://localhost:5000/api` for local; `https://pico-bello-boq.onrender.com/api` for production |
| `VITE_GOOGLE_CLIENT_ID` | Optional | Google OAuth (must match backend) | Same as `GOOGLE_CLIENT_ID` in backend |

### Production Environment Variables on Render

Log in to https://dashboard.render.com → select your **backend service** → Environment tab. Add:

```
NODE_ENV=production
MONGODB_URI=<your atlas URI>
JWT_SECRET=<generate a strong one>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://<your-frontend>.onrender.com
CLOUDINARY_CLOUD_NAME=<if using>
CLOUDINARY_API_KEY=<if using>
CLOUDINARY_API_SECRET=<if using>
PAYSTACK_SECRET_KEY=<from Paystack dashboard>
```

---

## 8. ALL EXTERNAL SERVICES USED

### 1. MongoDB Atlas
- **What:** Cloud-hosted database
- **Why:** Free tier for small teams, auto-backups, no server to manage
- **Free tier:** 512MB storage — plenty for this app
- **Setup:** https://cloud.mongodb.com → Create cluster → Get connection string
- **Cost:** Free (M0 tier) or ~$57/month (M10 for production)

### 2. Render.com
- **What:** Hosts both the backend API (Web Service) and frontend (Static Site)
- **Why:** Simple GitHub integration — push to `main` and it deploys automatically
- **Backend:** Web Service running Node.js
- **Frontend:** Static Site serving the built React app
- **Cost:** ~$7/month per web service on Starter plan
- **Dashboard:** https://dashboard.render.com
- **Note:** Free tier web services spin down after 15 minutes of inactivity and take ~30 seconds to wake up

### 3. Cloudinary
- **What:** Cloud image and file storage
- **Why:** Used for company logos, signatures, stamps uploaded in Company Settings
- **Free tier:** 25GB storage, 25GB bandwidth/month
- **Setup:** https://cloudinary.com → Dashboard → Get API keys
- **Currently:** Optional — the app runs without it; image uploads are disabled

### 4. Google OAuth
- **What:** "Sign in with Google" button
- **Why:** Easier login for users with Google accounts — no password to remember
- **Setup:** https://console.cloud.google.com → APIs & Services → OAuth 2.0 Credentials
- **Important:** Add your frontend URL to Authorized JavaScript Origins

### 5. Web Push (VAPID)
- **What:** Browser push notifications (the alerts that pop up even when the browser is closed)
- **Why:** Notify project team members of approvals, new change orders, etc.
- **Setup:** Run `npx web-push generate-vapid-keys` — copy the two keys to your `.env`
- **Currently:** Keys need to be generated and set

### 6. Paystack
- **What:** Nigerian online payment gateway — clients can pay invoices online
- **Why:** Dominant payment processor in Nigeria; supports bank transfer, card, USSD
- **Setup:** https://paystack.com → Register → Settings → API Keys
- **Webhook:** Must be configured at `https://pico-bello-boq.onrender.com/api/paystack/webhook` with event `charge.success`
- **Currently:** Backend webhook endpoint is built and deployed; Paystack dashboard config pending

### 7. Nodemailer / SMTP
- **What:** Sends emails (password reset, invoice delivery, invite links)
- **Why:** Built-in email delivery without a third-party service
- **Note:** Currently email sending may not be fully configured — review `services/email.js`

---

## 9. DATABASE: ALL MODELS & WHAT THEY STORE

Every model lives in `backend/src/models/`. Every document automatically has `companyId` scoping — meaning data is isolated per company (multi-tenant).

### Core Models

| Model | File | What it stores |
|-------|------|----------------|
| **User** | User.js | Accounts — name, email, hashed password, role, which company they belong to |
| **Company** | Company.js | Company profile — name, logo, address, bank details for invoices |
| **Project** | Project.js | A construction project — name, client, budget, dates, status |

### Pricing Libraries

| Model | File | What it stores |
|-------|------|----------------|
| **QsPrice** | QsPrice.js | QS rate items — material/labour items with standard rates (e.g. "Concrete Grade 25 - per m³ - ₦85,000") |
| **ArtisanPrice** | ArtisanPrice.js | Labour costs — daily/hourly rates for trades (e.g. "Bricklayer - ₦8,000/day") |
| **MaterialPrice** | MaterialPrice.js | Supplier price list — specific vendors with prices (e.g. "Dangote Cement 50kg - ₦8,500") |

### BOQ

| Model | File | What it stores |
|-------|------|----------------|
| **BoqVersion** | BoqVersion.js | A version of a Bill of Quantities for a project (draft/final/approved) |
| **BoqItem** | BoqItem.js | One line item in a BOQ — description, qty, unit cost, overhead %, profit %, 3 tier options |

**Auto-calculation formula:**
```
finalUnitPrice = baseCost × (1 + overhead%) × (1 + profit%)
totalCost = finalUnitPrice × quantity
```

### Invoicing

| Model | File | What it stores |
|-------|------|----------------|
| **Invoice** | Invoice.js | Invoice issued to client — line items, VAT, total, payments received, balance |
| **Estimate** | Estimate.js | Project cost estimate — different from invoice; uses the pricing engine |

**Invoice payment tracking:**
Each `Invoice` has a `payments` array embedded. When a payment is added:
- `amountPaid` = sum of all payment amounts
- `balance` = `total - amountPaid`
- If `balance ≤ 0`, status automatically changes to `'paid'`

### Execution & Site

| Model | File | What it stores |
|-------|------|----------------|
| **ChangeOrder** | ChangeOrder.js | A change to the original scope — title, original cost, new cost, difference, status (pending/approved/rejected) |
| **ProgressUpdate** | ProgressUpdate.js | Construction progress entries — phase, % complete, photos, actual costs |
| **SiteReport** | SiteReport.js | Daily/weekly site reports — weather, workers on site, problems, actions required |
| **Expense** | Expense.js | Project expenses — category, amount, vendor, date, receipt photos |

### Collaboration

| Model | File | What it stores |
|-------|------|----------------|
| **Contact** | Contact.js | Project contacts directory — clients, contractors, suppliers, consultants |
| **Comment** | Comment.js | Project comments (threaded) — for the client portal discussion board |
| **Document** | Document.js | Uploaded documents — linked to projects, stored in folders |
| **Notification** | Notification.js | In-app notifications per user |
| **PushSubscription** | PushSubscription.js | Browser push notification subscriptions |
| **Approval** | Approval.js | Client approvals on BOQ items/versions |

### Admin

| Model | File | What it stores |
|-------|------|----------------|
| **HistoricalProject** | HistoricalProject.js | Past project data used to calibrate the pricing estimation engine |
| **AuditLog** | AuditLog.js | Record of all significant actions — who did what, when |

---

## 10. BACKEND API: EVERY ROUTE

All routes are available at both `/api/v1/...` and `/api/...` (for backwards compatibility).

**Key:**
- 🔒 = Requires login (JWT token in `Authorization: Bearer <token>` header)
- 👑 = Admin only
- 📋 = Admin, QS, or Project Manager

### Authentication (`/api/auth`)
| Method | Path | Who | What |
|--------|------|-----|------|
| POST | `/auth/register` | Anyone | Create new account |
| POST | `/auth/login` | Anyone | Login, returns JWT |
| POST | `/auth/google` | Anyone | Google OAuth login |
| GET | `/auth/me` | 🔒 | Get current user profile |
| PUT | `/auth/profile` | 🔒 | Update own profile |
| POST | `/auth/forgot-password` | Anyone | Send password reset email |
| POST | `/auth/reset-password/:token` | Anyone | Reset password with token |
| POST | `/auth/invite` | 👑 | Invite team member by email |
| POST | `/auth/accept-invite/:token` | Anyone | Accept team invite and set password |

### Company (`/api/company`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/company` | 🔒 | Get company profile |
| PUT | `/company` | 👑 | Update company name, address, bank details |
| POST | `/company/logo` | 👑 | Upload company logo |

### Projects (`/api/projects`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/projects` | 🔒 | List all projects |
| POST | `/projects` | 📋 | Create new project |
| GET | `/projects/:id` | 🔒 | Get single project |
| PUT | `/projects/:id` | 📋 | Update project |
| DELETE | `/projects/:id` | 👑 | Delete project |

### Invoices (`/api/invoices`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/invoices` | 🔒 | List all invoices |
| POST | `/invoices` | 📋 | Create invoice |
| GET | `/invoices/:id` | 🔒 | Get single invoice |
| PUT | `/invoices/:id` | 📋 | Update invoice |
| DELETE | `/invoices/:id` | 👑 | Delete invoice |
| POST | `/invoices/:id/payments` | 📋 | Record a payment |
| DELETE | `/invoices/:id/payments/:paymentId` | 📋 | Remove a payment |
| POST | `/invoices/:id/mark-paid` | 📋 | Mark invoice as fully paid (records balance as payment) |
| GET | `/invoices/:id/pdf` | 🔒 | Download invoice as PDF |
| POST | `/paystack/webhook` | None | Paystack payment webhook (raw body) |

### Contacts (`/api/contacts`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/contacts` | 🔒 | List contacts |
| POST | `/contacts` | 📋 | Create contact |
| PUT | `/contacts/:id` | 📋 | Update contact |
| DELETE | `/contacts/:id` | 👑 | Delete contact |

### Change Orders (`/api/change-orders`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/change-orders` | 🔒 | List change orders |
| POST | `/change-orders` | 📋 | Create change order |
| PUT | `/change-orders/:id` | 📋 | Edit change order |
| DELETE | `/change-orders/:id` | 📋 | Delete change order |
| PATCH | `/change-orders/:id/decide` | 👑 | Approve or reject |

### Expenses (`/api/expenses`)
| Method | Path | Who | What |
|--------|------|-----|------|
| GET | `/expenses` | 🔒 | List expenses |
| POST | `/expenses` | 📋 | Add expense (supports file upload for receipts) |
| PUT | `/expenses/:id` | 📋 | Edit expense |
| DELETE | `/expenses/:id` | 📋 | Delete expense |

### Pricing Libraries
| Method | Path | Who | What |
|--------|------|-----|------|
| GET/POST | `/qs-prices` | 🔒/📋 | QS rate library |
| GET/POST | `/artisan-prices` | 🔒/📋 | Artisan labour rates |
| GET/POST | `/material-prices` | 🔒/📋 | Material supplier prices |
| GET | `/pricing` | 🔒 | Combined pricing search |

### BOQ
| Method | Path | Who | What |
|--------|------|-----|------|
| GET/POST | `/boq` | 🔒/📋 | BOQ versions |
| GET/PUT/DELETE | `/boq/:id` | 🔒/📋 | Single BOQ version |
| POST | `/boq/:id/items` | 📋 | Add item to BOQ |
| PUT | `/boq/:id/items/:itemId` | 📋 | Update BOQ item |

### Analytics (`/api/analytics`)
| GET | `/analytics` | 🔒 | Dashboard metrics — revenue, project counts, etc. |

### Dashboard (`/api/dashboard`)
| GET | `/dashboard` | 🔒 | Summary data for dashboard cards |

---

## 11. FRONTEND: EVERY PAGE & WHAT IT DOES

All pages live in `frontend/src/pages/`. Non-auth pages require login.

### Public Pages (no login needed)
| File | URL | What it shows |
|------|-----|---------------|
| `Landing.jsx` | `/` | Marketing landing page |
| `auth/Login.jsx` | `/login` | Email/password + Google login |
| `auth/Register.jsx` | `/register` | New account creation |
| `auth/ForgotPassword.jsx` | `/forgot-password` | Request password reset email |
| `auth/ResetPassword.jsx` | `/reset-password/:token` | Set new password |
| `auth/AcceptInvite.jsx` | `/accept-invite/:token` | Accept team invitation |

### App Pages (require login — all under `/app/`)
| File | URL | What it does |
|------|-----|--------------|
| `Dashboard.jsx` | `/app/dashboard` | Overview cards — revenue, active projects, pending approvals, overdue invoices |
| `Projects.jsx` | `/app/projects` | Project list with create/edit modal. Shows status badges, budget. |
| `Contacts.jsx` | `/app/contacts` | Contact directory. Create/edit contacts. Empty state has "Add First Contact" CTA. |
| `Invoices.jsx` | `/app/invoices` | Invoice list with status filters. Mark-as-paid button. Mobile card view + desktop table. |
| `InvoiceDetail.jsx` | `/app/invoices/:id` | Single invoice — line items, payments, PDF download button |
| `ChangeOrders.jsx` | `/app/change-orders` | Change order list. Approve/reject (admin). Print document. Status summary cards. |
| `ExpenseTracker.jsx` | `/app/expenses` | Expense list with category filter. Receipt photo lightbox. Summary by category. |
| `ProgressTracker.jsx` | `/app/progress` | Construction phase progress. Photo uploads. Completion percentages. |
| `SiteReports.jsx` | `/app/site-reports` | Daily/weekly site reports. Template selection. |
| `Analytics.jsx` | `/app/analytics` | Charts and metrics — revenue trends, expense breakdown, project status |
| `QsPricing.jsx` | `/app/qs-prices` | QS rate library — search, add, edit, import from Excel |
| `ArtisanPricing.jsx` | `/app/artisan-prices` | Artisan labour rate library |
| `MaterialPricing.jsx` | `/app/materials` | Material supplier price library |
| `PricingIntelligence.jsx` | `/app/price-intelligence` | Combines all 3 pricing sources in one view |
| `QsComparison.jsx` | `/app/qs-comparison` | Compare rates across sources |
| `Estimator.jsx` | `/app/estimator` | Automated estimate generator — input size, condition, tier → outputs cost estimate |
| `EstimateHistory.jsx` | `/app/estimates` | List of all estimates |
| `EstimateDetail.jsx` | `/app/estimates/:id` | Single estimate detail view |
| `HistoricalProjects.jsx` | `/app/historical-projects` | Past project database used to calibrate estimator |
| `Simulator.jsx` | `/app/simulator` | What-if cost simulation tool |
| `BoqBuilder.jsx` | `/app/boq` | Build and manage Bill of Quantities |
| `Documents.jsx` | `/app/documents` | File manager — upload, organize in folders |
| `ClientPortal.jsx` | `/app/client-portal` | Client-facing view of their projects (role: client) |
| `ClientBOQ.jsx` | `/app/client-boq` | Client view of BOQ with approval buttons |
| `ClientInvoices.jsx` | `/app/client-invoices` | Client view of their invoices |
| `ClientComments.jsx` | `/app/client-comments` | Client discussion/comments thread |
| `CompanySettings.jsx` | `/app/settings` | Company profile, logo, bank details, signature |
| `TeamManagement.jsx` | `/app/team` | Invite/manage team members, change roles |
| `Profile.jsx` | `/app/profile` | Own account settings, change password |

### Key Frontend Services
| File | What it does |
|------|--------------|
| `services/api.js` | Axios instance — attaches JWT token to every request, handles 401 logout |
| `context/AuthContext.jsx` | Stores logged-in user, provides `login()` / `logout()` / `user` to all components |
| `context/ToastContext.jsx` | Global toast notifications — `useToast()` hook returns `toast(message, type)` function |
| `context/ThemeContext.jsx` | Light/dark mode toggle |
| `components/ExcelImport.jsx` | Reusable Excel upload + column mapping for bulk data import |

---

## 12. USER ROLES & PERMISSIONS

| Permission | admin | qs | project_manager | client |
|-----------|-------|----|-----------------|--------|
| View all data | ✅ | ✅ | ✅ | ❌ (own only) |
| Create projects | ✅ | ✅ | ✅ | ❌ |
| Create invoices | ✅ | ✅ | ✅ | ❌ |
| Mark invoices paid | ✅ | ✅ | ✅ | ❌ |
| Create change orders | ✅ | ✅ | ✅ | ❌ |
| **Approve/reject** change orders | ✅ | ❌ | ❌ | ❌ |
| Manage team members | ✅ | ❌ | ❌ | ❌ |
| Delete records | ✅ | ❌ | ❌ | ❌ |
| Update company settings | ✅ | ❌ | ❌ | ❌ |
| View client portal | ❌ | ❌ | ❌ | ✅ |
| Approve BOQ options | ❌ | ❌ | ❌ | ✅ |

**The `authorize` middleware** in `backend/src/middleware/authorize.js` is used like:
```js
router.delete('/:id', protect, authorize('admin'), deleteRecord);
router.post('/', protect, authorize('admin', 'qs', 'project_manager'), createRecord);
```

---

## 13. HOW TO DEPLOY (RENDER.COM)

### First-time setup

**Step 1 — Create a Render account**
Go to https://render.com and connect your GitHub account.

**Step 2 — Deploy the Backend**
1. Render Dashboard → New → Web Service
2. Connect repository: `tidan1023-web/picobelloprojekte.boq`
3. Settings:
   - **Name:** `pico-bello-boq-api`
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
   - **Node Version:** 18 or higher
4. Add all environment variables from Section 7
5. Click **Create Web Service**

**Step 3 — Deploy the Frontend**
1. Render Dashboard → New → Static Site
2. Same repository
3. Settings:
   - **Name:** `pico-bello-boq-frontend`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
4. Add environment variables:
   - `VITE_API_URL` = `https://pico-bello-boq.onrender.com/api`
5. Click **Create Static Site**

**Step 4 — Update backend CORS**
In your backend environment variables, set:
```
CLIENT_URL=https://your-frontend-name.onrender.com
```

### Auto-deploy on push
Once connected, every push to `main` triggers an automatic redeploy. No manual steps needed.

### Checking deploy logs
Render Dashboard → your service → **Logs** tab. If the service fails to start, the error is shown here.

---

## 14. WHAT IS CURRENTLY WORKING

As of the last build session (June 2026):

| Feature | Status |
|---------|--------|
| User registration and login | ✅ Working |
| JWT authentication | ✅ Working |
| Google OAuth login | ✅ Working (if GOOGLE_CLIENT_ID is set) |
| Password reset via email | ✅ Working (if email SMTP configured) |
| Team invites | ✅ Working |
| Company settings | ✅ Working |
| Projects — create/edit/delete | ✅ Working |
| Contacts — full CRUD | ✅ Working |
| Contacts — empty state CTA | ✅ Working |
| Invoices — create/edit/delete | ✅ Working |
| Invoices — mark as paid button | ✅ Working |
| Invoices — PDF download | ✅ Working |
| Invoices — payment recording | ✅ Working |
| Change Orders — full CRUD | ✅ Working |
| Change Orders — print document | ✅ Working |
| Expense Tracker — full CRUD | ✅ Working |
| Expense Tracker — receipt photos | ✅ Working (if Cloudinary configured) |
| Progress Tracker | ✅ Working |
| Site Reports | ✅ Working |
| QS Pricing Library | ✅ Working |
| Artisan Pricing Library | ✅ Working |
| Material Pricing Library | ✅ Working |
| Excel import (all pricing pages) | ✅ Working |
| BOQ Builder | ✅ Working |
| Client Portal | ✅ Working |
| Estimator engine | ✅ Working |
| Analytics dashboard | ✅ Working |
| Toast notifications (global) | ✅ Working |
| Skeleton loaders | ✅ Working |
| Mobile responsive (card views) | ✅ Working |
| In-app notifications | ✅ Working |
| Push notifications (browser) | ⚠️ VAPID keys needed |
| Paystack webhook endpoint | ✅ Deployed |
| Paystack dashboard config | ❌ Not configured yet |
| File uploads (S3) | ⚠️ AWS keys needed |
| Cloudinary uploads | ⚠️ API keys needed |
| Backend deployed on Render | ✅ Live |
| Frontend deployed on Render | ✅ Live |

---

## 15. WHAT IS NOT WORKING / KNOWN ISSUES

### 1. AWS S3 Image Uploads — Not Configured
**Problem:** The server logs this warning on startup:
```
AWS S3 credentials not set — image upload features are disabled
```
**Effect:** Receipt photo uploads in Expense Tracker and site report photos don't save to cloud storage.
**Fix:** Add these to Render environment variables:
```
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET_NAME=pico-bello-uploads
```

### 2. Paystack Online Payments — Webhook Not Configured
**Problem:** The backend endpoint exists but Paystack doesn't know where to send payment events.
**Effect:** Clients cannot pay invoices online.
**Fix:**
1. Log in to https://paystack.com/business/settings
2. Go to **API Keys & Webhooks**
3. Set webhook URL to: `https://pico-bello-boq.onrender.com/api/paystack/webhook`
4. Enable event: `charge.success`
5. Add `PAYSTACK_SECRET_KEY` to Render env vars

### 3. Browser Push Notifications — Keys Not Generated
**Problem:** VAPID keys are not in the environment variables.
**Effect:** Push notifications don't work.
**Fix:** Run `npx web-push generate-vapid-keys` and add `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Render env vars.

### 4. Company Logo on Invoice PDF
**Problem:** The invoice PDF shows "PICO BELLO / PROJEKTE" as text instead of the real logo.
**Effect:** PDFs don't show the company logo image.
**Fix:** Place the real logo PNG at `frontend/public/logo.png` — or better, upload via Company Settings once Cloudinary is configured.

### 5. Render Free Tier Cold Starts
**Problem:** The backend may take 30–60 seconds to respond after a period of inactivity.
**Effect:** First request after idle period is slow.
**Fix:** Upgrade to Render Starter paid plan ($7/month) which keeps the service always running.

---

## 16. BUILD HISTORY — WHAT WAS DONE & WHEN

This section records every major build decision and change made during development.

### Phase 1 — Core Platform
- Built full authentication system (register, login, JWT, Google OAuth, password reset, team invites)
- Built company profile with branding (logo, signature, bank details)
- Built project CRUD
- Built 3 pricing libraries (QS prices, artisan prices, material prices)
- Built BOQ Builder with auto-calculation engine
- Built client portal with approval workflow
- Built invoice generator with PDF streaming
- Built estimator engine with historical project data calibration

### Phase 2 — Execution Module
- Added Change Orders module (create, approve/reject, print document)
- Added Expense Tracker with receipt photo uploads
- Added Progress Tracker
- Added Site Reports

### Phase 3 — UX Improvements
- Added mobile card views to all list pages (responsive design)
- Added skeleton loaders to all pages (content placeholder while loading)
- Added global toast notification system (`ToastContext.jsx`)
- Added `animate-slide-up` animation to Tailwind config
- Wired toast confirmations to: Projects, Contacts, Invoices (delete + mark-paid), ChangeOrders, ExpenseTracker
- Added "Add First Contact" CTA to Contacts empty state

### Phase 4 — Invoicing Improvements
- Added `POST /invoices/:id/mark-paid` backend endpoint
- Added Mark as Paid button (`BadgeCheck` icon) to invoice list (both mobile and desktop views)
- Added Paystack webhook endpoint (`paystackWebhook` export in invoiceController)
- Fixed critical deploy crash: `paystackWebhook` was imported in `index.js` but not exported from controller

### Phase 5 — Smart Estimator
- Estimator engine (`estimateEngine.js`) now computes a coefficient-of-variation from historical rates and derives a **confidence rating** (high/medium/low/manual) and a **low–likely–high price range** (spread) for every tier
- Each tier estimate carries `rateLow/rateHigh/totalLow/totalHigh` in addition to the point estimate
- Engine returns the top 3 **comparable historical projects** (ranked by matching condition, tier, and closeness in size) with their rate deviation vs. the calculated base rate
- `Estimate` model extended (`comparableProjectSchema`, range fields) so this data persists with each saved estimate
- Estimator wizard gained an optional **Smart Suggest** field — free-text project description is parsed client-side (`frontend/src/utils/smartSuggest.js`, rule-based, no external AI call) to pre-fill condition, tier, size, and includes, and to draft scope assumptions/exclusions text
- Estimate detail page and PDF now show the confidence badge, price range, and comparable projects list

### Phase 6 — BOQ Reviewer & Rate Alerter
- `backend/src/utils/rateAlerter.js` — fuzzy (Jaccard token-overlap) match of a BOQ line item's text against the company's QS Pricing Library; flags the item when its entered rate is more than 15% below the matched library rate. No FK link between `BoqItem` and `QsPrice` exists, so matching is text-based by design
- `backend/src/utils/boqReviewer.js` — rule-based checklist of 10 trades (Preliminaries, Concrete Works, Masonry, Roofing, Tiling, Painting, Doors & Windows, Plumbing, Electrical, External Works); for each trade already represented in the BOQ, flags commonly-paired items (e.g. plumbing present but no "testing & commissioning" line) that appear to be missing
- `GET /boq/:id` (`boqController.getVersion`) now returns each item with a computed `rateAlert` and a top-level `missingItems` list — both computed live, nothing persisted, so results stay current as the QS library or item list changes
- BOQ Builder UI: a warning icon + tooltip on any line item priced below the library rate, and a collapsible "BOQ Reviewer" panel above the item table listing missing items grouped by trade

### Notable Bugs Fixed
| Bug | Cause | Fix |
|-----|-------|-----|
| Backend crash on deploy | `paystackWebhook` undefined in controller but imported in index.js | Added `exports.paystackWebhook` to invoiceController.js |
| File size limit on GitHub push | 10 files too large for single push_files call | Split into 3 batches |
| Toast not working | Context value was `{ toast }` object but consumers called `const toast = useToast()` | Changed context value to be the function directly |

---

## 17. SUGGESTED NEXT IMPROVEMENTS

These were identified during the build but not yet implemented. Prioritized by impact:

### High Priority (do these first)
1. **Configure Paystack** — Set webhook URL in Paystack dashboard, add secret key to Render. This enables online payments.
2. **Configure VAPID** — Generate keys, add to Render. This enables push notifications.
3. **Client email on invoice** — Make sure every invoice has `clientEmail` populated so Paystack fallback works.

### Medium Priority
4. **Invoice due date alerts** — Automated job that checks for overdue invoices daily and sends email/notification
5. **Project progress percentage** — Show % complete on the project card in the Projects list
6. **Form validation feedback** — Inline field-level errors (e.g. "Email is invalid") instead of just a generic error message at the top
7. **Pagination** — Invoice and expense lists with many records should paginate (currently loads all)
8. **Audit log viewer** — Admin page to view the audit log (model exists but no UI)
9. **Client dashboard** — Summary view for client portal showing project health at a glance

### Lower Priority
10. **Rate limiting per user** — Currently rate-limited per IP; add per-authenticated-user limits
11. **File upload size limits** — Add max file size validation for receipt photos
12. **Keyboard accessibility** — Tab order and ARIA labels on modals
13. **Dark mode** — ThemeContext exists but dark mode styles not fully implemented

---

## 18. COMMON PROBLEMS & HOW TO FIX THEM

### "Cannot connect to database"
**Check:** Is `MONGODB_URI` set correctly? Does the MongoDB Atlas cluster allow connections from your IP (or from all IPs: `0.0.0.0/0` for Render)?
**Fix:** MongoDB Atlas → Network Access → Add IP Address → Allow From Anywhere

### "CORS error in the browser"
**Check:** Is `CLIENT_URL` in the backend env set to the exact frontend URL?
**Fix:** In Render backend env vars: `CLIENT_URL=https://your-exact-frontend-url.onrender.com`

### "401 Unauthorized on all API calls"
**Check:** Is the JWT token being sent? Check `services/api.js` — it should attach `Authorization: Bearer <token>` header.
**Common cause:** JWT_SECRET changed — all existing tokens become invalid. Users need to log in again.

### "Route.post() requires a callback function" crash
**Cause:** A function is imported in a route file but not exported from the controller.
**Fix:** Check the import at the top of `index.js` or route files, then confirm the function is exported with `exports.functionName = ...` in the controller.

### "Build failed" on Render
**Check the build logs.** Most common causes:
- Missing `package.json` dependency
- Syntax error in a recently pushed file
- Environment variable missing that the code requires at startup

### Slow first load
**Cause:** Render free tier spins down after 15 minutes of no traffic.
**Fix:** Upgrade to Starter plan OR accept it and warn users.

---

## 19. HOW TO ADD A NEW FEATURE (STEP-BY-STEP PATTERN)

Use this exact pattern every time. Example: adding a "Subcontractors" module.

### Step 1 — Create the Model (backend)
```js
// backend/src/models/Subcontractor.js
const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  name:      { type: String, required: true },
  trade:     { type: String },
  phone:     { type: String },
  rate:      { type: Number },
}, { timestamps: true });
module.exports = mongoose.model('Subcontractor', schema);
```

### Step 2 — Create the Controller (backend)
```js
// backend/src/controllers/subcontractorController.js
const Subcontractor = require('../models/Subcontractor');

exports.list   = async (req, res) => { ... }
exports.create = async (req, res) => { ... }
exports.update = async (req, res) => { ... }
exports.remove = async (req, res) => { ... }
```

### Step 3 — Create the Route (backend)
```js
// backend/src/routes/subcontractors.js
const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/authorize');
const ctrl = require('../controllers/subcontractorController');

router.get('/',     protect, ctrl.list);
router.post('/',    protect, authorize('admin','qs','project_manager'), ctrl.create);
router.put('/:id',  protect, authorize('admin','qs','project_manager'), ctrl.update);
router.delete('/:id', protect, authorize('admin'), ctrl.remove);

module.exports = router;
```

### Step 4 — Register the Route in index.js (backend)
```js
// In index.js, add:
const subcontractorRoutes = require('./routes/subcontractors');
// Then inside the forEach loop:
app.use(`${prefix}/subcontractors`, subcontractorRoutes);
```

### Step 5 — Create the Page (frontend)
```jsx
// frontend/src/pages/Subcontractors.jsx
import { useToast } from '../context/ToastContext';
// ... build list + modal pattern (copy from Contacts.jsx as template)
```

### Step 6 — Add the Route in App.jsx (frontend)
```jsx
import Subcontractors from './pages/Subcontractors';
// Inside <Route path="/app" ...>:
<Route path="subcontractors" element={<Subcontractors />} />
```

### Step 7 — Add to Sidebar navigation
```jsx
// In components/layout/Sidebar.jsx, add a new menu item
{ label: 'Subcontractors', path: '/app/subcontractors', icon: HardHat }
```

### Step 8 — Push to main
```bash
git add .
git commit -m "feat: add subcontractors module"
git push origin main
```

---

## 20. GLOSSARY

| Term | Meaning |
|------|---------|
| **BOQ** | Bill of Quantities — a detailed list of materials, labour, and costs for a construction project |
| **QS** | Quantity Surveyor — the professional who prepares BOQs and manages project costs |
| **JWT** | JSON Web Token — a secure way to verify that a user is logged in without storing sessions |
| **CORS** | Cross-Origin Resource Sharing — a browser security feature that controls which websites can call your API |
| **Mongoose** | An ODM (Object Document Mapper) — makes it easier to work with MongoDB from Node.js |
| **Render** | The cloud hosting platform this app is deployed on |
| **VAPID** | Voluntary Application Server Identification — keys needed to send browser push notifications |
| **Webhook** | A URL that Paystack (or another service) calls when an event happens, e.g. a payment succeeds |
| **Seed data** | Test data pre-loaded into the database to make development easier |
| **Middleware** | Code that runs between a request arriving and the route handler running — used for auth checks, logging, etc. |
| **Static site** | The frontend — pre-built HTML/JS/CSS files served directly without a server doing any work |
| **Web Service** | The backend — a running Node.js process that handles requests |
| **Multi-tenant** | Multiple companies can use the same platform; their data is kept separate via `companyId` |
| **SPA** | Single Page Application — the frontend loads once and React handles all navigation without full page reloads |

---

*Document last updated: June 2026*
*Repository: https://github.com/tidan1023-web/picobelloprojekte.boq*
*Platform: https://pico-bello-boq.onrender.com*
