const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimiter');
const { parseTransaction, scanReceipt, advisorChat, getInsights } = require('../controllers/aiController');

// Multer memory storage configuration with strict security filters
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 12 * 1024 * 1024 // Strict 12 MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed. PDFs and SVGs are prohibited.'));
    }
  }
});

// Protect all routes with JWT auth and rate limit
router.use(requireAuth);
router.use(aiLimiter);

router.post('/parse-transaction', parseTransaction);
router.post('/scan-receipt', upload.single('receipt'), scanReceipt);
router.post('/chat', advisorChat);
router.get('/insights', getInsights);

module.exports = router;
