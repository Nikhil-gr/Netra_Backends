import mongoose from 'mongoose';

const visionAnalysisSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Journey' },
  description: { type: String, required: true },
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('VisionAnalysis', visionAnalysisSchema);
