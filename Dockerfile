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
RUN npm ci --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the backend
WORKDIR /app/api/backend
RUN npm ci --legacy-peer-deps
# Ensure bcrypt is installed properly
RUN npm install bcrypt@5.1.1 --legacy-peer-deps
RUN npm run build

# Build the web application
WORKDIR /app/web
RUN npm ci --legacy-peer-deps
RUN npm run build

# Return to root directory
WORKDIR /app

# Production stage
FROM node:20-alpine AS production

# Install necessary runtime dependencies
RUN apk add --no-cache python3 make g++ curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

WORKDIR /app

# Copy API backend
COPY --from=base --chown=nestjs:nodejs /app/api/backend/dist ./api/backend/dist
COPY --from=base --chown=nestjs:nodejs /app/api/backend/node_modules ./api/backend/node_modules
COPY --from=base --chown=nestjs:nodejs /app/api/backend/package.json ./api/backend/package.json

# Copy web frontend
COPY --from=base --chown=nestjs:nodejs /app/web/.next ./web/.next
COPY --from=base --chown=nestjs:nodejs /app/web/public ./web/public
COPY --from=base --chown=nestjs:nodejs /app/web/node_modules ./web/node_modules
COPY --from=base --chown=nestjs:nodejs /app/web/package.json ./web/package.json

# Copy root package.json and node_modules
COPY --from=base --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=base --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy start script
COPY --chown=nestjs:nodejs start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment variables
ENV NODE_ENV=production \
    PORT=8000 \
    NEXT_PUBLIC_API_URL=http://localhost:8000

# Expose ports for both frontend and backend
EXPOSE 8000
EXPOSE 3000

# Switch to non-root user
USER nestjs

# Start both services using the start script
CMD ["/app/start.sh"]