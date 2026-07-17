const express = require('express');
const router = express.Router();
const { syncTransactions } = require('../controllers/syncController');
const { requireAuth } = require('../middleware/authMiddleware');

router.post('/transactions', requireAuth, syncTransactions);

module.exports = router;
