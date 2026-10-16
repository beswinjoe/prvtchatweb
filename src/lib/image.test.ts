import { describe, expect, it } from 'vitest';
import { validateImageMagicBytes, processAndCompressImage } from './image';

describe('Image Security & MIME Validation', () => {
  it('correctly identifies valid PNG magic bytes', async () => {
    // 89 50 4E 47 0D 0A 1A 0A
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    const file = new File([pngHeader], 'sample.png', { type: 'image/png' });
    const mime = await validateImageMagicBytes(file);
    expect(mime).toBe('image/png');
  });

  it('correctly identifies valid JPEG magic bytes', async () => {
    // FF D8 FF
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const file = new File([jpegHeader], 'photo.jpg', { type: 'image/jpeg' });
    const mime = await validateImageMagicBytes(file);
    expect(mime).toBe('image/jpeg');
  });

  it('correctly identifies valid WebP magic bytes', async () => {
    // RIFF .... WEBP
    const webpHeader = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x20, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const file = new File([webpHeader], 'graphic.webp', { type: 'image/webp' });
    const mime = await validateImageMagicBytes(file);
    expect(mime).toBe('image/webp');
  });

  it('correctly identifies valid GIF magic bytes', async () => {
    // GIF89a
    const gifHeader = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    const file = new File([gifHeader], 'animation.gif', { type: 'image/gif' });
    const mime = await validateImageMagicBytes(file);
    expect(mime).toBe('image/gif');
  });

  it('rejects executable SVG or XML vectors', async () => {
    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
    const file = new File([svgContent], 'vector.svg', { type: 'image/svg+xml' });
    await expect(processAndCompressImage(file)).rejects.toThrow(/SVG, HTML, and XML files are strictly prohibited/);
  });

  it('rejects random binary files masked as images', async () => {
    const fakeData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
    const file = new File([fakeData], 'malicious.jpg', { type: 'image/jpeg' });
    await expect(validateImageMagicBytes(file)).rejects.toThrow(/Unsupported or invalid image file signature/);
  });

  it('rejects files exceeding maximum processing size (15 MB)', async () => {
    // Mock oversized file
    const largeFile = {
      name: 'giant.jpg',
      type: 'image/jpeg',
      size: 16 * 1024 * 1024, // 16 MB
    } as unknown as File;

    await expect(processAndCompressImage(largeFile)).rejects.toThrow(/exceeds maximum local processing size/);
  });
});
