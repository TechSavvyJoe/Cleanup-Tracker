#!/bin/bash

# Cleanup Tracker - Server Startup Script
# This script starts both the Node.js server and React client

echo "🚀 Starting Cleanup Tracker Application..."

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "server.js" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
pkill -f "PORT=3001" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

echo "📱 Starting Node.js Server (port 5051)..."
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/server"
npm start > server.log 2>&1 &
SERVER_PID=$!

echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if curl -s http://localhost:5051/api/v2/health > /dev/null; then
    echo "✅ Server started successfully on port 5051"
else
    echo "❌ Server failed to start"
    exit 1
fi

echo "🌐 Starting React Client (port 3001)..."
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/client"
PORT=3001 npm start > client.log 2>&1 &
CLIENT_PID=$!

echo "⏳ Waiting for React client to compile..."
sleep 10

# Check if React is running (process-based check since curl might not work)
if ps -p $CLIENT_PID > /dev/null; then
    echo "✅ React client started successfully on port 3001"
    echo ""
    echo "🎉 Application is ready!"
    echo "📍 Server API: http://localhost:5051"
    echo "🌐 Web App: http://localhost:3001"
    echo ""
    echo "Test Credentials:"
    echo "  Employee ID: MGR001"
    echo "  PIN: 1701"
    echo ""
    echo "Press Ctrl+C to stop both servers"
    
    # Keep script running and forward signals to child processes
    trap 'kill $SERVER_PID $CLIENT_PID; exit' INT TERM
    wait
else
    echo "❌ React client failed to start"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi