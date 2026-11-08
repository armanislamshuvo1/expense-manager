import express from 'express';
import { createReport, getMyReports } from '../controllers/supportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/reports', createReport);
router.get('/my-reports', getMyReports);

export default router;
