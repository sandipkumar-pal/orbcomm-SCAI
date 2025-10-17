import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { calculateKPIs, fetchKpiTrend } from '../services/kpiService.js';

const router = Router();

router.get('/:routeCode/:week', authenticate, authorize(['admin', 'analyst', 'business']), async (req, res) => {
  try {
    const { routeCode, week } = req.params;
    const data = await calculateKPIs({ routeCode, week });
    if (!data) {
      return res.status(404).json({ message: 'No KPI data found' });
    }
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

router.post('/:routeCode/trend', authenticate, authorize(['admin', 'analyst', 'business']), async (req, res) => {
  try {
    const { routeCode } = req.params;
    const { weeks } = req.body;
    const data = await fetchKpiTrend({ routeCode, weeks });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

export default router;
