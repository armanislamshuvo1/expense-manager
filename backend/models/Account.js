import mongoose from 'mongoose';

const accountSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    enum: ['CASH', 'CARD', 'CREDIT_CARD', 'SAVINGS', 'INVESTMENT', 'CRYPTO', 'REAL_ESTATE', 'E-WALLET']
  },
  balance: { 
    type: Number, 
    default: 0.0 
  },
  creditLimit: {
    type: Number,
    default: 0.0
  },
  statementDate: {
    type: Number,
    min: 1,
    max: 31
  },
  dueDate: {
    type: Number,
    min: 1,
    max: 31
  },
  currency: { 
    type: String, 
    default: 'MYR' 
  },
  clientAccId: {
    type: String,
    index: true,
    sparse: true
  }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);
