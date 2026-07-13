const express = require('express');
const router = express.Router();
const { getProfile, changePassword, toggleSharing, regenerateShareToken } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/profile', getProfile);
router.post('/change-password', changePassword);
router.post('/toggle-sharing', toggleSharing);
router.post('/regenerate-share-token', regenerateShareToken);

module.exports = router;

