const express = require('express');
const router = express.Router();
const { register, login, getMe, updateSettings, googleLogin, forgotPassword, resetPassword, refreshToken } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', requireAuth, getMe);

router.put('/settings', requireAuth, updateSettings);

module.exports = router;
