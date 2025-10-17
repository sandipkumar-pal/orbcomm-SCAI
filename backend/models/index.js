import { DataTypes } from 'sequelize';
import { sequelize } from '../config/config.js';

export const Route = sequelize.define('Route', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  route_code: { type: DataTypes.STRING, unique: true },
  origin_county: DataTypes.STRING,
  destination_county: DataTypes.STRING,
  mode: DataTypes.STRING
}, { tableName: 'routes', underscored: true });

export const OrbcommData = sequelize.define('OrbcommData', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  route_code: { type: DataTypes.STRING, references: { model: 'routes', key: 'route_code' } },
  week: DataTypes.STRING,
  available: DataTypes.FLOAT,
  loaded: DataTypes.FLOAT,
  used: DataTypes.FLOAT,
  total: DataTypes.FLOAT,
  avg_stop_duration: DataTypes.FLOAT,
  trips_over_five: DataTypes.INTEGER,
  total_trips: DataTypes.INTEGER,
  latitude: DataTypes.FLOAT,
  longitude: DataTypes.FLOAT,
  event_timestamp: DataTypes.DATE
}, { tableName: 'orbcomm_data', underscored: true });

export const TransearchData = sequelize.define('TransearchData', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  route_code: { type: DataTypes.STRING },
  week: DataTypes.STRING,
  performance_variation: DataTypes.FLOAT
}, { tableName: 'transearch_data', underscored: true });

export const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true },
  password_hash: DataTypes.STRING,
  role: { type: DataTypes.ENUM('admin', 'analyst', 'business'), defaultValue: 'business' }
}, { tableName: 'users', underscored: true });

Route.hasMany(OrbcommData, { foreignKey: 'route_code', sourceKey: 'route_code' });
OrbcommData.belongsTo(Route, { foreignKey: 'route_code', targetKey: 'route_code' });

Route.hasMany(TransearchData, { foreignKey: 'route_code', sourceKey: 'route_code' });
TransearchData.belongsTo(Route, { foreignKey: 'route_code', targetKey: 'route_code' });

export { sequelize } from '../config/config.js';
