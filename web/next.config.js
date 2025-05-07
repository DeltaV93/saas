/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // Explicitly set the port for the Next.js server
  server: {
    port: 3000,
  },
}

module.exports = nextConfig 