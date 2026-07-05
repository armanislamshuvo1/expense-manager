const express = require('express');
const router = express.Router();
const { getTransactions, createTransaction, deleteTransaction, updateTransaction } = require('../controllers/transactionController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);
router.delete('/:id', deleteTransaction);

module.exports = router;
