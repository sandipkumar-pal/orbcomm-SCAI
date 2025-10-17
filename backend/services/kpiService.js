import { Op } from 'sequelize';
import { OrbcommData, TransearchData } from '../models/index.js';

const safeDivide = (numerator, denominator) => {
  if (numerator === null || numerator === undefined) return null;
  if (!denominator || Number.isNaN(denominator)) return null;
  return Number((numerator / denominator).toFixed(4));
};

export const calculateKPIs = async ({ routeCode, week }) => {
  const orbcommRecord = await OrbcommData.findOne({
    where: { route_code: routeCode, week }
  });

  if (!orbcommRecord) {
    return null;
  }

  const transearchRecord = await TransearchData.findOne({
    where: { route_code: routeCode, week }
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
    whereClause.week = { [Op.in]: weeks };
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
