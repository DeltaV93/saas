/** @type {import('next').NextConfig} */
const nextConfig = {
  publicRuntimeConfig: {
    // Will be available on both server and client
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL,
  },
  // ... any other existing config
}

module.exports = nextConfig 