#!/bin/sh

# Function to check if a service is ready
check_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    echo "Checking if service is ready at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null; then
            echo "Service is ready!"
            return 0
        fi
        
        echo "Attempt $attempt of $max_attempts: Service not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo "Service failed to start after $max_attempts attempts"
    return 1
}

# Start the backend service in the background
echo "Starting backend service..."
cd /app/api/backend
npm run start:prod &
BACKEND_PID=$!

# Wait for backend to be ready
if ! check_service "http://localhost:8000/health"; then
    echo "Backend failed to start"
    exit 1
fi

# Start the frontend service
echo "Starting frontend service..."
cd /app/web
npm run start &
FRONTEND_PID=$!

# Wait for frontend to be ready
if ! check_service "http://localhost:3000"; then
    echo "Frontend failed to start"
    exit 1
fi

# Keep the script running and handle shutdown
trap 'kill $BACKEND_PID $FRONTEND_PID; exit' SIGTERM SIGINT

# Wait for any process to exit
wait -n

# Exit with status of process that exited first
exit $? 