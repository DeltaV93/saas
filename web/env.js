module.exports = {
    // These values will be inlined at build time
    publicRuntimeConfig: {
      backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
    }
  };