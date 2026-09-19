import mongoose from "mongoose";

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    relationship: { type: String, default: null, trim: true },
    phone: { type: String, required: true, trim: true },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: { type: String, default: null, trim: true },
    passwordHash: { type: String, default: null, select: false },
    role: { type: String, enum: ["parent", "child"], default: null },
    emergencyContacts: { type: [emergencyContactSchema], default: [] },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

userSchema.index({ email: 1 }, { unique: true });

export default mongoose.model("User", userSchema);
