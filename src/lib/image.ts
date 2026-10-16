// =============================================================================
// PRVTCHAT IMAGE COMPRESSION & VALIDATION (Client-Side, Pre-Encryption)
// =============================================================================

import type { ImageAttachment } from '../types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB max raw input
const MAX_DIMENSION = 1200; // 1200px max dimension
const MAX_DATA_URL_LENGTH = 450_000; // ~330 KB compressed base64 payload

type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/**
 * Validates raw file signature (magic bytes) to prevent executable SVG/HTML injections
 * and verify that the file content matches its declared image format.
 */
export async function validateImageMagicBytes(file: File): Promise<SupportedImageFormat> {
  const slice = file.slice(0, 12);
  const buffer = await slice.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF ... WEBP (52 49 46 46 .... 57 45 42 50)
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  // GIF: 47 49 46 (GIF87a or GIF89a)
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }

  throw new Error(
    'Unsupported or invalid image file signature. Only JPEG, PNG, WebP, and GIF images are permitted.',
  );
}

/**
 * Validates, sanitizes, resizes, and compresses an image file client-side
 * before encryption. Output is a base64 data URL ready to be encrypted and sent.
 */
export async function processAndCompressImage(
  file: File,
): Promise<ImageAttachment> {
  if (!file) {
    throw new Error('No image file provided.');
  }

  // Reject SVG and HTML explicitly to eliminate script injection / XSS vectors
  const declaredType = (file.type || '').toLowerCase();
  if (declaredType.includes('svg') || declaredType.includes('html') || declaredType.includes('xml')) {
    throw new Error('SVG, HTML, and XML files are strictly prohibited for security.');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image exceeds maximum local processing size (15 MB).');
  }

  // Validate magic bytes
  await validateImageMagicBytes(file);

  return new Promise<ImageAttachment>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () =>
        reject(new Error('Malformed or corrupted image file. Decompression failed.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Guard against decompression bombs (insanely huge pixel dimensions)
        if (width > 8000 || height > 8000) {
          reject(new Error('Image dimensions exceed safe processing limit (8000x8000).'));
          return;
        }

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
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to initialize 2D canvas context.'));
          return;
        }

        // Clean white background for transparent PNG/WebP conversions
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try WebP first at 0.82 quality
        let dataUrl = canvas.toDataURL('image/webp', 0.82);

        // If WebP is unsupported by browser or exceeds limit, fallback to JPEG
        if (dataUrl.startsWith('data:image/png') || dataUrl.length > MAX_DATA_URL_LENGTH) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.72);
        }

        // Further compress if still oversized
        if (dataUrl.length > MAX_DATA_URL_LENGTH) {
          dataUrl = canvas.toDataURL('image/jpeg', 0.55);
        }

        // Extract the ACTUAL encoded MIME type from the data URL header
        // Fixes the MIME mismatch bug where jpeg fallback was reported as image/webp
        const mimeMatch = dataUrl.match(/^data:([^;]+);/);
        const actualMime = mimeMatch ? mimeMatch[1] : 'image/jpeg';

        // Sanitize original file name
        const cleanName = (file.name || 'attachment.jpg')
          .replace(/[^a-zA-Z0-9._-]/g, '_')
          .slice(0, 64);

        resolve({
          dataUrl,
          width,
          height,
          originalName: cleanName,
          mimeType: actualMime,
          approxBytes: Math.round((dataUrl.length * 3) / 4),
        });
      };

      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
