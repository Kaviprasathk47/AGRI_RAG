import { IngestionService } from '../services/ingestion.service.js';
import { logger } from '../utils/logger.js';

/**
 * Controller handling PDF ingestion operations.
 */
export class IngestController {
  /**
   * Starts the document ingestion pipeline.
   * Route: POST /ingest
   */
  static async ingest(req, res, next) {
    logger.info('Received ingestion request.');
    
    try {
      // Optional namespace override from body parameters
      const { namespace } = req.body || {};
      
      const result = await IngestionService.ingestAll(namespace);
      
      res.status(200).json({
        documentsProcessed: result.processedDocuments,
        chunksCreated: result.totalChunks,
        vectorsUploaded: result.uploadedVectors,
        processingTimeMs: result.timeElapsedMs,
      });
    } catch (err) {
      logger.error('Ingest controller action failed:', err);
      next(err);
    }
  }
}
