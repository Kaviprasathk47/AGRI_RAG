import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller.js';

const router = Router();

// Route for fetching analytics stats
router.get('/', StatisticsController.getStats);

export default router;
