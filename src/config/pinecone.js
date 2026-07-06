import { Pinecone } from '@pinecone-database/pinecone';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

if (!CONFIG.PINECONE.API_KEY) {
  logger.warn('PINECONE_API_KEY is missing in your environment configuration.');
}

export const pinecone = new Pinecone({
  apiKey: CONFIG.PINECONE.API_KEY || 'dummy-key',
});

/**
 * Resolves and returns the Pinecone Index client.
 * Supports both automatic host resolution and explicit host overriding.
 * @returns {import('@pinecone-database/pinecone').Index}
 */
export function getPineconeIndex() {
  const indexName = CONFIG.PINECONE.INDEX;
  const host = CONFIG.PINECONE.HOST;

  if (host) {
    logger.debug(`Initializing Pinecone index "${indexName}" using explicit host: ${host}`);
    // The Pinecone SDK allows passing index name and host in v3/v4 index call
    return pinecone.index(indexName, host);
  }

  logger.debug(`Initializing Pinecone index "${indexName}" via auto host resolution`);
  return pinecone.index(indexName);
}
