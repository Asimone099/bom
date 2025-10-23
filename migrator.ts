import fs from 'fs';
import path from 'path';
import DatabaseConnection from './connection';

interface Migration {
  id: number;
  filename: string;
  sql: string;
}

export class DatabaseMigrator {
  private db: DatabaseConnection;
  private migrationsPath: string;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.migrationsPath = path.join(__dirname, 'migrations');
  }

  async createMigrationsTable(): Promise<void> {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await this.db.query(createTableQuery);
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.db.query(
      'SELECT filename FROM migrations ORDER BY id'
    );
    return result.rows.map((row: any) => row.filename);
  }

  async getMigrationFiles(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const filePath = path.join(this.migrationsPath, filename);
      const sql = fs.readFileSync(filePath, 'utf8');
      const id = parseInt(filename.split('_')[0]);
      
      return { id, filename, sql };
    });
  }

  async runMigrations(): Promise<void> {
    console.log('🔄 Starting database migrations...');
    
    await this.createMigrationsTable();
    
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.filename)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`⚡ Running migration: ${migration.filename}`);
        
        await this.db.transaction(async (client) => {
          // Execute migration SQL
          await client.query(migration.sql);
          
          // Record migration as executed
          await client.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [migration.filename]
          );
        });
        
        console.log(`✅ Migration completed: ${migration.filename}`);
      } catch (error) {
        console.error(`❌ Migration failed: ${migration.filename}`, error);
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully');
  }

  async rollbackLastMigration(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    
    if (executedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return;
    }

    const lastMigration = executedMigrations[executedMigrations.length - 1];
    
    await this.db.transaction(async (client) => {
      // Remove migration record
      await client.query(
        'DELETE FROM migrations WHERE filename = $1',
        [lastMigration]
      );
    });

    console.log(`Rolled back migration: ${lastMigration}`);
    console.log('⚠️  Note: This only removes the migration record. Manual rollback of schema changes may be required.');
  }

  async getMigrationStatus(): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    const allMigrations = await this.getMigrationFiles();
    
    console.log('\n📊 Migration Status:');
    console.log('==================');
    
    for (const migration of allMigrations) {
      const status = executedMigrations.includes(migration.filename) ? '✅' : '⏳';
      console.log(`${status} ${migration.filename}`);
    }
    
    const pendingCount = allMigrations.length - executedMigrations.length;
    console.log(`\nExecuted: ${executedMigrations.length}`);
    console.log(`Pending: ${pendingCount}`);
  }
}