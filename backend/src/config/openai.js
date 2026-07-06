import OpenAI from 'openai';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

if (!CONFIG.OPENAI.API_KEY) {
  logger.warn('OPENAI_API_KEY is missing in your environment configuration.');
}

export const openai = new OpenAI({
  apiKey: CONFIG.OPENAI.API_KEY || 'dummy-key',
});
