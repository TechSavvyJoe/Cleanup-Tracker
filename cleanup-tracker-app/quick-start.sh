#!/bin/bash
# Quick Start Script - Run both servers

echo "🧹 Cleanup Tracker - Development Server Startup"
echo "================================================"
echo ""

# Kill any existing processes
echo "🛑 Stopping any existing servers..."
pkill -9 -f "nodemon" 2>/dev/null
pkill -9 -f "react-scripts" 2>/dev/null
pkill -9 -f "node.*server.js" 2>/dev/null
sleep 2

# Start backend
echo ""
echo "🚀 Starting Backend Server on port 5051..."
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/server"
nohup node server.js > /tmp/cleanup-backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend PID: $BACKEND_PID"

# Wait for backend to start
sleep 3

# Check if backend is running
if lsof -ti:5051 > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 5051"
else
    echo "   ❌ Backend failed to start. Check /tmp/cleanup-backend.log"
    exit 1
fi

# Start frontend
echo ""
echo "🚀 Starting React Dev Server on port 3000..."
cd "/Users/missionford/Cleanup Tracker/cleanup-tracker-app/client"
nohup npm start > /tmp/cleanup-frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend PID: $FRONTEND_PID"

# Wait for frontend to start
echo ""
echo "⏳ Waiting for React to compile (this takes ~15 seconds)..."
sleep 15

# Check if frontend is running
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on port 3000"
else
    echo "   ❌ Frontend failed to start. Check /tmp/cleanup-frontend.log"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Both servers are running!"
echo ""
echo "📱 Open your browser to: http://localhost:3000"
echo ""
echo "📋 Process IDs:"
echo "   Backend:  $BACKEND_PID"
echo "   Frontend: $FRONTEND_PID"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/cleanup-backend.log"
echo "   Frontend: tail -f /tmp/cleanup-frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   OR run: pkill -f 'node.*server.js' && pkill -f 'react-scripts'"
echo ""
