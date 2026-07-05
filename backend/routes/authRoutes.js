const express = require('express');
const router = express.Router();
const { register, login, getMe, updateSettings, googleLogin, forgotPassword, resetPassword } = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', requireAuth, getMe);
router.put('/settings', requireAuth, updateSettings);

module.exports = router;
