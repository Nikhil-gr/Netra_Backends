import mongoose from "mongoose";
import { MODES } from "../utils/buildPrompt.js";

const historySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    mode: { type: String, enum: MODES, required: true },
    query: { type: String, default: "", maxlength: 200 },
    language: { type: String, enum: ["en", "ne"], default: "en" },
    result: { type: mongoose.Schema.Types.Mixed, required: true },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
    bufferCommands: false,
  },
);

historySchema.index({ createdAt: -1, _id: -1 });
historySchema.index({ userId: 1, createdAt: -1, _id: -1 });

export default mongoose.model("History", historySchema);
