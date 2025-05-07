/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://saas-production-a504.up.railway.app:8000',
  },
  // ... any other existing config
}

module.exports = nextConfig 