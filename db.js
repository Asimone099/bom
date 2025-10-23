// Database connection utility for Vercel
import { Pool } from 'pg';

let pool;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('Database connection string not found. Please set POSTGRES_URL or DATABASE_URL environment variable.');
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  
  return pool;
}

export async function query(text, params) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const pool = getPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}