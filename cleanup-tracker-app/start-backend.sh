#!/bin/bash
# Start Backend Server

cd "$(dirname "$0")/server"

echo "🚀 Starting Backend Server..."
echo "📍 Working directory: $(pwd)"
echo ""

node server.js
