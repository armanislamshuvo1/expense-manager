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
    enum: ['CASH', 'CARD', 'SAVINGS', 'INVESTMENT', 'CRYPTO', 'REAL_ESTATE']
  },
  balance: { 
    type: Number, 
    default: 0.0 
  },
  currency: { 
    type: String, 
    default: 'MYR' 
  }
}, { timestamps: true });

export default mongoose.model('Account', accountSchema);
