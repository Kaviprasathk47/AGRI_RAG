import { openai } from '../config/openai.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';
import { EmbeddingError } from '../utils/ragErrors.js';

/**
 * Service to generate text embeddings using OpenAI.
 */
export class EmbeddingService {
  /**
   * Generates a vector embedding for a single text or an array of texts.
   * @param {string|Array<string>} input - Text content to embed.
   * @returns {Promise<Array<number>|Array<Array<number>>>} Embeddings.
   */
  static async generateEmbedding(input) {
    if (!input || (Array.isArray(input) && input.length === 0)) {
      throw new Error('Input text for embedding generation is empty.');
    }

    const isBatch = Array.isArray(input);
    const modelName = CONFIG.OPENAI.MODEL;

    // Log the initiation of the embedding API call
    logger.debugStage('embedding_generation_start', {
      isBatch,
      inputsCount: isBatch ? input.length : 1,
      model: modelName,
      textPreviews: isBatch 
        ? input.map(t => t.substring(0, 80) + '...') 
        : input.substring(0, 80) + '...'
    });

    const startTime = Date.now();
    try {
      const response = await openai.embeddings.create({
        model: modelName,
        input: input,
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Received empty response from OpenAI Embeddings API.');
      }

      // Sort response.data by index to guarantee ordering matches the input array
      const sortedData = [...response.data].sort((a, b) => a.index - b.index);
      const elapsed = Date.now() - startTime;

      logger.debugStage('embedding_generation_success', {
        durationMs: elapsed,
        embeddingsCount: sortedData.length,
        dimensions: sortedData[0].embedding.length,
      });

      if (isBatch) {
        logger.info(`Generated batch embeddings for ${sortedData.length} text chunks.`);
        return sortedData.map(item => item.embedding);
      } else {
        logger.debug('Generated single text embedding.');
        return sortedData[0].embedding;
      }
    } catch (error) {
      logger.error('Failed to generate embedding:', error);
      // Wrap in custom EmbeddingError with context details
      throw new EmbeddingError(`Embedding generation failed: ${error.message}`, {
        model: modelName,
        isBatch,
        inputsCount: isBatch ? input.length : 1,
        originalError: error.message
      });
    }
  }
}
