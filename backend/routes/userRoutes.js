const express = require('express');
const router = express.Router();
const { getProfile, changePassword } = require('../controllers/userController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/profile', getProfile);
router.post('/change-password', changePassword);

module.exports = router;
