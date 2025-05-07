# Redis Deployment Guide

This guide explains how to set up Redis for your application in various deployment environments.

## Redis Configuration Options

Your application can connect to Redis using either:

1. A full Redis URL: `REDIS_URL=redis://username:password@host:port`
2. Individual components: `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD`

## Deployment Options

### Option 1: Railway

Railway provides Redis as a service that you can easily add to your project:

1. In your Railway project, click "New" → "Database" → "Redis"
2. Railway will automatically create a Redis instance and provide the connection details
3. The `REDIS_URL` environment variable will be automatically available to your application

### Option 2: Heroku

To use Redis on Heroku:

1. Add the Redis add-on: `heroku addons:create heroku-redis:hobby-dev`
2. Heroku will automatically set the `REDIS_URL` environment variable

### Option 3: DigitalOcean

To use DigitalOcean Managed Redis:

1. Create a Redis database from the DigitalOcean control panel
2. Get the connection details and set the `REDIS_URL` environment variable in your app settings

### Option 4: AWS ElastiCache

For AWS ElastiCache:

1. Create a Redis cluster in ElastiCache
2. Configure your VPC to allow connections from your application
3. Set the `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` environment variables

## Fallback Behavior

The application is configured to handle Redis connection failures gracefully:

- If Redis is unavailable, the application will continue to function using in-memory storage for sessions
- Caching operations will be skipped if Redis is not available
- Rate limiting will be disabled if Redis is not available

## Troubleshooting

If you see errors like `ECONNREFUSED 127.0.0.1:6379`, it means:

1. The application is trying to connect to Redis on localhost (default behavior)
2. No Redis instance is running at that address

Solutions:

1. Provide the correct Redis connection details via environment variables
2. Install and run Redis locally for development
3. Use the fallback behavior (application will work with reduced functionality)

## Local Development

For local development, you can run Redis using Docker:

```bash
docker run -d --name redis -p 6379:6379 redis:alpine
```

Then set your environment variables:

```
REDIS_URL=redis://localhost:6379
```

Or simply rely on the default configuration, which will attempt to connect to Redis at localhost:6379. 