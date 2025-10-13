const pino = require('pino');
const config = require('../config/env');

const transport = config.isProduction
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        singleLine: true
      }
    };

const logger = pino({
  level: config.logLevel,
  transport,
  base: {
    env: config.nodeEnv
  }
});

module.exports = logger;
