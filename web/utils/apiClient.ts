import getConfig from 'next/config';

const IS_MOCK_DATA = process.env.NEXT_PUBLIC_IS_MOCK_DATA === 'true';

// Get backend URL from runtime config or environment variables
const getBackendUrl = () => {
  // For the browser, we can only use NEXT_PUBLIC_ variables
  if (typeof window !== 'undefined') {
    // Get the current hostname and protocol
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const port = window.location.port;
    
    // If we're in production and the environment variables are set, use them
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      // Ensure the URL ends with a slash
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL.endsWith('/') 
        ? process.env.NEXT_PUBLIC_BACKEND_URL 
        : `${process.env.NEXT_PUBLIC_BACKEND_URL}/`;
      return baseUrl;
    }
    
    // If we're in production and no environment variables are set, use the current domain
    if (process.env.NODE_ENV === 'production') {
      return `${protocol}//${hostname}${port ? `:${port}` : ''}/`;
    }
    
    // Default to localhost for development
    return 'http://localhost:8000/';
  }
  
  // On the server we can use any env var
  const serverUrl = process.env.BACKEND_URL || 
         process.env.API_URL || 
         process.env.NEXT_PUBLIC_BACKEND_URL ||
         process.env.NEXT_PUBLIC_API_URL ||
         'http://localhost:8000/';
         
  // Ensure the URL ends with a slash
  return serverUrl.endsWith('/') ? serverUrl : `${serverUrl}/`;
};

const mockData: { [key: string]: any } = {
  '/auth/signup': { success: true, user: { name: 'New User', role: 'user' } },
  '/auth/login': { success: true, token: 'mock-jwt-token' },
  '/auth/magic-link': { success: true },
  '/auth/reset-password': { success: true },
  '/auth/me': {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
  },
  '/auth/update-profile': {
    statusCode: 200,
    message: 'Profile updated successfully',
    data: {
      id: '123',
      name: 'Updated Name',
      email: 'updated@example.com',
      role: 'user',
      subscriptionType: 'premium',
      subscriptionStatus: 'active',
    },
  },
  '/user/profile': { name: 'John Doe', email: 'john@example.com' },
  '/user/update': { success: true },
  '/user/change-password': { success: true },
  '/user/delete-account': { success: true },
  '/auth/role': { role: 'user' },
  '/auth/update-role': { success: true, newRole: 'premium' },
  '/auth/send-verification-email': { success: true },
  '/auth/verify-email': { success: true },
  '/stripe/create-checkout-session': { url: 'https://mock-checkout-session-url' },
  '/stripe/webhook': { success: true },
  '/auth/subscription-status': { plan: 'premium' },
  '/stripe/retry-payment': { success: true },
  '/stripe/subscription-details': { plan: 'premium', status: 'active' },
  '/stripe/cancel-subscription': { success: true },
  '/stripe/update-plan': { success: true },
  '/api/admin/users': [
    { id: '1', name: 'Alice', email: 'alice@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
  ],
  '/auth/login-google': { success: true, token: 'mock-google-jwt-token' },
  '/auth/send-magic-link': { success: true },
  '/api/user': {
    id: '123',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
    subscriptionType: 'premium',
    subscriptionStatus: 'active',
  },
  '/auth/logout': { success: true },
  '/auth/forgot-password': { success: true },
};

export const apiClient = async (endpoint: string, options?: RequestInit) => {
  if (IS_MOCK_DATA) {
    console.log(`Mock data for ${endpoint}`);

    if (endpoint === '/auth/update-profile' && options?.method === 'PUT') {
      const body = JSON.parse(options.body as string);
      mockData['/auth/me'] = {
        ...mockData['/auth/me'],
        ...body,
      };
      mockData['/auth/update-profile'].data = {
        ...mockData['/auth/update-profile'].data,
        ...body,
      };
    }

    return new Promise((resolve) => {
      setTimeout(() => resolve({
        json: () => Promise.resolve(mockData[endpoint]),
      }), 500);
    });
  }

  const backendUrl = getBackendUrl();
  // Remove leading slash from endpoint if it exists
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  try {
    console.log(`Making request to: ${backendUrl}${cleanEndpoint}`);
    const response = await fetch(`${backendUrl}${cleanEndpoint}`, options);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw new Error(`Failed to make request to ${backendUrl}${cleanEndpoint}`);
  }
};