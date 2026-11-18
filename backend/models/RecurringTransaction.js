import mongoose from 'mongoose';

const recurringTransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true,
    index: true
  },
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: function () {
      return this.type === 'TRANSFER';
    }
  },
  toAmount: {
    type: Number
  },
  toCurrency: {
    type: String
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: function () {
      return this.type !== 'TRANSFER';
    }
  },
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    required: true
  },
  exchangeRate: {
    type: Number,
    default: 1.0
  },
  shouldConvert: {
    type: Boolean,
    default: true
  },
  convertedAmount: {
    type: Number
  },
  frequency: {
    type: String,
    enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
    required: true,
    default: 'DAILY'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'PAUSED', 'COMPLETED'],
    required: true,
    default: 'ACTIVE',
    index: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  nextRunDate: {
    type: Date,
    required: true,
    index: true
  },
  lastRunDate: {
    type: Date,
    default: null
  },
  executionCount: {
    type: Number,
    default: 0
  },
  note: {
    type: String,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 250
  }
}, { timestamps: true });

// Enforce at most 1 active recurring rule per user at database level
recurringTransactionSchema.index(
  { userId: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

// Compound index for user query and cron polling performance
recurringTransactionSchema.index({ userId: 1, status: 1, nextRunDate: 1 });

if (mongoose.models.RecurringTransaction) {
  delete mongoose.models.RecurringTransaction;
}

const RecurringTransaction = mongoose.model('RecurringTransaction', recurringTransactionSchema);
export default RecurringTransaction;
