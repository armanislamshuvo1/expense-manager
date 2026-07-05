const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    lowercase: true 
  },
  passwordHash: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    enum: ['USER', 'ADMIN', 'ADVISOR'], 
    default: 'USER' 
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'SUSPENDED', 'BANNED'], 
    default: 'ACTIVE' 
  },
  baseCurrency: { 
    type: String, 
    default: 'MYR' 
  },
  preferredCurrencies: { 
    type: [String], 
    default: ['MYR', 'USD'] 
  },
  theme: { 
    type: String, 
    enum: ['light', 'dark'], 
    default: 'dark' 
  },
  settings: {
    subcategoryEnabled: { type: Boolean, default: false },
    budgetLimit: { type: Number, default: 0 },
    repeatDefault: { type: String, default: 'None' },
    subCurrency: { type: String, default: 'USD' },
    startScreen: { type: String, default: 'Daily' },
    monthlyStartDate: { type: Number, default: 1 },
    weeklyStartDay: { type: String, default: 'Sunday' },
    carryOverEnabled: { type: Boolean, default: true },
    swipeAction: { type: String, default: 'To Change Date' },
    colorSetting: { type: String, default: 'Set. A' },
    timeInputSetting: { type: String, default: 'Input Only, Desc.' },
    showDescription: { type: Boolean, default: false },
    autocomplete: { type: Boolean, default: true },
    passcodeEnabled: { type: Boolean, default: false },
    passcodeValue: { type: String, default: '' },
    alarmEnabled: { type: Boolean, default: true },
    quickAddEnabled: { type: Boolean, default: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
