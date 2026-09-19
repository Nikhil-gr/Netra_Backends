import crypto from "node:crypto";
import { promisify } from "node:util";
import { ApiError } from "./apiResponse.js";

const scrypt = promisify(crypto.scrypt);
const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

function authSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET?.trim();
  if (!secret || secret.length < 32)
    throw new ApiError(
      503,
      "AUTH_NOT_CONFIGURED",
      "Set a strong AUTH_TOKEN_SECRET to enable private features.",
    );
  return secret;
}

export function requireAuthConfiguration() {
  authSecret();
}

export async function hashPassword(password) {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 200
  ) {
    throw new ApiError(
      400,
      "INVALID_PASSWORD",
      "password must be 8 to 200 characters.",
    );
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  if (typeof password !== "string" || typeof storedHash !== "string")
    return false;
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = Buffer.from(await scrypt(password, salt, 64)).toString("hex");
  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
  );
}

export function issueToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user._id.toString(),
      role: user.role,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", authSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyToken(token) {
  if (typeof token !== "string" || !token.includes("."))
    throw new ApiError(
      401,
      "INVALID_TOKEN",
      "Authentication token is invalid.",
    );
  const [payload, signature] = token.split(".");
  const expected = crypto
    .createHmac("sha256", authSecret())
    .update(payload)
    .digest("base64url");
  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  )
    throw new ApiError(
      401,
      "INVALID_TOKEN",
      "Authentication token is invalid.",
    );
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (
      !data?.sub ||
      !Number.isInteger(data.exp) ||
      data.exp <= Math.floor(Date.now() / 1000)
    )
      throw new Error("expired");
    return data;
  } catch {
    throw new ApiError(401, "TOKEN_EXPIRED", "Sign in again to continue.");
  }
}

export function publicUser(user) {
  const value = user.toObject ? user.toObject() : user;
  const { passwordHash, ...safe } = value;
  return safe;
}
