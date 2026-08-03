import express from 'express';
import multer from 'multer';

import { syncTransactions, syncCategories, syncAccounts } from '../controllers/syncController.js';
import { exportData, scanImportData, commitImportData } from '../controllers/syncExportImportController.js';
import { aiAnalyzeImport } from '../controllers/aiImportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { syncLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

router.post('/transactions', requireAuth, syncLimiter, syncTransactions);
router.post('/categories', requireAuth, syncLimiter, syncCategories);
router.post('/accounts', requireAuth, syncLimiter, syncAccounts);

// Data Import & Export Routes
router.get('/export', requireAuth, exportData);
router.post('/import-scan', requireAuth, upload.single('file'), scanImportData);
router.post('/import-commit', requireAuth, commitImportData);
router.post('/ai-analyze-import', requireAuth, aiAnalyzeImport);

export default router;
