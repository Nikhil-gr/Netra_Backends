import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  language: { type: String, default: 'en' },
  voiceEnabled: { type: Boolean, default: true },
  vibrationEnabled: { type: Boolean, default: true },
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('Settings', settingsSchema);
