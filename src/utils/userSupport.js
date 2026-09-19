import User from '../models/User.js';
import { ApiError } from './apiResponse.js';
import { requireObjectId } from './crudGuards.js';

export async function requireUser(id, expectedRole = null) {
  requireObjectId(id);
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found.');
  if (expectedRole && user.role !== expectedRole) {
    throw new ApiError(403, expectedRole === 'parent' ? 'PARENT_REQUIRED' : 'CHILD_REQUIRED', `A ${expectedRole} user is required.`);
  }
  return user;
}

export function normalizePhone(value) {
  if (typeof value !== 'string') throw new ApiError(400, 'INVALID_PHONE', 'phone must be a valid dialable number.');
  const trimmed = value.trim();
  const normalized = `${trimmed.startsWith('+') ? '+' : ''}${trimmed.replace(/\D/g, '')}`;
  const digits = normalized.replace('+', '');
  if (!/^\+?\d{7,15}$/.test(normalized) || !digits) {
    throw new ApiError(400, 'INVALID_PHONE', 'phone must contain 7 to 15 digits, optionally starting with +.');
  }
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
}

export function normalizeEmergencyContacts(value) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new ApiError(400, 'INVALID_EMERGENCY_CONTACTS', 'emergencyContacts must be an array.');
  const contacts = value.map((contact) => {
    if (!contact || typeof contact !== 'object' || Array.isArray(contact) || typeof contact.name !== 'string' || !contact.name.trim()) {
      throw new ApiError(400, 'INVALID_EMERGENCY_CONTACT', 'Each emergency contact needs a non-empty name and phone.');
    }
    if (contact.relationship !== undefined && (typeof contact.relationship !== 'string' || !contact.relationship.trim())) {
      throw new ApiError(400, 'INVALID_EMERGENCY_CONTACT', 'relationship must be non-empty text when supplied.');
    }
    if (contact.isPrimary !== undefined && typeof contact.isPrimary !== 'boolean') {
      throw new ApiError(400, 'INVALID_EMERGENCY_CONTACT', 'isPrimary must be true or false.');
    }
    return { name: contact.name.trim(), relationship: contact.relationship?.trim() || null, phone: normalizePhone(contact.phone), isPrimary: contact.isPrimary === true };
  });
  const primaryCount = contacts.filter((contact) => contact.isPrimary).length;
  if (primaryCount > 1) throw new ApiError(400, 'MULTIPLE_PRIMARY_CONTACTS', 'Only one emergency contact can be primary.');
  if (contacts.length && primaryCount === 0) contacts[0].isPrimary = true;
  return contacts;
}

export function getPrimaryContact(user) {
  if (!user.emergencyContacts?.length) throw new ApiError(400, 'NO_EMERGENCY_CONTACT', 'The user has no emergency contacts.');
  const contact = user.emergencyContacts.find((item) => item.isPrimary);
  if (!contact) throw new ApiError(400, 'NO_PRIMARY_EMERGENCY_CONTACT', 'The user has no primary emergency contact.');
  return contact;
}

export function validateLocation(value, { required = false, includeMovement = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ApiError(400, 'LOCATION_REQUIRED', 'A location is required.');
    return null;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'INVALID_LOCATION', 'location must be an object.');
  const output = {};
  for (const key of ['latitude', 'longitude']) {
    if (!Number.isFinite(value[key])) throw new ApiError(400, 'INVALID_LOCATION', `${key} must be a number.`);
    output[key] = value[key];
  }
  if (output.latitude < -90 || output.latitude > 90 || output.longitude < -180 || output.longitude > 180) throw new ApiError(400, 'INVALID_LOCATION', 'Location coordinates are out of range.');
  for (const key of includeMovement ? ['accuracy', 'heading', 'speed'] : ['accuracy']) {
    if (value[key] !== undefined && (!Number.isFinite(value[key]) || value[key] < 0 || (key === 'heading' && value[key] > 360))) {
      throw new ApiError(400, 'INVALID_LOCATION', `${key} is invalid.`);
    }
    if (value[key] !== undefined) output[key] = value[key];
  }
  return output;
}
