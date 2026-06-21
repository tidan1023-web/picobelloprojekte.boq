require('dotenv').config();
require('express-async-errors');

const express        = require('express');
const cors           = require('cors');
const helmet         = require('helmet');
const mongoSanitize  = require('express-mongo-sanitize');
const hpp            = require('hpp');
const connectDB      = require('./config/database');
const errorHandler   = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// ── Core routes (previously mounted) ─────────────────────────────────────────
const authRoutes               = require('./routes/auth');
const companyRoutes            = require('./routes/company');
const siteReportRoutes         = require('./routes/siteReports');
const historicalProjectRoutes  = require('./routes/historicalProjects');
const estimateRoutes           = require('./routes/estimates');
const invoiceRoutes            = require('./routes/invoices');

// ── Feature routes (previously built but not mounted) ─────────────────────────
const projectRoutes       = require('./routes/projects');
const contactRoutes       = require('./routes/contacts');
const qsPriceRoutes       = require('./routes/qsPrices');
const artisanPriceRoutes  = require('./routes/artisanPrices');
const materialPriceRoutes = require('./routes/materialPrices');
const boqRoutes           = require('./routes/boq');
const changeOrderRoutes   = require('./routes/changeOrders');
const progressRoutes      = require('./routes/progress');
const analyticsRoutes     = require('./routes/analytics');
const approvalRoutes      = require('./routes/approvals');
const pricingRoutes       = require('./routes/pricing');
const dashboardRoutes     = require('./routes/dashboard');
const commentRoutes       = require('./routes/comments');
const notificationRoutes  = require('./routes/notifications');

const app = express();
connectDB();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.some((o) => origin.startsWith(o))) return cb(null, true);
    if (origin.endsWith('.onrender.com')) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── Body parsing with size limit ──────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── NoSQL injection + HTTP parameter pollution prevention ─────────────────────
app.use(mongoSanitize());
app.use(hpp());

// ── Global rate limiting ──────────────────────────────────────────────────────
app.use('/api/', apiLimiter);

// ── Health / root ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ status: 'ok', service: 'Pico Bello Estimator API', version: '2.0.0' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes — available at /api/v1/* and /api/* (backward-compatible) ──────────
['/api/v1', '/api'].forEach((prefix) => {
  // Auth & company
  app.use(`${prefix}/auth`,                authRoutes);
  app.use(`${prefix}/company`,             companyRoutes);

  // Core features
  app.use(`${prefix}/estimates`,           estimateRoutes);
  app.use(`${prefix}/invoices`,            invoiceRoutes);
  app.use(`${prefix}/site-reports`,        siteReportRoutes);
  app.use(`${prefix}/historical-projects`, historicalProjectRoutes);

  // Projects & contacts
  app.use(`${prefix}/projects`,            projectRoutes);
  app.use(`${prefix}/contacts`,            contactRoutes);

  // Pricing libraries
  app.use(`${prefix}/qs-prices`,           qsPriceRoutes);
  app.use(`${prefix}/artisan-prices`,      artisanPriceRoutes);
  app.use(`${prefix}/material-prices`,     materialPriceRoutes);
  app.use(`${prefix}/pricing`,             pricingRoutes);

  // BOQ & execution
  app.use(`${prefix}/boq`,                 boqRoutes);
  app.use(`${prefix}/change-orders`,       changeOrderRoutes);
  app.use(`${prefix}/progress`,            progressRoutes);

  // Analytics & approvals
  app.use(`${prefix}/analytics`,           analyticsRoutes);
  app.use(`${prefix}/approvals`,           approvalRoutes);

  // Dashboard summary
  app.use(`${prefix}/dashboard`,           dashboardRoutes);

  // Collaboration
  app.use(`${prefix}/comments`,            commentRoutes);
  app.use(`${prefix}/notifications`,       notificationRoutes);
});

// ── 404 + error handler ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ message: 'Not found' }));
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Pico Bello Estimator API running on port ${PORT}`));
