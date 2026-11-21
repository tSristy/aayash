import { catalogRequest } from './catalogApi';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');

      if (comma === -1) {
        reject(new Error('Cannot read the selected image.'));
        return;
      }

      resolve(result.slice(comma + 1));
    };

    reader.onerror = () => reject(new Error('Cannot read the selected image.'));
    reader.readAsDataURL(file);
  });
}

/** Upload one file through authenticated Next.js -> Express admin API proxy. */
export async function uploadProductImage(file) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error('Only JPEG, PNG and WebP images are supported.');
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`${file.name} is larger than 5 MB.`);
  }

  const encodedImage = await fileToBase64(file);

  return catalogRequest('/media/images', {
    method: 'POST',
    body: JSON.stringify({
      data_base64: encodedImage,
      mime_type: file.type,
    }),
  });
}
