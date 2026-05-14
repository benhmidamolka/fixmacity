require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const cron = require('node-cron');

const { autoCloseResolvedDeclarations } = require('./src/services/autoClose.service');

const PORT = process.env.PORT || 5005;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5174',
    credentials: true,
  },
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    socket.join(userId);
  });
});

app.set('emitToUser', (userId, data) => {
  io.to(userId).emit('notification', data);
});

// Run every day at 02:00
cron.schedule('0 2 * * *', async () => {
  console.log('[CRON] Running auto-close job...');
  try {
    const count = await autoCloseResolvedDeclarations(app);
    console.log(`[CRON] Auto-closed ${count} declaration(s).`);
  } catch (err) {
    console.error('[CRON] Auto-close error:', err.message);
  }
});

server.listen(PORT, () => {
  console.log(`FixMaCity API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log('--- BACKEND READY ---');
});

// Simple error handler — with retry logic for EADDRINUSE (Windows port release lag)
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Server] Port ${PORT} is in use, retrying in 1s...`);
    setTimeout(() => {
      server.close();
      server.listen(PORT);
    }, 1000);
  } else {
    console.error('[Server] Fatal error:', err);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UnhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UncaughtException]', err);
  process.exit(1);
});
