const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');

const config = require('./config');
const logger = require('./lib/logger');
const requestId = require('./middleware/requestId');
const { identifyActor } = require('./middleware/auth');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const ordersRoutes = require('./modules/orders/orders.routes');
const returnsRoutes = require('./modules/returns/returns.routes');
const reportsRoutes = require('./modules/reports/reports.routes');

const app = express();

// Trust the first proxy hop (needed on most PaaS/hosts for req.ip and rate-limit
// keys to reflect the real client, not the load balancer).
app.set('trust proxy', 1);

app.use(helmet());
app.use(
  cors({
    origin: config.ALLOWED_ORIGINS.length > 0 ? config.ALLOWED_ORIGINS : false,
    credentials: true,
  })
);
app.use(express.json({ limit: '32kb' })); // small limit — this API never needs large payloads
app.use(requestId);
app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: req.id }) }));
app.use(identifyActor); // attaches req.actor to every request, before routes

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/orders', ordersRoutes);
app.use('/api/returns', returnsRoutes);
app.use('/api/reports', reportsRoutes);

app.use(notFoundHandler);
app.use(errorHandler); // must be registered last

module.exports = app;
