import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller.js';

const router = Router();

// Endpoint to run query chats
router.post('/', ChatController.chat);

export default router;
