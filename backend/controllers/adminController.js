const User = require('../models/User');

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
