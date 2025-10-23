const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'bom_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

async function runMigrations() {
  const pool = new Pool(config);
  
  try {
    console.log('🔄 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    for (const file of migrationFiles) {
      console.log(`🔄 Running migration: ${file}`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      try {
        await pool.query(sql);
        console.log(`✅ Migration ${file} completed successfully`);
      } catch (error) {
        console.error(`❌ Migration ${file} failed:`, error.message);
        // Continue with other migrations
      }
    }

    console.log('🎉 All migrations completed!');
    
    // Test query
    const result = await pool.query('SELECT COUNT(*) as count FROM bom_items');
    console.log(`📊 BOM items in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };