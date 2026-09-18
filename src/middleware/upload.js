import multer from 'multer';
import { ApiError } from '../utils/apiResponse.js';

const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 4, parts: 5, fieldSize: 2048 },
  fileFilter(req, file, callback) {
    if (!allowedTypes.has(file.mimetype)) {
      return callback(new ApiError(415, 'UNSUPPORTED_IMAGE', 'Use a JPEG, PNG, or WebP image.'));
    }
    callback(null, true);
  },
}).single('image');

export default function uploadImage(req, res, next) {
  if (!req.is('multipart/form-data')) {
    return next(new ApiError(415, 'MULTIPART_REQUIRED', 'Send multipart/form-data with an image field.'));
  }
  upload(req, res, (error) => {
    if (error && !(error instanceof multer.MulterError) && !(error instanceof ApiError)) {
      return next(new ApiError(400, 'INVALID_MULTIPART', 'The multipart upload is malformed or incomplete.'));
    }
    next(error);
  });
}
