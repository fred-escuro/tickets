import { PrismaClient } from '@prisma/client';
import { seedTicketSystem } from './seedTicketSystem';
import { seedRbacAbac } from './seedRbacAbac';
import { seedMenu } from './seedMenu';

const prisma = new PrismaClient();

async function migrateEnhanced() {
  console.log('🔄 Running enhanced ticket system migration...');

  try {
    // This script will be run after the Prisma migration
    // It seeds core data sets
    console.log('👥 Seeding users (basic)...');
    try { await import('./seed'); } catch {}
    console.log('🔐 Seeding RBAC/ABAC...');
    await seedRbacAbac();
    console.log('🎫 Seeding ticket system (categories, priorities, statuses, templates, workflows)...');
    await seedTicketSystem();
    console.log('📋 Seeding menu items and permissions...');
    await seedMenu();
    console.log('✅ Enhanced ticket system migration and seeding completed');
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateEnhanced()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateEnhanced };
