'use strict';

const { ImageUploadError, parseImageUpload } = require('../../media/image-validation');
const { storeImage } = require('../../media/image-storage');

const uploadWindows = new Map();
const RATE_WINDOW_MS = 15 * 60 * 1000;
const MAX_UPLOADS_PER_WINDOW = 60;

function ensureUploadAllowance(adminUserId) {
  const now = Date.now();
  const current = uploadWindows.get(adminUserId);

  if (!current || now >= current.expiresAt) {
    uploadWindows.set(adminUserId, { count: 1, expiresAt: now + RATE_WINDOW_MS });
    return;
  }

  if (current.count >= MAX_UPLOADS_PER_WINDOW) {
    throw new ImageUploadError('Too many uploads. Please retry later.', 429);
  }

  current.count++;
}

async function uploadProductImage(req, res, next) {
  try {
    ensureUploadAllowance(req.adminUser.id);
    const image = parseImageUpload(req.body);
    const uploaded = await storeImage(image);

    return res.status(201).json(uploaded);
  } catch (error) {
    if (error instanceof ImageUploadError) {
      return res.status(error.status).json({ error: error.message });
    }

    return next(error);
  }
}

module.exports = { uploadProductImage };
