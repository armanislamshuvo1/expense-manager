const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true 
  },
  value: {
    promoText: { type: String, default: 'Special Launch Offer: Premium features are 100% FREE for the first 100 users! (Only 14 slots left)' },
    btnText: { type: String, default: 'Claim Now' },
    isActive: { type: Boolean, default: true }
  }
}, { timestamps: true });

module.exports = mongoose.model('AppConfig', appConfigSchema);
