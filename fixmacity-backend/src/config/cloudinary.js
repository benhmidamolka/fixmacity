'use strict';

const cloudinary = require('cloudinary').v2;
const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('[Storage] Created uploads folder at:', UPLOAD_DIR);
}

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Legacy upload middleware for local storage using Busboy
 */
function uploadMiddleware(fieldName) {
  return (req, res, next) => {
    if (!req.is('multipart/form-data')) {
      return next();
    }

    const busboy = Busboy({
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    });

    let fileWritten = false;
    let fileInfo = null;

    busboy.on('file', (name, stream, info) => {
      if (name !== fieldName || fileWritten) {
        stream.resume();
        return;
      }

      const { filename, mimeType } = info;
      if (!ALLOWED_MIMETYPES.includes(mimeType)) {
        stream.resume();
        return;
      }

      const ext = path.extname(filename).toLowerCase() || '.jpg';
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const filepath = path.join(UPLOAD_DIR, unique);
      const writeStream = fs.createWriteStream(filepath);
      fileWritten = true;

      stream.pipe(writeStream);

      writeStream.on('close', () => {
        fileInfo = { filename: unique, originalname: filename, mimetype: mimeType, path: filepath };
      });

      writeStream.on('error', (err) => {
        console.error('[Storage] Write error:', err);
      });
    });

    busboy.on('field', (name, value) => {
      req.body = req.body || {};
      req.body[name] = value;
    });

    busboy.on('finish', () => {
      if (fileInfo) {
        req.file = fileInfo;
      }
      next();
    });

    busboy.on('error', (err) => {
      console.error('[Storage] Busboy error:', err);
      next(err);
    });

    req.pipe(busboy);
  };
}

const upload = { single: (fieldName) => (req, res, next) => next() }; // Dummy for backward compatibility

module.exports = {
  cloudinary, // Export the real v2 instance
  upload,
  uploadMiddleware,
  UPLOAD_DIR,
};
