const User = require('../models/User');
const PromoBanner = require('../models/PromoBanner');

exports.getActivePromoBanner = async (req, res, next) => {
  try {
    let activeBanner = await PromoBanner.findOne({ isActive: true });
    // Seed default banner if collection is completely empty
    if (!activeBanner) {
      const count = await PromoBanner.countDocuments();
      if (count === 0) {
        activeBanner = await PromoBanner.create({
          promoText: 'Special Launch Offer: Premium features are 100% FREE for the first 100 users! (Only 14 slots left)',
          btnText: 'Claim Now',
          isActive: true
        });
      }
    }
    res.status(200).json({ success: true, data: activeBanner || null });
  } catch (error) {
    next(error);
  }
};

exports.getPromoBanners = async (req, res, next) => {
  try {
    const banners = await PromoBanner.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    next(error);
  }
};

exports.createPromoBanner = async (req, res, next) => {
  try {
    const { promoText, btnText, isActive } = req.body;
    
    if (isActive) {
      // Set all other banners to inactive
      await PromoBanner.updateMany({}, { isActive: false });
    }

    const newBanner = await PromoBanner.create({ promoText, btnText, isActive });
    res.status(201).json({ success: true, data: newBanner });
  } catch (error) {
    next(error);
  }
};

exports.updatePromoBanner = async (req, res, next) => {
  try {
    const { promoText, btnText, isActive } = req.body;
    const { id } = req.params;

    if (isActive) {
      // Set all other banners to inactive
      await PromoBanner.updateMany({ _id: { $ne: id } }, { isActive: false });
    }

    const updatedBanner = await PromoBanner.findByIdAndUpdate(
      id, 
      { promoText, btnText, isActive }, 
      { returnDocument: 'after', runValidators: true }
    );

    if (!updatedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    res.status(200).json({ success: true, data: updatedBanner });
  } catch (error) {
    next(error);
  }
};

exports.deletePromoBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedBanner = await PromoBanner.findByIdAndDelete(id);
    if (!deletedBanner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.status(200).json({ success: true, data: deletedBanner });
  } catch (error) {
    next(error);
  }
};


exports.getUsers = async (req, res, next) => {
  try {
    // Zero-Trust context: admin can only access user account info, roles, and status
    const users = await User.find().select('name email role status createdAt');
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};
