import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  CORS_ORIGIN: (process.env.CORS_ORIGIN || '*').trim().replace(/^["']|["']$/g, ''),
  
  // Folders
  PDF_DIR: process.env.PDF_DIR || 'data',
  
  // OpenAI Embedding Settings
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY,
    MODEL: 'text-embedding-3-small',
    DIMENSION: 1536,
  },
  
  // Pinecone Settings
  PINECONE: {
    API_KEY: (process.env.PINECONE_API_KEY || process.env.PINECONE_API || '').trim().replace(/^["']|["']$/g, ''),
    INDEX: process.env.PINECONE_INDEX || 'quickstart',
    HOST: (process.env.PINECONE_HOST || process.env.PINE_CODE_API || '').trim().replace(/^["']|["']$/g, ''), // Support both names
    NAMESPACE: process.env.PINECONE_NAMESPACE || 'pesticide-rag',
  },
  
  // Gemini Settings
  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY,
    MODEL: 'gemini-2.5-flash', // Production ready Gemini 2.x model
    TEMPERATURE: 0.1,
    MAX_OUTPUT_TOKENS: 2048,
  },
  
  // Chunking
  CHUNKING: {
    SIZE: parseInt( '1000', 10),
    OVERLAP: parseInt( '200', 10),
  },
  
  // Retrieval
  RETRIEVAL: {
    DEFAULT_K: parseInt('5', 10),
    MIN_SCORE: parseFloat('0.2'),
  }
};
