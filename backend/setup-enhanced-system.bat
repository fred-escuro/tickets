@echo off
REM Enhanced Ticket System Setup Script for Windows

echo 🚀 Setting up Enhanced Ticket System...

REM Check if we're in the backend directory
if not exist "package.json" (
    echo ❌ Please run this script from the backend directory
    pause
    exit /b 1
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm install

REM Generate Prisma client
echo 🔧 Generating Prisma client...
call npx prisma generate

REM Reset database and apply new schema
echo 🗄️  Resetting database with enhanced schema...
call npx prisma db push --force-reset

REM Seed the database with enhanced data
echo 🌱 Seeding database with enhanced ticket system data...
call npm run db:reset

echo ✅ Enhanced Ticket System setup completed!
echo.
echo 🔑 Test User Credentials:
echo Admin: admin@tickethub.com / password123
echo Manager: manager@tickethub.com / password123
echo Agent: agent@tickethub.com / password123
echo Developer: developer@tickethub.com / password123
echo Customer: customer@tickethub.com / password123
echo User: user@tickethub.com / password123
echo.
echo 🚀 Start the development server with: npm run dev
echo 📊 View database with: npm run db:studio
echo 🎫 Access admin interface at: /ticket-system-admin

pause
