import { Op } from 'sequelize';
import { OrbcommData, Route, TransearchData } from '../models/index.js';

const safeDivide = (numerator, denominator) => {
  if (numerator === null || numerator === undefined) return null;
  if (!denominator || Number.isNaN(denominator)) return null;
  return Number((numerator / denominator).toFixed(4));
};

const normalizeWeekFilter = weekInput => {
  const candidates = new Set();
  candidates.add(weekInput);
  const numeric = Number(weekInput);
  if (!Number.isNaN(numeric)) {
    candidates.add(numeric);
  }
  const values = Array.from(candidates);
  if (values.length === 1) {
    return values[0];
  }
  return { [Op.in]: values };
};

export const calculateKPIs = async ({ routeCode, week }) => {
  const weekFilter = normalizeWeekFilter(week);
  const orbcommRecord = await OrbcommData.findOne({
    where: { route_code: routeCode, week: weekFilter }
  });

  if (!orbcommRecord) {
    return null;
  }

  const transearchRecord = await TransearchData.findOne({
    where: { route_code: routeCode, week: weekFilter }
  });

  const sdei = safeDivide(orbcommRecord.available, orbcommRecord.loaded);
  const sdcui = safeDivide(orbcommRecord.used, orbcommRecord.total);
  const stopRatio = safeDivide(orbcommRecord.trips_over_five, orbcommRecord.total_trips);
  const sii = orbcommRecord.avg_stop_duration && stopRatio !== null
    ? Number((orbcommRecord.avg_stop_duration * stopRatio).toFixed(4))
    : null;

  return {
    routeCode,
    week,
    sdei,
    sdcui,
    sii,
    rpi: transearchRecord ? Number(transearchRecord.performance_variation.toFixed(4)) : null,
    raw: {
      available: orbcommRecord.available,
      loaded: orbcommRecord.loaded,
      used: orbcommRecord.used,
      total: orbcommRecord.total,
      avg_stop_duration: orbcommRecord.avg_stop_duration,
      trips_over_five: orbcommRecord.trips_over_five,
      total_trips: orbcommRecord.total_trips
    }
  };
};

export const fetchKpiTrend = async ({ routeCode, weeks }) => {
  const whereClause = { route_code: routeCode };
  if (Array.isArray(weeks) && weeks.length > 0) {
    const normalizedWeeks = weeks.reduce((acc, value) => {
      acc.add(value);
      const numeric = Number(value);
      if (!Number.isNaN(numeric)) {
        acc.add(numeric);
      }
      return acc;
    }, new Set());
    whereClause.week = { [Op.in]: Array.from(normalizedWeeks) };
  }

  const records = await OrbcommData.findAll({
    where: whereClause,
    order: [['week', 'ASC']]
  });

  return records.map(record => ({
    week: record.week,
    sdei: safeDivide(record.available, record.loaded),
    sdcui: safeDivide(record.used, record.total),
    sii: record.avg_stop_duration && record.total_trips
      ? Number((record.avg_stop_duration * safeDivide(record.trips_over_five, record.total_trips)).toFixed(4))
      : null
  }));
};

export const listAvailableRoutes = async () => {
  const routes = await Route.findAll({
    order: [['route_code', 'ASC']]
  });

  const telemetryWeeks = await OrbcommData.findAll({
    attributes: ['route_code', 'week'],
    order: [['route_code', 'ASC'], ['week', 'ASC']]
  });

  const weeksByRoute = telemetryWeeks.reduce((acc, record) => {
    const routeCode = record.route_code;
    if (!acc[routeCode]) {
      acc[routeCode] = new Set();
    }
    acc[routeCode].add(record.week);
    return acc;
  }, {});

  return routes.map(route => {
    const weeksSet = weeksByRoute[route.route_code];
    const weeks = weeksSet
      ? Array.from(weeksSet)
          .sort((a, b) => `${a}`.localeCompare(`${b}`))
          .map(week => `${week}`)
      : [];

    return {
      code: route.route_code,
      origin: route.origin_county,
      destination: route.destination_county,
      mode: route.mode,
      weeks
    };
  });
};
