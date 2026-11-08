import mongoose from 'mongoose';

const userReportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    category: {
      type: String,
      enum: ['BUG', 'AI_FEATURE', 'SYNC_ISSUE', 'ACCOUNT_BILLING', 'OTHER'],
      default: 'BUG'
    },
    status: {
      type: String,
      enum: ['RECEIVED', 'IN_PROGRESS', 'SOLVED'],
      default: 'RECEIVED',
      index: true
    },
    adminNotes: {
      type: String,
      default: '',
      trim: true
    },
    resolvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model('UserReport', userReportSchema);
