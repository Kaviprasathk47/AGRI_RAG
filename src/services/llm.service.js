import { genAI } from '../config/gemini.js';
import { CONFIG } from '../constants/config.js';
import { logger } from '../utils/logger.js';
import { LlmError } from '../utils/ragErrors.js';
import { debugStore } from '../utils/debugStore.js';

/**
 * Service to execute completions using Gemini LLM.
 */
export class LlmService {
  /**
   * Sends the compiled prompt parameters to Gemini and returns the output text.
   * @param {{systemInstruction: string, userContent: string}} compiledPrompt - Compiled prompts.
   * @returns {Promise<string>} Model answer.
   */
  static async generateAnswer(compiledPrompt) {
    const { systemInstruction, userContent } = compiledPrompt;
    
    if (!userContent) {
      throw new Error('User prompt content is required for LLM call.');
    }

    const primaryModel = CONFIG.GEMINI.MODEL;
    // Decoupled fallback chain of standard stable models
    const fallbacks = [
      'gemini-2.5-flash',
    ];
    const candidates = [primaryModel, ...fallbacks.filter(m => m !== primaryModel)];

    logger.debugStage('gemini_request_start', {
      primaryModel,
      candidates,
      systemInstructionCharLength: systemInstruction.length,
      userPromptCharLength: userContent.length,
      config: {
        temperature: CONFIG.GEMINI.TEMPERATURE,
        maxOutputTokens: CONFIG.GEMINI.MAX_OUTPUT_TOKENS
      }
    });

    let lastError = null;

    for (const modelName of candidates) {
      logger.info(`Attempting generation with Gemini model: "${modelName}"`);
      const startTime = Date.now();
      
      try {
        // 1. Get generative model with system instructions pre-configured
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemInstruction,
        });

        // 2. Call generateContent with user message and generation config parameters
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userContent }] }],
          generationConfig: {
            temperature: CONFIG.GEMINI.TEMPERATURE,
            maxOutputTokens: CONFIG.GEMINI.MAX_OUTPUT_TOKENS,
          },
        });

        const response = await result.response;
        const text = response.text();

        const duration = Date.now() - startTime;
        logger.info(`Gemini response generated successfully using model "${modelName}" in ${duration}ms.`);
        
        logger.debugStage('gemini_request_success', {
          chosenModelName: modelName,
          durationMs: duration,
          generatedCharLength: text.length,
          generatedTextPreview: text.substring(0, 100) + '...'
        });

        // Append generation details to debugStore for complete RAG tracing
        const lastRetrieval = debugStore.getLastRetrieval() || {};
        debugStore.setLastRetrieval({
          ...lastRetrieval,
          llmModel: modelName,
          llmDurationMs: duration,
          systemInstructionText: systemInstruction,
          userPromptText: userContent,
          generatedAnswerText: text
        });

        return text;
      } catch (error) {
        logger.warn(`Gemini model "${modelName}" request failed. Error: ${error.message}`);
        lastError = error;
        // Continue loop to fallback models
      }
    }

    logger.error('All configured Gemini models in the failover chain failed.');
    throw new LlmError(`Gemini generation failed: ${lastError?.message}`, {
      primaryModel,
      candidatesList: candidates,
      originalError: lastError?.message
    });
  }
}
