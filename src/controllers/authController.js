import User from "../models/User.js";
import FamilyLink from "../models/FamilyLink.js";
import { requireDatabase } from "../utils/crudGuards.js";
import { ApiError, successResponse } from "../utils/apiResponse.js";
import {
  hashPassword,
  issueToken,
  publicUser,
  requireAuthConfiguration,
  verifyPassword,
} from "../utils/auth.js";
import { normalizeEmergencyContacts, normalizePhone } from "../utils/userSupport.js";

const ROLES = ["parent", "child"];

function account(input, role) {
  if (!input || typeof input !== "object")
    throw new ApiError(
      400,
      "INVALID_REGISTRATION",
      `${role} account details are required.`,
    );
  if (typeof input.name !== "string" || !input.name.trim())
    throw new ApiError(400, "NAME_REQUIRED", `${role} name is required.`);
  if (typeof input.email !== "string" || !input.email.trim())
    throw new ApiError(400, "EMAIL_REQUIRED", `${role} email is required.`);
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: normalizePhone(input.phone),
    password: input.password,
    role,
  };
}

export async function registerFamily(req, res) {
  requireDatabase();
  requireAuthConfiguration();
  const parentInput = account(req.body?.parent, "parent");
  const childInput = account(req.body?.child, "child");
  if (parentInput.email === childInput.email)
    throw new ApiError(
      400,
      "INVALID_REGISTRATION",
      "Parent and child need different email addresses.",
    );
  const existing = await User.exists({
    email: { $in: [parentInput.email, childInput.email] },
  });
  if (existing)
    throw new ApiError(
      409,
      "EMAIL_ALREADY_EXISTS",
      "A user with one of these email addresses already exists.",
    );
  let parent;
  let child;
  try {
    parent = await User.create({
      ...parentInput,
      passwordHash: await hashPassword(parentInput.password),
    });
    child = await User.create({
      ...childInput,
      passwordHash: await hashPassword(childInput.password),
    });
    const link = await FamilyLink.create({
      parentId: parent._id,
      childId: child._id,
    });
    return successResponse(
      res,
      {
        parent: publicUser(parent),
        child: publicUser(child),
        linkId: link._id,
        token: issueToken(parent),
      },
      201,
    );
  } catch (error) {
    if (child) await User.deleteOne({ _id: child._id });
    if (parent) await User.deleteOne({ _id: parent._id });
    if (error?.code === 11000)
      throw new ApiError(
        409,
        "EMAIL_ALREADY_EXISTS",
        "A user with one of these email addresses already exists.",
      );
    throw error;
  }
}

export async function register(req, res) {
  requireDatabase();
  requireAuthConfiguration();
  const input = req.body ?? {};
  if (typeof input.name !== "string" || !input.name.trim())
    throw new ApiError(400, "NAME_REQUIRED", "name is required.");
  if (typeof input.email !== "string" || !input.email.trim())
    throw new ApiError(400, "EMAIL_REQUIRED", "email is required.");
  if (input.role !== undefined && !ROLES.includes(input.role))
    throw new ApiError(400, "INVALID_ROLE", "role must be parent or child.");
  const email = input.email.trim().toLowerCase();
  const emergencyContacts = normalizeEmergencyContacts(input.emergencyContacts);
  try {
    const user = await User.create({
      name: input.name.trim(),
      email,
      phone: normalizePhone(input.phone),
      passwordHash: await hashPassword(input.password),
      role: input.role ?? null,
      emergencyContacts: emergencyContacts ?? [],
    });
    return successResponse(res, { user: publicUser(user), token: issueToken(user) }, 201);
  } catch (error) {
    if (error?.code === 11000)
      throw new ApiError(409, "EMAIL_ALREADY_EXISTS", "A user with this email already exists.");
    throw error;
  }
}

export async function login(req, res) {
  requireDatabase();
  requireAuthConfiguration();
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string")
    throw new ApiError(
      400,
      "EMAIL_AND_PASSWORD_REQUIRED",
      "email and password are required.",
    );
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select(
    "+passwordHash",
  );
  if (
    !user ||
    !user.passwordHash ||
    !(await verifyPassword(password, user.passwordHash))
  )
    throw new ApiError(
      401,
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  return successResponse(res, {
    user: publicUser(user),
    token: issueToken(user),
  });
}
