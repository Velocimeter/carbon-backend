import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Only load .env in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Debug connection info
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DATABASE_SSL_ENABLED:', process.env.DATABASE_SSL_ENABLED);

const ssl =
  process.env.DATABASE_SSL_ENABLED === '1'
    ? {
        require: true,
        ca: process.env.CARBON_BACKEND_SQL_CERTIFICATION,
        ciphers: [
          'ECDHE-RSA-AES128-SHA256',
          'DHE-RSA-AES128-SHA256',
          'AES128-GCM-SHA256',
          '!RC4',
          'HIGH',
          '!MD5',
          '!aNULL',
        ].join(':'),
        honorCipherOrder: true,
      }
    : null;

console.log('Using SSL configuration:', ssl ? 'enabled' : 'disabled');

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['**/*.entity.ts'],
  migrations: ['dist/migrations/*.js'],
  ssl,
  synchronize: false,
});
