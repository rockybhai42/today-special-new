const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  mediaBaseUrl: process.env.MEDIA_BASE_URL || 'http://localhost:5000',
  // Lets the test suite redirect uploads to a throwaway directory instead of
  // writing into the real uploads/ folder used by the dev server.
  uploadsDir: process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, '..', 'uploads'),
  frontendUrls: (process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
};

module.exports = config;
