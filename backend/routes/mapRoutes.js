import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { Route, OrbcommData } from '../models/index.js';

const router = Router();

router.get('/:routeCode', authenticate, authorize(['admin', 'analyst', 'business']), async (req, res) => {
  try {
    const { routeCode } = req.params;
    const route = await Route.findOne({ where: { route_code: routeCode } });
    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const telemetryRecords = await OrbcommData.findAll({
      where: { route_code: routeCode },
      order: [['event_timestamp', 'ASC']]
    });

    const telemetry = telemetryRecords.map(point => ({
      id: point.id,
      latitude: point.latitude,
      longitude: point.longitude,
      event_timestamp: point.event_timestamp
    }));

    res.json({
      route: {
        code: route.route_code,
        origin: route.origin_county,
        destination: route.destination_county,
        mode: route.mode
      },
      telemetry
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
