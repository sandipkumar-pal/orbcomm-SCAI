import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  loadCountyPairMoveData,
  loadTransearchSampleData,
  summarizeDataset,
  ingestAllDatasets
} from '../services/dataIngestionService.js';

const router = express.Router();

router.get('/preview', authenticate, authorize(['admin', 'analyst']), async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 10;

    const [countySample, transearchSample] = await Promise.all([
      loadCountyPairMoveData({ limit }),
      loadTransearchSampleData({ limit })
    ]);

    return res.json({
      countyPairMoves: {
        limit,
        rows: countySample
      },
      transearch: {
        limit,
        rows: transearchSample
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.get('/metadata', authenticate, authorize(['admin', 'analyst']), async (req, res) => {
  try {
    const [countyMeta, transearchMeta] = await Promise.all([
      summarizeDataset('county_pair_move_data_06037-04019.parquet', {
        sampleSize: Number.parseInt(req.query.sampleSize, 10) || 5
      }),
      summarizeDataset('transearch_data_sample.parquet', {
        sampleSize: Number.parseInt(req.query.sampleSize, 10) || 5
      })
    ]);

    return res.json({
      countyPairMoves: countyMeta,
      transearch: transearchMeta
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/load', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { truncate = false, files = {} } = req.body || {};
    const results = await ingestAllDatasets({ truncate: Boolean(truncate), files });
    return res.status(201).json({
      message: 'Datasets ingested successfully',
      truncate: Boolean(truncate),
      results
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
