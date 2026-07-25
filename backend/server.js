const app = require('./app');
const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');

async function start() {
  await connectDB();
  app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`, { env: config.nodeEnv });
  });
}

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled rejection', { error: err.message, stack: err.stack });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});

start();
