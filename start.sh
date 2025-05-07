#!/bin/sh

# Start the backend service in the background
cd /app/api/backend
npm run start:prod &

# Wait for the backend to be ready
echo "Waiting for backend to start..."
sleep 10

# Start the frontend service
cd /app/web
npm run start 