'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { generalLimiter } = require('./middleware/rateLimit');

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
  const baseUrl = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
  const filename = path.basename(filepath);
  return `${baseUrl}/uploads/${filename}`;
};

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(UPLOAD_DIR));

app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
  skipSuccessfulRequests: true,
});

app.get('/api/health', (_req, res) => res.json({
  status: 'ok',
  platform: 'FixMaCity',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV || 'development',
}));

app.use('/api/auth', authLimiter, require('./routes/auth.routes'));
app.use('/api/declarations', require('./routes/declarations.routes'));
app.use('/api/president', require('./routes/president.routes'));
app.use('/api/chef', require('./routes/chef.routes'));
app.use('/api/agent', require('./routes/agent.routes'));
app.use('/api/chatbot', require('./routes/chatbot.routes'));
app.use('/api/notifications', require('./routes/notifications.routes'));
app.use('/api/propositions', require('./routes/propositions.routes'));
app.use('/api/public', require('./routes/public.routes'));

app.use((_req, res) => res.status(404).json({ error: 'Route introuvable.' }));

app.use((err, req, res, _next) => {
  console.error('[GlobalError]', err.message || err, '| Path:', req.path);
  if (err.code === 'LIMIT_FILE_SIZE')
    return res.status(413).json({ error: 'Fichier trop volumineux (max 10 Mo).' });
  if (err.message && err.message.includes('Type de fichier'))
    return res.status(400).json({ error: err.message });
  return res.status(500).json({ error: 'Erreur interne du serveur.' });
});

module.exports = app;