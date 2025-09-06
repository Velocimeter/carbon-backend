import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

// Load .env file (always for scripts, only in development for app)
if (process.env.NODE_ENV !== 'production' || process.argv.includes('ts-node')) {
  dotenv.config({ override: true });
}

// Debug connection info



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



export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  ssl,
  synchronize: false,
});
