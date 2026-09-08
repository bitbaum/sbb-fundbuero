import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { logger } from './utils/logger';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

let db: Pool;
let redis: RedisClientType;

// Simple placeholder scoring combining category + text similarity (ILIKE)
async function findMatches(lostItemId: string, limit = 10) {
  const client = await db.connect();
  try {
    // Fetch the lost item
    const lostRes = await client.query('SELECT * FROM lost_items WHERE id = $1', [lostItemId]);
    if (lostRes.rows.length === 0) return { matches: [] };
    const lost = lostRes.rows[0];

    // Find candidate found items by category and simple ILIKE matches
    const q = `
      SELECT fi.*, 
        (
          (CASE WHEN fi.category = $1 THEN 0.6 ELSE 0 END) +
          (CASE WHEN fi.title ILIKE $2 THEN 0.2 ELSE 0 END) +
          (CASE WHEN fi.description ILIKE $3 THEN 0.2 ELSE 0 END)
        ) AS score
      FROM found_items fi
      WHERE fi.status IN ('reported_found','matched')
      ORDER BY score DESC, fi.found_time DESC
      LIMIT $4
    `;
    const likeTerm = `%${lost.title?.split(' ').slice(0, 3).join(' ') || ''}%`;
    const cand = await client.query(q, [lost.category, likeTerm, likeTerm, limit]);
    return { matches: cand.rows };
  } finally {
    client.release();
  }
}

app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', service: 'matching-service', timestamp: new Date().toISOString() });
});

// Score candidates for a lost item id
app.get('/api/matches/:lostItemId', async (req, res) => {
  try {
    const { lostItemId } = req.params;
    const limit = Math.min(parseInt((req.query.limit as string) || '10', 10), 50);
    const { matches } = await findMatches(lostItemId, limit);
    res.json({ success: true, data: matches });
  } catch (error) {
    logger.error('Failed to get matches', { error });
    res.status(500).json({
      success: false,
      error: { code: 'MATCH_ERROR', message: 'Failed to compute matches' },
    });
  }
});

// Trigger a re-match event for a lost item
app.post('/api/matches/:lostItemId/recompute', async (req, res) => {
  try {
    const { lostItemId } = req.params;
    const { matches } = await findMatches(lostItemId, 10);
    await redis.publish(
      'item_matched',
      JSON.stringify({ type: 'item_matched', lostItemId, matches }),
    );
    res.json({ success: true, data: { count: matches.length } });
  } catch (error) {
    logger.error('Failed to recompute matches', { error });
    res.status(500).json({
      success: false,
      error: { code: 'RECOMPUTE_ERROR', message: 'Failed to recompute matches' },
    });
  }
});

const start = async () => {
  try {
    const port = Number(process.env.PORT || 3002);
    const pgConf = {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 5432),
      database: process.env.DB_NAME || 'sbb_fundbuero',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
    };
    db = new Pool(pgConf);
    const test = await db.query('SELECT NOW()');
    logger.info('DB OK', { now: test.rows[0].now });

    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redis = createClient({ url: redisUrl });
    redis.on('error', (err) => logger.error('Redis error', { err }));
    await redis.connect();
    logger.info('Redis connected');

    app.listen(port, () => logger.info(`Matching service listening on ${port}`));
  } catch (error) {
    logger.error('Failed to start matching service', { error });
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  try {
    await redis?.quit();
  } catch (error) {
    // Best-effort on the way down — a failed quit must not block shutdown, but
    // swallowing it silently is how a connection leak stays invisible.
    logger.warn('Redis quit failed during shutdown', { error });
  }
  await db?.end();
  process.exit(0);
});

start();
