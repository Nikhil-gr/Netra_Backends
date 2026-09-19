import crypto from "node:crypto";
import ChildLocation from "../models/ChildLocation.js";
import FamilyLink from "../models/FamilyLink.js";
import History from "../models/History.js";
import PairingCode from "../models/PairingCode.js";
import SosEvent from "../models/SosEvent.js";
import User from "../models/User.js";
import { requireDatabase, requireObjectId } from "../utils/crudGuards.js";
import { ApiError, successResponse } from "../utils/apiResponse.js";
import { requireUser, validateLocation } from "../utils/userSupport.js";

const hashCode = (code) =>
  crypto.createHash("sha256").update(code).digest("hex");
const profile = (user) => ({ _id: user._id, name: user.name, role: user.role });
const limitFrom = (value) => {
  const limit = value ?? "20";
  if (
    typeof limit !== "string" ||
    !/^\d+$/.test(limit) ||
    Number(limit) < 1 ||
    Number(limit) > 100
  )
    throw new ApiError(400, "INVALID_PAGINATION", "limit must be 1 to 100.");
  return Number(limit);
};

async function activeLink(parentId, childId, control = null) {
  const link = await FamilyLink.findOne({
    parentId,
    childId,
    status: "active",
  });
  if (!link)
    throw new ApiError(
      403,
      "FAMILY_LINK_NOT_FOUND",
      "There is no active parent-child link.",
    );
  if (control && !link.controls[control])
    throw new ApiError(
      403,
      control === "trackingEnabled"
        ? "TRACKING_NOT_ALLOWED"
        : control === "historyVisible"
          ? "HISTORY_ACCESS_DENIED"
          : "SOS_ACCESS_DENIED",
      "This parent does not have access to that child data.",
    );
  return link;
}

export async function generatePairingCode(req, res) {
  requireDatabase();
  const child = await requireUser(req.body?.childUserId, "child");
  const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await PairingCode.deleteMany({ childId: child._id, usedAt: null });
  await PairingCode.create({
    childId: child._id,
    codeHash: hashCode(code),
    expiresAt,
  });
  return successResponse(res, { code, expiresAt }, 201);
}

export async function claimPairingCode(req, res) {
  requireDatabase();
  const { parentUserId, code } = req.body ?? {};
  const parent = await requireUser(parentUserId, "parent");
  if (typeof code !== "string" || !/^\d{6}$/.test(code))
    throw new ApiError(
      400,
      "INVALID_PAIRING_CODE",
      "Provide a valid pairing code.",
    );
  const codeHash = hashCode(code);
  const candidate = await PairingCode.findOne({ codeHash, usedAt: null });
  if (candidate && candidate.expiresAt <= new Date())
    throw new ApiError(
      400,
      "PAIRING_CODE_EXPIRED",
      "The pairing code has expired.",
    );
  const pairing = await PairingCode.findOneAndUpdate(
    { codeHash, usedAt: null, expiresAt: { $gt: new Date() } },
    { $set: { usedAt: new Date() } },
    { new: true },
  );
  if (!pairing)
    throw new ApiError(
      400,
      "INVALID_PAIRING_CODE",
      "The pairing code is invalid, used, or expired.",
    );
  const child = await requireUser(pairing.childId, "child");
  if (String(parent._id) === String(child._id))
    throw new ApiError(
      400,
      "INVALID_PAIRING_CODE",
      "A user cannot link to themselves.",
    );
  const link = await FamilyLink.findOneAndUpdate(
    { parentId: parent._id, childId: child._id },
    {
      $set: { status: "active" },
      $setOnInsert: {
        controls: {
          trackingEnabled: true,
          historyVisible: true,
          sosVisible: true,
        },
      },
    },
    { new: true, upsert: true, runValidators: true },
  );
  return successResponse(
    res,
    {
      linkId: link._id,
      parent: profile(parent),
      child: profile(child),
      controls: link.controls,
    },
    201,
  );
}

export async function listChildren(req, res) {
  requireDatabase();
  const parent = await requireUser(req.user.id, "parent");
  const links = await FamilyLink.find({
    parentId: parent._id,
    status: "active",
  }).lean();
  const children = await User.find({
    _id: { $in: links.map((link) => link.childId) },
  })
    .select("name role")
    .lean();
  return successResponse(res, children.map(profile));
}

