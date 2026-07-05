const express = require('express');
const router = express.Router();
const { getUsers, updateUserStatus } = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

router.use(requireAuth, requireRole(['ADMIN']));

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

module.exports = router;
