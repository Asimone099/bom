import { Pool, PoolClient } from 'pg';
import { databaseConfig, logQueries, validateConfig } from './config';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    // Validate configuration before creating pool
    validateConfig();
    
    this.pool = new Pool(databaseConfig);
    
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });

    this.pool.on('connect', (client) => {
      if (logQueries) {
        console.log('✅ Connected to PostgreSQL database');
      }
    });

    this.pool.on('acquire', (client) => {
      if (logQueries) {
        console.log('🔗 Database client acquired from pool');
      }
    });

    this.pool.on('release', (err, client) => {
      if (logQueries) {
        console.log('🔓 Database client released to pool');
      }
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      if (logQueries) {
        console.log('🔍 Executing query:', text);
        if (params && params.length > 0) {
          console.log('📋 Parameters:', params);
        }
      }
      
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      if (logQueries) {
        console.log(`⚡ Query completed in ${duration}ms, returned ${result.rowCount} rows`);
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
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

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT NOW()');
      console.log('Database connection test successful:', result.rows[0]);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}

export default DatabaseConnection;