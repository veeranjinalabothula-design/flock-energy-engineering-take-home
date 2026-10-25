'use strict';

const crypto = require('node:crypto');
const express = require('express');
const { loadConfig } = require('./config/env');
const { UrjaAuthService } = require('./services/urjaAuth.service');
const { UrjaClient } = require('./clients/urja.client');
const { UrjaPortalService } = require('./services/urjaPortal.service');
const { MeterService } = require('./services/meter.service');
const { NetworkService } = require('./services/network.service');
const { createMeterController } = require('./controllers/meter.controller');
const { createNetworkController } = require('./controllers/network.controller');
const { createMeterRouter } = require('./routes/meter.routes');
const { createNetworkRouter } = require('./routes/network.routes');
const { router: healthRouter } = require('./routes/health.routes');
const { requestLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { mountSwagger } = require('./docs/swagger');

function createApp({ config = loadConfig(), services } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    req.id = crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.use(requestLogger);
  app.use(express.json({ limit: '32kb' }));

  let meterService;
  let networkService;
  if (services) {
    ({ meterService, networkService } = services);
  } else {
    const auth = new UrjaAuthService({
      baseUrl: config.urjaBaseUrl,
      username: config.urjaUsername,
      password: config.urjaPassword,
      timeoutMs: config.requestTimeoutMs
    });
    const client = new UrjaClient({
      baseUrl: config.urjaBaseUrl,
      auth,
      timeoutMs: config.requestTimeoutMs
    });
    const portalService = new UrjaPortalService({
      client,
      cacheTtlMs: config.cacheTtlMs
    });
    networkService = new NetworkService({ portalService });
    meterService = new MeterService({ portalService, networkService });
  }

  app.use('/api/meters', createMeterRouter(createMeterController(meterService)));
  app.use('/api/network', createNetworkRouter(createNetworkController(networkService)));
  app.use('/api/health', healthRouter);
  mountSwagger(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
