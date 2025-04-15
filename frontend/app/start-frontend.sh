#!/bin/bash

# Exit on error
set -e

# Display commands
set -x

# Go to the root directory of the frontend
cd ..

# Check if we have required node modules installed
if [ ! -d "node_modules" ]; then
    echo "Installing required node modules..."
    npm install
fi

# Start the Next.js development server
echo "Starting frontend development server..."
echo "Frontend will be available at http://localhost:3000"

# Set the API base URL for development
export NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL:-"http://localhost:5000/api"}
echo "API base URL set to: $NEXT_PUBLIC_API_BASE_URL"

# Start the development server
npm run dev 