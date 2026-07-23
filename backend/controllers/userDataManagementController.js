import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
import Category from '../models/Category.js';
import User from '../models/User.js';

// --- WIPE ALL USER FINANCIAL DATA ---
export const wipeUserData = async (req, res, next) => {
  const userId = req.user.id;
  const { confirmationText } = req.body;

  if (confirmationText !== 'DELETE MY FINANCIAL DATA') {
    return res.status(400).json({
      success: false,
      message: 'Please type "DELETE MY FINANCIAL DATA" to confirm wiping your data.'
    });
  }

  let session = null;
  try {
    session = await mongoose.startSession();
  } catch (e) {
    session = null;
  }

  try {
    if (session) session.startTransaction();

    await Transaction.deleteMany({ userId }).session(session);
    await Account.deleteMany({ userId }).session(session);
    await Category.deleteMany({ userId }).session(session);

    try {
      await mongoose.model('InsightCache').deleteMany({ userId }).session(session);
    } catch (_) {}

    // Re-seed default accounts and categories for fresh start
    const defaultAcc = new Account({
      userId,
      name: 'Cash Account',
      type: 'CASH',
      balance: 0,
      currency: req.user?.baseCurrency || 'MYR'
    });
    await defaultAcc.save({ session });

    const defaultCat1 = new Category({ userId, name: 'Food & Dining', emoji: '🍔', type: 'EXPENSE', color: '#f87171' });
    const defaultCat2 = new Category({ userId, name: 'Salary', emoji: '💰', type: 'INCOME', color: '#4ade80' });
    await defaultCat1.save({ session });
    await defaultCat2.save({ session });

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    res.status(200).json({
      success: true,
      message: 'All financial data has been completely wiped. Default accounts and categories re-initialized.'
    });
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    next(err);
  }
};

// --- DELETE USER ACCOUNT ---
export const deleteUserAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password, confirmationText } = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Verification check
    if (user.provider === 'custom') {
      if (!password) {
        return res.status(400).json({ success: false, message: 'Password is required to delete your account.' });
      }
      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password.' });
      }
    } else {
      if (confirmationText !== 'DELETE MY ACCOUNT') {
        return res.status(400).json({ success: false, message: 'Please type "DELETE MY ACCOUNT" to confirm.' });
      }
    }

    // Soft delete status update
    user.status = 'DELETED';
    user.deletedAt = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Your account has been deleted. If this was a mistake, please contact support to restore your account.'
    });
  } catch (err) {
    next(err);
  }
};
