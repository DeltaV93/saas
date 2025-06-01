import getConfig from 'next/config';

const IS_MOCK_DATA = process.env.NEXT_PUBLIC_IS_MOCK_DATA === 'true';

/**
 * Returns the backend URL for API requests.
 * Uses NEXT_PUBLIC_BACKEND_URL from environment variables, falling back to localhost for development.
 * Ensures the URL ends with a slash for consistency.
 * @returns {string} The backend base URL
 */
const getBackendUrl = () => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000/';
  return url.endsWith('/') ? url : `${url}/`;
};

// Helper function to get the JWT token from localStorage
const getAuthToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Helper function to set the JWT token in localStorage
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

// Helper function to remove the JWT token from localStorage
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
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

  console.log('options', options);
  const backendUrl = getBackendUrl();
  // Remove leading slash from endpoint if it exists
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  try {
    console.log(`Making ${options?.method || 'GET'} request to: ${backendUrl}${cleanEndpoint}`);    
    
    // Get auth token
    const token = getAuthToken();
    
    // Prepare headers with auth token if available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Ensure default headers are set
    const defaultOptions: RequestInit = {
      credentials: 'include', // Important for cookies/sessions
      headers: {
        ...headers,
        ...(options?.headers || {}),
      },
      ...options,
    };
    
    console.log('defaultOptions', defaultOptions);
    console.log('backendUrl', backendUrl);
    console.log('cleanEndpoint', cleanEndpoint);
    const response = await fetch(`${backendUrl}${cleanEndpoint}`, defaultOptions);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw new Error(`Failed to make request to ${backendUrl}${cleanEndpoint}`);
  }
};