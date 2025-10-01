#!/bin/bash

# Cleanup Tracker - Production Startup Script
# This script helps deploy the application to production

set -e  # Exit on error

echo "🚀 Cleanup Tracker Production Deployment"
echo "========================================="

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher required"
    echo "   Current version: $(node -v)"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check if .env exists
if [ ! -f "cleanup-tracker-app/server/.env" ]; then
    echo "❌ Error: .env file not found"
    echo "   Please copy .env.production to .env and configure it"
    exit 1
fi
echo "✅ Environment file found"

# Check JWT_SECRET
JWT_SECRET=$(grep JWT_SECRET cleanup-tracker-app/server/.env | cut -d'=' -f2)
if [ "$JWT_SECRET" == "your-256-bit-secret-here-CHANGE-THIS-IN-PRODUCTION" ] || [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET not configured"
    echo "   Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\""
    exit 1
fi
echo "✅ JWT_SECRET configured"

# Check MongoDB URI
MONGO_URI=$(grep MONGO_URI cleanup-tracker-app/server/.env | cut -d'=' -f2)
if [ -z "$MONGO_URI" ]; then
    echo "⚠️  Warning: MONGO_URI not set, will use in-memory database"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
cd cleanup-tracker-app
npm run install:all

# Build client
echo ""
echo "🔨 Building client..."
npm run build

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo ""
    echo "📦 Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# Start/Restart with PM2
echo ""
echo "🚀 Starting application with PM2..."
cd server

if pm2 describe cleanup-tracker > /dev/null 2>&1; then
    echo "   Restarting existing process..."
    pm2 restart cleanup-tracker
else
    echo "   Starting new process..."
    NODE_ENV=production pm2 start server.js --name cleanup-tracker
fi

# Save PM2 process list
pm2 save

# Display status
echo ""
echo "✅ Deployment complete!"
echo ""
pm2 status
echo ""
echo "📊 View logs: pm2 logs cleanup-tracker"
echo "🔄 Restart: pm2 restart cleanup-tracker"
echo "🛑 Stop: pm2 stop cleanup-tracker"
echo ""
echo "🌐 Application should be running on port 5051"
echo "   Check with: curl http://localhost:5051/api/vehicles/count"
