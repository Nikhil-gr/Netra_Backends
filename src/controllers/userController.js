import User from "../models/User.js";
import FamilyLink from "../models/FamilyLink.js";
import PairingCode from "../models/PairingCode.js";
import ChildLocation from "../models/ChildLocation.js";
import Settings from "../models/Settings.js";
import { requireDatabase, requireObjectId } from "../utils/crudGuards.js";
import { ApiError, successResponse } from "../utils/apiResponse.js";
import { normalizeEmergencyContacts } from "../utils/userSupport.js";

const ROLES = ["parent", "child"];
function validateName(name) {
  if (typeof name !== "string" || !name.trim())
    throw new ApiError(400, "NAME_REQUIRED", "name is required.");
  return name.trim();
}
function validateEmail(email) {
  if (typeof email !== "string" || !email.trim())
    throw new ApiError(400, "EMAIL_REQUIRED", "email is required.");
  return email.trim().toLowerCase();
}
function validateRole(role) {
  if (role !== undefined && !ROLES.includes(role))
    throw new ApiError(400, "INVALID_ROLE", "role must be parent or child.");
  return role;
}

export async function createUser(req, res) {
  requireDatabase();
  const { name, email, role, emergencyContacts } = req.body ?? {};
  const userData = {
    name: validateName(name),
    email: validateEmail(email),
    role: validateRole(role) ?? null,
  };
  const contacts = normalizeEmergencyContacts(emergencyContacts);
  if (contacts !== undefined) userData.emergencyContacts = contacts;
  try {
    const user = await User.create(userData);
    return successResponse(res, user, 201);
  } catch (error) {
    if (error?.code === 11000)
      throw new ApiError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "A user with this email already exists.",
      );
    throw error;
  }
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
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  return successResponse(res, user);
}

export async function updateUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { name, email, role, emergencyContacts } = req.body ?? {};
  const existing = await User.findById(req.params.id);
  if (!existing) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  const updates = {};
  if (name !== undefined) updates.name = validateName(name);
  if (email !== undefined) updates.email = validateEmail(email);
  if (role !== undefined) {
    validateRole(role);
    if (existing.role !== null)
      throw new ApiError(
        409,
        "ROLE_ALREADY_ASSIGNED",
        "A user role cannot be changed after it has been assigned.",
      );
    updates.role = role;
  }
  const contacts = normalizeEmergencyContacts(emergencyContacts);
  if (contacts !== undefined) updates.emergencyContacts = contacts;
  try {
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });
    return successResponse(res, user);
  } catch (error) {
    if (error?.code === 11000)
      throw new ApiError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "A user with this email already exists.",
      );
    throw error;
  }
}

export async function deleteUser(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, "USER_NOT_FOUND", "User not found.");
  await Promise.all([
    FamilyLink.updateMany(
      { $or: [{ parentId: user._id }, { childId: user._id }] },
      { status: "revoked" },
    ),
    PairingCode.deleteMany({ childId: user._id }),
    ChildLocation.deleteOne({ childId: user._id }),
    Settings.deleteOne({ userId: user._id }),
  ]);
  // History and SOS records are intentionally retained as historical records.
  return successResponse(res, { deleted: true });
}
