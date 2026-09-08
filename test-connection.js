const { Client } = require('pg');
const redis = require('redis');

async function testConnections() {
  console.log('Testing PostgreSQL connection...');

  const pgClient = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5433/sbb_fundbuero',
  });

  try {
    await pgClient.connect();
    const result = await pgClient.query('SELECT NOW() as now, COUNT(*) as user_count FROM users');
    console.log('PostgreSQL connected:', result.rows[0]);
    await pgClient.end();
  } catch (error) {
    console.error('PostgreSQL connection failed:', error.message);
  }

  console.log('\nTesting Redis connection...');

  const redisClient = redis.createClient({ url: 'redis://localhost:6380' });

  try {
    await redisClient.connect();
    await redisClient.set('test', 'hello');
    const value = await redisClient.get('test');
    console.log('Redis connected, test value:', value);
    await redisClient.disconnect();
  } catch (error) {
    console.error('Redis connection failed:', error.message);
  }
}

testConnections();
