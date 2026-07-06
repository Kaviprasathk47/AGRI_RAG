import { RegistryService } from '../services/registry.service.js';
import { pinecone } from '../config/pinecone.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

/**
 * Controller compiling performance metrics, registry files, index and system configurations.
 */
export class StatisticsController {
  /**
   * Retrieves summary analytics for the RAG dashboard.
   * Route: GET /statistics
   */
  static async getStats(req, res, next) {
    try {
      // 1. Gather document counts from registry
      const documents = RegistryService.listDocuments();
      const documentsCount = documents.length;
      const chunksCount = documents.reduce((acc, doc) => acc + (doc.chunks || 0), 0);
      const vectorsCount = documents.reduce((acc, doc) => acc + (doc.vectors || 0), 0);

      // 2. Fetch Pinecone Index description
      let indexDetails = {
        name: CONFIG.PINECONE.INDEX,
        host: CONFIG.PINECONE.HOST || 'unknown',
        dimension: CONFIG.OPENAI.DIMENSION,
        metric: 'cosine',
        state: 'uninitialized'
      };

      if (CONFIG.PINECONE.API_KEY && CONFIG.PINECONE.INDEX && CONFIG.PINECONE.API_KEY !== 'dummy-key') {
        try {
          const indexDesc = await pinecone.describeIndex(CONFIG.PINECONE.INDEX);
          indexDetails = {
            name: CONFIG.PINECONE.INDEX,
            host: indexDesc.host || CONFIG.PINECONE.HOST,
            dimension: indexDesc.dimension || CONFIG.OPENAI.DIMENSION,
            metric: indexDesc.metric || 'cosine',
            state: indexDesc.status?.state || 'ready'
          };
        } catch (dbErr) {
          logger.warn(`Could not fetch details for Pinecone index "${CONFIG.PINECONE.INDEX}":`, dbErr.message);
          indexDetails.state = 'connection_error';
        }
      }

      // 3. Assemble and return stats package
      res.status(200).json({
        documentsCount,
        chunksCount,
        vectorsCount,
        index: indexDetails,
        models: {
          embedding: CONFIG.OPENAI.MODEL,
          llm: CONFIG.GEMINI.MODEL,
        },
        status: 'ok',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to compile stats report:', error);
      next(error);
    }
  }
}
