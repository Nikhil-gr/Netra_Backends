import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number },
}, { _id: false });

const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
}, { _id: false });

const routeSchema = new mongoose.Schema({
  provider: { type: String },
  distance: { type: Number },
  duration: { type: Number },
  steps: { type: [mongoose.Schema.Types.Mixed] },
}, { _id: false });

const journeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startLocation: { type: locationSchema, required: true },
  destination: { type: destinationSchema, required: true },
  route: { type: routeSchema },
  status: { type: String, enum: ['planned', 'active', 'completed', 'cancelled'], default: 'planned' },
  startedAt: { type: Date },
  endedAt: { type: Date },
}, {
  timestamps: true,
  versionKey: false,
});

export default mongoose.model('Journey', journeySchema);
