import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseConfig {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  connectionString?: string;
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

// Create database configuration based on environment
function createDatabaseConfig(): DatabaseConfig {
  // If DATABASE_URL is provided (Heroku), use it
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
      ssl: isProduction ? { rejectUnauthorized: false } : false
    };
  }
  
  // Otherwise use individual environment variables (local development)
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'bom_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    ssl: process.env.DB_SSL === 'true'
  };
}

export const databaseConfig: DatabaseConfig = createDatabaseConfig();

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';

// Logging configuration
export const logQueries = process.env.LOG_QUERIES === 'true' || isDevelopment;
export const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

// Migration configuration
export const autoMigrate = process.env.AUTO_MIGRATE === 'true';
export const migrationsPath = process.env.MIGRATIONS_PATH || './src/database/migrations';

// Connection pool configuration
export const poolConfig = {
  min: parseInt(process.env.DB_POOL_MIN || '2'),
  max: databaseConfig.max,
  acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT || '30000'),
  destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT || '5000'),
  reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL || '1000'),
  createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL || '200')
};

// Validation
export function validateConfig(): void {
  // If DATABASE_URL is provided, we don't need individual variables
  if (process.env.DATABASE_URL) {
    console.log('✅ Using DATABASE_URL for database connection');
    return;
  }
  
  // Otherwise validate individual environment variables
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('   Using default values for development');
  }
  
  if (databaseConfig.port && (isNaN(databaseConfig.port) || databaseConfig.port < 1 || databaseConfig.port > 65535)) {
    throw new Error('DB_PORT must be a valid port number');
  }
  
  if (databaseConfig.max < 1) {
    throw new Error('DB_POOL_MAX must be at least 1');
  }
}