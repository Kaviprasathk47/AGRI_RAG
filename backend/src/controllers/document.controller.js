import fs from 'fs';
import path from 'path';
import { RegistryService } from '../services/registry.service.js';
import { PineconeService } from '../services/pinecone.service.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

/**
 * Controller managing document registration metadata and deletions.
 */
export class DocumentController {
  /**
   * Lists all currently registered documents.
   * Route: GET /documents
   */
  static async listDocuments(req, res, next) {
    try {
      const documents = RegistryService.listDocuments();
      res.status(200).json(documents);
    } catch (err) {
      logger.error('Failed to list documents:', err);
      next(err);
    }
  }

  /**
   * Deletes a document's vectors, physical file, and registry entry.
   * Route: DELETE /documents/:id
   */
  static async deleteDocument(req, res, next) {
    try {
      const documentId = req.params.id; // Target filename
      
      if (!documentId || documentId.trim() === '') {
        const error = new Error('Document parameter ID is required.');
        error.status = 400;
        throw error;
      }

      logger.info(`Initiating complete deletion of document and vectors: "${documentId}"`);

      // 1. Remove vectors from Pinecone using metadata filter query
      const namespace = req.query.namespace || CONFIG.PINECONE.NAMESPACE;
      await PineconeService.deleteByDocument(documentId, namespace);

      // 2. Remove PDF file from the disk uploads/ folder
      const pdfPath = path.resolve(CONFIG.PDF_DIR, documentId);
      if (fs.existsSync(pdfPath)) {
        fs.unlinkSync(pdfPath);
        logger.info(`Deleted PDF file from disk: "${pdfPath}"`);
      } else {
        logger.warn(`PDF file not present on disk at "${pdfPath}" during registry deletion.`);
      }

      // 3. Remove entry from local registry metadata file
      const wasRemoved = RegistryService.unregisterDocument(documentId);

      res.status(200).json({
        status: 'success',
        message: `Document "${documentId}" and all associated vectors deleted successfully.`,
        id: documentId,
        unregisteredFromDb: wasRemoved,
      });
    } catch (err) {
      logger.error(`Deletion execution failed for document "${req.params.id}":`, err);
      next(err);
    }
  }
}
