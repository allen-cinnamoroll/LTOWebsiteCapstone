#!/bin/bash

# Restart Server Script for LTO Website
echo "🔄 Restarting LTO Website Server..."

# Navigate to backend directory
cd backend

# Kill any existing Node.js processes (be careful with this in production)
echo "🛑 Stopping existing server processes..."
pkill -f "node.*server.js" || echo "No existing server processes found"

# Wait a moment
sleep 2

# Install/update dependencies
echo "📦 Installing/updating dependencies..."
npm install

# Start the server
echo "🚀 Starting server..."
npm start

echo "✅ Server restart completed!"
