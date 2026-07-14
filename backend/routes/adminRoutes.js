const express = require('express');
const router = express.Router();
const { 
  getUsers, 
  updateUserStatus, 
  getActivePromoBanner,
  getPromoBanners,
  createPromoBanner,
  updatePromoBanner,
  deletePromoBanner
} = require('../controllers/adminController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

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

module.exports = router;
