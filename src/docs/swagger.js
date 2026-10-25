'use strict';

const path = require('node:path');
const swaggerUi = require('swagger-ui-express');
const openapi = require(path.resolve(__dirname, '../../openapi.json'));

function mountSwagger(app) {
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi));
  app.get('/openapi.json', (_req, res) => res.json(openapi));
}

module.exports = { mountSwagger };
