import User from '../models/User.js';
import { requireDatabase, requireObjectId } from '../utils/crudGuards.js';
import { ApiError, successResponse } from '../utils/apiResponse.js';

export async function createUser(req, res) {
  requireDatabase();
  const { name, email } = req.body ?? {};
  if (typeof name !== 'string' || !name.trim()) {
    throw new ApiError(400, 'NAME_REQUIRED', 'name is required.');
  }
  if (typeof email !== 'string' || !email.trim()) {
    throw new ApiError(400, 'EMAIL_REQUIRED', 'email is required.');
  }
  const user = await User.create({ name: name.trim(), email: email.trim() });
  return successResponse(res, user, 201);
}

export async function getUsers(req, res) {
  requireDatabase();
  const users = await User.find().sort({ createdAt: -1 }).limit(100).lean();
  return successResponse(res, users);
}

export async function getUserById(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const user = await User.findById(req.params.id).lean();
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  return successResponse(res, user);
}

export async function updateUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { name, email } = req.body ?? {};
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  return successResponse(res, user);
}

export async function deleteUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  return successResponse(res, { deleted: true });
}
