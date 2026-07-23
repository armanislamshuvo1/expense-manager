import express from 'express';
import { getProfile, changePassword, toggleSharing, regenerateShareToken } from '../controllers/userController.js';
import { wipeUserData, deleteUserAccount } from '../controllers/userDataManagementController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/profile', getProfile);
router.post('/change-password', changePassword);
router.post('/toggle-sharing', toggleSharing);
router.post('/regenerate-share-token', regenerateShareToken);

// User Data Governance Routes
router.delete('/wipe-data', wipeUserData);
router.delete('/account', deleteUserAccount);

export default router;
