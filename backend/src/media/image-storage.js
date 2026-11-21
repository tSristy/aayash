'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const { ImageUploadError } = require('./image-validation');

const LOCAL_IMAGE_NAME = /^[a-f0-9-]{36}\.(png|jpg|webp)$/;

function localUploadDirectory() {
  return path.resolve(process.env.MEDIA_UPLOAD_DIR || path.join(process.cwd(), 'uploads'));
}

async function saveLocalImage({ buffer, extension }) {
  if (process.env.NODE_ENV === 'production') {
    throw new ImageUploadError('Local media storage is disabled in production.', 503);
  }

  const directory = localUploadDirectory();
  const filename = `${crypto.randomUUID()}.${extension}`;

  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(directory, filename), buffer, {
    flag: 'wx',
    mode: 0o600,
  });

  return { url: `/uploads/${filename}`, storage: 'local' };
}

async function saveCloudinaryImage({ buffer, extension, mimeType }) {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;

  if (!cloud || !apiKey || !secret || !/^[a-zA-Z0-9_-]+$/.test(cloud)) {
    throw new ImageUploadError('Cloudinary credentials are not configured.', 503);
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const folder = 'ayashmart/products';
  const signature = crypto
    .createHash('sha1')
    .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
    .digest('hex');

  const form = new FormData();
  form.append('file', new Blob([buffer], { type: mimeType }), `image.${extension}`);
  form.append('folder', folder);
  form.append('timestamp', timestamp);
  form.append('api_key', apiKey);
  form.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: 'POST', body: form, signal: AbortSignal.timeout(30000) }
  );

  const result = await response.json().catch(() => ({}));

  if (
    !response.ok ||
    typeof result.secure_url !== 'string' ||
    !result.secure_url.startsWith(`https://res.cloudinary.com/${cloud}/image/upload/`)
  ) {
    throw new ImageUploadError('Image storage provider could not save the image.', 502);
  }

  return { url: result.secure_url, storage: 'cloudinary' };
}

async function storeImage(image) {
  const storage = process.env.MEDIA_STORAGE || 'local';

  if (storage === 'cloudinary') {
    return saveCloudinaryImage(image);
  }

  if (storage === 'local') {
    return saveLocalImage(image);
  }

  throw new ImageUploadError('Unsupported MEDIA_STORAGE configuration.', 503);
}

function registerLocalImageServing(app) {
  app.get('/uploads/:filename', (req, res) => {
    const { filename } = req.params;

    if (!LOCAL_IMAGE_NAME.test(filename)) {
      return res.status(404).end();
    }

    const extension = path.extname(filename).slice(1);
    const mime = {
      png: 'image/png',
      jpg: 'image/jpeg',
      webp: 'image/webp',
    }[extension];

    res.set({
      'Content-Type': mime,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'public, max-age=31536000, immutable',
    });

    return res.sendFile(
      filename,
      { root: localUploadDirectory(), dotfiles: 'deny' },
      error => {
        if (error && !res.headersSent) {
          res.status(error.status || 404).end();
        }
      }
    );
  });
}

module.exports = {
  localUploadDirectory,
  storeImage,
  registerLocalImageServing,
};
