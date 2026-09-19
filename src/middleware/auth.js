import User from "../models/User.js";
import { ApiError } from "../utils/apiResponse.js";
import { verifyToken } from "../utils/auth.js";

async function authenticate(req) {
  const header = req.get("Authorization");
  if (!header?.startsWith("Bearer "))
    throw new ApiError(401, "AUTH_REQUIRED", "Sign in to use this feature.");
  const payload = verifyToken(header.slice(7).trim());
  const user = await User.findById(payload.sub).select("+passwordHash");
  if (!user)
    throw new ApiError(
      401,
      "INVALID_TOKEN",
      "Authentication token is invalid.",
    );
  req.user = { id: user._id.toString(), role: user.role, user };
}

export async function requireAuth(req, res, next) {
  try {
    await authenticate(req);
    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req, res, next) {
  if (!req.get("Authorization")) return next();
  return requireAuth(req, res, next);
}
