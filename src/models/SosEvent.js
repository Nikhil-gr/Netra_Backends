import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
  },
  { _id: false },
);

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    relationship: { type: String, default: null },
    phone: { type: String, required: true },
  },
  { _id: false },
);

const sosEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    location: { type: locationSchema, default: null },
    primaryContactSnapshot: { type: contactSchema, required: true },
    status: {
      type: String,
      enum: ["triggered", "dial_started", "cancelled"],
      default: "triggered",
    },
    triggeredAt: { type: Date, default: Date.now },
    dialStartedAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

sosEventSchema.index({ userId: 1, createdAt: -1, _id: -1 });
export default mongoose.model("SosEvent", sosEventSchema);
