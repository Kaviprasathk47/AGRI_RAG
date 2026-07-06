/**
 * Custom base error for RAG pipeline operations.
 */
class RagBaseError extends Error {
  constructor(message, tag, status = 500, details = null) {
    super(message);
    this.name = this.constructor.name;
    this.tag = tag;
    this.status = status;
    this.statusCode = status; // for express compatibility
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error thrown during OpenAI embedding generations.
 */
export class EmbeddingError extends RagBaseError {
  constructor(message, details = null) {
    super(message, 'EMBEDDING_API_ERROR', 502, details);
  }
}

/**
 * Error thrown during Pinecone vector database operations.
 */
export class VectorDbError extends RagBaseError {
  constructor(message, details = null) {
    super(message, 'PINECONE_DB_ERROR', 502, details);
  }
}

/**
 * Error thrown during prompt assembly/token check issues.
 */
export class PromptError extends RagBaseError {
  constructor(message, details = null) {
    super(message, 'PROMPT_COMPILATION_ERROR', 500, details);
  }
}

/**
 * Error thrown during Gemini LLM completions.
 */
export class LlmError extends RagBaseError {
  constructor(message, details = null) {
    super(message, 'GEMINI_LLM_ERROR', 502, details);
  }
}
