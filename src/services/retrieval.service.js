import { EmbeddingService } from './embedding.service.js';
import { PineconeService } from './pinecone.service.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';
import { debugStore } from '../utils/debugStore.js';

/**
 * Service responsible for embedding questions and querying Pinecone to retrieve context.
 */
export class RetrievalService {
  /**
   * Retrieves top-K context chunks matching the user's query.
   * @param {string} question - User question.
   * @param {number} [k] - Number of vectors to fetch.
   * @param {string} [namespace] - Vector database namespace.
   * @returns {Promise<Array<{score: number, metadata: object, pageContent: string, documentId: string, title: string}>>} Found contexts.
   */
  static async retrieve(question, k = CONFIG.RETRIEVAL.DEFAULT_K, namespace = CONFIG.PINECONE.NAMESPACE) {
    const startTime = Date.now();
    logger.info(`Retrieving relevant document contexts for query: "${question}"`);

    try {
      // 1. Generate query embedding vector
      const embeddingStartTime = Date.now();
      const queryEmbedding = await EmbeddingService.generateEmbedding(question);
      const embeddingDuration = Date.now() - embeddingStartTime;

      // 2. Execute vector search query against Pinecone
      const queryStartTime = Date.now();
      const matches = await PineconeService.query(queryEmbedding, k, namespace);
      const queryDuration = Date.now() - queryStartTime;

      // 3. Normalize matches into context items conforming to the requested schema
      const results = matches.map(match => {
        const metadata = match.metadata || {};
        return {
          score: match.score || 0,
          metadata: metadata, // Full metadata object preserved
          pageContent: metadata.pageContent || '',
          documentId: metadata.documentId || 'unknown_document',
          title: metadata.title || 'Untitled',
        };
      });

      // Filter out matches below minimal score threshold if configured
      const filteredResults = results.filter(item => item.score >= CONFIG.RETRIEVAL.MIN_SCORE);
      
      const elapsed = Date.now() - startTime;
      logger.info(`Retrieval completed. Fetched ${matches.length} matches, filtered to ${filteredResults.length} matching score threshold (${CONFIG.RETRIEVAL.MIN_SCORE}) in ${elapsed}ms.`);

      // Log detailed debug stage
      logger.debugStage('retrieval_service_success', {
        question,
        embeddingDurationMs: embeddingDuration,
        pineconeQueryDurationMs: queryDuration,
        totalDurationMs: elapsed,
        rawMatchesCount: matches.length,
        filteredMatchesCount: filteredResults.length,
        scoreThreshold: CONFIG.RETRIEVAL.MIN_SCORE,
        resultsPreview: filteredResults.map(r => ({
          documentId: r.documentId,
          title: r.title,
          score: r.score,
          textLength: r.pageContent.length,
          preview: r.pageContent.substring(0, 60) + '...'
        }))
      });

      // Cache diagnostics in-memory for dev debugging
      debugStore.setLastRetrieval({
        question,
        queryEmbeddingPreview: queryEmbedding.slice(0, 5),
        embeddingDurationMs: embeddingDuration,
        pineconeQueryDurationMs: queryDuration,
        totalDurationMs: elapsed,
        rawMatches: matches.map(m => ({
          id: m.id,
          score: m.score,
          documentId: m.metadata?.documentId,
          title: m.metadata?.title,
          textLength: m.metadata?.pageContent?.length || 0
        })),
        scoreThreshold: CONFIG.RETRIEVAL.MIN_SCORE,
        k,
        namespace,
        filteredResults
      });

      return filteredResults;
    } catch (error) {
      logger.error('Failed to retrieve matching documents from Pinecone:', error);
      throw error;
    }
  }
}
