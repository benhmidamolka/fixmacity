'use strict';

const Busboy = require('busboy');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('[Storage] Created uploads folder at:', UPLOAD_DIR);
}

const ALLOWED_MIMETYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

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

function getLocalFileInfo(file, baseUrl = 'http://localhost:5000') {
  if (!file) throw new Error('No file provided');
  const url = `${baseUrl}/uploads/${file.filename}`;
  const public_id = `local/${file.filename}`;
  return { url, public_id };
}

function deleteFromLocal(public_id) {
  try {
    const filename = public_id.replace('local/', '');
    const filepath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error('[Storage] Delete error:', err.message);
  }
}

function uploadToCloudinary(_buffer, _folder) {
  throw new Error('Use getLocalFileInfo(req.file) instead of uploadToCloudinary()');
}

function deleteFromCloudinary(public_id) {
  return deleteFromLocal(public_id);
}

const upload = { single: () => (req, _res, next) => next() };

module.exports = {
  upload,
  uploadMiddleware,
  uploadToCloudinary,
  deleteFromCloudinary,
  getLocalFileInfo,
  UPLOAD_DIR,
};
