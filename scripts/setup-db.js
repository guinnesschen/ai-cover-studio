#!/usr/bin/env node

const { execSync } = require('child_process');

console.log('🚀 Setting up database...\n');

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Push database schema
  console.log('\n🗄️  Pushing database schema...');
  execSync('npx prisma db push', { stdio: 'inherit' });

  console.log('\n✅ Database setup complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Make sure your environment variables are set');
  console.log('2. Run `npm run dev` to start the development server');
  console.log('3. Visit http://localhost:3000');
} catch (error) {
  console.error('\n❌ Database setup failed:', error.message);
  process.exit(1);
}