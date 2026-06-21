'use strict';
const winston = require('winston');

const { combine, timestamp, json, colorize, simple } = winston.format;

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(timestamp(), json()),
  defaultMeta: { service: 'warehouse-inventory-hq' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.NODE_ENV === 'production'
          ? combine(timestamp(), json())
          : combine(colorize(), simple()),
    }),
  ],
});

module.exports = logger;
