import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ParquetReader } from 'parquetjs-lite';

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

export const loadCountyPairMoveData = async (options = {}) =>
  loadParquetRows('county_pair_move_data_06037-04019.parquet', options);

export const loadTransearchSampleData = async (options = {}) =>
  loadParquetRows('transearch_data_sample.parquet', options);

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

export default {
  loadCountyPairMoveData,
  loadTransearchSampleData,
  summarizeDataset
};
