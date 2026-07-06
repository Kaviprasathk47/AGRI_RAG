/**
 * Simple structured console logger for production RAG application.
 * Automatically sanitizes sensitive keys or tokens from log outputs.
 */
class Logger {
  constructor() {
    this.levels = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };
    this.currentLevel = process.env.LOG_LEVEL ? this.levels[process.env.LOG_LEVEL.toUpperCase()] : this.levels.INFO;
  }

  /**
   * Helper to sanitize sensitive strings (e.g. API keys) from logs.
   * @param {any} message 
   * @returns {any}
   */
  _sanitize(message) {
    if (typeof message !== 'string') {
      try {
        message = JSON.stringify(message);
      } catch (e) {
        return message;
      }
    }
    // Replace API keys matching standard patterns (sk-..., AQ...., pcsk_..., etc.)
    return message
      .replace(/sk-[a-zA-Z0-9_-]{32,}/g, 'sk-***[REDACTED]***')
      .replace(/AIzaSy[a-zA-Z0-9_-]{33}/g, 'AIzaSy***[REDACTED]***')
      .replace(/pcsk_[a-zA-Z0-9_-]{45,}/g, 'pcsk_***[REDACTED]***');
  }

  /**
   * Recursively sanitizes any keys/values inside an object that might contain secrets.
   * @param {any} obj 
   * @returns {any}
   */
  _sanitizeObject(obj) {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj !== 'object') {
      if (typeof obj === 'string') {
        return this._sanitize(obj);
      }
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this._sanitizeObject(item));
    }
    
    const copy = {};
    for (const key of Object.keys(obj)) {
      const lowerKey = key.toLowerCase();
      // Tag key names that typically represent secrets or authorization tokens
      const isSensitiveKey = ['apikey', 'api_key', 'secret', 'password', 'token', 'auth', 'key', 'credentials'].some(k => lowerKey.includes(k));
      
      if (isSensitiveKey && typeof obj[key] === 'string') {
        copy[key] = '***[REDACTED_API_KEY]***';
      } else {
        copy[key] = this._sanitizeObject(obj[key]);
      }
    }
    return copy;
  }

  _log(levelName, ...args) {
    if (this.levels[levelName] < this.currentLevel) return;

    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      return this._sanitize(arg);
    });

    console.log(`[${timestamp}] [${levelName}]`, ...sanitizedArgs);
  }

  debug(...args) {
    this._log('DEBUG', ...args);
  }

  info(...args) {
    this._log('INFO', ...args);
  }

  warn(...args) {
    this._log('WARN', ...args);
  }

  error(...args) {
    this._log('ERROR', ...args);
  }

  /**
   * Logs a structured RAG pipeline diagnostic stage in development mode.
   * @param {string} stage - RAG phase name.
   * @param {object} details - Metadata details.
   */
  debugStage(stage, details) {
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
    if (!isDev) return;

    const timestamp = new Date().toISOString();
    const sanitized = this._sanitizeObject(details);
    
    console.log(
      `\n[${timestamp}] [DEBUG-STAGE] ==================== ${stage.toUpperCase()} ====================`
    );
    console.log(JSON.stringify(sanitized, null, 2));
    console.log(`[${timestamp}] [DEBUG-STAGE] =======================================================\n`);
  }

  /**
   * Measures execution time of an async operation.
   * @param {string} label 
   * @param {Function} fn 
   * @returns {Promise<any>}
   */
  async time(label, fn) {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.info(`${label} completed in ${duration}ms`);
      return result;
    } catch (err) {
      const duration = Date.now() - start;
      this.error(`${label} failed after ${duration}ms:`, err);
      throw err;
    }
  }
}

export const logger = new Logger();
