import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { logger } from '../utils/logger.js';

/**
 * Service responsible for dividing documents into semantically coherent text chunks.
 */
export class ChunkerService {
  /**
   * Splits a virtual document into overlapping chunks using LangChain's RecursiveCharacterTextSplitter.
   * @param {{pageContent: string, metadata: object}} virtualDoc - LangChain Document structure.
   * @param {number} [chunkSize] - Character size limit.
   * @param {number} [chunkOverlap] - Overlaps between chunks.
   * @returns {Promise<Array<{pageContent: string, metadata: object}>>} Chunks with updated metadata.
   */
  static async chunkDocument(virtualDoc, chunkSize = 1000, chunkOverlap = 200) {
    if (!virtualDoc || !virtualDoc.pageContent) {
      return [];
    }

    const documentId = virtualDoc.metadata.id;

    logger.debugStage('chunking_start', {
      documentId,
      contentLength: virtualDoc.pageContent.length,
      config: { chunkSize, chunkOverlap }
    });

    try {
      // 1. Initialize LangChain character-based recursive splitter
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize,
        chunkOverlap
      });

      // 2. Split the document content
      const rawChunks = await splitter.splitDocuments([
        {
          pageContent: virtualDoc.pageContent,
          metadata: { ...virtualDoc.metadata }
        }
      ]);

      const totalChunks = rawChunks.length;

      // 3. Post-process to inject parent metadata and index counters
      const processedChunks = rawChunks.map((chunk, index) => {
        const chunkIndex = index + 1;
        const chunkId = `${documentId}_c${chunkIndex}`;

        return {
          pageContent: chunk.pageContent,
          metadata: {
            ...chunk.metadata, // Inherits parent metadata keys (title, category, crop, etc.)
            documentId,
            chunkId,
            chunkIndex,
            totalChunks
          }
        };
      });

      logger.debugStage('chunking_success', {
        documentId,
        totalChunksGenerated: processedChunks.length,
        averageChunkLength: processedChunks.length 
          ? Math.round(processedChunks.reduce((sum, c) => sum + c.pageContent.length, 0) / processedChunks.length) 
          : 0
      });

      return processedChunks;
    } catch (error) {
      logger.error(`Failed to chunk document ${documentId}:`, error);
      throw error;
    }
  }
}
