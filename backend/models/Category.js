import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
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
  emoji: { 
    type: String, 
    default: '' 
  },
  color: { 
    type: String,
    default: '#94a3b8' // Slate color default
  },
  parentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', 
    default: null 
  },
  type: {
    type: String,
    enum: ['INCOME', 'EXPENSE'],
    required: true,
    default: 'EXPENSE'
  },
  clientCatId: {
    type: String,
    index: true,
    sparse: true
  }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);
