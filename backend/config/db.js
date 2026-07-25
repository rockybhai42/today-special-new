const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

mongoose.set('strictQuery', true);

/**
 * Connects to MongoDB with automatic retry so a transient DB outage
 * never crashes the process during startup or afterwards.
 */
async function connectDB() {
  mongoose.connection.on('connected', () => {
    logger.info('MongoDB connected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected, retrying in 5s');
    setTimeout(connectWithRetry, 5000);
  });

  await connectWithRetry();
}

async function connectWithRetry() {
  try {
    await mongoose.connect(config.mongodbUri);
  } catch (err) {
    logger.error('MongoDB initial connection failed, retrying in 5s', { error: err.message });
    setTimeout(connectWithRetry, 5000);
  }
}

module.exports = connectDB;
