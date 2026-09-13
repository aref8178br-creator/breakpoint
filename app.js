const env = require('./config/env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');
const path = require('path');

const logger = require('./utils/logger');
const { db, initDatabase } = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

const hotelRoutes = require('./routes/hotelRoutes');
const roomRoutes = require('./routes/roomRoutes');
const amenityRoutes = require('./routes/amenityRoutes');
const statsRoutes = require('./routes/statsRoutes');

initDatabase();

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors(
    env.NODE_ENV === 'production'
      ? { origin: env.allowedOrigins }
      : {}
  )
);
app.use(compression());
app.use(express.json({ limit: '100kb' }));

app.use(
  pinoHttp({
    logger,
    autoLogging: { ignore: (req) => req.url === '/api/health' }
  })
);

app.use('/api/', apiLimiter);

app.get('/api/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(503).json({ status: 'error' });
  }
});

app.use('/api/hotels', hotelRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/stats', statsRoutes);

app.use('/api', notFoundHandler);

app.use(
  express.static(path.join(__dirname, 'frontend'), {
    maxAge: env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true
  })
);
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.use(errorHandler);

module.exports = { app, db };
