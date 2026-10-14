// =============================================================================
// IMAGE COMPRESSION & VALIDATION (Client-Side, Pre-Encryption)
// =============================================================================

import type { ImageAttachment } from '../types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_DIMENSION = 1100;
const MAX_DATA_URL_LENGTH = 550_000;

/**
 * Validates, resizes, and compresses an image file client-side before
 * encryption. Output is a base64 data URL ready to be encrypted and sent.
 */
export async function processAndCompressImage(
  file: File,
): Promise<ImageAttachment> {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error(
      'Only valid image files (PNG, JPEG, WEBP, GIF) are permitted.',
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      'Image exceeds maximum local processing size (15 MB).',
    );
  }

  return new Promise<ImageAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('Malformed or corrupted image file.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          if (width > height) {
            height = Math.round((height * MAX_DIMENSION) / width);
            width = MAX_DIMENSION;
          } else {
            width = Math.round((width * MAX_DIMENSION) / height);
            height = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.82;
        let dataUrl = canvas.toDataURL('image/webp', quality);
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          quality = 0.6;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve({
          dataUrl,
          width,
          height,
          originalName: file.name || 'clipboard-image.webp',
          mimeType: 'image/webp',
          approxBytes: Math.round((dataUrl.length * 3) / 4),
        });
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
