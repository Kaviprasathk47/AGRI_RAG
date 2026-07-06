import fs from 'fs';
import path from 'path';
import { ParserService } from './parser.service.js';
import { ChunkerService } from './chunker.service.js';
import { EmbeddingService } from './embedding.service.js';
import { PineconeService } from './pinecone.service.js';
import { RegistryService } from './registry.service.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

/**
 * Service orchestrating the complete markdown-to-vector ingestion pipeline.
 */
export class IngestionService {
  /**
   * Scans, parses, chunks, embeds, and uploads Markdown batch documents to Pinecone.
   * @param {string} [namespace] - Target Pinecone namespace.
   * @returns {Promise<{processedDocuments: string[], totalChunks: number, uploadedVectors: number, timeElapsedMs: number}>} Ingestion statistics.
   */
  static async ingestAll(namespace = CONFIG.PINECONE.NAMESPACE) {
    const startTime = Date.now();
    const dataDir = path.resolve(CONFIG.PDF_DIR); // Resolves to 'data' directory

    // Verify folder presence
    if (!fs.existsSync(dataDir)) {
      logger.warn(`Directory not found: ${dataDir}. Creating empty folder.`);
      fs.mkdirSync(dataDir, { recursive: true });
      return {
        processedDocuments: [],
        totalChunks: 0,
        uploadedVectors: 0,
        timeElapsedMs: Date.now() - startTime,
      };
    }

    // Step 1: Scan target folder for markdown files
    console.log("Reading Documents");
    const files = fs.readdirSync(dataDir).filter(file => file.toLowerCase().endsWith('.md'));
    if (files.length === 0) {
      logger.warn(`No Markdown files found in directory: ${dataDir}`);
      return {
        processedDocuments: [],
        totalChunks: 0,
        uploadedVectors: 0,
        timeElapsedMs: Date.now() - startTime,
      };
    }

    logger.info(`Found ${files.length} Markdown batch file(s) for ingestion in: ${dataDir}`);

    const processedDocuments = [];
    let allChunks = [];
    const fileStats = {};

    // Step 2 & 3: Split into memory-only virtual documents and extract metadata
    console.log("Splitting Documents");
    const allVirtualDocs = [];
    
    for (const file of files) {
      const filePath = path.join(dataDir, file);
      try {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const statsObj = fs.statSync(filePath);

        // Split batch file into virtual documents
        const virtualDocs = ParserService.parseMarkdownBatch(fileContent, file);
        allVirtualDocs.push(...virtualDocs);

        fileStats[file] = {
          size: statsObj.size,
          chunksCount: 0,
          startTime: Date.now()
        };
        processedDocuments.push(file);
      } catch (err) {
        logger.error(`Error splitting markdown batch file "${file}":`, err);
      }
    }

    // Step 4 & 5: Chunk the virtual documents using ChunkerService (RecursiveCharacterTextSplitter)
    console.log("Chunking");
    for (const doc of allVirtualDocs) {
      try {
        const chunks = await ChunkerService.chunkDocument(
          doc,
          CONFIG.CHUNKING.SIZE,
          CONFIG.CHUNKING.OVERLAP
        );
        allChunks = allChunks.concat(chunks);
        
        // Find which batch file this document originated from to allocate stats
        // We'll search for the file prefix or assign to the first processed file
        const originatingFile = files.find(f => doc.metadata.id.includes(f.replace('.md', ''))) || files[0];
        if (fileStats[originatingFile]) {
          fileStats[originatingFile].chunksCount += chunks.length;
        }
      } catch (err) {
        logger.error(`Error chunking virtual document ${doc.metadata.id}:`, err);
      }
    }

    if (allChunks.length === 0) {
      logger.warn('No text chunks generated. Ingestion aborted.');
      return {
        processedDocuments,
        totalChunks: 0,
        uploadedVectors: 0,
        timeElapsedMs: Date.now() - startTime,
      };
    }

    // Step 6: Generate OpenAI Embeddings for chunk content
    console.log("Generating Embeddings");
    logger.info(`Generated ${allChunks.length} chunks. Starting OpenAI embedding generation...`);

    const embeddingBatchSize = 100;
    const vectors = [];

    for (let i = 0; i < allChunks.length; i += embeddingBatchSize) {
      const chunkBatch = allChunks.slice(i, i + embeddingBatchSize);
      const textBatch = chunkBatch.map(c => c.pageContent);

      try {
        logger.info(`Generating embeddings for batch ${Math.floor(i / embeddingBatchSize) + 1}/${Math.ceil(allChunks.length / embeddingBatchSize)}...`);
        const embeddings = await EmbeddingService.generateEmbedding(textBatch);

        // Format chunks into Pinecone vector objects with exact requested metadata
        chunkBatch.forEach((chunk, index) => {
          vectors.push({
            id: chunk.metadata.chunkId,
            values: embeddings[index],
            metadata: {
              document: chunk.metadata.document, // Source batch file reference
              documentId: chunk.metadata.documentId,
              chunkId: chunk.metadata.chunkId,
              title: chunk.metadata.title,
              category: chunk.metadata.category,
              crop: chunk.metadata.crop || [],
              region: chunk.metadata.region || [],
              season: chunk.metadata.season || [],
              keywords: chunk.metadata.keywords || [],
              pageContent: chunk.pageContent, // original chunk content
              related_documents: chunk.metadata.related_documents || [],
              chunkIndex: chunk.metadata.chunkIndex,
              totalChunks: chunk.metadata.totalChunks
            }
          });
        });
      } catch (err) {
        logger.error(`Embedding generation failed at batch starting index ${i}:`, err);
        throw err; // Re-throw to halt the pipeline
      }
    }

    // Clear the existing namespace first to prevent stale document chunk index mix-ups
    try {
      logger.info(`Clearing existing vectors in namespace: "${namespace}" before fresh batch upsert...`);
      await PineconeService.clearNamespace(namespace);
    } catch (err) {
      logger.warn(`Namespace clear operation failed or namespace was already empty: ${err.message}`);
    }

    // Step 7: Store vectors inside Pinecone with batch upserts and progress tracking
    const pineconeBatchSize = 100;
    let uploadedVectors = 0;
    let batchIndex = 1;

    for (let i = 0; i < vectors.length; i += pineconeBatchSize) {
      const batch = vectors.slice(i, i + pineconeBatchSize);
      console.log(`Uploading Batch ${batchIndex}`);
      
      const count = await PineconeService.upsertBatched(batch, pineconeBatchSize, namespace);
      uploadedVectors += count;
      batchIndex++;
    }

    console.log("Completed");

    // Sync database registries
    for (const file of processedDocuments) {
      const stats = fileStats[file];
      if (stats) {
        const duration = Date.now() - stats.startTime;
        RegistryService.registerDocument(
          file,
          stats.size,
          stats.chunksCount,
          stats.chunksCount,
          duration
        );
      }
    }

    const timeElapsedMs = Date.now() - startTime;
    logger.info(`Ingestion pipeline completed in ${timeElapsedMs}ms. Handled ${processedDocuments.length} files, uploaded ${uploadedVectors} vectors.`);

    return {
      processedDocuments,
      totalChunks: allChunks.length,
      uploadedVectors,
      timeElapsedMs,
    };
  }
}
