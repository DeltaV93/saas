
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    publicRuntimeConfig: {
      // Will be available on both server and client
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    },
    // Disable TypeScript type checking during build to allow deployment
    typescript: {
      // !! WARN !!
      // This setting allows production builds to complete even if
      // your project has type errors. This is not recommended.
      // !! WARN !!
      ignoreBuildErrors: true,
    },
    eslint: {
      // Allow production builds to complete even if your project has ESLint errors
      ignoreDuringBuilds: true,
    },
    // Explicitly set the port for the Next.js server
    serverRuntimeConfig: {
      port: parseInt(process.env.PORT, 10) || 3000,
    }
  }
  
  module.exports = nextConfig