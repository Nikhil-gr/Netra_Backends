import mongoose from "mongoose";

const childLocationSchema = new mongoose.Schema(
  {
    childId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    accuracy: { type: Number, default: null },
    heading: { type: Number, default: null },
    speed: { type: Number, default: null },
    capturedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

export default mongoose.model("ChildLocation", childLocationSchema);
