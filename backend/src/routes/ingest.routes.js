import { Router } from 'express';
import multer from 'multer';
import { IngestController } from '../controllers/ingest.controller.js';
import { CONFIG } from '../constants/config.js';
import fs from 'fs';

// Configure multer storage to retain original PDF filenames inside uploads/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = CONFIG.PDF_DIR;
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.toLowerCase();
    if (
      file.mimetype === 'application/pdf' || 
      ext.endsWith('.pdf') || 
      ext.endsWith('.md') || 
      file.mimetype === 'text/markdown' ||
      file.mimetype === 'text/plain'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF or Markdown documents are allowed.'));
    }
  }
});

const router = Router();

// Endpoint to run the ingestion pipeline (accepts optional file array upload)
router.post('/', upload.array('files'), IngestController.ingest);

export default router;
