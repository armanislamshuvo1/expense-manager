const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB limit

const { syncTransactions } = require('../controllers/syncController');
const { exportData, scanImportData, commitImportData } = require('../controllers/syncExportImportController');
const { aiAnalyzeImport } = require('../controllers/aiImportController');
const { requireAuth } = require('../middleware/authMiddleware');
const { syncLimiter } = require('../middleware/rateLimiter');

router.post('/transactions', requireAuth, syncLimiter, syncTransactions);

// Data Import & Export Routes
router.get('/export', requireAuth, exportData);
router.post('/import-scan', requireAuth, upload.single('file'), scanImportData);
router.post('/import-commit', requireAuth, commitImportData);
router.post('/ai-analyze-import', requireAuth, aiAnalyzeImport);

module.exports = router;
