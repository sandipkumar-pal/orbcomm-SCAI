import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@db:5432/scci';

export const sequelize = new Sequelize(databaseUrl, {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' ? { ssl: { require: false } } : {}
});

export default {
  sequelize
};
