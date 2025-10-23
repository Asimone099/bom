#!/usr/bin/env node

import { DatabaseMigrator } from '../database/migrator';
import DatabaseConnection from '../database/connection';

async function main() {
  const command = process.argv[2];
  const migrator = new DatabaseMigrator();

  try {
    // Test database connection first
    const db = DatabaseConnection.getInstance();
    const isConnected = await db.testConnection();
    
    if (!isConnected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }

    switch (command) {
      case 'up':
        await migrator.runMigrations();
        break;
        
      case 'down':
        await migrator.rollbackLastMigration();
        break;
        
      case 'status':
        await migrator.getMigrationStatus();
        break;
        
      default:
        console.log('Usage: npm run migrate [up|down|status]');
        console.log('');
        console.log('Commands:');
        console.log('  up     - Run pending migrations');
        console.log('  down   - Rollback last migration');
        console.log('  status - Show migration status');
        break;
    }
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    const db = DatabaseConnection.getInstance();
    await db.close();
  }
}

main();