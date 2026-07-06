import express from 'express';
import { debugStore } from '../utils/debugStore.js';

const router = express.Router();

/**
 * GET /debug/rag
 * Returns diagnostics payload for the last execution of the RAG pipeline.
 * Access restricted strictly to development environments.
 */
router.get('/rag', (req, res) => {
  const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
  
  if (!isDev) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Diagnostic endpoints are disabled in production environments.'
    });
  }

  const lastTrace = debugStore.getLastRetrieval();
  if (!lastTrace) {
    return res.status(200).json({
      message: 'No RAG retrieval queries have been processed in this session yet.'
    });
  }

  res.status(200).json(lastTrace);
});

export default router;
