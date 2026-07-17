const express = require('express');
const router = express.Router();
const { syncTransactions } = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');
const { syncLimiter } = require('../middleware/rateLimiter');

router.post('/transactions', requireAuth, syncLimiter, syncTransactions);

module.exports = router;
