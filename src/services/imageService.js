import sharp from 'sharp';
import { ApiError } from '../utils/apiResponse.js';

export async function processImage(buffer) {
  try {
    const image = sharp(buffer, { limitInputPixels: 50_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(metadata.format)) {
      throw new ApiError(415, 'UNSUPPORTED_IMAGE', 'The actual file must be JPEG, PNG, or WebP.');
    }
    if ((metadata.pages ?? 1) > 1) {
      throw new ApiError(400, 'ANIMATED_IMAGE', 'Upload a single still image.');
    }
    return await image
      .rotate()
      .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 75 })
      .toBuffer(); // Sharp strips metadata by default; nothing is written to disk.
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'INVALID_IMAGE', 'Image is corrupt, unreadable, or exceeds 50 megapixels.');
  }
}
