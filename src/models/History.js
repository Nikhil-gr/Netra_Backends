import mongoose from 'mongoose';
import { MODES } from '../utils/buildPrompt.js';

const historySchema = new mongoose.Schema({
  mode: { type: String, enum: MODES, required: true },
  query: { type: String, default: '', maxlength: 200 },
  language: { type: String, enum: ['en', 'ne'], default: 'en' },
  result: { type: mongoose.Schema.Types.Mixed, required: true },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  bufferCommands: false,
});

historySchema.index({ createdAt: -1, _id: -1 });

export default mongoose.model('History', historySchema);
