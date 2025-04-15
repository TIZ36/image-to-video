#!/bin/bash
# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please edit .env file with your actual API keys if needed."
fi

# Create required directories
mkdir -p uploads videos

# Check if we have the required packages
if ! pip list | grep -q "flask"; then
    echo "Installing required packages..."
    pip install -r requirements-backend.txt
fi

# Start Flask app
echo "Starting Flask API server..."
python app.py 