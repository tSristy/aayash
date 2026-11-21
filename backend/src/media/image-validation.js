'use strict';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_PIXELS = 24 * 1024 * 1024;

class ImageUploadError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'ImageUploadError';
    this.status = status;
  }
}

function detectImageType(buffer) {
  if (buffer.length < 24) {
    throw new ImageUploadError('The selected file is not a supported image.');
  }

  const pngSignature = Buffer.from('89504e470d0a1a0a', 'hex');

  if (buffer.subarray(0, 8).equals(pngSignature)) {
    const hasIhdr = buffer.toString('ascii', 12, 16) === 'IHDR';
    const hasIend = buffer.subarray(-8, -4).toString('ascii') === 'IEND';
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);

    if (!hasIhdr || !hasIend || !width || !height || width * height > MAX_IMAGE_PIXELS) {
      throw new ImageUploadError('Invalid or excessively large PNG image.');
    }

    return { extension: 'png', mimeType: 'image/png' };
  }

  const isJpeg =
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff &&
    buffer.at(-2) === 0xff &&
    buffer.at(-1) === 0xd9;

  if (isJpeg) {
    let position = 2;
    let foundDimensions = false;

    // Check JPEG segment boundaries and at least one Start of Frame marker.
    while (position + 3 < buffer.length) {
      if (buffer[position] !== 0xff) {
        break;
      }

      while (buffer[position] === 0xff) {
        position++;
      }

      const marker = buffer[position++];

      if (marker === 0xda || marker === 0xd9) {
        break;
      }

      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        continue;
      }

      if (position + 2 > buffer.length) {
        break;
      }

      const segmentLength = buffer.readUInt16BE(position);

      if (segmentLength < 2 || position + segmentLength > buffer.length) {
        break;
      }

      const isFrameMarker = [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
        0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
      ].includes(marker);

      if (isFrameMarker && segmentLength >= 7) {
        const height = buffer.readUInt16BE(position + 3);
        const width = buffer.readUInt16BE(position + 5);

        if (!width || !height || width * height > MAX_IMAGE_PIXELS) {
          throw new ImageUploadError('Invalid or excessively large JPEG image.');
        }

        foundDimensions = true;
      }

      position += segmentLength;
    }

    if (!foundDimensions) {
      throw new ImageUploadError('Invalid JPEG image structure.');
    }

    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  const isWebP =
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP' &&
    buffer.readUInt32LE(4) + 8 === buffer.length;

  if (isWebP) {
    const chunkType = buffer.toString('ascii', 12, 16);

    if (!['VP8 ', 'VP8L', 'VP8X'].includes(chunkType)) {
      throw new ImageUploadError('Invalid WebP image structure.');
    }

    if (chunkType === 'VP8X' && buffer.length >= 30) {
      const width = buffer.readUIntLE(24, 3) + 1;
      const height = buffer.readUIntLE(27, 3) + 1;

      if (width * height > MAX_IMAGE_PIXELS) {
        throw new ImageUploadError('WebP image dimensions are too large.');
      }
    }

    return { extension: 'webp', mimeType: 'image/webp' };
  }

  throw new ImageUploadError('Only valid PNG, JPEG and WebP images are accepted.');
}

function parseImageUpload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ImageUploadError('Provide an image to upload.');
  }

  const { data_base64: data, mime_type: declaredType } = body;

  if (typeof data !== 'string' || !data.length) {
    throw new ImageUploadError('Image data is required.');
  }

  if (data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4) {
    throw new ImageUploadError('Each image must be 5 MB or smaller.', 413);
  }

  if (data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new ImageUploadError('The image data is not valid Base64.');
  }

  const buffer = Buffer.from(data, 'base64');

  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new ImageUploadError('Each image must be 5 MB or smaller.', 413);
  }

  const detected = detectImageType(buffer);

  if (declaredType !== detected.mimeType) {
    throw new ImageUploadError('File extension, content type and image data must match.');
  }

  return { buffer, ...detected };
}

module.exports = {
  MAX_IMAGE_BYTES,
  ImageUploadError,
  detectImageType,
  parseImageUpload,
};
