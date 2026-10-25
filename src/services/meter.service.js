'use strict';

const { AppError } = require('../middleware/errorHandler');
const { DEFAULT_CONSUMPTION_LIMIT, MAX_CONSUMPTION_LIMIT } = require('../utils/constants');

function parseNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError(502, 'UPSTREAM_INVALID_RESPONSE', `The portal returned an invalid ${fieldName}.`);
  }
  return parsed;
}

class MeterService {
  constructor({ portalService, networkService }) {
    this.portal = portalService;
    this.network = networkService;
  }

  async listMeters({ query = '', page = 1 }) {
    return this.portal.searchMeters(query, page);
  }

  async getMeter(meterId, requestedLimit = DEFAULT_CONSUMPTION_LIMIT) {
    const search = await this.portal.searchMeters(meterId, 1);
    const meter = search.data.find((item) => item.meterId === meterId);
    if (!meter) throw new AppError(404, 'METER_NOT_FOUND', `Meter "${meterId}" was not found.`);

    const [geo, readings, transformer] = await Promise.all([
      this.portal.getMeterGeo(meterId),
      this.portal.getMeterEnergy(meterId),
      meter.dtCode ? this.network.findTransformer(meter.dtCode) : null
    ]);

    const limit = Math.min(requestedLimit, MAX_CONSUMPTION_LIMIT);
    const recentReadings = readings.slice(-limit).map((reading) => ({
      timestamp: reading.timestamp,
      kwh: parseNumber(reading.kwh, 'kWh reading'),
      kvah: parseNumber(reading.kvah, 'kVAh reading'),
      voltageR: parseNumber(reading.voltR, 'R-phase voltage')
    }));

    return {
      ...meter,
      location: {
        latitude: parseNumber(geo.latitude, 'latitude'),
        longitude: parseNumber(geo.longitude, 'longitude')
      },
      network: {
        transformer: transformer || { code: meter.dtCode },
        feederCode: transformer ? transformer.feederCode : null
      },
      consumption: {
        unit: 'kWh',
        sourceReadingCount: readings.length,
        returnedReadingCount: recentReadings.length,
        readings: recentReadings
      }
    };
  }
}

module.exports = { MeterService, parseNumber };
