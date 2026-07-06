/**
 * In-memory thread-safe store caching diagnostic data for the last RAG pipeline execution.
 * Only loaded and accessible in developer environments to verify stage metadata.
 */
class DebugStore {
  constructor() {
    this.lastRetrieval = null;
  }

  /**
   * Sets trace metrics and outputs from the last retrieval run.
   * @param {object} data - Tracing details.
   */
  setLastRetrieval(data) {
    this.lastRetrieval = {
      ...data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetches the cached trace details.
   * @returns {object|null} Last diagnostic metadata.
   */
  getLastRetrieval() {
    return this.lastRetrieval;
  }

  /**
   * Wipes cached diagnostic metrics.
   */
  clear() {
    this.lastRetrieval = null;
  }
}

export const debugStore = new DebugStore();
