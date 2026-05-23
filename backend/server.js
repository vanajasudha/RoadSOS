require('dotenv').config();

const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

// ── Startup env validation ────────────────────────────────────────────────────
const isProd = process.env.NODE_ENV === 'production';

const REQUIRED_VARS = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_VARS.filter(v => !process.env[v]);
if (missing.length) {
  console.error(`[startup] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

if (isProd && process.env.JWT_SECRET === 'roadsos-super-secret-key-change-in-prod') {
  console.error('[startup] JWT_SECRET must be changed from the default value before running in production');
  process.exit(1);
}

const authRoutes           = require('./routes/auth');
const contactRoutes        = require('./routes/contacts');
const alertRoutes          = require('./routes/alerts');
const nearbyRoutes         = require('./routes/nearby');
const medicalProfileRoutes = require('./routes/medicalProfile');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// React Native does not send an Origin header, so wildcard is safe for mobile-only backends.
// Set CORS_ORIGIN to restrict to specific web origins if a web client is added.
app.use(cors({
  origin:         process.env.CORS_ORIGIN || '*',
  methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'ROADSoS API',
    status:  'running',
    env:     process.env.NODE_ENV || 'development',
    db:      mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/contacts',        contactRoutes);
app.use('/api/alerts',          alertRoutes);
app.use('/api/nearby',          nearbyRoutes);
app.use('/api/medical-profile', medicalProfileRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: isProd ? 'Internal server error' : err.message,
    ...(isProd ? {} : { stack: err.stack }),
  });
});

// ── Database + server start ───────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`ROADSoS server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
      if (!isProd) {
        console.log('Routes:');
        console.log('  POST   /api/auth/firebase-login');
        console.log('  POST   /api/auth/send-otp');
        console.log('  POST   /api/auth/verify-otp');
        console.log('  GET    /api/auth/me');
        console.log('  PATCH  /api/auth/profile');
        console.log('  POST   /api/contacts         (auth required)');
        console.log('  GET    /api/contacts         (auth required)');
        console.log('  DELETE /api/contacts/:id     (auth required)');
        console.log('  POST   /api/alerts           (auth required)');
        console.log('  GET    /api/alerts           (auth required)');
        console.log('  PATCH  /api/alerts/:id/resolve (auth required)');
        console.log('  POST   /api/alerts/bulk-sync (auth required)');
        console.log('  GET    /api/nearby?lat=X&lng=Y');
        console.log('  POST   /api/medical-profile  (auth required)');
        console.log('  GET    /api/medical-profile  (auth required)');
      }
    });
  })
  .catch(err => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
