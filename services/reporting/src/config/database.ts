import { Pool, PoolConfig } from 'pg';
import { logger } from '../utils/logger';

const buildConfig = (): PoolConfig => {
  const fromDiscrete: PoolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'sbb_fundbuero',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };

  const url = process.env.DATABASE_URL;
  if (!url) return fromDiscrete;

  try {
    const u = new URL(url);
    const cfg: PoolConfig = {
      host: u.hostname,
      port: u.port ? parseInt(u.port) : 5432,
      database: u.pathname ? u.pathname.replace(/^\//, '') : undefined,
      user: decodeURIComponent(u.username || ''),
      password: decodeURIComponent(u.password || ''),
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
    return cfg;
  } catch (e) {
    logger.warn('Failed to parse DATABASE_URL, falling back to discrete DB_* vars', { error: e });
    return fromDiscrete;
  }
};

export const pool = new Pool(buildConfig());

pool.on('connect', (client) => {
  const pid = (client as any).processID;
  logger.debug('New client connected', { pid });
});

pool.on('error', (err) => {
  logger.error('Database pool error', err);
  process.exit(-1);
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    logger.info('Database connected successfully', { timestamp: result.rows[0].now });
  } catch (error) {
    logger.error('Failed to connect to database', error);
    throw error;
  }
};
