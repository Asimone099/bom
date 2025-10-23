import DatabaseConnection from './connection';
import { DatabaseMigrator } from './migrator';
import { autoMigrate } from './config';

export class DatabaseInitializer {
  private db: DatabaseConnection;
  private migrator: DatabaseMigrator;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.migrator = new DatabaseMigrator();
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing database...');

    try {
      // Test connection
      const isConnected = await this.db.testConnection();
      if (!isConnected) {
        throw new Error('Database connection failed');
      }

      // Run migrations if auto-migrate is enabled
      if (autoMigrate) {
        console.log('🔄 Auto-migrate enabled, running migrations...');
        await this.migrator.runMigrations();
      } else {
        console.log('ℹ️  Auto-migrate disabled, skipping migrations');
        await this.migrator.getMigrationStatus();
      }

      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.testConnection();
      
      // Check if core tables exist
      const tablesResult = await this.db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'projects', 'bom_items', 'roles')
      `);

      const expectedTables = ['users', 'projects', 'bom_items', 'roles'];
      const existingTables = tablesResult.rows.map((row: any) => row.table_name);
      const missingTables = expectedTables.filter(table => !existingTables.includes(table));

      if (missingTables.length > 0) {
        console.warn('⚠️  Missing database tables:', missingTables);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  async getStats(): Promise<any> {
    try {
      const stats = await this.db.query(`
        SELECT 
          (SELECT COUNT(*) FROM users) as users_count,
          (SELECT COUNT(*) FROM projects) as projects_count,
          (SELECT COUNT(*) FROM bom_items) as bom_items_count,
          (SELECT COUNT(*) FROM roles) as roles_count
      `);

      return stats.rows[0];
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const dbInitializer = new DatabaseInitializer();