import SosEvent from "../models/SosEvent.js";
import FamilyLink from "../models/FamilyLink.js";
import { requireDatabase, requireObjectId } from "../utils/crudGuards.js";
import { ApiError, successResponse } from "../utils/apiResponse.js";
import { getPrimaryContact, requireUser, validateLocation } from "../utils/userSupport.js";

function eventData(event) {
  return {
    eventId: event._id.toString(),
    contact: event.primaryContactSnapshot,
    dialUri: `tel:${event.primaryContactSnapshot.phone}`,
    location: event.location,
    status: event.status,
    triggeredAt: event.triggeredAt,
    dialStartedAt: event.dialStartedAt,
    cancelledAt: event.cancelledAt,
  };
}

export async function triggerSos(req, res) {
  requireDatabase();
  const { location } = req.body ?? {};
  const user = await requireUser(req.user.id);
  let contact;
  try {
    const primary = getPrimaryContact(user);
    contact = { name: primary.name, relationship: primary.relationship || null, phone: primary.phone };
  } catch (error) {
    if (error.code !== "NO_EMERGENCY_CONTACT" && error.code !== "NO_PRIMARY_EMERGENCY_CONTACT") throw error;
    const link = await FamilyLink.findOne({ childId: user._id, status: "active" })
      .sort({ createdAt: 1 })
      .populate("parentId", "name phone role");
    const parent = link?.parentId;
    if (!parent?.phone)
      throw new ApiError(400, "NO_EMERGENCY_CONTACT", "Add a primary emergency contact or link a parent with a phone number.");
    contact = { name: parent.name, relationship: "parent", phone: parent.phone };
  }
  const event = await SosEvent.create({
    userId: user._id,
    location: validateLocation(location),
    primaryContactSnapshot: contact,
    status: "triggered",
    triggeredAt: new Date(),
  });
  return successResponse(res, eventData(event), 201);
}

async function updateSosStatus(req, res, status) {
  requireDatabase();
  requireObjectId(req.params.id);
  const event = await SosEvent.findOne({
    _id: req.params.id,
    userId: req.user.id,
  });
  if (!event)
    throw new ApiError(
      404,
      "SOS_EVENT_NOT_FOUND",
      "SOS event not found for this user.",
    );
  event.status = status;
  if (status === "dial_started") event.dialStartedAt = new Date();
  if (status === "cancelled") event.cancelledAt = new Date();
  await event.save();
  return successResponse(res, eventData(event));
}

export const markDialStarted = (req, res) =>
  updateSosStatus(req, res, "dial_started");
export const cancelSos = (req, res) => updateSosStatus(req, res, "cancelled");

export async function getSosHistory(req, res) {
  requireDatabase();
  const { limit = "20" } = req.query;
  if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100)
    throw new ApiError(400, "INVALID_PAGINATION", "limit must be 1 to 100.");
  const items = await SosEvent.find({ userId: req.user.id })
    .sort({ createdAt: -1, _id: -1 })
    .limit(Number(limit))
    .lean();
  return successResponse(res, { items, limit: Number(limit) });
}
