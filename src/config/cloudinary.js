import { v2 as cloudinary } from 'cloudinary';
import { ApiError } from '../utils/apiResponse.js';

let configured = false;

export function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Set the Cloudinary credentials to save images.');
  }

  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }

  return cloudinary;
}