export async function listParents(req, res) {
  requireDatabase();
  const child = await requireUser(req.user.id, "child");
  const links = await FamilyLink.find({
    childId: child._id,
    status: "active",
  }).lean();
  const parents = await User.find({
    _id: { $in: links.map((link) => link.parentId) },
  })
    .select("name role")
    .lean();
  return successResponse(res, parents.map(profile));
}

export async function revokeLink(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const requester = await requireUser(req.user.id);
  const link = await FamilyLink.findById(req.params.id);
  if (!link)
    throw new ApiError(404, "FAMILY_LINK_NOT_FOUND", "Family link not found.");
  if (
    ![String(link.parentId), String(link.childId)].includes(
      String(requester._id),
    )
  )
    throw new ApiError(
      403,
      "FAMILY_LINK_NOT_FOUND",
      "You cannot revoke this family link.",
    );
  link.status = "revoked";
  await link.save();
  return successResponse(res, { revoked: true });
}

export async function updateControls(req, res) {
  requireDatabase();
  requireObjectId(req.params.id);
  const { trackingEnabled, historyVisible, sosVisible } = req.body ?? {};
  const parent = await requireUser(req.user.id, "parent");
  const link = await FamilyLink.findOne({
    _id: req.params.id,
    parentId: parent._id,
    status: "active",
  });
  if (!link)
    throw new ApiError(
      403,
      "FAMILY_LINK_NOT_FOUND",
      "No active family link was found for this parent.",
    );
  const updates = { trackingEnabled, historyVisible, sosVisible };
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (typeof value !== "boolean")
        throw new ApiError(
          400,
          "INVALID_CONTROLS",
          `${key} must be true or false.`,
        );
      link.controls[key] = value;
    }
  }
  await link.save();
  return successResponse(res, { linkId: link._id, controls: link.controls });
}

export async function updateChildLocation(req, res) {
  requireDatabase();
  const { capturedAt, ...locationInput } = req.body ?? {};
  const child = await requireUser(req.user.id, "child");
  const link = await FamilyLink.findOne({
    childId: child._id,
    status: "active",
    "controls.trackingEnabled": true,
  });
  if (!link)
    throw new ApiError(
      403,
      "TRACKING_DISABLED",
      "Location tracking is disabled because no parent link permits it.",
    );
  const location = validateLocation(locationInput, {
    required: true,
    includeMovement: true,
  });
  const timestamp =
    capturedAt === undefined ? new Date() : new Date(capturedAt);
  if (Number.isNaN(timestamp.getTime()))
    throw new ApiError(
      400,
      "INVALID_LOCATION",
      "capturedAt must be a valid date.",
    );
  const previous = await ChildLocation.findOne({ childId: child._id }).lean();
  if (previous && Date.now() - new Date(previous.updatedAt).getTime() < 3000)
    return successResponse(res, { location: previous, throttled: true });
  const saved = await ChildLocation.findOneAndUpdate(
    { childId: child._id },
    { $set: { ...location, capturedAt: timestamp } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  );
  return successResponse(res, { location: saved, throttled: false });
}

export async function getChildLocation(req, res) {
  requireDatabase();
  const parent = await requireUser(req.user.id, "parent");
  const child = await requireUser(req.params.childId, "child");
  await activeLink(parent._id, child._id, "trackingEnabled");
  const location = await ChildLocation.findOne({ childId: child._id }).lean();
  return successResponse(res, {
    child: { _id: child._id, name: child.name },
    location,
    updatedAt: location?.updatedAt ?? null,
    isStale: location
      ? Date.now() - new Date(location.updatedAt).getTime() > 2 * 60 * 1000
      : true,
  });
}

export async function getChildSos(req, res) {
  requireDatabase();
  const parent = await requireUser(req.user.id, "parent");
  const child = await requireUser(req.params.childId, "child");
  await activeLink(parent._id, child._id, "sosVisible");
  const items = await SosEvent.find({ userId: child._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitFrom(req.query.limit))
    .lean();
  return successResponse(res, { items });
}

export async function getChildHistory(req, res) {
  requireDatabase();
  const parent = await requireUser(req.user.id, "parent");
  const child = await requireUser(req.params.childId, "child");
  await activeLink(parent._id, child._id, "historyVisible");
  const items = await History.find({ userId: child._id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limitFrom(req.query.limit))
    .lean();
  return successResponse(res, { items });
}
