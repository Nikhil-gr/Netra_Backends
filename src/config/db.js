import mongoose from 'mongoose';

// Optional history must never leave an analysis request waiting in Mongoose's buffer.
mongoose.set('bufferCommands', false);

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    console.warn('MONGODB_URI is unset. Analysis works; history is unavailable.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    });
    console.info('MongoDB connected.');
    return true;
  } catch {
    // Connection errors can contain credentials; do not print the URI or raw error.
    console.warn('MongoDB connection failed. Check MONGODB_URI and database availability.');
    return false;
  }
}
