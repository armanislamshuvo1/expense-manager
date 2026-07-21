const mongoose = require('mongoose');

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

module.exports = mongoose.model('InsightCache', insightCacheSchema);
