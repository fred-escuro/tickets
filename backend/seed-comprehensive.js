const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 Starting comprehensive database seeding...\n');

const scripts = [
  { name: 'RBAC/ABAC', file: 'src/scripts/seedRbacAbac.ts' },
  { name: 'Basic Data (Users, Tickets, etc.)', file: 'src/scripts/resetAndSeed.ts' },
  { name: 'Task Metadata', file: 'src/scripts/seedTaskMeta.ts' },
  { name: 'Menu Items', file: 'src/scripts/seedMenu.ts' },
  { name: 'Settings', file: 'src/scripts/seedSettings.ts' },
  { name: 'Auto-Assignment', file: 'src/scripts/seedAutoAssignment.ts' },
  { name: 'Auto-Response Templates', file: 'src/scripts/seedAutoResponseTemplates.ts' }
];

try {
  for (const script of scripts) {
    console.log(`📋 Running ${script.name}...`);
    execSync(`npx ts-node ${script.file}`, { 
      stdio: 'inherit',
      cwd: __dirname 
    });
    console.log(`✅ ${script.name} completed\n`);
  }
  
  console.log('🎉 Comprehensive seeding completed successfully!');
  console.log('\n🔑 Available demo accounts:');
  console.log('Admin: admin@tickethub.com / password123');
  console.log('Manager: manager@tickethub.com / password123');
  console.log('Agent: agent@tickethub.com / password123');
  console.log('Developer: developer@tickethub.com / password123');
  console.log('Customer: customer@tickethub.com / password123');
  console.log('User: user@tickethub.com / password123');
  
} catch (error) {
  console.error('❌ Comprehensive seeding failed:', error.message);
  process.exit(1);
}
