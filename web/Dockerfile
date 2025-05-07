# Use Node.js 20 (matching your .nvmrc)
FROM node:20-alpine AS base

# Install necessary build tools for native modules
RUN apk add --no-cache python3 make g++ curl

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY api/backend/package.json ./api/backend/
COPY web/package.json ./web/
# Install root dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the backend
WORKDIR /app/api/backend
RUN npm install --legacy-peer-deps
# Ensure bcrypt is installed properly
RUN npm install bcrypt@5.1.1 --legacy-peer-deps
RUN npm run build

# Build the web application
WORKDIR /app/web
RUN npm install --legacy-peer-deps

# CRITICAL: Set ARG variables that can be passed at build time for Next.js
ARG NEXT_PUBLIC_BACKEND_URL
ARG NEXT_PUBLIC_API_URL
ARG RAILWAY_PUBLIC_DOMAIN

# Set default values for the build environment variables
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8000}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
ENV RAILWAY_PUBLIC_DOMAIN=${RAILWAY_PUBLIC_DOMAIN:-localhost}

# Now run the build with these environment variables available
RUN npm run build

# Return to root directory
WORKDIR /app

# Production stage
FROM node:20-alpine AS production

# Install necessary runtime dependencies for bcrypt
RUN apk add --no-cache python3 make g++ curl

WORKDIR /app

# Copy API backend
COPY --from=base /app/api/backend/dist ./api/backend/dist
COPY --from=base /app/api/backend/node_modules ./api/backend/node_modules
COPY --from=base /app/api/backend/package.json ./api/backend/package.json

# Copy web frontend
COPY --from=base /app/web/.next ./web/.next
COPY --from=base /app/web/public ./web/public
COPY --from=base /app/web/node_modules ./web/node_modules
COPY --from=base /app/web/package.json ./web/package.json
COPY --from=base /app/web/next.config.js ./web/next.config.js

# Copy root package.json and node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/node_modules ./node_modules

# Copy start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment variables for runtime
ENV NODE_ENV=production
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL:-http://localhost:8000}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:8000}
ENV RAILWAY_PUBLIC_DOMAIN=${RAILWAY_PUBLIC_DOMAIN:-localhost}

# Expose ports for both frontend and backend
EXPOSE 8000
EXPOSE 3000

# Start both services using the start script
CMD ["/app/start.sh"]