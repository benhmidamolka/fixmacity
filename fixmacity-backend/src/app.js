'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { generalLimiter } = require('./middleware/rateLimit');
const sanitize = require('./middleware/sanitize');

const app = express();

// Ensure uploads folder exists locally
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Global Helper to convert local paths to full URLs
app.locals.getFileUrl = (filepath) => {
  if (!filepath) return null;
  if (filepath.startsWith('http')) return filepath;
  const baseUrl = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5005}`).replace(/\/$/, '');
  const filename = path.basename(filepath);
  return `${baseUrl}/uploads/${filename}`;
};

// ── Security ──
app.use(helmet({
  contentSecurityPolicy: false,   // Disable CSP for dev (frontend serves separately)
  crossOriginEmbedderPolicy: false,
}));

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173', // Standardized dev port
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (e.g., mobile apps, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    // In production, reject unknown origins
    if (process.env.NODE_ENV === 'production') {
      return cb(new Error('CORS non autorisé.'), false);
    }
    // In dev, allow all
    return cb(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize all incoming request bodies (XSS prevention)
app.use(sanitize);

app.use('/uploads', express.static(UPLOAD_DIR));

app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: true,
});

// ── Health Check ──
app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  platform: 'FixMaCity',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

// ── Routes ──
app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/declarations', require('./routes/declarations.routes'));
app.use('/api/president', require('./routes/president.routes'));
app.use('/api/chef', require('./routes/chef.routes'));
app.use('/api/agent', require('./routes/agent.routes'));
app.use('/api/chatbot', require('./routes/chatbot.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/propositions', require('./routes/propositions.routes'));
app.use('/api/tasks', require('./routes/tasks.routes'));
app.use('/api/public', require('./routes/public.routes'));

// ── Official President Interface ──
app.get('/president', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'president.html'));
});


// ── 404 ──
app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));

// ── Global Error Handler ──
app.use((err, req, res, _next) => {
  console.error('[GlobalError]', err.message || err, '| Path:', req.path);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'Fichier trop volumineux (max 10 Mo).' });
  if (err.message && err.message.includes('Type de fichier'))
    return res.status(400).json({ error: err.message });
  if (err.message && err.message.includes('CORS'))
    return res.status(403).json({ error: 'Origine non autorisée.' });
  return res.status(500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;