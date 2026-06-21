'use strict';
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connection.on('connected', () => {
  logger.info('MongoDB connected successfully');
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB connection error', { error: err.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected — attempting reconnect');
});

async function connectDatabase() {
  if (!MONGODB_URI) {
    logger.warn('MONGODB_URI not set — running without database');
    return;
  }
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
  } catch (err) {
    logger.warn('MongoDB connection failed — running without database', { error: err.message });
  }
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
