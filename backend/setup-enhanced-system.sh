#!/bin/bash

# Enhanced Ticket System Setup Script
echo "🚀 Setting up Enhanced Ticket System..."

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the backend directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Reset database and apply new schema
echo "🗄️  Resetting database with enhanced schema..."
npx prisma db push --force-reset

# Seed the database with enhanced data
echo "🌱 Seeding database with enhanced ticket system data..."
npm run db:reset

echo "✅ Enhanced Ticket System setup completed!"
echo ""
echo "🔑 Test User Credentials:"
echo "Admin: admin@tickethub.com / password123"
echo "Manager: manager@tickethub.com / password123"
echo "Agent: agent@tickethub.com / password123"
echo "Developer: developer@tickethub.com / password123"
echo "Customer: customer@tickethub.com / password123"
echo "User: user@tickethub.com / password123"
echo ""
echo "🚀 Start the development server with: npm run dev"
echo "📊 View database with: npm run db:studio"
echo "🎫 Access admin interface at: /ticket-system-admin"
