import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { sequelize } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import kpiRoutes from './routes/kpiRoutes.js';
import mapRoutes from './routes/mapRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/auth', authRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/map', mapRoutes);

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync();
    app.listen(PORT, () => {
      console.log(`Backend listening on port ${PORT}`);
    });
  } catch (error) {
    console.error('Unable to start server:', error);
    process.exit(1);
  }
})();
