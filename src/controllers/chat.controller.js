import { RetrievalService } from '../services/retrieval.service.js';
import { PromptService } from '../services/prompt.service.js';
import { LlmService } from '../services/llm.service.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';

/**
 * Controller handling user query chats.
 */
export class ChatController {
  /**
   * Processes the retrieval-augmented generation question.
   * Route: POST /chat
   */
  static async chat(req, res, next) {
    logger.info('Received chat query request.');

    try {
      const { question, k, namespace } = req.body || {};

      if (!question || typeof question !== 'string' || question.trim() === '') {
        const error = new Error('The request body must contain a non-empty string parameter "question".');
        error.status = 400;
        throw error;
      }

      const topK = k ? parseInt(k, 10) : CONFIG.RETRIEVAL.DEFAULT_K;
      const targetNamespace = namespace || CONFIG.PINECONE.NAMESPACE;

      // 1. Retrieve the matching chunks from Pinecone
      const contexts = await RetrievalService.retrieve(question.trim(), topK, targetNamespace);

      // 2. Build the system and user instructions prompt
      const compiledPrompt = PromptService.compilePrompt(contexts, question.trim());

      // 3. Request completion response from Gemini
      const answer = await LlmService.generateAnswer(compiledPrompt);

      // 4. Format citations array to match the requested schema
      const sources = contexts.map(c => ({
        documentId: c.documentId,
        title: c.title,
        score: c.score,
      }));

      // Return clean response containing answers and reference sources
      res.status(200).json({
        answer,
        sources,
      });
    } catch (err) {
      logger.error('Chat controller action failed:', err);
      next(err);
    }
  }
}
