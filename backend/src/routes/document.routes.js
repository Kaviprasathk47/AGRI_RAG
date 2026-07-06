import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller.js';

const router = Router();

// Routes for managing documents
router.get('/', DocumentController.listDocuments);
router.delete('/:id', DocumentController.deleteDocument);

export default router;
