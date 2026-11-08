import express from 'express';
import { 
  // Banners
  getActivePromoBanner,
  getPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner,
  // Users & Tiers
  getUsers, 
  updateUserStatus,
  updateUserRole,
  updateUserTier,
  // Analytics & AI Telemetry
  getOverviewStats,
  getAiUsageStats,
  // Problem Reports
  getReports,
  updateReportStatus,
  // System Logs
  getErrorLogs,
  resolveErrorLog,
  purgeResolvedLogs
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for fetching the currently active banner
router.get('/promo-banner', getActivePromoBanner);

// Secure routes below (requires ADMIN or SUPER_ADMIN authentication)
router.use(requireAuth, requireRole(['ADMIN', 'SUPER_ADMIN']));

// Analytics & Telemetry
router.get('/stats/overview', getOverviewStats);
router.get('/stats/ai', getAiUsageStats);

// User & Tier Management
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/tier', updateUserTier);

// User Problem Reports
router.get('/reports', getReports);
router.put('/reports/:id/status', updateReportStatus);

// System Error Logs
router.get('/logs', getErrorLogs);
router.put('/logs/:id/resolve', resolveErrorLog);
router.delete('/logs/resolved', purgeResolvedLogs);

// Promotional Banners CRUD
router.get('/promo-banners', getPromoBanners);
router.post('/promo-banners', createPromoBanner);
router.put('/promo-banners/:id', updatePromoBanner);
router.delete('/promo-banners/:id', deletePromoBanner);

export default router;
