#!/bin/bash

# Exit on error
set -e

# Display commands
set -x

# Start backend
echo "Starting backend server..."
cd backend && ./start.sh &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 3

# Start frontend
echo "Starting frontend server..."
npm run dev &
FRONTEND_PID=$!

# Handle script termination
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT TERM

echo "Development environment is running:"
echo "- Backend: http://localhost:5000"
echo "- Frontend: http://localhost:3000"
echo "- API Documentation: http://localhost:5000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for processes to complete
wait $BACKEND_PID $FRONTEND_PID 