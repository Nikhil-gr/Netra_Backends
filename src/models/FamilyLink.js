import mongoose from "mongoose";

const controlsSchema = new mongoose.Schema(
  {
    trackingEnabled: { type: Boolean, default: true },
    historyVisible: { type: Boolean, default: true },
    sosVisible: { type: Boolean, default: true },
  },
  { _id: false },
);

const familyLinkSchema = new mongoose.Schema(
  {
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    controls: { type: controlsSchema, default: () => ({}) },
  },
  { timestamps: true, versionKey: false },
);

familyLinkSchema.index({ parentId: 1, childId: 1 }, { unique: true });
familyLinkSchema.index({ childId: 1, status: 1 });
export default mongoose.model("FamilyLink", familyLinkSchema);
