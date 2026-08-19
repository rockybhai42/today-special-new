const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');

const config = require('./config/env');
const storageService = require('./services/storageService');

const authRoutes = require('./routes/authRoutes');
const specialRoutes = require('./routes/specialRoutes');
const publicRoutes = require('./routes/publicRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const app = express();

// Render (and most hosts) sit the app behind their own reverse proxy, which
// adds X-Forwarded-For. Without this, express-rate-limit refuses to trust
// that header (ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) since a client could
// otherwise spoof it — trusting exactly one hop here is safe because that
// header is set by Render's own edge, not directly by the client.
app.set('trust proxy', 1);

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

app.get('/health', openCors, (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', restrictedCors, authRoutes);
app.use('/api/specials', restrictedCors, apiLimiter, specialRoutes);
app.use('/', openCors, publicRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
