import { SYSTEM_PROMPT, buildUserPrompt } from '../constants/prompts.js';
import { logger } from '../utils/logger.js';
import { PromptError } from '../utils/ragErrors.js';

/**
 * Service to build professional RAG prompts.
 * Does not make any external network or model calls.
 */
export class PromptService {
  /**
   * Compiles the system instructions and user-facing prompt incorporating vector search results.
   * @param {Array<{text: string, document: string, page: number}>} contexts - Retrieved context chunks.
   * @param {string} question - Question query.
   * @returns {{systemInstruction: string, userContent: string}} Complete prompt parameters.
   */
  static compilePrompt(contexts, question) {
    try {
      const userPrompt = buildUserPrompt(contexts, question);
      
      logger.debugStage('prompt_compilation_success', {
        contextsCount: contexts ? contexts.length : 0,
        systemInstructionCharLength: SYSTEM_PROMPT.length,
        userPromptCharLength: userPrompt.length,
        contextSources: contexts ? contexts.map(c => `[DocId: ${c.documentId}, Title: ${c.title}] ${c.pageContent.substring(0, 40)}...`) : []
      });

      return {
        systemInstruction: SYSTEM_PROMPT,
        userContent: userPrompt,
      };
    } catch (error) {
      logger.error('Failed to compile prompt contexts:', error);
      throw new PromptError(`Prompt compilation failed: ${error.message}`, {
        contextsCount: contexts ? contexts.length : 0,
        originalError: error.message
      });
    }
  }
}
