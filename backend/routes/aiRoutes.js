import express from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/authMiddleware.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { parseTransaction, scanReceipt, advisorChat, getInsights } from '../controllers/aiController.js';

const router = express.Router();

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

export default router;
