#!/bin/bash
echo "========================================"
echo "  Smart Library Management System"
echo "  Starting Backend and Frontend Servers"
echo "========================================"
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js 20.x from https://nodejs.org/"
    exit 1
fi

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "[1/4] Installing backend dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install backend dependencies"
    exit 1
fi

echo
echo "[2/4] Installing frontend dependencies..."
cd ../web
npm install
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to install frontend dependencies"
    exit 1
fi

echo
echo "[3/4] Building frontend for production..."
npm run build
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to build frontend"
    exit 1
fi

echo
echo "[4/4] Starting backend server (port 3001)..."
cd ../server
npm run dev &
BACKEND_PID=$!
echo "Backend server started (PID: $BACKEND_PID) at http://localhost:3001"

# Wait for backend to start
sleep 3

echo
echo "========================================"
echo "  Server is running!"
echo "  Backend API: http://localhost:3001"
echo "  Frontend: Open web/dist/index.html in browser"
echo "========================================"
echo
echo "Press Ctrl+C to stop the server..."

# Handle Ctrl+C
trap "echo; echo 'Stopping server...'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Keep the script running
wait $BACKEND_PID
