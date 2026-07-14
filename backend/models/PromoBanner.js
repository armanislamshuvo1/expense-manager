const mongoose = require('mongoose');

const promoBannerSchema = new mongoose.Schema({
  promoText: { 
    type: String, 
    required: true 
  },
  btnText: { 
    type: String, 
    default: 'Claim Now' 
  },
  isActive: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('PromoBanner', promoBannerSchema);
