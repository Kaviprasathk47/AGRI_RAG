import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import ingestRoutes from './routes/ingest.routes.js';
import chatRoutes from './routes/chat.routes.js';
import documentRoutes from './routes/document.routes.js';
import statisticsRoutes from './routes/statistics.routes.js';
import debugRoutes from './routes/debug.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { logger } from './utils/logger.js';
import { CONFIG } from './constants/config.js';

const app = express();

// 1. Basic security headers
app.use(helmet());

// 2. Enable CORS with dynamic host check and credential permissions
const allowedOrigins = CONFIG.CORS_ORIGIN === '*' ? '*' : CONFIG.CORS_ORIGIN.split(',').map(o => o.trim().replace(/\/$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    // Permit requests with no origin (like mobile clients, local scripts, or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins === '*' || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Always permit localhost connections for easy developer testing
    const isDev = process.env.NODE_ENV === 'development' || process.env.DEBUG_MODE === 'true';
    if (isDev && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))) {
      return callback(null, true);
    }

    return callback(new Error(`Origin "${origin}" blocked by CORS policy.`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 3. Rate limiting middleware to prevent API flooding
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    code: 429,
    message: 'Too many requests from this IP. Please try again in 15 minutes.'
  }
});

// Apply rate limiter to all API endpoints
app.use(apiLimiter);

// 4. Request logger middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} request received on path: ${req.path}`);
  next();
});

// 5. Body parsing middleware (limit set to 10MB to support potential large JSON vectors/metadata requests)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 6. API Route Mounts
app.use('/ingest', ingestRoutes);
app.use('/chat', chatRoutes);
app.use('/documents', documentRoutes);
app.use('/statistics', statisticsRoutes);
app.use('/debug', debugRoutes);

// 7. GET /health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
  });
});

// 8. Catch-all fallback route handler for undefined endpoints (404)
app.use((req, res, next) => {
  const error = new Error(`Resource not found: ${req.method} ${req.path}`);
  error.status = 404;
  next(error);
});

// 9. Global Error Handling Middleware
app.use(errorHandler);

export default app;
