import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

const REGISTRY_FILE = path.resolve('data/registry.json');

/**
 * Service to manage local database tracking of ingested documents.
 */
export class RegistryService {
  /**
   * Reads registry tracking data.
   * @returns {Array<object>} List of registered documents.
   */
  static getRegistry() {
    try {
      const dir = path.dirname(REGISTRY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (!fs.existsSync(REGISTRY_FILE)) {
        fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2));
        return [];
      }

      const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
      return JSON.parse(raw || '[]');
    } catch (error) {
      logger.error('Failed to read document registry:', error);
      return [];
    }
  }

  /**
   * Writes registry tracking data back to disk.
   * @param {Array<object>} registry - Data to save.
   */
  static saveRegistry(registry) {
    try {
      const dir = path.dirname(REGISTRY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
      logger.debug('Document registry saved successfully.');
    } catch (error) {
      logger.error('Failed to save document registry:', error);
      throw new Error(`Registry write failure: ${error.message}`);
    }
  }

  /**
   * Registers or updates a document's metadata.
   * @param {string} name - Document file name.
   * @param {number} size - File size in bytes.
   * @param {number} chunks - Count of chunks created.
   * @param {number} vectors - Count of vectors uploaded.
   * @param {number} durationMs - Ingestion duration in ms.
   * @returns {object} The saved metadata.
   */
  static registerDocument(name, size, chunks, vectors, durationMs) {
    const registry = this.getRegistry();
    const existingIndex = registry.findIndex(doc => doc.name === name);

    const docMetadata = {
      id: name,
      name,
      size,
      chunks,
      vectors,
      ingestedAt: new Date().toISOString(),
      durationMs,
    };

    if (existingIndex !== -1) {
      registry[existingIndex] = docMetadata;
      logger.info(`Updated document registry entry for: ${name}`);
    } else {
      registry.push(docMetadata);
      logger.info(`Created new document registry entry for: ${name}`);
    }

    this.saveRegistry(registry);
    return docMetadata;
  }

  /**
   * Removes a document's entry from the registry.
   * @param {string} name - Document name to remove.
   * @returns {boolean} True if document existed and was removed.
   */
  static unregisterDocument(name) {
    const registry = this.getRegistry();
    const filtered = registry.filter(doc => doc.name !== name);
    
    if (filtered.length === registry.length) {
      return false;
    }

    this.saveRegistry(filtered);
    logger.info(`Unregistered document from local registry: ${name}`);
    return true;
  }

  /**
   * Retrieves single document metadata by name.
   * @param {string} name - Document name.
   * @returns {object|null} Document metadata or null.
   */
  static getDocument(name) {
    const registry = this.getRegistry();
    return registry.find(doc => doc.name === name) || null;
  }

  /**
   * Returns complete document listing.
   * @returns {Array<object>} Ingested documents.
   */
  static listDocuments() {
    return this.getRegistry();
  }
}
