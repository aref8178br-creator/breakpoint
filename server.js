const env = require('./config/env');
const logger = require('./utils/logger');
const { app, db } = require('./app');

const server = app.listen(env.PORT, env.HOST, () => {
  logger.info(`Server running at http://${env.HOST}:${env.PORT} [${env.NODE_ENV}]`);
});

function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    try {
      db.close();
    } catch (err) {
      logger.error({ err }, 'Error closing database');
    }
    logger.info('Shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (err) => {
  logger.error({ err }, 'Unhandled promise rejection');
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});

module.exports = server;
