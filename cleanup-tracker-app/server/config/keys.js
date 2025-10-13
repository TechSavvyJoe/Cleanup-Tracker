const config = require('./env');

let legacyJwtSecret = config.jwtLegacySecret;
if (!legacyJwtSecret) {
  if (config.isProduction) {
    throw new Error('JWT_SECRET must be set in production environment');
  }
  legacyJwtSecret = 'dev-secret-change-in-production';
}

module.exports = {
  mongoURI: config.mongoUri,
  jwtSecret: legacyJwtSecret
};
