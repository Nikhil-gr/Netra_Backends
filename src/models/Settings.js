import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    language: { type: String, enum: ["en", "ne"], default: "en" },
    // Retained for legacy documents/clients. Controllers always mirror autoSpeak.
    voiceEnabled: { type: Boolean, default: true },
    autoSpeak: { type: Boolean, default: true },
    speechRate: { type: Number, default: 1, min: 0.5, max: 2 },
    vibrationEnabled: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export default mongoose.model("Settings", settingsSchema);
