# Warehouse Inventory HQ

Production-ready full-stack system for managing medical hardware inventory and delivery accountability.

---

## Architecture

```
warehousetrackerhq/
├── backend/          # Node.js + Express API (deploy to Render)
└── frontend/         # Next.js 14 App Router (deploy to Vercel)
```

**Stack:**
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, TanStack Query
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB (Mongoose)
- **Storage:** AWS S3 (AES-256 encrypted image uploads)
- **Auth:** JWT (access + refresh tokens)
- **Monitoring:** Sentry
- **Deployment:** Render (backend) + Vercel (frontend)
