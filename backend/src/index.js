'use strict';
require('dotenv/config');
const express = require('express');
const { Router } = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const Sentry = require('@sentry/node');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { connectDatabase } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const { mongoSanitize } = require('./middleware/sanitize');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { User } = require('./models/User');
// Register eBay models so Mongoose knows about them before any query runs
require('./models/EbayToken');
require('./models/EbayListing');
const { startEbaySyncJob } = require('./jobs/ebaySync');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const defectRoutes = require('./routes/defects');
const auditRoutes = require('./routes/audit');
const dashboardRoutes = require('./routes/dashboard');
const ebayRoutes = require('./routes/ebay');

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.2,
  });
}

const app = express();

app.set('trust proxy', 1);

// Attach a unique request ID to every request for log correlation
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', '*.amazonaws.com'],
        connectSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// Only allow localhost origins in non-production environments
const allowedOrigins =
  process.env.NODE_ENV === 'production'
    ? [process.env.FRONTEND_URL].filter(Boolean)
    : [process.env.FRONTEND_URL || 'http://localhost:3000', 'http://localhost:3001'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (_req, res) => res.statusCode < 400 && process.env.NODE_ENV === 'production',
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Strip MongoDB operator keys ($gt, $where, etc.) from all user-supplied input
app.use(mongoSanitize);

// Rate limit all API traffic
app.use('/api/', apiLimiter);

// Root redirect to the frontend app
app.get('/', (_req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  res.redirect(301, frontendUrl);
});

// Health check — accessible without auth for Render/uptime monitors
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'warehouse-inventory-hq-api',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// v1 API router — all product routes live under /api/v1
const v1 = Router();
v1.use('/auth', authRoutes);
v1.use('/products', productRoutes);
v1.use('/defects', defectRoutes);
v1.use('/audit', auditRoutes);
v1.use('/dashboard', dashboardRoutes);
v1.use('/ebay', ebayRoutes);

app.use('/api/v1', v1);
// Backward-compatibility alias so any existing integrations keep working
app.use('/api', v1);

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  await connectDatabase();
  await seedAdminIfNeeded();

  // Start background eBay status sync (runs 2 min after startup, then every 30 min)
  startEbaySyncJob();

  const PORT = parseInt(process.env.PORT || '5000', 10);
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Warehouse Inventory HQ API running on port ${PORT}`, {
      env: process.env.NODE_ENV,
      port: PORT,
      apiVersion: 'v1',
    });
  });
}

async function seedAdminIfNeeded() {
  if (mongoose.connection.readyState !== 1) return;

  const adminEmail = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const adminPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  const adminEmpId = process.env.BOOTSTRAP_ADMIN_EMPLOYEE_ID;

  if (!adminEmail || !adminPassword || !adminEmpId) return;

  const existing = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existing) return;

  await User.create({
    employeeId: adminEmpId,
    name: 'System Admin',
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
  });

  logger.info('Bootstrap admin account created', { email: adminEmail });
}

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err.message });
  process.exit(1);
});

module.exports = app;
