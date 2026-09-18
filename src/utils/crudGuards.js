import mongoose from 'mongoose';
import { isDatabaseConnected } from '../config/db.js';
import { ApiError } from './apiResponse.js';

export function requireDatabase() {
  if (!isDatabaseConnected()) {
    throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'Connect MongoDB and try again.');
  }
}

export function requireObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, 'INVALID_ID', 'The provided id is not a valid identifier.');
  }
}
