import express from 'express';
import {
  getRecurringTransactions,
  getRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  toggleRecurringTransaction,
  deleteRecurringTransaction,
  runNowRecurringTransaction
} from '../controllers/recurringTransactionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getRecurringTransactions);
router.post('/', createRecurringTransaction);
router.post('/run-now', runNowRecurringTransaction);
router.get('/:id', getRecurringTransactionById);
router.put('/:id', updateRecurringTransaction);
router.patch('/:id/toggle', toggleRecurringTransaction);
router.post('/:id/run-now', runNowRecurringTransaction);
router.delete('/:id', deleteRecurringTransaction);

export default router;
