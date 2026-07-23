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

const router = express.Router();

// Mount master sub-routers
router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/share', shareRoutes);
router.use('/ai', aiRoutes);
router.use('/sync', syncRoutes);

export default router;
