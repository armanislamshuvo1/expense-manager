const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
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
    required: function() { return this.type === 'TRANSFER'; },
    index: true 
  },
  categoryId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    required: function() { return this.type !== 'TRANSFER'; }, 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['INCOME', 'EXPENSE', 'TRANSFER'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    required: true 
  },
  shouldConvert: { 
    type: Boolean, 
    default: true 
  },
  exchangeRate: { 
    type: Number, 
    default: 1.0 
  },
  convertedAmount: { 
    type: Number 
  },
  date: { 
    type: Date, 
    required: true 
  },
  note: { 
    type: String,
    trim: true
  },
  description: { 
    type: String,
    trim: true
  },
  receiptUrl: { 
    type: String 
  },
  splitWith: { 
    type: [String],
    default: []
  },
  reimbursable: { 
    type: Boolean, 
    default: false 
  },
  clientTxId: {
    type: String,
    sparse: true,
    index: true
  }
}, { timestamps: true });

// Pre-save middleware to verify convertedAmount mapping
transactionSchema.pre('save', function () {
  if (this.shouldConvert) {
    this.convertedAmount = Number((this.amount * this.exchangeRate).toFixed(2));
  } else {
    this.convertedAmount = this.amount;
  }
});

module.exports = mongoose.model('Transaction', transactionSchema);
