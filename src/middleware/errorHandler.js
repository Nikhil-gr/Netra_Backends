import multer from 'multer';
import { ApiError, errorResponse } from '../utils/apiResponse.js';

export default function errorHandler(error, req, res, next) {
  if (req.file) delete req.file.buffer;
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 413, 'IMAGE_TOO_LARGE', 'The maximum image size is 5 MB.');
    }
    return errorResponse(res, 400, 'INVALID_UPLOAD', 'Send one image and at most the mode, query, language, and saveHistory fields.');
  }
  if (error instanceof ApiError) {
    if (error.status === 429) res.set('Retry-After', '60');
    return errorResponse(res, error.status, error.code, error.message);
  }
  if (error.type === 'entity.too.large') {
    return errorResponse(res, 413, 'BODY_TOO_LARGE', 'The JSON request body is too large.');
  }
  if (error.type === 'entity.parse.failed') {
    return errorResponse(res, 400, 'INVALID_JSON', 'The request body must be valid JSON.');
  }
  if (error.code === 11000) {
    return errorResponse(res, 409, 'DUPLICATE_VALUE', 'A record with that value already exists.');
  }
  if (error.name === 'ValidationError') {
    return errorResponse(res, 400, 'VALIDATION_ERROR', 'The request body failed validation.');
  }
  if (error.name === 'CastError') {
    return errorResponse(res, 400, 'INVALID_ID', 'The provided id is not a valid identifier.');
  }
  console.error('An unexpected backend error occurred.');
  return errorResponse(res, 500, 'INTERNAL_ERROR', 'Something went wrong. Please try again.');
}
