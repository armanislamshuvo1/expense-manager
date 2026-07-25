import express from 'express';
import { register, login, getMe, updateSettings, googleLogin, forgotPassword, resetPassword, refreshToken } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google-login', authLimiter, googleLogin);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);
router.post('/refresh', authLimiter, refreshToken);
router.get('/me', requireAuth, getMe);

router.put('/settings', requireAuth, updateSettings);

export default router;
