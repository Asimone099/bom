#!/usr/bin/env node

import { dbInitializer, RepositoryFactory } from '../database';

async function testORM() {
  console.log('🧪 Testing ORM Configuration...\n');

  try {
    // Initialize database
    await dbInitializer.initialize();

    // Test health check
    const isHealthy = await dbInitializer.healthCheck();
    console.log(`🏥 Database health: ${isHealthy ? '✅ Healthy' : '❌ Unhealthy'}`);

    // Get database stats
    const stats = await dbInitializer.getStats();
    if (stats) {
      console.log('\n📊 Database Statistics:');
      console.log(`   Users: ${stats.users_count}`);
      console.log(`   Projects: ${stats.projects_count}`);
      console.log(`   BOM Items: ${stats.bom_items_count}`);
      console.log(`   Roles: ${stats.roles_count}`);
    }

    // Test repositories
    console.log('\n🔧 Testing Repositories...');

    // Test User Repository
    const userRepo = RepositoryFactory.getUserRepository();
    const users = await userRepo.findAll();
    console.log(`   User Repository: ✅ Found ${users.length} users`);

    // Test Project Repository
    const projectRepo = RepositoryFactory.getProjectRepository();
    const projects = await projectRepo.findAll();
    console.log(`   Project Repository: ✅ Found ${projects.length} projects`);

    // Test BOM Repository
    const bomRepo = RepositoryFactory.getBOMRepository();
    if (projects.length > 0) {
      const bomItems = await bomRepo.findByProject(projects[0].id);
      console.log(`   BOM Repository: ✅ Found ${bomItems.length} BOM items in first project`);
    } else {
      console.log(`   BOM Repository: ✅ No projects to test with`);
    }

    console.log('\n🎉 ORM Configuration Test Completed Successfully!');

  } catch (error) {
    console.error('\n❌ ORM Test Failed:', error);
    process.exit(1);
  }
}

testORM();