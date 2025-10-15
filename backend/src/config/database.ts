import knex from 'knex';
import knexConfig from '../../knexfile';

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

export const db = knex(config);

db.raw('SELECT 1')
  .then(() => console.log('Database connected'))
  .catch((err) => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });