import { getPineconeIndex } from '../config/pinecone.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';
import { VectorDbError } from '../utils/ragErrors.js';

/**
 * Service to execute low-level vector operations in Pinecone.
 * Contains no embedding or parsing logic.
 */
export class PineconeService {
  /**
   * Upserts vectors in batched chunks to prevent payload size issues.
   * @param {Array<{id: string, values: Array<number>, metadata: object}>} vectors - Vectors to upsert.
   * @param {number} batchSize - Number of vectors per API request.
   * @param {string} [namespace] - Vector namespace.
   * @returns {Promise<number>} Number of successfully uploaded vectors.
   */
  static async upsertBatched(vectors, batchSize = 100, namespace = CONFIG.PINECONE.NAMESPACE) {
    if (!vectors || vectors.length === 0) {
      logger.warn('No vectors provided for Pinecone upsert.');
      return 0;
    }

    logger.debugStage('pinecone_upsert_start', {
      totalVectorsCount: vectors.length,
      batchSize,
      namespace,
      vectorIdsPreview: vectors.slice(0, 10).map(v => v.id)
    });

    const index = getPineconeIndex();
    let uploadedCount = 0;
    const startTime = Date.now();

    try {
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        logger.info(`Uploading Pinecone batch of ${batch.length} vectors (${i + 1} to ${Math.min(i + batchSize, vectors.length)})...`);
        
        await index.namespace(namespace).upsert(batch);
        uploadedCount += batch.length;
      }
      
      const elapsed = Date.now() - startTime;
      logger.info(`Successfully completed upsert for total of ${uploadedCount} vectors in namespace "${namespace}".`);

      logger.debugStage('pinecone_upsert_success', {
        durationMs: elapsed,
        vectorsUploadedCount: uploadedCount,
        namespace
      });

      return uploadedCount;
    } catch (error) {
      logger.error(`Pinecone batch upsert failed at batch progress ${uploadedCount}/${vectors.length}:`, error);
      throw new VectorDbError(`Pinecone upsert failed: ${error.message}`, {
        progress: uploadedCount,
        total: vectors.length,
        namespace,
        originalError: error.message
      });
    }
  }

  /**
   * Queries Pinecone index for similar vectors.
   * @param {Array<number>} vector - The query embedding vector.
   * @param {number} topK - Number of results to retrieve.
   * @param {string} [namespace] - Target namespace.
   * @returns {Promise<Array<{id: string, score: number, metadata: object}>>} Matches.
   */
  static async query(vector, topK = CONFIG.RETRIEVAL.DEFAULT_K, namespace = CONFIG.PINECONE.NAMESPACE) {
    if (!vector || vector.length === 0) {
      throw new Error('Query vector is empty or invalid.');
    }

    logger.debugStage('pinecone_query_start', {
      vectorDimension: vector.length,
      topK,
      namespace
    });

    const index = getPineconeIndex();
    const startTime = Date.now();

    try {
      logger.info(`Querying Pinecone index for top-${topK} results in namespace "${namespace}"...`);
      const response = await index.namespace(namespace).query({
        vector,
        topK,
        includeMetadata: true,
        includeValues: false,
      });

      const elapsed = Date.now() - startTime;
      const matches = response.matches || [];

      logger.debugStage('pinecone_query_success', {
        durationMs: elapsed,
        matchesCount: matches.length,
        matches: matches.map(m => ({
          id: m.id,
          score: m.score,
          documentId: m.metadata?.documentId,
          title: m.metadata?.title,
          textPreview: m.metadata?.pageContent ? m.metadata.pageContent.substring(0, 60) + '...' : ''
        }))
      });

      return matches;
    } catch (error) {
      logger.error('Pinecone query execution failed:', error);
      throw new VectorDbError(`Pinecone query failed: ${error.message}`, {
        namespace,
        topK,
        originalError: error.message
      });
    }
  }

  /**
   * Deletes specified vectors from the Pinecone index namespace.
   * @param {Array<string>} ids - Vector IDs to remove.
   * @param {string} [namespace] - Target namespace.
   */
  static async delete(ids, namespace = CONFIG.PINECONE.NAMESPACE) {
    if (!ids || ids.length === 0) return;

    logger.debugStage('pinecone_delete_start', {
      idsCount: ids.length,
      ids,
      namespace
    });

    const index = getPineconeIndex();

    try {
      logger.info(`Deleting ${ids.length} vectors from namespace "${namespace}"...`);
      await index.namespace(namespace).deleteMany(ids);
      
      logger.debugStage('pinecone_delete_success', {
        deletedCount: ids.length,
        namespace
      });
    } catch (error) {
      logger.error('Pinecone delete operation failed:', error);
      throw new VectorDbError(`Pinecone deletion failed: ${error.message}`, {
        ids,
        namespace,
        originalError: error.message
      });
    }
  }

  /**
   * Deletes all vectors matching a specific document filter.
   * @param {string} documentName - Name of the document whose chunks will be deleted.
   * @param {string} [namespace] - Target namespace.
   */
  static async deleteByDocument(documentName, namespace = CONFIG.PINECONE.NAMESPACE) {
    if (!documentName) return;

    logger.debugStage('pinecone_delete_by_document_start', {
      documentName,
      namespace
    });

    const index = getPineconeIndex();
    const startTime = Date.now();

    try {
      logger.info(`Deleting all vectors matching document metadata: "${documentName}" from namespace "${namespace}"...`);
      // Pinecone deleteMany takes a filter parameter
      await index.namespace(namespace).deleteMany({
        filter: { document: { $eq: documentName } }
      });
      
      const elapsed = Date.now() - startTime;
      logger.info(`Successfully deleted vectors for "${documentName}" from Pinecone.`);
      
      logger.debugStage('pinecone_delete_by_document_success', {
        durationMs: elapsed,
        documentName,
        namespace
      });
    } catch (error) {
      logger.error(`Pinecone metadata-filter delete failed for "${documentName}":`, error);
      throw new VectorDbError(`Pinecone delete by document failed: ${error.message}`, {
        documentName,
        namespace,
        originalError: error.message
      });
    }
  }

  /**
   * Clears all records within a namespace.
   * @param {string} [namespace] - Namespace to wipe.
   */
  static async clearNamespace(namespace = CONFIG.PINECONE.NAMESPACE) {
    logger.debugStage('pinecone_clear_namespace_start', {
      namespace
    });

    const index = getPineconeIndex();
    const startTime = Date.now();

    try {
      logger.warn(`Wiping all vectors inside namespace "${namespace}"!`);
      await index.namespace(namespace).deleteAll();
      
      const elapsed = Date.now() - startTime;
      logger.debugStage('pinecone_clear_namespace_success', {
        durationMs: elapsed,
        namespace
      });
    } catch (error) {
      logger.error(`Failed to clear namespace "${namespace}":`, error);
      throw new VectorDbError(`Pinecone clear namespace failed: ${error.message}`, {
        namespace,
        originalError: error.message
      });
    }
  }
}
