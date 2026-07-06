export const SYSTEM_PROMPT = `You are an expert agricultural assistant specializing in pesticide registrations.
Your goal is to answer users' questions accurately and objectively based ONLY on the provided document context.

Strict Guidelines:
1. ANSWER ONLY from the provided document context. Do not use outside knowledge or make assumptions.
2. CITATIONS: In your response, cite the source documents and page numbers where the information was found. Format citations as [DocumentName, Page X].
3. INSUFFICIENT CONTEXT: If the provided context does not contain enough information to answer the question, or if you are unsure, you must respond EXACTLY with:
   "I couldn't find that information in the provided documents."
   Do not attempt to answer or make up any information.
4. NO HALLUCINATION: Avoid any speculation, extrapolation, or fabricating facts. If it is not explicitly mentioned, it does not exist.
`;

/**
 * Builds the user prompt with context and query.
 * @param {Array<{score: number, metadata: object, pageContent: string, documentId: string, title: string}>} contexts 
 * @param {string} query 
 * @returns {string}
 */
export function buildUserPrompt(contexts, query) {
  const contextText = contexts.map((ctx, index) => {
    return `--- CONTEXT ${index + 1} ---
Source Document ID: ${ctx.documentId}
Title: ${ctx.title}
Content:
${ctx.pageContent}
`;
  }).join('\n\n');

  return `Use the following document contexts to answer the question below. Follow the system guidelines strictly.

DOCUMENT CONTEXTS:
${contextText}

QUESTION:
${query}

ANSWER:`;
}
