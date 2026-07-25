const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const storageService = require('./services/storageService');

const authRoutes = require('./routes/authRoutes');
const specialRoutes = require('./routes/specialRoutes');
const publicRoutes = require('./routes/publicRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(
  helmet({
    // Media is served here and consumed cross-origin by TV players on
    // other devices — the default same-origin policy would block that.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
// The dashboard's auth/CRUD routes are restricted to known origins. The
// playlist + media routes are read by TV players on arbitrary devices/
// origins (any Smart TV, Mini PC, etc. on the network) and must stay open —
// they carry no auth and expose nothing sensitive.
const restrictedCors = cors({ origin: config.frontendUrls });
const openCors = cors();

app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));
}

app.use(
  '/uploads',
  openCors,
  express.static(storageService.UPLOADS_ROOT, {
    etag: true,
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cache-Control', 'public, max-age=604800'),
  })
);

app.use('/api/auth', restrictedCors, authRoutes);
app.use('/api/specials', restrictedCors, apiLimiter, specialRoutes);
app.use('/', openCors, publicRoutes);

app.use(notFound);
app.use(errorHandler);

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
