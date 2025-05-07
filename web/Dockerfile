# Use Node.js 20
FROM node:20-alpine AS base

# Install necessary build tools
RUN apk add --no-cache python3 make g++

# Create app directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY web/package.json ./web/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the web application
WORKDIR /app/web
RUN npm install --legacy-peer-deps
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy web frontend
COPY --from=base /app/web/.next ./web/.next
COPY --from=base /app/web/public ./web/public
COPY --from=base /app/web/node_modules ./web/node_modules
COPY --from=base /app/web/package.json ./web/package.json

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_API_URL=${API_URL}

# Expose port
EXPOSE 3000

# Start the frontend service
CMD ["npm", "run", "start"] 