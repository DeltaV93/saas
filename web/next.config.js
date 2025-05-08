/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    env: {
      NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    },    
    // Disable TypeScript type checking during build to allow deployment
    typescript: {
      // !! WARN !!
      // This setting allows production builds to complete even if
      // your project has type errors. This is not recommended.
      // !! WARN !!
      ignoreBuildErrors: false,
    },
    eslint: {
      // Allow production builds to complete even if your project has ESLint errors
      ignoreDuringBuilds: false,
    },
    // Explicitly set the port for the Next.js server
    serverRuntimeConfig: {
      port: parseInt(process.env.PORT, 10) || 3000,
    },
    // Add security headers
    async headers() {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Access-Control-Allow-Credentials', value: 'true' },
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
            { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
          ],
        },
      ];
    },
  }
  
  module.exports = nextConfig