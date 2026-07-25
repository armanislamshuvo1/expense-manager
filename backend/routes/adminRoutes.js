import express from 'express';
import { 
  getUsers, 
  updateUserStatus, 
  getActivePromoBanner,
  getPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner
} from '../controllers/adminController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route for fetching the currently active banner
router.get('/promo-banner', getActivePromoBanner);

// Secure routes below (requires Admin authentication)
router.use(requireAuth, requireRole(['ADMIN']));

router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);

// Banner CRUD
router.get('/promo-banners', getPromoBanners);
router.post('/promo-banners', createPromoBanner);
router.put('/promo-banners/:id', updatePromoBanner);
router.delete('/promo-banners/:id', deletePromoBanner);

export default router;
