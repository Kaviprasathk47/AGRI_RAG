import app from './app.js';
import { CONFIG } from './constants/config.js';
import { logger } from './utils/logger.js';

const PORT = CONFIG.PORT;

// Start Express Server
const server = app.listen(PORT, () => {
  logger.info(`===========================================================`);
  logger.info(`RAG Pesticide Chatbot service started successfully.`);
  logger.info(`Listening on port: ${PORT}`);
  logger.info(`Local URL: http://localhost:${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`===========================================================`);
});

// Process signal listeners for graceful termination (critical for cloud hosting deployments)
const initiateShutdown = (signal) => {
  logger.warn(`Process received termination signal [${signal}]. Initiating graceful shutdown...`);
  
  server.close(() => {
    logger.info('Express server has been closed successfully. Exiting.');
    process.exit(0);
  });

  // Force close process after 10 seconds if connections are hanging
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Force closing server process.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => initiateShutdown('SIGTERM'));
process.on('SIGINT', () => initiateShutdown('SIGINT'));
