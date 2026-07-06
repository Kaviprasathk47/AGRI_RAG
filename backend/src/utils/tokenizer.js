/**
 * A utility to estimate token count for text.
 * A standard approximation is 1 token ≈ 4 characters or 0.75 words.
 * 
 * @param {string} text 
 * @returns {number}
 */
export function countTokens(text) {
  if (!text) return 0;
  
  // Clean whitespace to avoid empty matches
  const cleanText = text.trim();
  if (cleanText === '') return 0;

  const charCount = cleanText.length;
  // Split by whitespace
  const wordCount = cleanText.split(/\s+/).length;

  // Compute heuristic approximations
  const charEstimate = charCount / 4;
  const wordEstimate = wordCount / 0.75;

  // Average the two heuristics for robustness
  return Math.ceil((charEstimate + wordEstimate) / 2);
}
