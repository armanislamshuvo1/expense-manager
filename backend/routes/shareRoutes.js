import express from 'express';
import { getSharedData } from '../controllers/shareController.js';

const router = express.Router();

router.get('/:token', getSharedData);

export default router;
