import express from 'express';

import authRoutes from './authRoutes.js';
import accountRoutes from './accountRoutes.js';
import categoryRoutes from './categoryRoutes.js';
import transactionRoutes from './transactionRoutes.js';
import adminRoutes from './adminRoutes.js';
import userRoutes from './userRoutes.js';
import shareRoutes from './shareRoutes.js';
import aiRoutes from './aiRoutes.js';
import syncRoutes from './syncRoutes.js';
import supportRoutes from './supportRoutes.js';
import recurringRoutes from './recurringRoutes.js';
import { getLatestAppVersion } from '../controllers/appVersionController.js';

const router = express.Router();

// Mount master sub-routers
// Public app version check
router.get('/app/version', getLatestAppVersion);

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/recurring', recurringRoutes);
router.use('/recurring-transactions', recurringRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/share', shareRoutes);
router.use('/ai', aiRoutes);
router.use('/sync', syncRoutes);
router.use('/support', supportRoutes);

export default router;
