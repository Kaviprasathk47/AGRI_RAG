import { GoogleGenerativeAI } from '@google/generative-ai';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

if (!CONFIG.GEMINI.API_KEY) {
  logger.warn('GEMINI_API_KEY is missing in your environment configuration.');
}

// In @google/generative-ai, client is initialized with the API key
export const genAI = new GoogleGenerativeAI(CONFIG.GEMINI.API_KEY || 'dummy-key');
