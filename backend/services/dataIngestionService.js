import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ParquetReader } from 'parquetjs-lite';

import { sequelize, Route, OrbcommData, TransearchData } from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../../data');

const resolveDataPath = (filePath) => {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }

  const rootDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : DEFAULT_DATA_DIR;
  return path.resolve(rootDir, filePath);
};

const assertFileExists = (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Data file not found: ${filePath}`);
  }
};

const loadParquetRows = async (filePath, { limit } = {}) => {
  const resolvedPath = resolveDataPath(filePath);
  assertFileExists(resolvedPath);

  const reader = await ParquetReader.openFile(resolvedPath);
  const cursor = reader.getCursor();
  const rows = [];

  try {
    let record = await cursor.next();
    while (record) {
      rows.push(record);

      if (limit && rows.length >= limit) {
        break;
      }

      record = await cursor.next();
    }
  } finally {
    await reader.close();
  }

  return rows;
};

const defaultCountyFile = 'county_pair_move_data_06037-04019.parquet';
const defaultTransearchFile = 'transearch_data_sample.parquet';

export const loadCountyPairMoveData = async (options = {}) => {
  const { filePath = defaultCountyFile, ...rest } = options;
  return loadParquetRows(filePath, rest);
};

export const loadTransearchSampleData = async (options = {}) => {
  const { filePath = defaultTransearchFile, ...rest } = options;
  return loadParquetRows(filePath, rest);
};

export const summarizeDataset = async (filePath, { sampleSize = 5 } = {}) => {
  const resolvedPath = resolveDataPath(filePath);
  assertFileExists(resolvedPath);

  const reader = await ParquetReader.openFile(resolvedPath);
  const schema = reader.getSchema();
  const metadata = reader.metadata.key_value_metadata?.reduce((acc, entry) => ({
    ...acc,
    [entry.key]: entry.value
  }), {});

  const cursor = reader.getCursor();
  const sample = [];

  try {
    let record = await cursor.next();
    while (record && sample.length < sampleSize) {
      sample.push(record);
      record = await cursor.next();
    }
  } finally {
    await reader.close();
  }

  return {
    path: resolvedPath,
    fields: Object.keys(schema.fields),
    metadata,
    sample
  };
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const toStringOrNull = (value) => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const normalizeCountyRecord = (record) => {
  const routeCode = record.route_code || record.routeCode || record.route || null;

  return {
    route: {
      route_code: routeCode,
      origin_county: record.origin_county || record.originCounty || null,
      destination_county: record.destination_county || record.destinationCounty || null,
      mode: record.mode || record.transport_mode || null
    },
    orbcomm: {
      route_code: routeCode,
      week: toStringOrNull(record.week),
      available: toNumber(record.available),
      loaded: toNumber(record.loaded),
      used: toNumber(record.used),
      total: toNumber(record.total),
      avg_stop_duration: toNumber(record.avg_stop_duration ?? record.avgStopDuration),
      trips_over_five: toNumber(record.trips_over_five ?? record.tripsOverFive),
      total_trips: toNumber(record.total_trips ?? record.totalTrips),
      latitude: toNumber(record.latitude),
      longitude: toNumber(record.longitude),
      event_timestamp: toDate(record.event_timestamp ?? record.eventTimestamp)
    }
  };
};

const normalizeTransearchRecord = (record) => ({
  route_code: record.route_code || record.routeCode || record.route || null,
  week: toStringOrNull(record.week),
  performance_variation: toNumber(record.performance_variation ?? record.performanceVariation)
});

const filterValidRoutes = (records) => {
  const deduped = new Map();

  records.forEach((entry) => {
    const code = entry.route.route_code;
    if (!code) return;

    deduped.set(code, {
      route_code: code,
      origin_county: entry.route.origin_county,
      destination_county: entry.route.destination_county,
      mode: entry.route.mode
    });
  });

  return Array.from(deduped.values());
};

export const ingestCountyPairMoveData = async ({ filePath = defaultCountyFile, truncate = false } = {}) => {
  const rows = await loadParquetRows(filePath, {});
  const normalized = rows.map(normalizeCountyRecord);

  return sequelize.transaction(async (transaction) => {
    if (truncate) {
      await OrbcommData.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true, transaction });
    }

    const routes = filterValidRoutes(normalized);
    if (routes.length > 0) {
      await Route.bulkCreate(routes, {
        transaction,
        updateOnDuplicate: ['origin_county', 'destination_county', 'mode'],
        conflictAttributes: ['route_code']
      });
    }

    const orbcommRows = normalized
      .map((entry) => entry.orbcomm)
      .filter((entry) => entry.route_code && entry.week);

    if (orbcommRows.length > 0) {
      await OrbcommData.bulkCreate(orbcommRows, {
        transaction,
        updateOnDuplicate: [
          'available',
          'loaded',
          'used',
          'total',
          'avg_stop_duration',
          'trips_over_five',
          'total_trips',
          'latitude',
          'longitude',
          'event_timestamp'
        ],
        conflictAttributes: ['route_code', 'week']
      });
    }

    return {
      routesImported: routes.length,
      orbcommRecordsImported: orbcommRows.length
    };
  });
};

export const ingestTransearchSampleData = async ({ filePath = defaultTransearchFile, truncate = false } = {}) => {
  const rows = await loadParquetRows(filePath, {});
  const normalized = rows
    .map(normalizeTransearchRecord)
    .filter((entry) => entry.route_code && entry.week);

  return sequelize.transaction(async (transaction) => {
    if (truncate) {
      await TransearchData.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true, transaction });
    }

    if (normalized.length > 0) {
      await TransearchData.bulkCreate(normalized, {
        transaction,
        updateOnDuplicate: ['performance_variation'],
        conflictAttributes: ['route_code', 'week']
      });
    }

    return {
      transearchRecordsImported: normalized.length
    };
  });
};

export const ingestAllDatasets = async ({ truncate = false, files = {} } = {}) => {
  const [countyResult, transearchResult] = await Promise.all([
    ingestCountyPairMoveData({ filePath: files.countyPairMoves || defaultCountyFile, truncate }),
    ingestTransearchSampleData({ filePath: files.transearch || defaultTransearchFile, truncate })
  ]);

  return {
    county: countyResult,
    transearch: transearchResult
  };
};

export default {
  loadCountyPairMoveData,
  loadTransearchSampleData,
  summarizeDataset,
  ingestCountyPairMoveData,
  ingestTransearchSampleData,
  ingestAllDatasets
};
