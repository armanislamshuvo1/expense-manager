import mongoose from 'mongoose';

const errorLogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['error', 'warn', 'info'],
    default: 'error'
  },
  source: {
    type: String,
    default: 'backend'
  },
  message: {
    type: String,
    required: true
  },
  stack: {
    type: String
  },
  statusCode: {
    type: Number,
    default: 500
  },
  path: {
    type: String
  },
  method: {
    type: String
  },
  meta: {
    type: mongoose.Schema.Types.Mixed
  },
  resolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 2592000 // 30-day TTL index (2,592,000 seconds)
  }
});

export default mongoose.model('ErrorLog', errorLogSchema);
