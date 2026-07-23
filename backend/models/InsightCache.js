import mongoose from 'mongoose';

const insightCacheSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  digest: {
    type: String,
    required: true
  },
  anomalies: {
    type: Array,
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 21600 // Automatically delete document after 6 hours (6 * 3600 seconds)
  }
});

export default mongoose.model('InsightCache', insightCacheSchema);
