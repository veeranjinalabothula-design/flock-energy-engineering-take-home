'use strict';

require('dotenv').config();

const { createApp } = require('./app');
const { loadConfig } = require('./config/env');

const config = loadConfig();
const app = createApp({ config });

const server = app.listen(config.port, () => {
  console.info(`Urja Meter API listening on port ${config.port}`);
});

function shutdown(signal) {
  console.info(`${signal} received; closing HTTP server.`);
  server.close((error) => {
    if (error) {
      console.error(error);
      process.exitCode = 1;
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
