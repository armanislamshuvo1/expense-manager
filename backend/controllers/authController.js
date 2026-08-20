import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Account from '../models/Account.js';

const prePopulateDefaults = async (userId, baseCurrency) => {
  const currency = baseCurrency || 'USD';
  const categoryCount = await Category.countDocuments({ userId });
  if (categoryCount === 0) {
    const defaultCategories = [
      { name: 'Salary', emoji: '💰', type: 'INCOME', color: '#10b981' },
      { name: 'Bonus', emoji: '🎁', type: 'INCOME', color: '#3b82f6' },
      { name: 'Allowance', emoji: '💵', type: 'INCOME', color: '#f59e0b' },
      { name: 'Food', emoji: '🍔', type: 'EXPENSE', color: '#ef4444' },
      { name: 'Shopping', emoji: '🛍️', type: 'EXPENSE', color: '#ec4899' },
      { name: 'Travel', emoji: '✈️', type: 'EXPENSE', color: '#06b6d4' },
      { name: 'Home expenses', emoji: '🏠', type: 'EXPENSE', color: '#8b5cf6' }
    ];
    await Category.insertMany(defaultCategories.map(cat => ({ ...cat, userId })));
  }

  const accountCount = await Account.countDocuments({ userId });
  if (accountCount === 0) {
    const defaultAccounts = [
      { name: 'Cash', type: 'CASH', balance: 0.0, currency },
      { name: 'Bank Account', type: 'SAVINGS', balance: 0.0, currency },
      { name: 'Card', type: 'CARD', balance: 0.0, currency }
    ];
    await Account.insertMany(defaultAccounts.map(acc => ({ ...acc, userId })));
  }
};

export const register = async (req, res, next) => {
  try {
    const { name, email, password, baseCurrency } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      provider: 'custom',
      baseCurrency: baseCurrency || 'USD'
    });

    await prePopulateDefaults(newUser._id, newUser.baseCurrency);

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, role: newUser.role, status: newUser.status },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          provider: newUser.provider,
          baseCurrency: newUser.baseCurrency,
          preferredCurrencies: newUser.preferredCurrencies,
          theme: newUser.theme,
          settings: newUser.settings,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.status === 'DELETED') {
      return res.status(403).json({ 
        success: false, 
        code: 'ACCOUNT_DELETED', 
        message: 'This account has been deleted. Please contact support to restore your account.' 
      });
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Account status restricted.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, status: user.status },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
          baseCurrency: user.baseCurrency,
          preferredCurrencies: user.preferredCurrencies,
          theme: user.theme,
          settings: user.settings,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const { baseCurrency, preferredCurrencies, theme, settings } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (baseCurrency) user.baseCurrency = baseCurrency;
    if (preferredCurrencies) user.preferredCurrencies = preferredCurrencies;
    if (theme) user.theme = theme;
    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }

    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        provider: user.provider,
        baseCurrency: user.baseCurrency,
        preferredCurrencies: user.preferredCurrencies,
        theme: user.theme,
        settings: user.settings,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

export const googleLogin = async (req, res, next) => {
  try {
    let email;
    let name;

    const { token: googleToken, email: bodyEmail, name: bodyName } = req.body;

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (googleToken && clientId) {
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({
        idToken: googleToken,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    } else if (process.env.NODE_ENV !== 'production' && bodyEmail === 'googleuser@mockauth.com') {
      // Allowed fallback/mock behavior ONLY in non-production environments for demo testing
      email = bodyEmail;
      name = bodyName || 'Alex Mercer';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Google Sign-In is not configured or invalid OAuth credential provided.'
      });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Missing email / invalid credential.' });
    }

    let user = await User.findOne({ email });
    if (user) {
      if (user.status === 'DELETED') {
        return res.status(403).json({ 
          success: false, 
          code: 'ACCOUNT_DELETED', 
          message: 'This account has been deleted. Please contact support to restore your account.' 
        });
      }
      if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
        return res.status(403).json({ success: false, message: 'Account status restricted.' });
      }
      if (name && user.name !== name) {
        user.name = name;
        await user.save();
      }
    } else {
      user = await User.create({
        name: name || 'Google User',
        email,
        provider: 'google'
      });
      await prePopulateDefaults(user._id, user.baseCurrency);
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, status: user.status },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
          baseCurrency: user.baseCurrency,
          preferredCurrencies: user.preferredCurrencies,
          theme: user.theme,
          settings: user.settings,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No user registered with this email.' });
    }
    
    // For demo/offline, return success and return a mock recovery link
    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email (Mock token generated).',
      resetToken: 'mock_reset_token_key'
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', { ignoreExpiration: true });
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token signature.' });
    }

    const now = Math.floor(Date.now() / 1000);
    const maxExpirationAge = 7 * 24 * 60 * 60; // Allow refresh for up to 7 days after expiry
    if (decoded.exp && (now - decoded.exp > maxExpirationAge)) {
      return res.status(401).json({ success: false, message: 'Token expired too long ago. Please log in again.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.status === 'SUSPENDED' || user.status === 'BANNED') {
      return res.status(403).json({ success: false, message: 'Account status restricted.' });
    }

    const newToken = jwt.sign(
      { id: user._id, email: user.email, role: user.role, status: user.status },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token: newToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          provider: user.provider,
          baseCurrency: user.baseCurrency,
          preferredCurrencies: user.preferredCurrencies,
          theme: user.theme,
          settings: user.settings,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
