import mongoose from "mongoose";

const pairingCodeSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("PairingCode", pairingCodeSchema);
